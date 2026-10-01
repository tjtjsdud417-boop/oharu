# iOS 공개 출시 전 소스·운영 점검

2026-10-01 확인. 이 문서는 실제 출시/실기기 인증 검증을 대신하지 않는다.

| 항목 | 확인 증거 | 현재 상태 |
|---|---|---|
| iOS UX 후속 3개 회귀 | HTML C27EBB95EA9E325B53EBF7C4240382C3A209C0097890091DD8D3AA5196415BDA, 영향 테스트14/14, 부모 독립리뷰7/7 | 해결. 계정 삭제 추가 후 영향 범위 재검증 필요 |
| 개인정보 URL | `https://oharu.today/privacy` 및 `/privacy.html` HTTP200, 각각9791bytes. 앱 Settings에 링크 존재 | 접근 가능. 실제 삭제 기능 반영 후 안내 문구 업데이트 필요 |
| 지원 | 앱 Settings의 `mailto:ceo@moodweb.co.kr`, native 외부 링크 처리 존재 | 소스 확인. 메일 전송/응답 테스트 미실행 |
| 가입/로그인 | signUp/signInWithPassword 구현. native Google 버튼 hidden/disabled | 실제 계정 인증·클라우드 복원·심사용 접근은 미검증 |
| 계정 삭제 | iOS11/기존 운영본에는 로그아웃만 있고 삭제 UI/API 없음. 후속 소스에는 이메일/Google/TOTP 삭제 준비본과 native cleanup 추가. 배포 Edge는 아직 daily-report/mcp뿐 | 신규 코드·fixture 통과, 운영 미활성. 독립 보안 리뷰 대기 |
| 삭제 무결성 | 운영 catalog의 todos.user_id에는 FK 없음. 기존 RLS는 auth.uid()=user_id. mcp_tokens/admins는 Auth cascade 존재. Storage bucket count=0. todos/auth.users 사용자 정의 trigger 없음 | FK 제약1개 준비. 적용 자체는 데이터 삭제가 없고 NOT VALID의 기존 행 검증 제한 유지 |
| 리뷰어 접근/영상 | ASC demo 계정명 미설정. 실제 iPhone 영상 없음 | 소유자 테스트 접근과 촬영 필요 |
| Apple 법적 상태 | iOS11 VALID / MISSING_EXPORT_COMPLIANCE | 기술 감사 완료, 소유자 규정 답변 대기 |

## 최소 삭제 무결성 변경안

[검토용 SQL](sql/account-deletion-hardening.review.sql)은 `todos.user_id`에 Auth 계정 FK와 ON DELETE CASCADE를 추가하는 제약 **한 개**다. 기존 데이터 삭제·기존 orphan 정리·RLS 변경·새 토큰·새 권한은 포함하지 않는다. `NOT VALID`은 기존 행 전체 검사를 생략하고 이후 쓰기에는 제약을 적용한다.

이 제약이 확인된 상태에서 본인 Bearer 검증 → 비밀번호 재인증 → 동일 사용자 ID 확인 → 명시적 DELETE 확인 → Auth hard delete를 수행하면 일정과 기존 MCP token/session이 함께 제거된다. 여전히 유효한 과거 JWT가 삭제된 ID로 일정을 쓰려고 해도 FK가 거부한다. 제약 적용 자체는 행 삭제를 실행하지 않지만 **앞으로 사용자가 자신의 계정을 삭제할 때** 해당 계정 일정도 삭제된다. 데이터 모델에 추가되는 변경이므로 검토용 파일만 준비했고 운영에는 적용하지 않았다.

부모는 이 데이터 삭제 없는 무결성 제약을 사용자의 출시 완료 요청 범위로 확인했다. 독립 보안 리뷰 PASS 전에는 적용하지 않으며, backend도 안전 조건 확인 전 삭제를 차단한다. 실제 적용용 파일은 `admin/supabase/migrations/20261001000000_account_deletion_todos_fk.sql`이다. 운영 계정 삭제 테스트는 별도 승인 없이 하지 않는다. 기존 API 두 번으로 일정과 계정을 따로 지우는 경로는 부분 실패·경합 위험 때문에 사용하지 않는다.

## 정책 근거

- [Apple 계정 삭제](https://developer.apple.com/support/offering-account-deletion-in-your-app/): 계정 생성 앱에는 앱 안에서 전체 계정 삭제를 시작하는 경로가 필요하고, 일반 앱의 이메일 지원 요청만으로 대체하지 않는다. 재인증과 명시 확인은 가능하다.
- [Supabase 사용자 관리](https://supabase.com/docs/guides/auth/managing-user-data): Auth 삭제는 기존 access JWT를 즉시 무효화하지 않으며, 사용자 데이터는 FK cascade 등으로 함께 관리해야 한다.
- [PostgreSQL FK](https://www.postgresql.org/docs/current/ddl-constraints.html): 존재하는 부모 행만 참조하게 하고 CASCADE로 부모 삭제에 연결된 행을 삭제한다.

최종 빌드는 계정 삭제 준비와 해당 변경의 검토 결과를 묶어 진행한다. 현재 iOS11은 후속 UX 수정도 미포함이며 최종 출시 후보가 아니다.
