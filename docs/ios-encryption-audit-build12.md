# Oharu iOS build 12 암호화 감사

## 현재 상태

**최종 build 12 IPA 정적 감사 완료. Apple의 제시된 네 가지 보기 중 4번 ‘위에 언급된 알고리즘 모두 아님’을 기술적으로 권고한다.** 정확 IPA를 직접 검사했으며 build 11의 결과를 이름만 보고 자동 적용하지 않았다. 앱은 OS TLS/WebCrypto를 사용하므로 ‘암호화 기능을 전혀 사용하지 않는다’는 뜻은 아니다. Apple 법적 답변 제출·설정 변경·빌드·업로드는 이 감사에서 수행하지 않았다.

- 요청된 EAS build ID: `8e09f3bf-f066-4e54-9c54-89d94da66316`.
- 소스: `bcf5c590e141f121d0e1ab44cf5e72ff5fa2c775`.
- 동결 stage: `mobile/.expo/eas-release-account-delete-bcf5c59`.
- 비교 기준: build 11 / source `7df2699673cb7d5e32c4ff47443160222b63d981`, 별도 기존 문서 `docs/ios-encryption-audit-2026-10-01.md` 보존.

## 동결 소스 비교 결과

`package.json`, `package-lock.json`, `app.json`은 build 11 소스와 bytes 단위로 동일하며 bcf5c59와도 일치한다. Expo 57.0.18 계열, RN 0.86.3, React 19.2.3, react-native-webview 13.16.1, Supabase JS 2.117.2 의존성에 변화가 없다. native 생성 plugins, patch-webview.cjs, metro.config.js, index.js의 Git diff도 없다.

| stage 파일 | SHA-256 | 비교 |
| --- | --- | --- |
| package.json | `f95b9f73c23fcddcb9d16a8dc9739e8d2336921e9f2c7c90791b0a30c5a4737b` | build11/현재소스 동일 |
| package-lock.json | `a2297bccc9fafad99771506b4e716614b1ed2609524a9ed354d43d3137d8e647` | build11/현재소스 동일 |
| app.json | `7b5bb22a777b3292483cf9dba31805dcb0b93f8bc9694ee95b0bbc411fe1f0c5` | build11/현재소스 동일 |
| App.js | `2bff8aaec3a53fa84b2e17916a2b96430a86d466088b56cd9dd559e1608ac9a2` | 변경; bcf5c59 동일 |
| account-deletion.cjs | `d7112497b27f914111274f5d3a1b8e1c8045f27b8eff31091c8af3de329d26d2` | 추가; bcf5c59 동일 |
| assets/web/app.html | `7e93cc2cf1fcadb0dd33fb0528a3b72d5e68db52b5c09ba6bf4bd2c1e6176263` | 384,718 bytes; bcf5c59 동일 |

HTML 내부 `oharu-native-sdk:start`부터 end 사이의 **Supabase UMD 전체 블록이 build 11과 정확히 동일**하다. 해당 블록 SHA-256 `032d9856dc5dac228b5a23042fedd393db9e45e13371b60c302bd59de941e482`. 따라서 소스 단계에서 PKCE SHA-256, JWT RSA/ECDSA 검증은 기존처럼 `crypto.subtle`에 위임하는 코드다. 새로운 자체 AES/암호화 라이브러리 추가 증거는 없다.

추가 account-deletion.cjs는 고정 HTTPS endpoint로 fetch하고 사용자 Bearer와 비밀번호를 요청 본문에 전달하는 네트워크 모듈이다. 암호 알고리즘을 직접 구현하지 않는다. App.js의 추가 import는 해당 앱 모듈이며 native 암호 라이브러리 추가가 없다. SDK 외 HTML의 crypto 호출은 기존 `crypto.randomUUID` 식별자 생성이며 subtle/encrypt/decrypt/crypto-js/tweetnacl/libsodium 표식은 없다. 문자열 검색 결과만을 전체 바이너리 부재 증명으로 쓰지 않는다.

## 사전 확인 계획 (아래 최종 결과로 완료)

