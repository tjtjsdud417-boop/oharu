# iPhone 홈·잠금 화면 위젯 — 비활성 Swift 구현 초안

2026-09-30 기준 `mobile/ios-widget-draft/`에 구현 소스를 준비했다. **앱에 등록되지 않았고 iOS 빌드·배포·실기기 검증을 완료하지 않았다.** 기존 `mobile/App.js`, 앱 설정, 빌드 설정, 기존 플러그인을 수정하지 않았다. App Group 생성, entitlement 활성화, 서명 프로파일 발급도 하지 않았다.

## 지원 설계와 현재 상태

| 대상 | 구현 소스 | 상태 |
|---|---|---|
| 홈 화면 작은 크기 | WidgetKit `systemSmall` | 초안, iOS 빌드 미검증 |
| 홈 화면 중간 크기 | WidgetKit `systemMedium` | 초안, iOS 빌드 미검증 |
| 잠금 화면 원형 | `accessoryCircular` | 초안, 개수만 표시 |
| 잠금 화면 사각형 | `accessoryRectangular` | 초안, 개수만 표시 |
| 잠금 화면 인라인 | `accessoryInline` | 초안, 개수만 표시 |
| PWA 홈 화면 아이콘 | WidgetKit과 별도 기능 | 이 소스로 웹 위젯이 생기지 않음 |

