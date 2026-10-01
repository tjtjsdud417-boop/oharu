# 계정삭제 서버 준비 상태 — 2026-10-01

**미배포·기본 차단 상태. 실제 삭제와 SQL 적용은 수행하지 않았다.**

## API 계약

`POST /functions/v1/delete-account`, `Content-Type: application/json`, `Authorization: Bearer <현재 사용자 access token>`.

본문은 strict union으로 `{ "password": "현재 비밀번호", "confirmation": "DELETE" }` 또는 `{ "reauthentication": "oauth", "confirmation": "DELETE" }` 각각 두 필드만 허용한다. 두 경로의 필드를 섞으면 거부한다. 빈 비밀번호·객체/배열·추가 email/userId/ownerId·잘못된 확인 문자열은 거부한다. 최대 UTF-8 body 4,096 bytes, password 최대 1,024 문자. 이메일과 삭제 대상 ID는 서버에서 검증한 사용자 객체만 사용한다.

성공은 HTTP 200 `{deleted:true,code:"account_deleted",accountDeleted:true,dataDeletion:"completed"}`. 실패는 `{deleted:false,code:...}`이며 키·이메일·비밀번호·토큰·SDK raw error를 반환하거나 로그로 출력하지 않는다. 응답은 `Cache-Control: no-store`.

현재 production adapter의 `securityPrerequisites: false` 때문에 유효한 요청도 **503 deletion_not_enabled**로 차단하며 인증 서버 호출/데이터 변경 전에 종료한다. 이는 출시 완료 기능이 아니라 검토 대기 코드다. 새 env/key를 만들지 않으며, 기존 Edge runtime의 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`만 사용하도록 구성했다. 서비스 URL은 기존 Oharu 프로젝트와 정확히 일치해야 한다.

## 삭제 순서와 최소 선행 조건

현재 확인된 문제: `public.todos.user_id`는 auth.users FK가 없고 기존 소유자 RLS만 있다. Supabase는 auth 사용자 삭제 후에도 이미 발급한 access JWT가 만료될 때까지 유효할 수 있다고 설명한다. 기존 구조에서 todos를 먼저 지우면 계정삭제 실패로 데이터만 사라질 수 있고, auth를 먼저 지우면 todo가 남거나 과거 토큰으로 고아 행이 재생성될 수 있다.

따라서 **별도 todos DELETE를 구현에서 제거했다.** 상위 담당자가 별도로 준비하는 `docs/sql/account-deletion-hardening.review.sql`의 최소안은 `todos.user_id → auth.users.id ON DELETE CASCADE NOT VALID` FK 1개다. 기존 고아 행을 삭제하지 않고 새 삽입/업데이트에는 FK를 적용하며, 본인 auth 삭제와 연결된 todos 삭제를 DB 트랜잭션으로 묶는다. 이 FK가 있으면 이미 삭제된 사용자 ID의 새 todos 생성도 거부된다. 기존 정상 소유자 RLS를 유지하는 조건에서 추가 RLS 변경은 이 최소안의 필수가 아니다.

운영 SQL은 아직 적용하지 않았다. 통합 담당자가 준비한 실제 migration 파일은 `admin/supabase/migrations/20261001000000_account_deletion_todos_fk.sql`이며, 검토용 SQL과 같은 제약 하나만 포함한다. **독립 보안 리뷰 PASS와 정확한 FK 대상/ON DELETE CASCADE 적용 확인 후에만 release gate를 바꿀 수 있다.** 단순히 코드가 존재하거나 mock 테스트가 통과했다고 true로 바꾸면 안 된다. 운영 계정 삭제 테스트는 별도 승인 없이 하지 않는다.

활성화 이후 준비된 순서:

1. method/origin/content-type/Bearer 형식 및 body 제한 검사.
2. release gate 검사.
3. `auth.getUser(token)` 서버 검증. 익명·이메일 없는 계정·잘못된 ID 거부.
4. password 경로는 `user.email`과 입력한 현재 비밀번호를 별도 anon client의 `signInWithPassword`로 재인증하고 반환 ID 일치를 확인한다. OAuth 경로는 아래 getClaims/최근 AMR 검증을 사용한다. verified MFA가 있으면 두 경로 모두 현재 Bearer의 최근 MFA 증거도 검사한다.
5. password 경로에서 재인증용 임시 세션만 `signOut({scope:'local'})`로 정리. 실패하면 삭제 전에 중단. 서비스 role client와 재인증 client를 분리하여 세션 오염을 방지한다.
6. Storage 차단 검사.
7. `service.auth.admin.deleteUser(authenticatedId, false)` **한 번만** 호출. 승인된 FK가 todos를 원자적으로 연쇄 삭제하며 기존 mcp_tokens/admins의 cascade는 DB 정의에 맡긴다. 사용자 metadata의 테마도 auth 사용자와 함께 제거된다. 관련 없는 dashboard/admin 데이터는 직접 삭제하지 않는다.
8. 성공 응답을 받은 클라이언트가 local/session storage, 알림, widget 등 자기 기기의 데이터 정리를 수행한다. 이 문서 범위는 서버다.

## Storage와 미지원 경로

상위 담당자의 정확 프로젝트 read-only metadata 조회에서는 `storage.buckets` 개수가 **0**이었다. production adapter는 호출 때마다 `listBuckets()`를 다시 읽고 0개일 때만 통과한다. 나중에 하나라도 생기면 소유권을 추정하지 않고 `storage_verification_required`로 **삭제 전 차단**한다. 목록 조회 오류도 실패로 차단한다.

분리 adapter 계약은 `clear | owned_objects | unverified`이며 모의 소유 객체가 있으면 `storage_objects_block_deletion`을 반환하는 흐름을 테스트했다. 현재 production adapter는 소유 객체 개별 판정·삭제를 지원하지 않는다. 버킷이 있으면 모든 사용자에게 보수적으로 차단될 수 있다. storage schema 공개, 새 RPC, prefix 기반 소유권 추측, storage SQL 삭제를 하지 않았다.

Google-only처럼 email/password identity가 없는 사용자의 password 경로는 `password_reauthentication_unsupported`다. 대신 아래 서명 검증된 최근 OAuth 재인증 경로를 준비했다. verified MFA 사용자는 두 경로 모두 현재 Bearer의 aal2와 최근 TOTP 인증 이력이 추가로 필요하다. 모바일 Google UI 비활성화가 기존 Google 계정의 부재를 보장하지 않는다.

브라우저 origin 허용 목록은 `https://oharu.today`, `https://www.oharu.today`, `https://oharu.vercel.app`이다. OPTIONS는 정확한 POST preflight만 처리하며 삭제는 POST만 가능하다. Origin 헤더가 없는 네이티브 요청은 Bearer와 선택한 password/OAuth 재인증 증거로 인증한다. file-backed WebView의 `Origin: null`은 허용하지 않는다. 모바일은 네이티브 bridge/network 경로로 호출해야 하며 이 서버는 wildcard CORS로 우회하지 않는다.