1. 정확 IPA SHA-256·크기, Info.plist `com.oharu.today` / `1.0.0` / build `12` 확인. 암호화 선언 키 존재 여부는 실제 plist에서 확인.
2. 내부 app.html이 위 stage·bcf5c59와 bytes 단위로 같은지 확인.
3. 9개 Mach-O 구성, linked frameworks, crypto import/defined symbol을 build 11과 대조. 바이너리 해시 변화는 빌드·서명에 따라 생길 수 있으므로 의미 있는 구성·심볼 차이를 구분.
4. Hermes bundle version·SHA-256, SHA-1 footer 체크섬 대조. 자체 SHA-1 코드와 MD5 오브젝트 표식이 있는 Hermes 예외를 숨기지 않고 기록.
5. 실제 IPA 근거로 Apple 4개 선택지에 대한 기술적 권고 확정. 소스만 보고 최종 바이너리 pass를 선언하지 않음.

## 기준과 한계

[Apple 암호화 문서 요구 표](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/)는 Apple OS 내 암호화와 별도 구현을 구분한다. [Apple 수출 규정 준수 안내](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations)는 third-party library까지 포함해 판단하도록 설명한다. 기존 build11의 4번 권고는 OS TLS/WebCrypto 사용 및 Hermes의 체크섬 해시 용도를 대조한 기술 판단이었다.

이 감사에서도 실제 iOS crypto tracing, 전체 바이너리 완전 역어셈블, 법적 분류·Apple 최종 승인까지 검증했다고 주장하지 않는다. 비밀키·프로비저닝 본문·사용자 세션을 읽거나 새 키를 만들지 않는다.


## 정확한 최종 IPA 검사 결과

- 파일: `mobile/.expo/artifacts/oharu-ios-1.0.0-12.ipa`.
- 크기: **9,597,959 bytes**.
- SHA-256: `10d23fa38cc58b0a9e7f41980f27a9df76c987b7ba299abe3f0d8a39dc043ecd`.
- 실제 Info.plist: `CFBundleIdentifier=com.oharu.today`, `CFBundleShortVersionString=1.0.0`, `CFBundleVersion=12`, `MinimumOSVersion=16.4`.
- `ITSAppUsesNonExemptEncryption` 및 `ITSEncryptionExportComplianceCode`: **둘 다 키 없음**. 이번 감사가 이 선언을 추가하거나 Apple 질문에 자동 답변한 것은 아니다.
- 실제 HTML: **384,718 bytes**, SHA-256 `7e93cc2cf1fcadb0dd33fb0528a3b72d5e68db52b5c09ba6bf4bd2c1e6176263`. 동결 stage HTML과 bytes 단위 일치. stage는 지정 bcf5c59와도 일치 확인했다.
- 실제 HTML 내부 Supabase UMD block: build11 IPA의 동일 block과 **bytes 단위 일치**, SHA-256 `032d9856dc5dac228b5a23042fedd393db9e45e13371b60c302bd59de941e482`.
- 실제 Hermes `main.jsbundle`: **1,562,462 bytes**, SHA-256 `c3604e2accd827e895c56d1e7e947b0cb79e833dbc50b9faea794f385e164161`, bytecode format **98**. 마지막 20바이트가 그 앞 전체 byte의 SHA-1과 일치(**직접 검사 PASS**).

## 네이티브 코드 동등성

9개 Mach-O의 경로 구성, dylib/framework load 목록, 암호 관련 LC_SYMTAB 심볼과 defined/undefined 구분이 **모두 build11과 동일**하다. 추가로 LC_SEGMENT_64의 `__text` 실행 코드 구간을 파싱해 SHA-256을 비교했으며 **9개 전부 build11과 동일**했다. 전체 바이너리 SHA-256은 모두 달랐으므로 파일 전체가 같다고 주장하지 않는다. 코드 구간 이외의 모든 차이를 역분석하지는 않았다.