현재 프로젝트는 Expo SDK 57 / React Native 0.86이다. [정확한 SDK 57 공식 문서](https://docs.expo.dev/versions/v57.0.0/)에 따라 iOS 최소 16.4, Xcode 최소 26.4를 통합 기준으로 삼는다. OS 자체 위젯 기능의 최초 지원 버전과 이 앱의 최소 지원 버전은 다르다.

**새로운 공식 대안도 확인했다.** SDK 57의 [expo-widgets](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/)는 홈 화면 및 위의 잠금 화면 3종을 모두 지원하는 설정을 제공한다. Expo Go에서는 사용할 수 없고 별도 네이티브 빌드가 필요하다. 따라서 “Expo라 iPhone 위젯이 불가능하다”는 설명은 부정확하다. 이 초안은 Swift/App Group 동작을 검토하기 위해 작성했으며, 제품 통합 시 공식 expo-widgets 경로와 비교해서 하나만 선택한다. 이중 확장을 동시에 등록하지 않는다.

## 준비된 파일

- `swift/OharuUpcomingWidget.swift`: 다섯 위젯 family, WidgetKit timeline, `oharu://widget` 열기 링크.
- `swift/OharuWidgetSnapshot.swift`: 앱/확장이 공유하는 제한된 Codable 모델, 원자적 파일 저장, 파일 보호, 6시간 유효기간.
- `swift/OharuWidgetModule.swift`: Expo Modules API 호스트 브리지. 직렬 큐에서 파일 쓰기/삭제 후 WidgetKit 새로고침 요청.
- `snapshot.cjs`: JS 입력 검증·민감필드 제거·호출 순서 보장. 아직 프로덕션 앱에서 import하지 않음.
- `expo-module.config.json`, `OharuIOSWidget.podspec`: 향후 로컬 모듈 등록용 초안. 현재 `modules/`나 package dependencies에 등록되어 있지 않음.
- `extension/Info.plist`, `extension/OharuWidget.entitlements.template`: 확장 템플릿. App Group은 `__APP_GROUP_ID__` 자리표시자로 남김.
- `integration.json`: 비활성 상태, 두 target의 파일 소유권, 지원 family, 통합 전제조건. 실행 가능한 config plugin이 아니며 Xcode target을 자동 생성하지 않음.

## 데이터 계약과 개인정보

```js
const bridge = createIOSWidgetBridge(requireNativeModule('OharuIOSWidget'));
await bridge.update({
  schemaVersion: 1,
  enabled: true,                       // 사용자가 위젯 공유에 동의한 경우만
  showTitlesOnHome: false,             // 기본값: 제목을 아예 공유 파일에 저장하지 않음
  tasks: [{id: 'todo-uuid', title: '할 일', dueAt: 1800000060000}]
});
await bridge.update({schemaVersion: 1, enabled: false}); // 동의 해제·로그아웃·계정 전환
```

시간은 UTC epoch **밀리초**다. 최대 60개, 앞으로 7일 이내 미완료 항목만 담는다. ID는 제한된 문자 128자, 제목은 제어/방향 전환 문자 제거 후 최대 140자, 직렬화한 payload는 32KB 이하로 제한한다. API 키, 이메일, 로그인 토큰, 전체 DB 행, 외부 URL은 모델에 없다. JS가 정제한 후에도 Swift가 재검증한다. 작성시각은 JS를 신뢰하지 않고 네이티브에서 생성한다. Widget 확장은 네트워크를 사용하지 않는다.

홈 화면 제목 공유는 별도 명시적 동의가 필요하다. 기본값은 제목 없는 개수 표시이며, **잠금 화면 3종에는 동의 여부와 관계없이 제목을 렌더링하지 않는다.** 홈 제목 영역에는 `privacySensitive()`도 적용한다. 공유 파일은 완전 파일 보호와 백업 제외를 사용한다. 기기가 잠겨 읽을 수 없으면 새 데이터 대신 갱신 안내를 표시한다.

다만 파일 보호는 **이미 WidgetKit이 렌더링해 보관한 화면을 지우는 기능이 아니다.** 제목 공유 동의 해제나 로그아웃 후 reload 요청을 해도 기존 홈 위젯 이미지가 OS 갱신 전까지 남을 수 있다. StandBy·잠금 상태의 홈 위젯·스크린샷·화면 공유도 별도 확인해야 한다. `privacySensitive()`가 모든 상황에서 제목을 가려 준다고 보장하지 않는다. 특히 민감한 내용을 다루는 사용자는 제목 공유를 켜지 않는 기본값을 유지한다. [Apple privacySensitive API](https://developer.apple.com/documentation/swiftui/view/privacysensitive(_:)) 참고.

## 갱신·삭제·오프라인

스냅샷은 전체 교체 방식이다. 수정/삭제/완료 후 최신 전체 목록을 보낸다. 로그아웃과 계정 전환에서는 이전 계정의 공유 파일을 먼저 지우고 완료를 기다린 뒤 새 계정 스냅샷을 보낸다. 앱 시작, 포그라운드 복귀, 시간대 변경, 로그인·동기화 완료에도 다시 계산한다. 서버 요청이 실패한 순간의 빈 배열로 기존 데이터를 지우지 않는다. **동의 해제/로그아웃의 명시적 비활성 신호와 일시적인 데이터 미로딩을 구분해야 한다.**

위젯은 앱 종료 후에도 마지막 스냅샷을 표시할 수 있다. 15분 이후 갱신을 요청하고, 예약시각 경과 및 6시간 만료 시각의 timeline도 제공한다. 갱신 시각은 OS 예산·전력 상태에 따라 달라질 수 있으며, 이를 정시 알림이나 서버 실시간 동기화로 사용하지 않는다. 만료 후 새로고침 안내로 전환하도록 작성했지만, OS가 이미 보관한 화면의 즉시 폐기를 보장하지 않는다. [Apple 위젯 갱신 정책](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date) 참고.

## 승인 후 Mac에서 할 통합 작업

1. 실제 Apple 개발자 계정의 기존 App Group/두 target 프로비저닝을 확인한다. 새 그룹·권한·프로파일이 필요하면 승인 후 진행한다. 제안 bundle ID `com.oharu.today.widgets`는 예약·등록된 ID가 아니다. 호스트는 기존 `com.oharu.today`를 유지한다.
2. 수동 Xcode target 또는 검증한 config plugin으로 Widget Extension `OharuWidgets`를 만들고 호스트 앱에 Embed App Extensions를 연결한다. Extension target에는 `OharuWidgetSnapshot.swift`와 `OharuUpcomingWidget.swift`만 넣는다. 호스트 모듈에는 Snapshot/Module만 넣어 `@main` 충돌을 피한다. Extension의 `APPLICATION_EXTENSION_API_ONLY=YES`, minimum iOS 16.4, 버전·build number 동기화, bundle ID, Swift 언어 모드 5를 설정한다.
3. 실제 승인된 같은 App Group을 **양쪽 entitlement와 양쪽 Info.plist의 `OharuWidgetAppGroup`**에 넣는다. 자리표시자는 코드가 거절한다. [Apple App Groups](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.application-groups) 참고.
4. Expo 로컬 모듈로 옮겨 명시적으로 등록하고 pod install을 수행한다. [Expo Modules API](https://docs.expo.dev/modules/get-started/)의 로컬 모듈 절차를 따른다. 현재 앱에 자동 등록되는 설정은 추가하지 않았다.
5. EAS를 사용할 경우 완성된 target과 `extra.eas.build.experimental.ios.appExtensions` 선언을 일치시킨다. 이 설정이 자격증명 생성/검증에 사용되므로 초안 상태에서 추가하지 않는다. [Expo 앱 확장 문서](https://docs.expo.dev/build-reference/app-extensions/) 참고.
6. 인증된 Oharu WebView 메인 문서에서 검증된 위젯 메시지만 받도록 App.js에 연결한다. 현재 `createWidgetService` Android 경로와 별도 어댑터를 사용한다. 위의 title opt-in·명시적 clear·계정 전환 순서를 구현하고 링크는 `oharu://widget`만 허용한다. 이 초안은 서버 데이터를 변경하는 완료 버튼을 제공하지 않는다.
7. iOS 개발 빌드 → 실제 iPhone 잠금/해제/재부팅/앱 종료/네트워크 끊김/시간대 변경/계정 전환/동의 철회 → TestFlight → 심사 순서로 검증한다. 위젯 추가는 사용자가 OS 편집 화면에서 수행하며 앱이 몰래 홈 화면에 배치하지 않는다.

## 검증 기록과 남은 한계

Windows에서 `node --test mobile/ios-widget-draft/snapshot.test.cjs` **9/9 통과**. 데이터 최소화, 제목 동의, 문자열 정제, clear, 시간 범위, 중복/대용량 거절, 직렬 호출과 네이티브 실패, 비활성 등록 경계를 검사했다. JS 문법 검사와 두 plist 템플릿 파싱도 통과했다. Swift/Xcode 도구가 이 환경에 없어 Swift 컴파일·WidgetKit 런타임·App Group 실제 파일 공유·프로비저닝·OS 화면은 **미검증**이다. 이 소스 초안을 “iPhone 위젯 출시 완료”로 보고하면 안 된다.

## 비활성 통합 준비 보강 (2026-09-30)

`prepare-integration.cjs`는 승인된 기존 App Group ID와 앱 버전을 받아 **적용하지 않는 검토용 설정 객체**를 반환한다. 실제 Apple 등록 여부를 자동 인증하는 함수가 아니다. 잘못된 호스트 앱, 미해결 자리표시자, 잘못된 그룹/버전을 거부하고 호스트/확장 소스 분리, 동일 그룹 metadata, 버전 동기화, extension 전용 build settings와 Embed 위치를 명시한다. 파일 쓰기·config plugin 실행·Xcode target 생성·entitlement 활성화·Apple 자원 등록은 수행하지 않는다. 예제 `group.example.oharu`는 테스트용이며 실제 등록된 Oharu 그룹이 아니다.

실행 검증:

```powershell
node --test mobile/ios-widget-draft/snapshot.test.cjs mobile/ios-widget-draft/prepare-integration.test.cjs
```

총 **13/13 통과**. 추가 4개는 부적절한 앱/그룹/버전 거부, target 소스 분리와 파일 존재, 반복 준비 시 객체 오염 방지 및 실제 release config 무변경, 비활성 template 경계를 검증한다. 기존 최종 Android6/iOS10 runtime과 HTML은 변경하지 않았다.

미완료 이유는 두 부분이다. 첫째 이 Swift 초안은 실행 가능한 Expo config plugin 또는 Xcode extension target까지 연결되지 않은 소스 초안이다. 둘째 실제 App Group 및 호스트/확장 provisioning 자격이 확인되지 않았으며 이 Windows 환경에서 WidgetKit Swift 컴파일·iPhone 화면 동작도 검증하지 못했다. **승인만 받으면 이미 완성된 위젯이 나타나는 상태가 아니다.** 승인된 자격 확인 후 위 단계의 native target/module 연결, 빌드와 실기기 검증이 추가로 필요하다. SDK57 expo-widgets 대안과 이 직접 Swift 방식 중 하나를 선택해 연결해야 한다.

참고로 기존 앱 iOS10은 별도 App Store Connect 읽기 조회에서 `processingState=VALID`, 내부·외부 beta 상태 모두 `MISSING_EXPORT_COMPLIANCE`로 확인했다(ASC 앱6807312683, 업로드 2026-09-30T10:59:10Z). 이는 위젯 포함 빌드가 아니다. 기존 제출 키만 메모리에서 사용했으며 키 저장/출력, 새 자격, 수출규정 답변, 심사/공개 출시 변경은 하지 않았다.
