# Windows 출시 검증 (2026-09-30)

## 현재 구현

- Electron **44.5.1**(정확한 버전 고정), electron-builder 25.1.8, Windows x64 NSIS 사용자별 설치. appId `com.moodweb.oharu`와 기존 데이터 경로 유지. [공식 안정판](https://releases.electronjs.org/)과 [지원 일정](https://releases.electronjs.org/schedule)을 2026-09-30 확인한 후, 지원 종료된 33.4.11에서 업그레이드했다.
- 실행 파일·설치 파일·제거 프로그램·창 아이콘을 동일한 `build/icon.ico`로 지정. ICO 16/24/32/48/64/128/256 프레임 확인.
- `signAndEditExecutable: true`로 표준 제품명/버전/아이콘/서명 처리를 복구. 이전 `afterPack.js`의 아이콘 단독 보정은 빌드에서 사용하지 않음.
- 시작 메뉴·바탕화면 바로가기 `Oharu (오하루)`, 프로그램 제거 표시명 정정. 빌더 NSIS 템플릿의 `WinShell::SetLnkAUMI`가 두 바로가기에 `com.moodweb.oharu`를 설정함을 확인. 깨진 트레이 한글 메뉴를 복구.
- 원격 페이지의 Electron IPC는 Oharu 메인 프레임만 사용. 외부 URL의 Google 호스트 접두어 우회 차단. 노드 비활성화/샌드박스/컨텍스트 격리.
- AI 테마 연결(ChatGPT/Claude), 개인정보·웹사이트, 문의 메일, 이 저장소 다운로드는 정확한 호스트/주소 허용 목록을 통해 시스템 브라우저·메일 앱으로 연다. Supabase는 기존 Oharu 프로젝트 호스트만 허용. 위장 호스트·인증정보 포함 URL·별도 포트·다른 저장소/프로젝트·추가 메일 수신자는 거절. 오프라인 문서의 `/privacy`만 공개 개인정보 안내로 매핑.
- 웹의 전체 알림 스냅샷을 메인 프로세스가 받아 1초 주기로 예약시각 확인. 창을 숨겨도 프로세스가 살아 있으면 동작. 완료/삭제/시간 수정은 이전 예약을 대체. 앱 재시작 중복 방지 원장에는 할 일 제목 없이 ID·시각만 저장.
- 절전 복귀는 5분 이내 지난 예약만 재확인. 더 오래 지난 알림은 오래된 알림 폭주를 피하기 위해 표시하지 않음. 앱 종료 시 예약 전송은 지원하지 않음.
- 네이티브 알림 실패는 예약 응답과 상태 조회 모두 `error`로 전달. 새 예약만으로 오류를 지우지 않으며 실제 후속 `show` 이벤트에서만 해제한다. 오래된 토스트의 지연 이벤트가 최신 오류/성공을 덮어쓰지 않음.

## 웹 연결 계약

```js
await desktopBridge.syncReminders([
  { id: 'todo-id', title: '할 일', dueAt: '2026-09-30T18:00:00+09:00', done: false }
]);
await desktopBridge.syncReminders([]); // 권한 해제, 로그아웃, 알림 비활성화
await desktopBridge.getNotificationStatus();
// supported, mode: 'while-running', worksWhenQuit: false,
// permission: 'system-settings', error
```

최대 500개, ID 중복 거절, 제목 500자 제한, UTC 또는 명시적 시간대 오프셋 필수. 반복 항목은 다음 발생시각을 별도 스냅샷으로 보내야 함. UI에서 사용자가 알림을 켠 경우에만 예약해야 하며 Windows 알림 설정/집중 지원에 따른 거부는 전달 보장이 아님.

## 검증 증거

- `npm test`: 17/17 통과. 정시 1회, 스냅샷 반복 중복, 삭제·완료, 시간·제목 수정, 절전 복귀 5분 경계, 시간대, 잘못된 입력, 앱 재시작 원장, 외부 AI/안내/문의 링크와 위장 링크, 오프라인 개인정보 링크, IPC URL, OS 오류 응답·비동기 상태·실제 성공 후 해제 검증.
- `npm run test:runtime`: Electron **44.5.1 / Chromium 152.0.7977.130** 실제 런타임 통과. 프로덕션 main/preload를 임시 사용자 프로필·숨겨진 창·로컬 HTTPS fixture로 실행. 샌드박스/컨텍스트 격리, 설정 IPC, 알림 실패·복구 상태 전달, 예약 비우기, 외부 AI 링크 확인. OS 토스트·트레이·브라우저 실행·프로토콜/시작프로그램 등록은 테스트 대역이므로 실제 OS 기능 통과와 구분한다.
- 관리형 작업 폴더의 ACL 때문에 새 런타임의 sandbox 초기 검사가 실패하는 환경 문제가 있었다. 공식 런타임을 일반 TEMP 위치에 복사하고 승인된 일반 실행으로 테스트를 통과했다. ACL 변경, `--no-sandbox`, 보안 기능 비활성화는 사용하지 않았다. 이 환경에서는 `ELECTRON_OVERRIDE_DIST_PATH`를 TEMP 복사본으로 설정하고 일반 실행해야 재현 가능하다.
- `node --check main.js`, `node --check preload.js`: 통과.
- `npm run dist`: NSIS 빌드 성공. Windows 빌드 도구의 macOS 심볼릭 링크 압축 해제 문제는 임시 캐시에 Windows용 파일만 추출해 해결. 관리자 권한/개발자 모드/보안 설정 변경 없음.
- Electron 44 최종 빌드는 `node node_modules/electron-builder/cli.js --win nsis --config.electronDist=node_modules/electron/dist`로 성공. npm의 공식 Electron 다운로드로 검증·설치된 로컬 런타임을 재사용하여 빌더의 중복 네트워크 다운로드 제한을 피했다. 빌드 로그에서 `electron=44.5.1`, `arch=x64` 확인.
- 최종 1.8.0 빌드(Electron44·OS 오류 상태·알림 회귀 및 게스트 데이터 복사 수정73d383f 포함): `dist/Oharu-Setup.exe`, 114,693,064 바이트. SHA256 `7C0F98439D73AB2259B42CD0F5973AE52405759A25E15894DA4C32EE7325197F`. 설치 파일과 포함된 Oharu.exe 모두 `NotSigned`. PE 제품명 Oharu / 회사 moodweb / 파일 버전 1.8.0 확인. `dist/build-verification.json`에 기계 판독용 결과 저장.
- 최종 패키지의 index.html, theme-system.js/CSS, reminders.js가 통합된 작업본과 바이트 단위로 일치함을 확인.
- 원본 설치 파일 `Get-AuthenticodeSignature`: `NotSigned`. 현재 사용자 인증서 저장소에 코드 서명 인증서 발견되지 않음. 환경 변수에 기존 서명 설정 이름도 발견되지 않음.
- 서명 필수 빌드 경로를 별도 `dist/signed-check`에서 실행하여 `App is not signed and forceCodeSigning is set to true` 오류와 exit 1 확인. 무서명 파일을 서명 완료로 통과시키지 않음.
- 일반적인 사용자별 설치 위치, 사용자 제거 레지스트리, 시작 메뉴에서 기존 Oharu 설치 발견되지 않음. 전체 디스크 설치 여부를 보장하는 검사는 아님.

## 공개 출시 차단 및 미검증

1. 새 빌드도 인증서 없이 만들어진 개발 검증용 파일이다. 공개 Windows 배포에는 `npm run dist:signed`를 사용하여 서명이 없으면 실패하도록 한다. 인증서 구매/발급, 새 서비스 연결, Store 계약 동의는 별도 승인 필요. 서명만으로 SmartScreen 경고 제거를 보장하지 않는다.
2. Windows GUI 도구가 제공되지 않아 실제 설치 화면, 작업표시줄/Windows 검색 결과/토스트 외관, 시작 메뉴 아이콘은 미검증. 보안 경고를 우회하거나 무서명 설치를 조용히 강행하지 않았다. 최근 문서 목록은 파일을 여는 앱이 아닌 Oharu에 임의 가짜 문서를 등록하지 않는다. Windows의 최근 앱 표시는 OS 정책과 실제 사용에 따름.
3. 앱을 완전히 종료한 뒤 예약 알림: 미지원. WinRT 예약 토스트 어댑터와 실제 설치/알림 권한 검증이 추가로 필요. Electron `Notification.show()`를 OS 예약 토스트로 설명하면 안 된다.
4. 지원 중인 Electron 44.5.1 업그레이드와 격리된 실제 런타임 호환성 검사는 완료했다. 실제 로그인·투명 창 외관·OS 알림·설치 회귀는 별도 검증해야 한다. npm 의존성 감사에서는 빌드 도구를 포함한 개발 의존성에 16개 취약점(15 high, 1 critical)이 보고되었다. 이 앱의 asar에는 빌드 도구를 포함하지 않지만 별도 도구 체인 업데이트 검토가 필요하다.
5. 오프라인 fallback에 테마·알림 JS/CSS를 포함하며 기존 서비스 워커 캐시를 삭제하지 않는다. CDN 의존성과 로그인 세션의 오프라인 동작은 별도 실기기 검증 필요.
6. `package.json`과 lockfile을 1.8.0으로 함께 변경하고 웹 통합 후 1.8.0 최종 빌드를 완료했다. 이전 공개 태그의 파일은 덮어쓰지 않았다. 서명 준비 전에는 초안 릴리스의 검증용 산출물로만 취급한다.

## 재현 및 복구

`desktop`에서 `npm ci`, `npm test`, `npm run dist`. 서명된 릴리스는 기존 승인된 서명 설정으로 `npm run dist:signed` 실행 후 설치 파일과 앱 실행 파일 모두 `Get-AuthenticodeSignature`의 `Valid` 확인. `dist/Oharu-Setup.exe`는 빌드 산출물이며 Git에 넣지 않음. 원본 사용자 프로젝트는 수정하지 않음. 설정/사용자 할 일 데이터를 지우는 마이그레이션 없음.

초기 빌드의 `desktop/node_modules` junction은 제거하고 현재는 작업 폴더에 독립적으로 설치했다. 원본 프로젝트 의존성은 변경하지 않았다. 다른 PC에서는 `npm ci`로 설치한다. Electron 44는 바이너리를 최초 실행 시 내려받을 수 있으며 네트워크 허용이 필요하다.

## 공식 근거

- [Electron 알림과 Windows 시작 메뉴 식별자 요구사항](https://www.electronjs.org/docs/latest/tutorial/notifications)
- [Electron IPC 발신자·탐색 보안](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron-builder Windows 설정](https://www.electron.build/win/)
- [Microsoft 예약 알림과 5분 전달 유효시간](https://learn.microsoft.com/en-us/windows/apps/develop/notifications/app-notifications/app-notifications-scheduled)
