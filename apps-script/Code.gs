/**
 * JB자산운용 홈페이지 — 문의 접수 → 구글 시트 저장
 *
 * [사용법]
 * 1. 구글 시트를 하나 만들고 "확장 프로그램 → Apps Script" 로 들어갑니다.
 * 2. 기본 코드를 지우고 이 파일 내용을 통째로 붙여넣습니다.
 * 3. "배포 → 새 배포 → 웹 앱" 으로 배포하고 URL을 복사합니다.
 *    - 실행 계정 : 나
 *    - 액세스 권한 : 모든 사용자
 * 4. 복사한 URL을 Netlify 환경변수 SHEET_WEBHOOK_URL 에 등록합니다.
 *
 * 시트 첫 행(헤더)은 실행 시 자동으로 만들어집니다.
 */

var SHEET_NAME = '문의접수';

var HEADERS = [
  '접수일시',
  '성함',
  '회사/기관',
  '이메일',
  '연락처',
  '문의유형',
  '문의내용',
  '개인정보 동의'
];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // 헤더가 없으면 생성하고 서식 적용
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var head = sheet.getRange(1, 1, 1, HEADERS.length);
    head.setFontWeight('bold');
    head.setBackground('#0b2545');
    head.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150); // 접수일시
    sheet.setColumnWidth(7, 420); // 문의내용
  }

  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // 봇 차단용 히든 필드 — 값이 있으면 사람이 아님
    if (body.website) {
      return json_({ ok: true });
    }

    if (!body.name || !body.email || !body.message) {
      return json_({ ok: false, error: '필수 항목이 비어 있습니다.' });
    }

    var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

    getSheet_().appendRow([
      now,
      String(body.name).slice(0, 100),
      String(body.company || '').slice(0, 100),
      String(body.email).slice(0, 200),
      String(body.phone || '').slice(0, 50),
      String(body.type || '').slice(0, 50),
      String(body.message).slice(0, 5000),
      body.agree ? '동의' : '미동의'
    ]);

    // 새 문의가 오면 메일로 알림 (원하지 않으면 아래 3줄을 지우세요)
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      '[JB자산운용] 새 문의 접수 - ' + body.name,
      '접수일시: ' + now +
      '\n성함: ' + body.name +
      '\n회사/기관: ' + (body.company || '-') +
      '\n이메일: ' + body.email +
      '\n연락처: ' + (body.phone || '-') +
      '\n문의유형: ' + (body.type || '-') +
      '\n\n' + body.message
    );

    return json_({ ok: true });

  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 브라우저로 URL을 열었을 때 동작 확인용
function doGet() {
  return json_({ ok: true, message: 'JB자산운용 문의 접수 엔드포인트가 정상 동작 중입니다.' });
}
