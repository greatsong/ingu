# 작품 갤러리 — 강사용 5분 설정 가이드

이 폴더(`gallery/`)는 빌드 과정 없이 정적 파일(HTML/CSS/JS)만으로 동작하는 작품 갤러리 미니 앱입니다.
`config.js`를 채우기 전까지는 **데모 모드**로 샘플 작품 몇 개가 바로 보여서, Supabase 없이도 화면 구성을 먼저 확인할 수 있습니다.

## 0. 지금 바로 확인하기 (데모 모드)

아무 설정 없이 배포만 해도 데모 모드로 완전히 동작합니다.
배포 주소: `https://greatsong.github.io/ingu/gallery/`

## 1. Supabase 프로젝트 만들기 (2분)

1. https://supabase.com 접속 → 로그인(구글 계정 가능) → **New project**
2. 프로젝트 이름(예: `ingu-gallery`), 비밀번호(아무거나, 사용 안 함), 리전은 **Northeast Asia (Seoul)** 선택 후 생성
3. 생성 완료까지 1~2분 대기

## 2. 테이블·정책 만들기 (1분)

1. 왼쪽 메뉴 **SQL Editor** 클릭 → **New query**
2. 이 폴더의 `schema.sql` 파일 내용을 전부 복사해서 붙여넣기
3. 우측 하단 **Run** 클릭 → 초록색 성공 메시지 확인
   - `apps`, `feedback` 테이블과 좋아요 증가용 `increment_likes` 함수, RLS 정책이 한 번에 생성됩니다.

## 3. publishable(공개) 키 확인하기 (1분)

1. 왼쪽 메뉴 **Project Settings → API** 클릭
2. **Project URL** 복사 (예: `https://xxxxxxxx.supabase.co`)
3. **Project API keys** 항목에서 **anon / public** 키(=publishable 키) 복사
   - ⚠️ **service_role(secret) 키는 절대 복사하지 마세요.** 이 키는 서버 전용이며, 참가자 화면에 들어가면 누구나 데이터를 지울 수 있게 됩니다.

## 4. config.js 채우기 (1분)

`gallery/config.js` 파일을 열고 두 값을 채웁니다.

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_KEY: "여기에_anon_publishable_키_붙여넣기"
};
```

push 후 새로고침하면 데모 작품이 사라지고 실제 제출 작품이 보입니다.

## 5. 배포하기

이 저장소(greatsong/ingu)는 이미 GitHub Pages로 서빙 중이므로, `gallery/` 폴더를 push하면
`https://greatsong.github.io/ingu/gallery/`로 바로 노출됩니다. 별도 설정이 필요 없습니다.

`config.js`에 들어가는 키는 publishable(anon) 키이므로 공개 저장소에 올라가도 구조적으로 안전합니다
(테이블 update/delete는 RLS로 전면 차단, 좋아요는 RPC로만 증가, insert 시 likes는 트리거로 항상 0).

## 운영 수칙

- **연수 전날 1회 접속**: Supabase 무료 티어는 7일간 활동이 없으면 프로젝트가 일시정지됩니다. 연수 전날 한 번 갤러리 페이지에 접속해 깨워두세요.
- **장애 시 폴백**: 갤러리가 열리지 않거나 오류가 나면 즉시 "패들렛(또는 채팅창)에 앱 URL을 남겨주세요"로 안내하고 진행을 계속합니다.
- **점검 포인트**: 제출 시점에 작품이 잘 올라왔는지 Supabase **Table Editor**에서 `apps` 테이블을 확인하면 됩니다. 별도의 강사 화면은 없어도 Table Editor가 그 역할을 합니다.
- **좋아요/피드백 모니터링**: `feedback` 테이블도 Table Editor에서 바로 확인 가능합니다. 금지어 필터를 통과한 표현이 있다면 `app.js`의 `BANNED_WORDS` 배열에 단어를 추가하면 됩니다.

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
| `schema.sql` | Supabase에 붙여넣을 테이블·RLS·RPC 정의 |
| `SETUP.md` | 이 문서 |
