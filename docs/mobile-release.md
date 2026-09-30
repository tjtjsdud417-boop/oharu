# 오하루 모바일 출시 검증 · 2026-09-30

## 기준 및 목표

- 최신 로컬 모바일은 Expo SDK 57 / React Native 0.86 + 번들 HTML WebView다. 앱 설정의 식별자는 Android/iOS `com.oharu.today`, EAS 프로젝트는 `9fac0860-511e-45e3-84de-5526d3ed132d`다.
- 기존 `mobile/android`는 `com.moodweb.oharu` 및 debug 서명으로 남아 있는 오래된 생성물이다. 이를 스토어 배포물로 사용하지 않는다. **mobile 폴더에서 곧바로 EAS build를 실행하지 않는다.** `node prepare-release.cjs`로 native 폴더가 없는 allowlist staging을 만들고 그 폴더에서 `EAS_NO_VCS=1`, `EAS_PROJECT_ROOT=<staging 절대경로>`를 지정한다. EAS는 업로드 제외 여부와 별개로 현재 native 폴더의 package/credential을 먼저 해석한다.
- 기존 iOS 1.0.0(6) TestFlight 업로드 기록은 이번 변경의 빌드·심사 성공 증거가 아니다.

## 예약 알림 구현

`expo-notifications`를 통해 앱 종료 후에도 OS가 보관하는 로컬 예약을 등록한다. APNs/FCM 서버 푸시 토큰을 수집하지 않는다. 오프라인에서도 이미 등록된 예약은 OS가 처리하지만, 다른 기기에서 수정한 내용은 이 기기가 동기화될 때 반영된다.

- 브리지: `oharu:reminders:sync`, version 1, requestId, enabled, tasks 전체 snapshot. 각 task는 제한된 id/title, UTC epoch milliseconds dueAt, boolean done만 허용한다. 최대 2,000개 / 메시지 512KB. 부정확한 snapshot은 부분 적용하지 않는다.
- 편집은 기존 예약 취소 후 교체, 완료/삭제/로그아웃/알림 해제는 예약 취소. 완료/삭제한 표시 알림도 정리한다. 빠른 연속 변경은 직렬화한다. 불변 예약은 중복 등록하지 않는다.
- 권한 요청은 사용자 클릭으로 보낸 `oharu:reminders:permission`에서만 한다. 자동 동기화는 권한 거부 시 `denied`를 반환하며 권한창을 반복하지 않는다. iOS provisional/ephemeral 상태를 구분한다.
- 앱 재개/HTML 준비 시 `oharu:reminders:resync` 이벤트로 최신 snapshot을 요청한다. 웹의 기기 현지 날짜/시간을 epoch로 변환하므로 시간대 변경 후 재동기화한다. 앱을 열기 전에는 기존 절대 시각이 유지된다.
- 지난 예약을 한꺼번에 다시 울리지 않는다. iOS 예약 개수 제한을 고려해 가까운 60개만 유지하며 `omitted`로 나머지를 알린다. 앱 재동기화 시 다음 예약을 보충한다.
- Android 12+에서 exact alarm 특수 접근이 없으면 SDK는 `setAndAllowWhileIdle`로 대체한다. 응답 precision은 `system-controlled`다. 절전/제조사 정책에 따라 늦을 수 있으며 정시 보장을 표시하지 않는다. 사용자 설정을 자동으로 변경하거나 특수 권한을 우회하지 않는다.
- 알림 본문에는 할 일 제목이 표시된다. 실제 잠금화면 표시 여부는 사용자의 OS 알림 미리보기 설정을 따른다.

## 플랫폼별 상태

| 대상 | 구현/지원 범위 | 남은 검증/차단 요인 |
|---|---|---|
| iOS 네이티브 알림 | OS 로컬 예약, 권한·취소·동기화 구현 | iPhone 수신/집중 모드/앱 종료/재부팅 실기기 검증, 새 native archive 필요 |
| Android 네이티브 알림 | 로컬 예약, 채널, 거부 처리; exact 특수 접근 없는 기기는 지연 가능 | 연결 기기 없음, Galaxy 절전/재부팅/권한 취소 실기기 검증 필요 |
| iPhone 홈/잠금 위젯 | SDK57 expo-widgets가 WidgetKit family 지원 | 이번 변경에는 위젯 미구현. 새 extension/App Group entitlement·provisioning 및 Mac/EAS 네이티브 빌드/실기기 검증 필요 |
| Galaxy 홈 위젯 | Android AppWidget 네이티브 구현, CNG plugin 등록/리소스/Kotlin 컴파일 성공 | 런처에서 실제 추가/리사이즈/클릭/로그아웃 갱신 실기기 검증 필요 |
| Galaxy 잠금 위젯 | 제조사/OS별 지원이 다름 | 모든 Galaxy 지원을 보장할 수 없음; 홈 위젯/잠금 알림이 대안 |
| 모바일 웹/PWA | 네이티브 로컬 예약 브리지 대상 아님 | 별도 웹 푸시 서버/권한 검증 필요 |

## 재현과 합격 기준