| IPA 내 바이너리 (Payload/app.app/ 이하) | build12 SHA-256 | __text / 링크 / 암호 심볼 build11 대조 |
| --- | --- | --- |
| app | `6ca92bdfac84a54c9bb007dda552051c33094ab9e5187ad0b177dd91c79541de` | 모두 동일 |
| Frameworks/ExpoModulesJSI.framework/ExpoModulesJSI | `dbfbbca410a8322f4754fd31c39e7e2638f8c59abcd026bc7e62d58c5979720d` | 모두 동일 |
| Frameworks/hermesvm.framework/hermesvm | `0067987715e39478d8379a0e002583621655c3c72eb617d070b52b3e7d2e6491` | 모두 동일 |
| Frameworks/ExpoFont.framework/ExpoFont | `75ba3f4bb972422b1c73f71f114be4b01e76d0b79e5bc685d8d68478b76cfabb` | 모두 동일 |
| Frameworks/ExpoModulesCore.framework/ExpoModulesCore | `3015f333b69c106eb824154eafef90a4d2f6964f38a0e41ad0bd16e69c4e4acf` | 모두 동일 |
| Frameworks/React.framework/React | `95aacc4db916d27c28af38951adafe192e5c7201b93bc9e6d34a83adfd451a45` | 모두 동일 |
| Frameworks/ReactNativeDependencies.framework/ReactNativeDependencies | `4546d408ab013b83214d6647846e688352327f3473c9e7bd3718f7a1cf26068c` | 모두 동일 |
| Frameworks/ExpoModulesWorklets.framework/ExpoModulesWorklets | `d35f017347b703e6c0fc3f3d02762eefa18a8e5e20ca9318ad5ac9813c7b7ddc` | 모두 동일 |
| Frameworks/ExpoFileSystem.framework/ExpoFileSystem | `1aad1223f557f078accd5b8a070403de1156d669499b770275e4827cf7bea51e` | 모두 동일 |

주요 관찰:

- app 및 ExpoFileSystem의 CryptoKit Insecure.MD5/HashFunction, React의 CC_MD5, ExpoModulesCore의 CC_SHA1, ReactNativeDependencies의 CC_SHA1/SecRandomCopyBytes는 기존처럼 OS 함수 import다.
- WebKit/Security/CryptoKit/CFNetwork 기반 연결 구성이 동일하다. PKCE SHA-256 및 JWT RSA/ECDSA 검증은 그대로 WebCrypto `crypto.subtle` 호출에 위임한다.
- Hermes는 여전히 자체 `llvh::SHA1::hashBlock/writebyte/pad/hash` 구현 및 SHA1.cpp/MD5.cpp 오브젝트 표식을 포함한다. **모든 해시가 OS 구현이라고 설명하면 안 된다.** 바이트코드 source/file checksum 용도와 실제 footer 일치를 확인했다. MD5 오브젝트 표식만으로 활성 데이터 암호화 기능을 추정하지 않는다.
- 9개 바이너리의 OpenSSL/BoringSSL/libsodium/CryptoSwift/mbedtls/AES_encrypt/EVP_Encrypt 표식은 모두 0이며 추가 암호 엔진 링크가 없다. 문자열 검색 부재만으로 모든 숨은 코드를 증명한 것이 아니라 의존성·소스·실제 코드 구간·심볼/링크를 종합했다.
- Hermes JS bundle에 subtle/SHA-256/RSASSA-PKCS1-v1_5/ECDSA/encrypt/decrypt/crypto-js/tweetnacl/libsodium/@noble/getRandomValues/importKey 표식은 없었다. WebCrypto 사용하는 SDK는 별도 포함 HTML 안에 있으므로 JS bundle 표식 없음과 앱 전체 암호 기능 없음을 혼동하지 않는다.

## 최종 선택 권고와 범위

**정확한 이 build12 IPA에 대해 4번을 권고한다.** 앱의 데이터 통신 및 인증용 암호 연산은 Apple OS 제공 기능을 사용하고, 자체 또는 별도 표준 데이터 암호화 엔진이 추가된 증거는 없다. Hermes에 포함된 자체 체크섬 해시 코드는 위와 같이 명시적으로 고려했다. 이는 build11과 동일한 기술적 결론이며, 이번에는 build12 실제 native 코드 구간·SDK 동등성까지 확인했다.

높은 확신의 **정적 기술 판단**이며 법적 분류 확정이나 Apple 승인 완료는 아니다. 문서 면제와 국가별·연례 보고 의무는 별개다. 실제 iOS crypto tracing, 모든 native/JS 코드 도달성의 완전한 동적 증명, 서버의 암호 구현 분류는 범위 밖이다. 정확한 이 파일에만 적용하며 후속 빌드나 새 라이브러리에는 재검증이 필요하다.

이번 작업에서 변경한 파일은 이 새 문서 하나뿐이다. 이전 build11 감사 문서는 보존했다. 비밀키·프로비저닝 파일 본문·실사용자 토큰은 읽지 않았고, 새 키·빌드·업로드·Apple 답변 제출·설정 변경을 하지 않았다.
