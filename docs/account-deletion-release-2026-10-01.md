# 계정 삭제 운영 배포 및 iOS 12 후보

## 확인된 결과

- 확정 모바일 소스: `bcf5c590e141f121d0e1ab44cf5e72ff5fa2c775`. 전체 로컬 테스트 169/169 및 해당 GitHub 출시 CI 성공. 최종 독립 검토는 10그룹 PASS, 제품 FAIL 0이다.
- 웹: https://oharu.today/?account=delete . 로그인 전에는 로그인 필요 안내만 표시한다. 화면 검수 중 실제 사용자의 최종 삭제 버튼은 누르지 않는다.
- 정확한 frontend: Vercel `moodweb/oharu`, `prj_LfIMV5Vk0OpSAaz1hjH71J2pbCc0`, 배포 `dpl_CXi9m8BbK3ZvXTg7PeZQD23BWV8N` READY. 관리자 사이트 배포와 별개다.
- 공개 자산 7개 HTTP 200 및 소스 바이트 일치. 웹 HTML SHA256 `B5AE4948AAD35125AA9FFB1A878275B129049B5A55C117B041FDF43589C14ACC`.
- 운영 PC/모바일 게스트·설정·삭제 진입 읽기 검사 10개 PASS, JavaScript 오류 0, 실제 인증·삭제·쓰기 요청 0. 기존 모바일 큰 제목과 로그인 버튼이 일부 겹쳐 보이는 관찰사항은 별도 남아 있다.
- Supabase 정확한 프로젝트 `tcaghsjndfaxlsgaqrdi`: 검토된 `todos_user_id_account_fkey`의 `ON DELETE CASCADE NOT VALID` 1회 적용 및 정의 재조회. 적용 자체로 기존 행을 삭제하지 않았고 고아 데이터 정리·RLS·grant·키 변경도 하지 않았다.
- `delete-account` v2 ACTIVE, gateway JWT 검증 유지. 원격 3파일과 활성화 커밋 `ecd7f59770235134cf27b6f8bfe195a627653bf5` 일치. 무인증/위조 JWT/anon/입력주입/허용하지 않은 Origin 거부 및 정상 preflight 확인.

## 최종 iOS 후보

- EAS: https://expo.dev/accounts/saiapp/projects/oharu/builds/8e09f3bf-f066-4e54-9c54-89d94da66316 — FINISHED, iOS 1.0.0(12), `com.oharu.today`, 최소 iOS 16.4.
- IPA: `mobile/.expo/artifacts/oharu-ios-1.0.0-12.ipa`, 9,597,959 bytes.
- IPA SHA256: `10D23FA38CC58B0A9E7F41980F27A9DF76C987B7BA299ABE3F0D8A39DC043ECD`.
- 포함 HTML: 384,718 bytes, SHA256 `7E93CC2CF1FCADB0DD33FB0528A3B72D5E68DB52B5C09BA6BF4BD2C1E6176263`, 확정 모바일 원본과 정확히 일치. 신규 계정 삭제 IPC도 바이너리에 포함된다.
- Hermes bundle SHA256: `C3604E2ACCD827E895C56D1E7E947B0CB79E833DBC50B9FAEA794F385E164161`. bytecode v98의 SHA-1 footer 검사 성공.
- 기존 credentials 고정 및 capability sync 비활성. 새 인증서/App Group/APNs 자격을 만들지 않았다. 포함 빌드 크레딧은 1700→1900/4500, 추가 요금 0.
- 정확한 IPA 암호 구성 감사는 [별도 문서](ios-encryption-audit-build12.md). 제출된 네 가지 보기 중 4번을 기술적으로 권고하지만 법적 답변은 제출하지 않았다.
- TestFlight 업로드는 기존 키로 한 번 예약했다: https://expo.dev/accounts/saiapp/projects/oharu/submissions/46d2c9f9-6187-4672-8092-e948bbea1fb3 . 업로드 FINISHED/error=null, Apple processingState=VALID, 내부·외부 beta 모두 MISSING_EXPORT_COMPLIANCE를 기존 승인 접근으로 직접 확인했다. Apple 업로드 시각은 2026-10-01T09:33:18Z이다. 규정 답변은 제출하지 않았으며 업로드 완료는 심사·공개 출시가 아니다.

## 미검증 및 보류

| 대상 | 확인 범위 | 남은 조건 |
|---|---|---|
| 웹 계정 삭제 | 배포·게스트 진입·PKCE/소유자/실패 모의 회귀·인증 거부 | 실제 Google/password/MFA E2E 및 실제 cascade 실행은 하지 않음 |
| iOS 12 | 빌드·IPA/HTML·암호 구성 | Apple VALID이나 수출 규정 대기, 승인된 리뷰어 접근, 실제 iPhone 검증·촬영·심사 |
| Android | 이전 Android 6 AAB와 emulator 검증 증거 보존 | 최신 계정 삭제 추가분은 Android 6에 포함되지 않음. 올바른 Play 소유자 접근과 후속 바이너리 필요 |
| iPhone 위젯 | 비활성 WidgetKit 초안·검증 | App Group/확장 ID 승인, native 통합·provisioning·iPhone 검증 |
| 브라우저 종료 후 Push | 비활성 프로토콜/설정 초안 | VAPID·구독 DB/RLS·scheduler 승인 및 실제 통합 |
| 완전 종료 Windows 알림 | 예약 toast 준비 코드 | identity/SDK/native 통합·실제 설치 및 OS 전달 검증 |
| Store/Toss/AI 디렉토리 | 제출 준비·문서·격리 adapter | 소유자 로그인/identity/약관·실기기 심사. 공개 MCP OAuth 발급은 미승인 |

운영 사용자 계정 삭제, 새 테스트 계정 생성, 새 OAuth/App Group/VAPID 자격 발급, 수출 규정 답변 또는 공개 심사 제출은 실행하지 않았다. 실물 촬영·Review Notes는 [심사 준비 문서](apple-review-pack-2026-10-01.md)를 따른다.