## 실패·재시도·동시성

재인증/Storage 실패는 auth 삭제 전에 발생한다. DB의 FK/cascade 오류는 단일 auth 삭제 트랜잭션 롤백을 기대한다. 그러나 네트워크 응답 유실은 커밋 여부를 알 수 없으므로 auth SDK 오류 시 `{deleted:false, code:"account_deletion_unconfirmed", accountDeleted:"unknown", dataDeletion:"unknown", retryable:true}`를 반환한다. ‘계정이 남아 있다’ 또는 ‘모두 삭제되었다’고 단정하지 않는다.

재시도도 매번 Bearer 검증과 선택된 password/OAuth 재인증 증거 검사를 거친다. 앞선 요청이 실제 완료됐다면 재인증 실패가 날 수 있으므로 이를 자동으로 삭제 성공이라고 변환하지 않는다. 단순 클라이언트 재시도로 성공을 꾸미지 않는다. 동시 요청의 성공/실패와 실제 계정 부재 확인은 후속 통합 검증 대상이다. FK 적용 전에는 과거 JWT의 고아 todo 재삽입이 가능하므로 release gate를 유지한다.

## 검증 결과와 한계

`node --test tests/account-deletion-server.test.cjs`: **18/18 PASS**. 정상 순서/서버 이메일 사용/다른 소유자 보존, body owner injection, method/origin/Bearer/body 크기, CORS, 잘못된 비밀번호/재인증 ID 불일치/Google-only/MFA, Storage 소유·불확실·오류 차단, 기본 gate, cascade 모의 롤백과 재시도, 삭제 후 옛 ID 재삽입 FK 거부 모델, production hard-delete false 인자와 별도 table write 부재를 검사했다.

`node --check` handler 및 adapter PASS. 테스트는 독립 fixture이며 운영 계정·DB·Storage를 변경하지 않는다. FK 모델 테스트가 실제 PostgreSQL 제약조건 테스트를 대신하지 않는다. Deno Edge 배포/원격 typecheck/운영 삭제/SQL 적용/실제 통합 삭제는 미실행이다. 현재 사용자에게 활성 계정삭제 완료라고 안내하면 안 된다.

## 공식 근거

