# Windows 완전 종료 후 예약 알림: 비활성 소스 초안

현재 배포 앱에는 연결하지 않았다. `desktop/scheduled-draft/`는 별도 검토용 C# 소스이며 NSIS/Electron 런타임과 설치파일은 변경하지 않았다. 아직 실제 Windows 예약 알림 지원 완료로 표시하면 안 된다.

## 구현과 검증

- `SchedulePlan.cs`: 최대 500개 전체 스냅샷 사전 검증, 명시적 시간대 필수, UTC 정규화, 완료/지난 일정 제외, 태스크별 안정적 16자리 해시 태그. 중복 ID/해시 충돌은 전체 거부한다.
- `WindowsScheduler.cs`: WinRT `ScheduledToastNotification` + `ToastNotifier.AddToSchedule`/`GetScheduledToastNotifications`/`RemoveFromSchedule` 사용. 자기 group만 취소하고 수정 시 교체한다. 같은 일정 재전송은 중복 추가하지 않는다. 알림 권한 거부와 OS 실패는 결과에 포함한다. 취소는 권한 거부 상태에서도 시도한다.
- 본문은 일반 안내만 담아 잠금 화면에 할 일 제목/계정/토큰을 저장하지 않는다. 기기 간 알림 미러링도 끈다. 클릭 인자는 고정 `action=openOharu`이며 아직 활성화 호스트가 없다.
- `config.example.json`은 비활성/빈 식별자, `activation.fragment.xml.template`은 실제 승인된 패키지에 통합하기 전 검토용이다. CLSID/인증서/계정/레지스트리를 생성하거나 등록하지 않는다.
- 실행: 저장소 루트에서 `pwsh -NoProfile -File desktop/scheduled-draft/test.ps1`. 실제 C# 계획·조정 소스를 PowerShell 컴파일러로 컴파일해 WinRT 대역과 실행한다. 초기 등록, 중복, 불완전 오프라인, 입력 오류, 수정, 완료, 로그아웃, 권한 거부, OS 오류/재시도, 다른 group 보존, 지난 일정, 시간대 등을 검증한다. **대역 테스트이며 native SDK 빌드/OS 전달 검증은 아니다.** `Test-Stubs.cs`는 제품 프로젝트에 절대 포함하지 않는다.

## 통합 계약과 남은 작업

1. 실제 설치 identity/AUMID 및 activation host를 확정해야 한다. NSIS의 `com.moodweb.oharu` 문자열을 MSIX 패키지 identity라고 간주하지 않는다. 현 초안은 이미 등록된 `ToastNotifier`를 주입받을 뿐 등록을 수행하지 않는다. Store 경로는 [Store 준비 문서](windows-store.md)를 따른다. NSIS 경로의 정식 unpackaged 등록/수명 관리는 별도 구현·검증 대상이다.
2. Windows SDK/.NET SDK 및 지원 Windows App SDK 버전을 확정한 native host 프로젝트가 필요하다. 현재 `dotnet --list-sdks` 결과는 비어 있다. SDK 설치/다운로드를 하지 않았다. manifest fragment에 실제 host/CLSID를 넣고 AppNotificationManager 등록과 COM 활성화, 실행 중/종료 상태 클릭 처리를 구현해야 한다. 기본 payload는 일반 앱 열기만 허용하고 임의 URL/명령을 실행하면 안 된다. 관리자 실행으로 시험하지 않는다.
3. Electron main의 검증된 IPC만 사용해 host에 전달한다. renderer가 설정/identity/실행파일 경로를 지정해서는 안 된다. 계정별 전체 스냅샷은 로딩 완료 또는 신뢰할 수 있는 로컬 캐시에서만 전달한다. `authoritative=false`는 기존 OS 예약을 보존한다. 로그아웃/계정 변경/사용자 알림 끄기는 명시적 빈 스냅샷을 보내 취소 성공을 확인한다. **취소 실패 시 기존 알림이 남을 수 있으므로 오류를 UI에 표시하고 재시도해야 한다.**
4. 한 native host/한 main 소유자의 직렬 호출과 계정 generation 검사가 필요하다. 클래스 lock은 같은 인스턴스 내 보호일 뿐 프로세스 간 lock이 아니다. 종료/재시작/절전 복귀/시계 및 시간대 변경 때 최신 데이터로 조정한다. 로컬 벽시계 일정이 시간대 변경으로 바뀌면 UTC dueAt을 다시 계산한다. 반복 일정은 앱이 개별 occurrence를 확장해야 하며 초안은 반복 규칙을 해석하지 않는다.
5. OS 수정은 트랜잭션이 아니다. 일부 등록/취소 후 실패할 수 있다. 성공 응답은 예약 등록 성공이고 실제 사용자 전달 증명이 아니다. 오류 시 동일 전체 스냅샷으로 재시도한다. 앱의 기존 타이머 알림과 native 예약을 동시에 켜지 말고 태스크당 단일 전달 소유자로 전환해야 한다. 이미 지난 일정은 재알림 대신 앱 내 미확인/지연 안내에 표시한다.
6. 실제 설치 후 완전 종료/오프라인/절전/재부팅/권한 거부/방해 금지/편집 직전 전달 경쟁/로그아웃/업그레이드/제거/클릭 테스트를 완료해야 한다. 다른 기기에서 수정한 사항은 PC 앱이 실행되어 동기화하기 전에는 로컬 OS 예약에 반영할 수 없다. 완전 종료 중 원격 취소 보장은 없다.

