# Microsoft Store 준비 — 실제 패키지 생성 전 단계

2026-09-30: `desktop/store/`에 MSIX manifest 템플릿과 검증 도구를 준비했다. **현재 MSIX 생성·서명·설치·Store 등록·게시를 완료하지 않았다.** 기존 NSIS 설정, 앱 런타임, 설치 파일은 변경하지 않았다.

## 준비 완료

- Windows x64 `packagedClassicApp` manifest 템플릿. `oharu` 프로토콜, 한국어·영어, 44/150 타일과 StoreLogo 슬롯 포함.
- `Identity.Name`, `Publisher`, `PublisherDisplayName`, 예약한 표시 이름을 명시적으로 입력해야 한다. 빈값·자리표시자·미확인 identity는 거절한다. 실제 값은 Partner Center의 해당 제품 identity 화면에서 대소문자·공백까지 그대로 가져와야 한다. [Microsoft 패키지 요구사항](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements)
- 기존 검증된 `desktop/build/icon.ico`를 `desktop/store/Assets/source-icon.ico`에 바이트 그대로 복사했다. SHA256 `0FF88410C94FB1B0786A89EEE931CF5BAAF92B357583B9C9E9A206C9E36F137D`.
- `prepare.cjs`는 기본 읽기 전용이며 실제 identity, SDK, PNG 크기, unpacked payload, 패키지 환경 검증 상태를 검사한다. 계정 로그인이나 도메인 검증을 대신하지 않으며 결과에 `identityVerifiedByTool:false`를 명시한다.
- `node --test desktop/store/prepare.test.cjs`: **6/6 통과**. 문법 검사도 통과. 기본 준비 검사는 예상대로 `blocked` / exit 1이다.

## 현재 차단 요인

| 항목 | 확인 결과 |
|---|---|
| Partner Center 실제 identity / publisher | 제공되지 않음. 추정값 생성하지 않음 |
| MakeAppx.exe / SDK | PATH 및 일반 Windows Kits 10 bin 경로에서 발견되지 않음 |
| Store용 PNG | 기존 ICO 원본만 보존. StoreLogo 50×50, 타일 44×44/150×150 파생 PNG 미준비 |
| MSIX 런타임 | 패키지 AUMID·알림·프로토콜·시작프로그램·사용자 데이터 이전 미검증 |
| Windows App Certification Kit | 실행하지 않음 |
| 인증서/Store 등록 | 생성·구매·발급·로그인·게시하지 않음 |

아이콘 파생 파일은 검증된 원본에서 크기만 맞춰 만들고 실제 렌더링을 확인해야 한다. 현재 검사기는 PNG 헤더와 선언된 크기만 확인하며 이미지 전체 디코딩/시각 검증을 대신하지 않는다. 원본 스타일을 새 그림으로 대체하지 않는다.

## 이후 사용 방법

1. `desktop/store/identity.example.json`을 `identity.local.json`으로 복사하고 **실제 Partner Center 값**을 입력한다. 예제의 빈칸이나 `confirmedFromPartnerCenter:false`를 단순히 통과시키기 위해 허위로 바꾸지 않는다. 로컬 identity 파일과 output 폴더는 Git 제외되어 있다.
2. `version`은 Store 제출용 네 부분 숫자(현재 후보 `1.8.0.0`), `maxVersionTested`는 실제 패키지 테스트를 수행한 Windows 빌드로 지정한다. 템플릿은 Windows Desktop 최소 10.0.19041.0으로 설계했으며 해당 최소 OS에서의 실제 동작 검증은 아직 없다.
3. `node desktop/store/prepare.cjs --identity desktop/store/identity.local.json`을 실행한다. 이 명령은 패키징/설치/서명을 수행하지 않는다.
4. 실제 identity가 유효하면 `--emit-review`로 **검토용** `desktop/store/output/AppxManifest.review.xml`을 생성할 수 있다. 이때 SDK/아이콘/런타임 검증이 남아 있으면 전체 상태는 계속 blocked다. 검토용 파일은 기존 파일을 덮어쓰지 않으며 제품 패키지 생성 완료 증거가 아니다.
5. 이후 승인된 SDK 도구로 별도 staging 폴더에 최신 `dist/win-unpacked`와 준비한 Assets/검토 완료 manifest를 구성하고 MakeAppx를 실행한다. 생성되는 결과와 WACK 검사 로그를 확인한다. 이 초안은 MakeAppx를 실행하거나 SDK를 다운로드하지 않는다. [Microsoft 수동 패키징 절차](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-manual-conversion)

## 배포 전에 필요한 런타임 적합성 확인

NSIS의 `com.moodweb.oharu` 식별자를 Store 패키지의 실제 AUMID와 혼동하면 안 된다. Store identity와 Application Id에 맞는 식별자를 적용하고, 설치된 시작 메뉴/검색/작업표시줄/알림의 실제 값을 확인해야 한다. 현재 배송 런타임을 이 작업에서 수정하지 않았다. `runtimeChecks.packagedIdentityAndNotifications`는 이 검증 후에만 true로 바꾼다. [Microsoft AUMID 확인 방법](https://learn.microsoft.com/en-us/windows/configuration/store/find-aumid)

현재 프로그램의 로그인 시 자동 실행 및 `setAsDefaultProtocolClient` 방식이 MSIX에서 동일하게 작동한다고 가정하지 않는다. manifest의 `oharu` 프로토콜 활성화, 시작 작업 지원, 로그인 콜백과 단일 실행 전달을 실제 패키지에서 검증한다. 필요한 StartupTask 선언은 추가 제품 결정·검증 후 넣는다.

기존 비패키지 앱 데이터 경로와 MSIX의 파일/레지스트리 가상화를 확인하여 기존 할 일·로그인·환경설정을 보존한다. Store 설치/업데이트/제거 및 NSIS와의 공존·전환을 검증하기 전에는 해당 runtimeChecks를 true로 바꾸지 않는다. [데스크톱 앱 패키징 사전 확인](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-prepare)

`runFullTrust`는 Electron 데스크톱 프로세스 실행에 필요한 제한 capability이므로 Store 심사 설명 대상이다. 새 계정·계약 동의·권한·인증서 발급을 이 템플릿이 승인하는 것은 아니다. Store 게시 시 Microsoft가 신뢰 서명을 제공하는 흐름과, 직접 배포하는 NSIS/사이드로드 서명은 별개다. 자체서명 인증서를 만들어 경고를 피하는 절차는 포함하지 않았다. [Microsoft 패키징·Store 서명 설명](https://learn.microsoft.com/en-us/windows/msix/package/packaging-uwp-apps)

## 기존 설치 확인

읽기 전용으로 HKCU/HKLM 및 WOW6432Node의 제거 레지스트리에서 Oharu/오하루 제품명을 조회했으나 **0개**였다. 사용자·공용 시작 메뉴의 Oharu/오하루 바로가기와 `Get-StartApps` 결과도 **0개**였다. 따라서 이 PC의 기존 설치 버전/경로/실제 AUMID를 확인할 수 없었다. 임의의 사용자 폴더 전체를 탐색하지 않았으며, 이 결과가 모든 휴대용 실행 파일의 부재를 증명하지는 않는다. 실제 설치나 보안 경고 수락은 수행하지 않았다.
