# 웹 계정 삭제와 Google 재확인

구현 위치는 `web/index.html`의 `ACCOUNT_DELETION_BEGIN`–`ACCOUNT_DELETION_END` 블록입니다. 모바일의 기존 삭제 설명·대화상자·계정별 정리 흐름을 웹에 맞게 부분 이식했습니다. 네이티브 삭제 브리지나 iOS 분기는 웹에 넣지 않았습니다.

## 사용 흐름

- 로그인한 사용자는 설정 > 계정 삭제에서 삭제할 이메일과 영향 범위를 확인합니다. 직접 진입 주소는 `https://oharu.today/?account=delete`입니다.
- 이메일 로그인 계정은 현재 비밀번호와 정확한 `DELETE`를 입력하고 최종 삭제를 누릅니다.
- Google 로그인 계정은 **Google로 다시 확인**을 누르고 삭제할 원래 계정과 같은 계정을 선택합니다. 귀환 후에도 자동 삭제하지 않습니다. 사용자가 `DELETE`를 새로 입력하고 최종 삭제 버튼을 직접 눌러야 합니다. 새 비밀번호를 만들도록 요구하지 않습니다.
- Windows 내장 브라우저에서는 Google 인증을 시도하지 않고 **웹에서 계정 삭제 열기** 링크를 제공합니다. 모바일에서도 같은 직접 진입 주소를 사용할 수 있습니다.
- 비로그인 직접 진입은 로그인 필요 안내를 표시합니다. 먼저 로그인한 다음 설정 > 계정 삭제에서 진행합니다. 아직 계정이 확인되지 않은 최초 로그인에는 삭제 재확인 증명을 발급하지 않습니다.
- 기존에 검증된 TOTP 인증 앱이 등록되어 있으면 6자리 코드를 입력합니다. 새 MFA를 등록하거나 해제하지 않습니다. TOTP 외의 검증 수단은 현재 지원하지 않으며 실패 상태로 중단합니다.

한국어·영어·일본어·중국어·스페인어 문구를 제공하고 320px 화면에서 대화상자가 가로로 넘치지 않는지 검사합니다.

## 인증 경계

기존 Supabase PKCE 클라이언트의 `signInWithOAuth`를 사용합니다. provider는 `google`, `queryParams.prompt`는 `select_account`, redirect는 `location.origin + location.pathname`으로 기존 루트 경로를 재사용합니다. 새로운 Google 자격 증명·리다이렉트 허용 목록·권한을 만들지 않습니다. 계정 선택 화면은 Google 비밀번호 재입력을 보장하지 않습니다.

재확인 전 `sessionStorage['oharu.account-deletion.intent.v1']`에는 `ownerID`, `nonce`, `startedAt` 세 필드만 저장합니다. nonce는 `crypto.randomUUID()`로 생성합니다. 비밀번호·OTP·토큰은 이 intent에 저장하지 않습니다. OAuth state/PKCE 교환 검증은 기존 Supabase SDK가 수행하며 이 nonce를 SDK state 대용으로 쓰지 않습니다.

삭제 intent가 있는 귀환에서만 `detectSessionInUrl: false`를 설정하고, `verifyDeletionOAuthReturn()`이 `exchangeCodeForSession(code)`를 명시적으로 한 번 실행합니다. 같은 Promise를 재사용하므로 SDK 자동 교환이나 중복 호출과 경쟁하지 않습니다. 이 처리는 테마 연결·일반 인증 콜백 등록·앱 시작 전에 끝납니다. 삭제 intent가 없는 정상 로그인은 기존 자동 URL 교환을 유지하며 이 수동 교환 경로에 들어가지 않습니다.

URL에 code가 있거나 기존 세션이 남아 있다는 사실만으로는 UI 증명을 만들지 않습니다. 해당 교환이 성공하여 반환한 사용자와 세션을 intent.ownerID에 연결하고, 그 access token을 SDK `getClaims(token)`으로 검증합니다. 검증된 claim에서 같은 프로젝트 issuer, owner subject, authenticated audience/role, 유효한 session_id와 만료, 180초 이내의 `amr.oauth`를 검사합니다. OAuth 시각은 intent 시작보다 앞설 수 없으며 시계 오차는 5초만 허용합니다. 검증 완료 시점에 현재 세션의 사용자와 토큰도 교환 결과와 같아야 합니다. 최종 제출 전 새 Bearer의 claim 및 같은 session_id를 다시 확인하므로 TOTP 승격은 허용하되 다른 세션으로의 교체는 거부합니다.