## OS 보장 범위

Windows는 앱이 종료돼도 사전 등록된 예약 알림을 처리한다. 전달 창은 5분이므로 그 이상 PC가 꺼져 있으면 누락될 수 있다. OS 알림 설정과 방해 금지도 영향을 준다. 이 초안은 별도 백그라운드 작업을 등록하지 않으며 전원 꺼짐 중 전달을 보장하지 않는다. [Microsoft 예약 안내](https://learn.microsoft.com/en-us/windows/apps/develop/notifications/app-notifications/app-notifications-scheduled)

공식 API에는 예약 수 한도와 과거 시각 오류가 있다. 초안은 500개로 제한하고 native 추가 직전 시각을 다시 확인한다. [AddToSchedule](https://learn.microsoft.com/en-us/uwp/api/windows.ui.notifications.toastnotifier.addtoschedule), [ScheduledToastNotification](https://learn.microsoft.com/en-us/uwp/api/windows.ui.notifications.scheduledtoastnotification)

COM/manifest 및 등록·클릭 처리는 별도 activation host의 책임이다. [Microsoft 활성화 안내](https://learn.microsoft.com/en-us/windows/apps/develop/notifications/app-notifications/app-notifications-quickstart)

## 실제 PC 설치/작업 표시줄 검증 상태 (2026-09-30)

읽기 전용 Windows 도구로 HKCU/HKLM/WOW6432Node uninstall 등록과 `Get-StartApps`의 정확한 Oharu/오하루 앱 이름을 재확인했다. 둘 다 일치 항목 0건이다. Known Folder StartMenu/CommonStartMenu의 Oharu/오하루 `.lnk`도 0건으로 target/icon 메타데이터를 확인할 설치 바로가기가 없었다. 모든 드라이브의 portable 실행파일 부재를 뜻하지 않는다. 현재 callable tool 목록에는 GUI 제어/node_repl 도구가 없다. 따라서 설치 화면, 작업 표시줄 실제 아이콘, Windows 검색 노출, 클릭 동작은 미검증이다. unsigned 설치파일을 silent 실행하거나 SmartScreen 경고를 승인/우회하지 않았다. 현재 설치파일/아이콘/패키지 메타데이터 검증 결과는 [Windows 출시 문서](windows-release.md)에 분리되어 있다.

이 작업 후 `Get-AuthenticodeSignature`는 `NotSigned`, 크기는 114,693,064바이트, SHA256은 `7C0F98439D73AB2259B42CD0F5973AE52405759A25E15894DA4C32EE7325197F`로 기존 빌드와 동일하다. C# 대역 테스트 15개 및 비활성 설정/XML 파싱은 PASS했다. 설치파일 실행/실제 OS 예약 등록/COM 등록은 하지 않았다.