### Android 홈 위젯

`plugins/withOharuWidget.js`가 CNG에서 `com.oharu.today`용 native module, AppWidget receiver, layout/info/string resources를 생성한다. `oharu:widgets:sync`는 알림 권한과 별개로 시간 지정된 할 일 snapshot을 전송한다. 네이티브에서 ID/길이/시각을 다시 검증하고 제어문자/양방향 제어문자를 제거한다. 제목·ID·예정 시각만 앱 전용 SharedPreferences에 최대60개 저장하고, 가까운 미완료 일정3개를 표시한다. 위젯은 읽기 전용이며 누르면 오하루를 연다. 일정 없는 일/완료된 일은 표시하지 않는다. 업데이트는 앱 동기화 직후와 OS가 허용한 주기(최소30분)이며 다른 기기 수정은 앱 동기화 후 반영된다. 로그아웃은 snapshot을 비운다. 홈화면 카테고리만 등록하므로 Galaxy 잠금 위젯 지원을 주장하지 않는다.

격리 CNG 생성물에서 `gradlew :app:compileDebugKotlin :app:processDebugResources` **성공**(137 tasks). 병합 manifest에서 실제 `com.oharu.today`, 위젯 receiver, `POST_NOTIFICATIONS` 확인; `SCHEDULE_EXACT_ALARM` 없음. 이는 APK 설치/런처 동작 검증이 아니다.

### 아카이브와 권한 범위

Windows EAS의 no-VCS 복사는 디렉터리에 끝 slash 없이 ignore를 검사한다. `.easignore`의 directory allowlist를 `!plugins`, `!assets`, `!assets/web`로 수정하고 EAS의 실제 `makeShallowCopyAsync`를 실행해 plugin/Kotlin/XML/HTML/icon/service 파일 포함을 검증했다. `.easignore`만 믿지 않고 staging에 허용된 파일만 복사한다.

첫 native 식별자 오인 빌드 `1d0fe6d5-df93-4f94-a635-e77f8300ecd5`는 취소 완료. 임시 tar는 CLI가 정리해 원본 파일 목록 직접 확인은 불가하다. 동일 필터 재현에서 root `web/.env.local`은 제외됐고, nested gitignore 적용 차이로 표준 Android debug keystore 및 `.claude/settings.json`(플러그인 활성화 설정만)은 포함 가능함을 확인했다. production 서명 키 파일은 해당 파일 목록에서 발견되지 않았다. 업로드 대상은 기존 소유 EAS 오하루 프로젝트이며 새 외부 수신자는 없다. 이후 staging 빌드2건(Android3/iOS7)은 plugin directory 누락으로 config 읽기 단계 실패, 배포/스토어 제출하지 않았다.

로컬 알림만 사용하는 이번 릴리스는 `withLocalNotifications.js`가 공식 Android plugin만 적용하고 같은 plugin 이름을 run-once 등록해 Expo 자동 APNs 기본값 재적용도 차단한다. 최종 `expo config --type introspect`의 iOS entitlements는 `{}`다. 새로운 APNs/App Group capability/credential을 발급하지 않는다.

2026-09-30 네이티브 서비스 통합 후 `expo export --platform all` 성공: Android 659모듈 / iOS 656모듈, 양쪽 Hermes 번들 약 1.6MB. 이는 JS 번들 검사이며 APK/IPA 네이티브 아카이브 및 실제 설치 성공을 뜻하지 않는다. 부모 작업의 최종 HTML 통합 후 재실행해야 한다. `adb devices`는 연결 기기 0개였다. SDK 내장 의존성 맵의 오프라인 검사는 up-to-date이나 온라인 최신 버전 확인은 네트워크 제한으로 미완료다. `npm audit`의 brace-expansion high 1건은 호환 업데이트로 제거했으며 Expo 도구 체인 moderate 10건은 남아 있다. 강제 수정이 제안하는 SDK46 다운그레이드는 적용하지 않았다.

`cd mobile; npm test`로 브리지 잘못된 데이터/중복 ID/편집/삭제/완료/권한 거부/설정 해제/과거 시각/60개 제한/경합/예약 오류 및 위젯 sanitization/로그아웃/CNG/권한범위 15개 테스트를 실행한다. 2026-09-30 실행: **15/15 통과**. 실제 OS 수신 테스트를 대신하지 않는다.

출시 전 각 실제 기기에서: 2분 후 예약 → 홈/잠금/종료 수신; 시각 수정 시 원래 예약 미수신; 삭제/완료 미수신; 오프라인 수신; 거부 후 무반복 프롬프트; 재허용 후 재개 동기화; 시간대 변경; 61개 이상 누락 안내; 로그아웃 후 남은 알림 없음; 새 native release 설치 후 bundled HTML와 bridge 일치 확인. Android 강제 종료/Doze, iOS 집중 모드는 OS 제한을 기록한다.

공식 근거: [Expo SDK57](https://docs.expo.dev/versions/v57.0.0/), [Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [iOS Widgets](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/), [Android alarms](https://developer.android.com/develop/background-work/services/alarms).
