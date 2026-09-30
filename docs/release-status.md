# 출시 상태와 남은 인수 항목

2026-09-30 작업 기록. 코드 구현, 로컬/에뮬레이터 검증, 실제 공개 상태는 별개다. 기존 데이터 정리·삭제, 새 계정·키·권한 발급, 서명 인증서 구매, 유료 광고, 보안 경고 우회는 하지 않았다.

| 대상 | 확인한 상태 | 남은 단계 |
|---|---|---|
| PC/모바일 웹 | 10개 테마, 안전한 테마 JSON, 실행 중 알림을 `oharu.today`에 배포. `d8b2888`의 알림 경합 수정까지 운영 바이트 확인 | 후속 게스트 저장 수정은 Vercel `Not authorized`로 배포 실패. 기존 계정·정확한 프로젝트 읽기는 정상. 다른 계정/token으로 우회하지 않음 |
| Windows | Electron44.5.1, IPC/링크/알림 상태·아이콘 메타데이터 보강. 최신 NSIS를 GitHub **초안**에 업로드하고 해시 확인 | 미서명. 실제 설치·작업표시줄/검색·OS 알림은 GUI 환경에서 미검증. 초안 설명/대상 갱신 요청은404 실패; 최신 소스는 문서/검증JSON에 기록 |
| Android | 네이티브 로컬 알림·홈 위젯 구현. 실제 Android14/WebView113에서 오프라인 화면, 권한 거부/재시도, OS 예약/삭제, 위젯 데이터 및 iframe 위조 차단 확인 | 최종 정식 EAS 산출물/실기기·스토어 검증 필요. Play 제출 자격/기존 앱 계정 접근 미확인. 앱 ID 변경 안 함 |
| iOS | 기존 자격으로 빌드·이전 TestFlight 업로드 확인. 웹 번들 오프라인/저장 회귀 검사 | 실제 iPhone 미검증. 이전 업로드는 수출 규정 응답 대기. 최신 수정본 제출·공개 심사와 별개 |
| iOS 홈/잠금 위젯 | WidgetKit 소스 초안 및 데이터 제한 계약 준비 | extension/App Group/서명 자격 승인·활성화, Swift 빌드 및 실제 표시 검증 필요 |
| Apps in Toss | SDK3.6.0 독립 local-first adapter, 잠금 의존성·테스트·로컬 .ait·로고/검토 화면 준비 | 콘솔/appName/사업자·약관/QR 검증 미완료. 제출·심사·출시 안 함. 동기화·알림·결제·테마 기능 미제공 |
| Microsoft Store | 실제 Identity 없으면 중단하는 manifest 준비,44/50/150px 아이콘·출처 해시·검증 스크립트 | Partner Center 실제 식별자/Publisher, MakeAppx, MSIX 설치·업데이트·AUMID 검증 필요. 가짜 서명/식별자 사용 안 함 |
| AI 디렉토리 | 외부 AI 테마 프롬프트/JSON 가져오기 사용 가능. 공식 Supabase OAuth2.1 기반 계약 문서 준비 | OAuth 활성화·클라이언트/동의·최소 권한/RLS 구현검증과 디렉토리 제출 미완료. 기존 토큰 URL을 직접 ChatGPT 연결 완료로 표시하지 않음 |

Android 잠금 위젯은 모든 Galaxy에서 지원한다고 보장하지 않는다. 브라우저 종료 후 Web Push 서버, 완전히 종료된 Windows 앱의 예약 토스트는 아직 제공하지 않는다. 원격 FCM/APNs와 구현된 로컬 알림을 혼동하지 않는다. Galaxy/Huawei/Fire 추가 경계는 [별도 문서](additional-android-stores.md)를 따른다.

Windows 최신 검증용 파일: `desktop/dist/Oharu-Setup.exe`, 114,693,064 bytes, SHA256 `7C0F98439D73AB2259B42CD0F5973AE52405759A25E15894DA4C32EE7325197F`. GitHub 초안 업로드 digest와 일치. 서명은 `NotSigned`다. 기존 공개 설치 파일은 바꾸지 않았다.

실제 계정 로그인·클라우드 DB CRUD·기기간 테마 metadata 왕복·RLS는 미검증이다. Supabase 기존 프로젝트 복구와 REST/keepalive 성공은 이 사용자 흐름의 검증을 대신하지 않는다. 에뮬레이터 화면에서 기존 영문 긴 제목과 로그인 버튼이 겹치는 반응형 제한을 관찰했으며, 기본 레이아웃을 재설계하지 않았다.

세부 증거: [QA 수정](qa-corrections.md), [모바일](mobile-release.md), [Windows](windows-release.md), [Store](windows-store.md), [Toss 인수](../apps-in-toss/INTEGRATION-REVIEW.md), [MCP 준비](mcp-directory-readiness.md). 과거 빌드/테스트 수치는 각 문서의 이력이며 최종 산출물과 혼동하지 않는다.
