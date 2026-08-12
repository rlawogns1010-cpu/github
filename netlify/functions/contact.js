/**
 * 문의 폼 접수 함수
 *
 * 브라우저 → 이 함수 → 구글 Apps Script → 구글 시트
 *
 * 구글 시트 주소(Apps Script URL)를 이 파일에 적지 않습니다.
 * Netlify 대시보드 → Site configuration → Environment variables 에
 * SHEET_WEBHOOK_URL 이라는 이름으로 등록하면 아래 process.env 로 읽어옵니다.
 *
 * 이렇게 하면 방문자에게 시트 주소가 노출되지 않아,
 * 외부에서 직접 시트로 데이터를 밀어 넣는 것을 막을 수 있습니다.
 */

const LIMITS = { name: 100, company: 100, email: 200, phone: 50, type: 50, message: 5000 };

function clean(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

exports.handler = async (event) => {
  const reply = (statusCode, obj) => ({
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  });

  if (event.httpMethod !== "POST") {
    return reply(405, { ok: false, error: "POST 요청만 허용됩니다." });
  }

  const url = process.env.SHEET_WEBHOOK_URL;
  if (!url) {
    return reply(500, { ok: false, error: "SHEET_WEBHOOK_URL 환경변수가 설정되지 않았습니다." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { ok: false, error: "잘못된 요청 형식입니다." });
  }

  // 봇 차단 — 사람에게는 보이지 않는 필드에 값이 채워지면 조용히 성공 처리
  if (body.website) return reply(200, { ok: true });

  const data = {
    name: clean(body.name, LIMITS.name),
    company: clean(body.company, LIMITS.company),
    email: clean(body.email, LIMITS.email),
    phone: clean(body.phone, LIMITS.phone),
    type: clean(body.type, LIMITS.type),
    message: clean(body.message, LIMITS.message),
    agree: body.agree === true,
  };

  if (!data.name || !data.email || !data.message) {
    return reply(400, { ok: false, error: "성함, 이메일, 문의내용은 필수입니다." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return reply(400, { ok: false, error: "이메일 주소 형식을 확인해 주세요." });
  }
  if (!data.agree) {
    return reply(400, { ok: false, error: "개인정보 수집·이용에 동의해 주세요." });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      redirect: "follow", // Apps Script는 302로 리다이렉트합니다
    });

    if (!res.ok) throw new Error(`시트 응답 오류 ${res.status}`);

    const result = await res.json().catch(() => ({ ok: true }));
    if (result.ok === false) throw new Error(result.error || "시트 저장 실패");

    return reply(200, { ok: true });

  } catch (err) {
    console.error("문의 접수 실패:", err);
    return reply(502, { ok: false, error: "접수 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
  }
};
