# AI 디렉토리 연결 준비

2026-09-30 현재: 테마 프롬프트 복사 → 외부 ChatGPT/Claude → 검증된 JSON 가져오기는 사용 가능하다. 공개 OAuth MCP 연결과 디렉토리 등록은 **미완료**다. 구독 요금을 API 크레딧으로 취급하지 않는다. 테마 프롬프트에는 할 일·계정·키를 포함하지 않는다.

기존 MCP 서버의 사용자 로컬 수정은 보존했다. 기존 토큰을 폐기하거나 새 토큰·클라이언트·권한을 발급하지 않았다. 웹 온보딩에서 토큰 포함 URL과 미검증 ChatGPT 연결 안내는 제거했지만, 기존 서버의 호환 토큰 인증 경로는 바꾸지 않았다. URL 토큰을 로그/스크린샷/디렉토리 제출에 포함하지 않는다.

## 승인 후 구현할 연결

자체 인증 서버 대신 [Supabase 공식 OAuth 2.1 MCP 지원](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)을 사용한다. 정확한 기존 프로젝트에서 OAuth 서버 활성화, 클라이언트 등록 및 선택적인 DCR은 별도 승인 사항이다. 아직 실행하지 않았다.

보호 리소스 메타데이터/401 challenge, PKCE, 정확한 redirect allowlist, 사용자별 동의·거부·철회 흐름을 함께 구현한다. 토큰 검증은 issuer/audience/expiry와 서명을 확인하고 사용자 범위 Supabase 클라이언트를 사용한다. 서비스 역할 키로 사용자 접근을 대체하지 않는다.

[공식 Token Security/RLS 지침](https://supabase.com/docs/guides/auth/oauth-server/token-security)에 따라 OIDC scope만으로 DB 권한을 제한했다고 판단하지 않는다. 사용자와 client_id에 결합된 서버 grant 및 RLS를 별도 검증한다. 기본 권한은 거부이며 테마 전용 grant로 할 일 API를 호출할 수 없어야 한다.

## 도구 계약과 검증 기준

- 초기 테마 도구는 draft 생성/검증만 허용한다. 앱의 공통 theme validator를 사용하고, 저장·적용은 앱 미리보기의 사용자 확인을 거친다. 원격 CSS/JS/URL은 금지한다.
- 기존 add_todo는 쓰기 도구로 정확한 MCP annotation을 제공해야 한다. 명시적인 IANA 시간대 또는 offset을 검증하며, 국제 연결에서 한국 시간을 묵시적 기본값으로 쓰지 않는다.
- owner는 검증된 인증 주체에서 결정한다. 입력 owner/client_id를 신뢰하지 않는다. 계정 A/B 격리, 다른 client grant, 만료·철회·위조 토큰, redirect 공격, 중복 요청, 요청 크기 제한을 검증한다.
- 디렉토리 제출 전에 실제 공급자 계정으로 연결/거부/철회/재연결과 도구 오류를 검증하고 지원 URL·개인정보 안내·심사용 계정 범위를 확정한다. 그 전에는 연결 완료나 공식 등록 완료로 표시하지 않는다.

이 문서는 구현·승인 준비물이며 실행 중인 OAuth 서버, 배포된 테마 REST/MCP API 또는 디렉토리 등록의 증거가 아니다.