오류·취소·다른 계정·만료·잘못된 intent·조작 code·PKCE 교환 실패·서명 검증 실패면 intent와 UI 증명을 제거하고 삭제 POST나 자동 로그아웃을 하지 않습니다. 해당 귀환에서는 별도 게스트 데이터를 계정에 자동 이전하지 않습니다. 정상 일반 로그인에 적용되던 기존 게스트 이전 구현과 `oneul.v3` 키는 유지합니다. 성공한 intent도 즉시 저장소에서 제거하고 메모리의 짧은 수명 증명으로만 최종 화면을 엽니다. SDK PKCE 교환 실패 시 자체 세션 삭제를 호출하는 별도 코드를 추가하지 않았습니다.

프런트엔드의 서명·claim 검증도 삭제 권한의 최종 판단은 아닙니다. JWT를 임의 decode하거나 `iat`, `last_sign_in_at`을 최근 재인증 증거로 사용하지 않습니다. 서버는 독립적으로 서명 검증된 claim에서 Google OAuth AMR 최근성, issuer/audience/subject/session, 필요한 AAL2/TOTP 최근성을 검증해야 합니다. 서버의 기존 180초 계약은 변경하지 않았습니다. 이 서버 검증이 없는 배포에서는 기능을 활성화하면 안 됩니다.

## 서버 계약

삭제 요청은 `POST <SUPABASE_URL>/functions/v1/delete-account`이며 Authorization에는 현재 세션 Bearer만 사용합니다. body는 다음 두 형태 중 정확히 하나입니다.

```json
{"password":"사용자가 입력한 현재 비밀번호","confirmation":"DELETE"}
```

```json
{"reauthentication":"oauth","confirmation":"DELETE"}
```

OTP는 삭제 body에 넣지 않습니다. `auth.mfa.listFactors()`에서 기존 verified TOTP를 확인하고 `auth.mfa.challengeAndVerify({factorId, code})` 성공 후 새 세션 Bearer로 요청합니다. 실패하면 삭제 요청을 보내지 않습니다.

`recent_oauth_required`, `reauthentication_proof_invalid`, `google_reauthentication_required`는 다시 Google 확인이 필요함을 표시합니다. `recent_mfa_required`는 인증 앱 확인 실패를 표시합니다. 비밀번호 실패, 429, 비활성 기능, Storage 검증 차단, 삭제 결과 미확인과 네트워크 실패도 분리합니다. 서버가 명시적으로 `{deleted:true}`를 반환하기 전에는 로컬 데이터 삭제나 로그아웃을 하지 않습니다.

성공 후에도 현재 사용자 ID를 재확인하고 해당 사용자 테마 캐시만 제거합니다. `OharuReminders.clear()`를 재사용하며 로컬 범위 로그아웃을 수행합니다. `localStorage.clear()`는 사용하지 않고 `oneul.v3` 및 다른 계정 캐시를 보존합니다. 서버 성공 후 기기 정리가 실패하면 기기 정리 재시도를 제공하고 삭제 API를 반복 호출하지 않습니다. 요청 중 계정이 바뀌면 새 계정의 캐시 삭제나 로그아웃을 하지 않습니다. 이미 전송된 서버 요청 자체는 취소할 수 없습니다.

## 검증과 남은 단계

`node --test tests/account-deletion-web.test.cjs`는 격리된 Chromium에서 모든 네트워크를 fixture로 대체합니다. 비밀번호/Google/기존 TOTP 흐름, 다른 계정·취소·만료·오류, 최종 확인 필수, 계정 변경 경합, 데이터 보존, 5언어 및 좁은 화면을 검사합니다. `cd web; node extract-diag.mjs; node --check _diag.mjs` 구문 게이트도 실행합니다.

실제 계정 삭제, 실제 Google OAuth 재확인, 운영 MFA 변경, 새 계정 생성, 배포는 이 작업에서 수행하지 않았습니다. 서버의 enable/FK/Storage 검증 및 실제 서비스 연결 성공은 별도 운영 검증이 필요합니다. 테스트 성공을 운영 삭제 기능 활성화로 해석하지 않습니다.

공식 SDK 근거: [Google OAuth 메서드](https://supabase.com/docs/reference/javascript/auth-signinwithoauth), [PKCE code 교환](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession), [서명 검증 getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims), [MFA 목록](https://supabase.com/docs/reference/javascript/auth-mfa-listfactors), [MFA challengeAndVerify](https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify).
