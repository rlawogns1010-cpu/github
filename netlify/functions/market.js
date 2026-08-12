/**
 * 시장 지표 조회 함수 (한국은행 ECOS Open API 프록시)
 *
 * API 키는 이 파일에 절대 적지 않습니다.
 * Netlify 대시보드 → Site configuration → Environment variables 에
 * ECOS_API_KEY 라는 이름으로 등록하면 아래 process.env 로 읽어옵니다.
 *
 * 브라우저는 이 함수만 호출하므로(/.netlify/functions/market)
 * 키가 사용자에게 전달되지 않습니다.
 */

const ECOS = "https://ecos.bok.or.kr/api/StatisticSearch";

// 조회할 지표 정의 (통계표코드 / 항목코드는 ECOS 기준)
const SERIES = [
  { id: "rate",   label: "한국은행 기준금리", stat: "722Y001", item: "0101000", unit: "%",  digits: 2, kind: "rate" },
  { id: "usd",    label: "원/달러 환율",      stat: "731Y001", item: "0000001", unit: "원", digits: 1, kind: "fx"   },
  { id: "kospi",  label: "KOSPI",             stat: "802Y001", item: "0001000", unit: "",   digits: 2, kind: "index" },
  { id: "kosdaq", label: "KOSDAQ",            stat: "802Y001", item: "0089000", unit: "",   digits: 2, kind: "index" },
];

// KST 기준 yyyymmdd
function kstDate(offsetDays = 0) {
  const now = new Date(Date.now() + 9 * 3600 * 1000 - offsetDays * 86400 * 1000);
  return now.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchSeries(key, s) {
  // 주말·공휴일을 감안해 넉넉히 30일 구간을 조회한 뒤 마지막 두 건만 사용
  const url = `${ECOS}/${key}/json/kr/1/100/${s.stat}/D/${kstDate(30)}/${kstDate(0)}/${s.item}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ECOS HTTP ${res.status}`);

  const json = await res.json();
  if (json.RESULT) throw new Error(`ECOS ${json.RESULT.CODE}: ${json.RESULT.MESSAGE}`);

  const rows = json?.StatisticSearch?.row || [];
  if (!rows.length) throw new Error("데이터 없음");

  const last = rows[rows.length - 1];
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;

  const value = Number(last.DATA_VALUE);
  const prevValue = prev ? Number(prev.DATA_VALUE) : null;
  const diff = prevValue === null ? null : value - prevValue;

  return {
    id: s.id,
    label: s.label,
    unit: s.unit,
    kind: s.kind,
    value: value.toLocaleString("ko-KR", {
      minimumFractionDigits: s.digits,
      maximumFractionDigits: s.digits,
    }),
    diff: diff === null ? null : Math.abs(diff).toLocaleString("ko-KR", {
      minimumFractionDigits: s.digits,
      maximumFractionDigits: s.digits,
    }),
    // 기준금리는 등락률 표기가 의미 없으므로 생략
    pct: diff === null || s.kind === "rate" || !prevValue
      ? null
      : ((diff / prevValue) * 100).toFixed(2),
    dir: diff === null ? 0 : diff > 0 ? 1 : diff < 0 ? -1 : 0,
    date: `${last.TIME.slice(0, 4)}.${last.TIME.slice(4, 6)}.${last.TIME.slice(6, 8)}`,
  };
}

exports.handler = async () => {
  const key = process.env.ECOS_API_KEY;

  if (!key) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "ECOS_API_KEY 환경변수가 설정되지 않았습니다." }),
    };
  }

  const settled = await Promise.allSettled(SERIES.map((s) => fetchSeries(key, s)));

  const items = settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { id: SERIES[i].id, label: SERIES[i].label, unit: SERIES[i].unit,
          kind: SERIES[i].kind, value: null, error: String(r.reason.message || r.reason) }
  );

  const ok = items.some((i) => i.value !== null);

  return {
    statusCode: ok ? 200 : 502,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // CDN에 30분 캐싱 — ECOS 일 호출한도 절약 및 응답 속도 확보
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
    body: JSON.stringify({ source: "한국은행 ECOS", items }),
  };
};