- [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser): 서버 인증 결과로 사용자 ID를 판단한다.
- [Supabase signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword): 현재 비밀번호 재인증 경로.
- [Supabase admin.deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser): 서버 service role 전용 관리 API, `false`로 soft delete를 사용하지 않는다.
- [Supabase managing user data](https://supabase.com/docs/guides/auth/managing-user-data): 사용자 삭제, storage 소유 객체 차단, 이미 발급된 JWT의 만료 전 유효성 및 FK cascade 관련 근거. 조회일 2026-10-01.


## 최근 OAuth / MFA 재인증 확장

아래는 미배포 준비 코드다. 기존 production FK gate=false는 유지했다. 새 Google credentials, OAuth consent, redirect allowlist, persistent 설정을 만들거나 바꾸지 않았다.

OAuth union을 받으면 **동일한 현재 Bearer**를 `getUser(token)`과 `getClaims(token)`에 전달한다. SDK `getClaims`가 비대칭 토큰은 JWKS 서명 검증, 대칭 토큰은 Auth 서버 인증을 수행한 결과만 사용한다. raw JWT decode 결과나 클라이언트 전달 claims/JWK는 받지 않는다.

서버 검증 항목:

- `iss`가 정확한 Oharu Auth issuer, `sub === getUser().id`.
- `aud` authenticated (단일 authenticated 배열도 허용), `role` authenticated, `is_anonymous:false`.
- `exp > 현재시간`, `nbf`가 미래라면 최대 5초 clock skew만 허용, session_id UUID, aal1/aal2.
- `amr`의 `method:'oauth'` timestamp가 **180초 이내**, 미래 최대 **5초**. iat나 last_sign_in_at가 최근이어도 오래된 oauth AMR은 거부한다. token_refresh는 OAuth 증거가 아니다.
- 서버 사용자 객체에 Google identity가 있어야 한다. 다른 OAuth identity가 함께 연결되어 있다는 이유로 같은 사용자 인증을 거부하지 않는다.

**GoTrue의 oauth AMR은 사용자가 최근 OAuth 인증을 거쳤다는 증거이지 Google 비밀번호를 직접 다시 입력했다는 증거가 아니다.** AMR에 provider 이름이 없으므로 UI가 Google을 제공하더라도 서버 판단은 동일 소유자의 검증된 최근 OAuth 인증으로 설명한다. Google ID token 자체(issuer accounts.google.com)를 Oharu access token 대신 보내면 거부한다.

verified MFA factor가 있는 계정은 password/OAuth 모두 서명 검증된 현재 Bearer의 `aal:'aal2'`와 **180초 이내 `totp` 또는 `mfa/totp` AMR**이 필요하다. password 재인증은 별도 client의 임시 AAL1 세션으로 비밀번호만 확인하고 현재 Bearer의 AAL2 증거를 대체하지 않는다. `otp`만으로는 일반 로그인 OTP인지 SMS MFA인지 구분되지 않아 인정하지 않는다. SMS/phone MFA 재인증은 이 v1에서 지원을 주장하지 않는다. 실제 Supabase 프로젝트 발급 AMR 값과 TOTP challengeAndVerify 완료 후 claims를 통합 검증해야 한다.

클라이언트 OAuth 흐름의 필수 책임:

1. 삭제를 시작한 원래 user ID와 단발 pending 상태를 보존한다. `prompt=select_account`로 Google 선택을 요청한다. 이는 provider password 재입력을 강제하거나 보장하지 않는다.
2. Supabase PKCE/state 검증으로 callback을 처리한다. URL이나 임의 nonce만 보고 성공으로 처리하지 않는다.
3. callback의 실제 세션 user ID가 시작한 원래 ID와 다르면 삭제를 요청하지 않는다. 취소/nonce·state 불일치/실패 시 pending을 해제하고 POST를 하지 않는다.
4. MFA가 필요하면 challengeAndVerify 후 새 AAL2 access token을 사용한다. 사용자에게 삭제를 다시 확인받고 exact OAuth body를 POST한다.

이 두 필드 API는 서버 저장 challenge가 없으므로 **삭제 시작 시점의 원래 계정 ID·nonce를 서버가 독립 복원하지 못한다.** 서버는 현재 검증된 토큰 사용자만 지우며, 이전 화면 계정과 callback 계정의 일치는 클라이언트가 별도로 보장해야 한다. 180초 내 이미 존재하는 정상 OAuth 인증은 허용된다. 1회용 deletion challenge가 필요하면 별도 승인·설계가 필요하며 현재 구현이 제공한다고 말하면 안 된다.

추가 fixture는 서명 검증 adapter 실패/미검증 claims, 다른 issuer·sub·aud·session·만료, 직접 Google JWT 경계, refresh recent iat + old oauth AMR, 과거·미래 timestamp, nonce/cancel 추가필드와 취소 후 옛 토큰, linked identity, aal2+TOTP 두 조건 및 password MFA 경로를 검사한다. **서명 위조 테스트는 SDK 실패를 주입하는 adapter 경계 모의 테스트이며 실제 Supabase 서명키·원격 provider 검증 테스트가 아니다.**

공식 근거: [JWT claims와 AMR 값](https://supabase.com/docs/guides/auth/jwt-fields), [서명 검증 getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims), [MFA와 AAL](https://supabase.com/docs/guides/auth/auth-mfa). 조회일 2026-10-01.
