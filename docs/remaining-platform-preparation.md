# 남은 플랫폼 기능: 코드와 승인 경계

기존 출시 snapshot `fd451860fe7fd19cd8e33e1dd7ec0bc27b035ec4`의 93개 테스트, Android6/iOS10 및 Windows 산출물은 그대로 보존한다. 후속 작업은 비활성 준비 소스와 문서이며, 추가 EAS 빌드·시장 제출·키 생성·과금·권한 변경은 없다.

| 항목 | 현재 코드 | 아직 구현/검증할 부분 | 승인·환경 경계 |
|---|---|---|---|
| iPhone 홈/잠금 위젯 | Swift WidgetKit/공유 snapshot 초안, 안전한 데이터 계약, 비활성 통합 설정 생성 및 테스트 | Expo native module 등록·확장 target/embed 연결, 실제 Swift 컴파일, App Group 파일 공유·iPhone 검증 | 실제 기존 App Group/확장 ID/provisioning 확인. 신규 entitlement/서명 자격 생성은 승인 필요. Mac/Xcode 또는 승인된 빌드 환경 필요 |
| 페이지 종료 후 Web Push | owner/revision/TTL·구독 검증·취소 재확인·중복 방지 인터페이스, 비활성 config·테스트 | DB 원자적 outbox/lease/RLS·인증 API·구독 UI·SW/IndexedDB·실제 provider 송신/수신 | 장기 VAPID 키/서버 접근·스케줄러·DB 변경 승인, 실제 권한 동의, Vercel 쓰기 권한 |
| Windows 앱 완전 종료 후 알림 | 별도 native scheduled-toast 초안, 비활성 설정/activation template·대역 테스트 | Windows SDK build·identity/activation host·Electron 연결·설치/실제 종료 후 OS 전달 | 실제 identity/등록·서명/Store 경로 검토. 보안 경고 우회 불가. 현재 GUI 상호작용 도구 미노출 |

이 항목들은 계정 승인만 받으면 자동으로 완성되는 기능이 아니다. 연결 코드와 플랫폼 실제 검증이 남은 부분을 위 표에 별도로 표시했다. iPhone 위젯을 현재 TestFlight 앱에 포함했다고 표시하거나, 현재 서비스워커를 서버 Push로 표시하지 않는다.

현재 iOS10은 Apple `VALID`, 내부·외부 `MISSING_EXPORT_COMPLIANCE`다. 사용자 또는 책임자가 실제 암호화 사용 정보를 확인하여 수출 규정 답변을 해야 한다. 정확한 Vercel frontend 권한 인수는 [별도 문서](vercel-access-handoff.md)를 따른다.

상세: [iPhone](ios-widget.md), [Web Push](web-push-preparation.md), [Windows 예약 알림](windows-scheduled.md).
