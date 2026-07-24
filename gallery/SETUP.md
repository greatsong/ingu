# 작품 갤러리 — 운영 가이드

이 폴더(`gallery/`)는 빌드 과정 없이 정적 파일(HTML/CSS/JS)만으로 동작하는 작품 갤러리 미니 앱입니다.

## 연동 구조 (2026-07-24 확정)

- **snui(병아리반) 갤러리와 같은 Supabase 프로젝트**(`ipcherzsnaevkkjrclvn`)를 공유합니다.
- 테이블은 **`ingu_apps` / `ingu_feedback`으로 분리**되어 병아리반 데이터(`apps`/`feedback`)와 절대 섞이지 않습니다.
- 좋아요 RPC도 별도(`increment_ingu_likes`)입니다.
- `config.js`에는 이미 프로젝트 URL과 publishable(anon) 키가 채워져 있습니다. publishable 키는 공개되어도 구조적으로 안전합니다(update/delete는 RLS로 전면 차단, 좋아요는 RPC로만 증가, insert 시 likes는 트리거로 항상 0).

## 최초 1회 설정 — 테이블 만들기

Supabase 대시보드(snui 프로젝트) → **SQL Editor** → `schema.sql` 내용 전체 붙여넣고 **Run**.
`ingu_apps`, `ingu_feedback` 테이블과 RLS 정책, `increment_ingu_likes` 함수가 한 번에 생성됩니다.

## 배포

이 저장소(greatsong/ingu)는 GitHub Pages로 서빙 중이므로 push만 하면
`https://greatsong.github.io/ingu/gallery/`에 반영됩니다.

## 운영 수칙

- **연수 전날 1회 접속**: Supabase 무료 티어는 7일간 활동이 없으면 프로젝트가 일시정지됩니다. 연수 전날 한 번 갤러리 페이지에 접속해 깨워두세요. (snui 쪽 활동이 있으면 같이 깨어 있습니다)
- **장애 시 폴백**: 갤러리가 열리지 않거나 오류가 나면 즉시 "패들렛(또는 채팅창)에 앱 URL을 남겨주세요"로 안내하고 진행을 계속합니다.
- **점검 포인트**: 제출 시점에 작품이 잘 올라왔는지 Supabase **Table Editor**에서 `ingu_apps` 테이블을 확인하면 됩니다. 별도의 강사 화면은 없어도 Table Editor가 그 역할을 합니다.
- **좋아요/피드백 모니터링**: `ingu_feedback` 테이블도 Table Editor에서 바로 확인 가능합니다. 금지어 필터를 통과한 표현이 있다면 `app.js`의 `BANNED_WORDS` 배열에 단어를 추가하면 됩니다.

## 참가자 작품 공개 동의 안내

- 이 갤러리는 닉네임·소개·앱 URL이 **누구나 볼 수 있게 공개**됩니다.
- 성인(교사) 대상 연수이므로 별도의 서면 동의서 대신, **연수 시작 시 강사가 구두로 안내**하고 동의를 확인하는 것으로 충분합니다. 예: "오늘 만든 앱을 원하는 분만 갤러리에 공유합니다. 실명 대신 닉네임을 사용해주세요."
- 게시는 참가자 본인이 폼에 직접 입력·제출하는 행위 자체가 공개 의사 표시이므로, 원치 않는 분은 제출하지 않으면 됩니다.
- 실명 대신 닉네임 사용을 권장합니다(제출 폼도 닉네임 입력으로 설계되어 있습니다).

## 금지어 목록 관리

`app.js` 상단의 `BANNED_WORDS` 배열이 금지어 목록입니다. 닉네임·한 줄 소개·피드백 등록 시 이 목록에 포함된 단어가 있으면 등록이 차단됩니다. 새로운 사례가 발견되면 배열에 문자열만 추가하면 됩니다(코드 구조 변경 불필요).

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 화면 구조 (갤러리/제출 2개 화면) |
| `style.css` | 디자인 (교재와 같은 크림·골드 톤) |
| `app.js` | 데모/실제 모드 분기, 데이터 처리, 금지어 필터, 렌더링 |
| `config.js` | Supabase URL/publishable 키 (비어 있으면 데모 모드) |
| `schema.sql` | Supabase에 붙여넣을 테이블·RLS·RPC 정의 (ingu_ 접두사) |
| `SETUP.md` | 이 문서 |
