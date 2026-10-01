# Oharu iOS 1.0.0 (11) 암호화 구현 감사 — 2026-10-01

## 선택 권고

제시된 Apple 질문의 **4번 ‘위에 언급된 알고리즘 모두 아님’**을 기술적으로 권고한다. 앱의 통신 암호화와 인증용 암호 연산은 Apple OS가 제공하는 WebKit/WebCrypto, Security, CryptoKit/CommonCrypto 경로를 사용한다. 별도 데이터 암호화 엔진, 자체 TLS, 독점 암호화, Apple OS를 대체·병행하는 별도 표준 암호화 구현은 확인되지 않았다.

이는 **암호화를 전혀 사용하지 않는다**는 답변이 아니다. HTTPS, PKCE의 SHA-256, SDK에 포함된 RSA/ECDSA JWT 검증은 실제 존재한다. 또한 Hermes 엔진에는 자체 SHA-1 코드와 MD5 오브젝트 표식이 포함되어 있다. 파일 식별·체크섬 해시의 존재를 별도 데이터 암호화 구현이라고 동일시하지 않았으며 아래에 예외 없이 기록했다.

판정 수준: 이 특정 IPA에 대한 정적 기술 감사에 기반한 높은 확신의 권고. 법적 분류 확정, App Store Connect 양식 제출 또는 Apple 승인 완료를 의미하지 않는다. 수출 서류 면제 여부와 국가별·연례 보고 의무는 별개다. 소스/의존성 변경이나 새 IPA에는 이 결론을 자동 적용하지 않는다.

## 감사 대상 고정

- 지정 소스: `7df2699673cb7d5e32c4ff47443160222b63d981`.
- IPA: `mobile/.expo/artifacts/oharu-ios-1.0.0-11.ipa`, **9,586,130 bytes**.
- IPA SHA-256: `5648358580d46a46cedc8ef79abf2962145924ad13121a64ca9dd272cb6870d3`.
- 실제 `Payload/app.app/Info.plist`: bundle ID `com.oharu.today`, 버전 `1.0.0`, build `11`, executable `app`.
- `ITSAppUsesNonExemptEncryption`: **키 없음**. 따라서 기존 빌드에 ‘비면제 암호화 없음’이 선언되어 있다고 말하면 안 된다. 이번 감사에서 Info.plist를 변경하지 않았다.
- 실제 HTML: `Payload/app.app/assets/assets/web/app.html`, 353,024 bytes, SHA-256 `483e4478173dfa059cbc755a6e136a46415ff7527cd1985edff94af0a2d6f918`.
- 위 HTML과 `git show 7df2699:mobile/assets/web/app.html`의 bytes 및 SHA-256이 **정확히 일치**했다. 감사 중 공유 작업 디렉터리 HTML이 변경되었으므로 최종 결론은 현재 작업 파일이 아닌 IPA와 지정 커밋에 고정한다.
- `Payload/app.app/main.jsbundle`: 1,557,798 bytes, SHA-256 `2aa24c47b1e5a21a57e361ba8419205b5a01194f3718d8ec6692fd0cec22fd13`.
- Hermes bytecode magic `c61fbc03c103191f`, format version **98**. 마지막 20바이트가 앞선 전체 바이트의 SHA-1과 일치함을 직접 확인했다.

## SDK와 실제 코드 경로

| 대상 | 확인 내용 | 암호화 구현 판단 |
| --- | --- | --- |
| React Native WebView 13.16.1 | App.js가 번들 HTML을 `Asset.fromModule`로 찾아 WebView에 로드 | iOS WebKit 네트워크·JS 환경 사용 |
| Supabase JS/Auth 2.117.2 | 실제 IPA HTML 안에 UMD SDK 전체 포함. 로컬 고정 버전 UMD의 script 종료 태그 escape 후 내용이 IPA에 포함됨 확인 | 이름만 보고 판단하지 않고 실제 포함 코드 검사 |
| PKCE | 앱 클라이언트 `auth.flowType: "pkce"`; SDK `crypto.getRandomValues`, `crypto.subtle.digest('SHA-256', …)` 호출 | SHA-256 자체 JS 구현이 아닌 OS WebCrypto 호출 |
| PKCE fallback | WebCrypto 부재 시 SDK는 plain challenge로 fallback; JS SHA-256 polyfill 없음 | fallback을 자체 암호화로 분류할 근거 없음. 이것이 실제 기기에서 사용되는지 런타임 검증은 별도 |
| JWT | SDK getClaims에 RS256 = RSASSA-PKCS1-v1_5/SHA-256, ES256 = ECDSA/P-256/SHA-256, `subtle.importKey`와 `subtle.verify` 포함 | RSA/ECDSA 엔진을 직접 구현하지 않고 OS에 위임 |
| JWT fallback | HS 계열, JWK 부재 또는 WebCrypto 부재 시 `getUser` 서버 검증 경로 | JS HMAC 자체 구현은 확인되지 않음 |
| 인증 UI | `signInWithPassword`, `signInWithOAuth` 호출 확인 | 인증정보를 HTTPS API에 전달하는 사용이며 자체 비밀번호 암호화 엔진 아님 |
| 앱 식별자 | `crypto.randomUUID` 또는 시간/Math.random fallback | 식별자 생성, 자체 암호화 아님 |

JWT 검증 코드는 SDK에 포함되어 있다는 사실을 확인했다. Oharu UI가 모든 SDK 메서드를 실제 실행한다는 뜻은 아니다. 현재 로그인 세션·토큰·실제 사용자 데이터를 읽거나 인증 요청을 실행하지 않았다.

검사한 lockfile 기준 Expo 57.0.18 계열, React Native 0.86.3, React 19.2.3, Expo Notifications 57.0.21, Expo FileSystem 57.0.6, Hermes compiler 250829098.0.17이다. RN의 `sdks/.hermesv1version`은 `hermes-v250829098.0.17`; 실제 bytecode version 98과 일치한다. IPA 내 RN privacy bundle 0.86.3, Notifications 57.0.21, FileSystem 57.0.6도 대조했다. framework plist의 Hermes 1.0.0 자체를 엔진 배포 버전이라고 오인하지 않았다.

## 네이티브 Mach-O 검사

IPA를 디스크에 풀거나 실행하지 않고 메모리에서 ZIP을 읽었다. 64-bit little-endian Mach-O **9개**의 load command와 LC_SYMTAB를 해석했다. undefined symbol은 OS/다른 라이브러리에서 가져오는 함수와 구분했다.

| 바이너리 | 실제 관찰 | 의미 |
| --- | --- | --- |
| app | WebKit, Security, CryptoKit framework 연결; CryptoKit Insecure.MD5/HashFunction undefined imports | Apple 구현 사용. Expo Asset 캐시 해시와 소스 대조 |
| ExpoFileSystem | CryptoKit 연결; Insecure.MD5, `_CC_MD5` imports | 파일 MD5 계산을 Apple 구현에 위임 |
| ExpoModulesCore | `_CC_SHA1` undefined import | 소스 `ios/Uuidv5/Uuidv5.swift:13–15`의 UUIDv5 계산 |
| React | `_RCTMD5Hash` wrapper, `_CC_MD5` undefined import | RN 문자열 MD5 helper가 Apple CommonCrypto 호출 |
| ReactNativeDependencies | Security/CFNetwork 연결; `_CC_SHA1`, `_SecRandomCopyBytes` imports, SRSHA1 wrapper | SocketRocket 계열 해시/난수 경로. 별도 TLS 엔진 근거 없음 |
| hermesvm | 자체 정의된 `llvh::SHA1::hashBlock/writebyte/pad/hash` 심볼, SHA1.cpp 및 MD5.cpp 오브젝트 표식 | 자체 해시 코드 존재는 인정. bytecode 소스·파일 해시 등 엔진 메타데이터 용도 확인. MD5 오브젝트 표식만으로 활성 암호화 경로 단정 안 함 |
| ExpoModulesJSI / ExpoModulesWorklets / ExpoFont | 검사한 암호 함수 심볼 없음 (일부 Swift 디버그 경로에 CryptoKit 명칭만 있음) | 디버그 경로 문자열과 실제 링크·함수 호출을 구분 |

총 9개 Mach-O에서 OpenSSL, BoringSSL, libsodium, CryptoSwift, mbedtls, AES_encrypt, EVP_Encrypt 표식과 해당 별도 framework 연결을 찾지 못했다. **표식 부재만으로 모든 코드의 부재를 수학적으로 증명한 것은 아니다.** 공개 dependency 목록, 실제 SDK, native import, 앱 소스 경로를 함께 검토한 결론이다.

네이티브 관련 소스 근거:

- `mobile/node_modules/expo-asset/ios/AssetModule.swift:28,41,49–60`: URL/asset 캐시 식별·검사에 CryptoKit Insecure.MD5.
- `mobile/node_modules/expo/node_modules/expo-file-system/ios/FileSystemFile.swift:61`: 파일 MD5.
- `mobile/node_modules/expo/node_modules/expo-file-system/ios/Legacy/NSData+EXFileSystem.m:10–14`: CommonCrypto MD5.
- `mobile/node_modules/react-native/React/Base/RCTUtils.mm:256–262`: RCTMD5Hash → CC_MD5.
- `mobile/node_modules/expo-modules-core/ios/Uuidv5/Uuidv5.swift:13–15`: SHA-1 기반 UUIDv5.

Hermes를 ‘OS 암호 함수만 호출하는 라이브러리’라고 설명하면 부정확하다. 자체 SHA-1 코드는 있다. 다만 SHA-1은 여기서 데이터를 암호문으로 만드는 암호화 기능이 아닌 bytecode fingerprint/checksum이다. [해당 Hermes 버전의 파일 형식](https://github.com/facebook/hermes/blob/hermes-v250829098.0.17/include/hermes/BCGen/HBC/BytecodeFileFormat.h)은 sourceHash와 fileHash 필드를 정의한다. 실제 IPA bundle footer까지 이 파일 해시와 일치했다. 이 용도 근거로 Hermes 해시만을 이유로 질문 2번의 별도 암호화 구현을 선택하지 않는 것이 타당하다고 판단한다. 엔진 전체의 모든 호출 경로를 동적 추적한 것은 아니다.

## 주요 바이너리 SHA-256

| IPA 내부 경로 (Payload/app.app/ 이하) | SHA-256 |
| --- | --- |
| app | `3f59e7a1f1b7ab776793d989ca76be6ae840b388a0065e5e7d3e7dbb8fd89511` |
| Frameworks/hermesvm.framework/hermesvm | `80ea1ec0428702097631bc86a31c1c72675f1eb8f1237351f472a25a56329439` |
| Frameworks/React.framework/React | `2a767f925325abea079a18c5af80a8dd6b027232492b7621d149d02237d1738b` |
| Frameworks/ReactNativeDependencies.framework/ReactNativeDependencies | `188822cb7ea2bb6bc6644d1bf040e5c07f0f66087f9e597a1c675cc8e31828a6` |
| Frameworks/ExpoFileSystem.framework/ExpoFileSystem | `f4560f935da04e94f99c532fe5659243229dc29441092617f65eb45793538641` |
| Frameworks/ExpoModulesCore.framework/ExpoModulesCore | `6b98a394ccba303b65a85db0e50714e5403fee5a651e79ae3a00445e2f07b5ef` |
| Frameworks/ExpoModulesJSI.framework/ExpoModulesJSI | `53ad65be6f858e7866a96f0992d7cc0489ad61e9738263987ea689547ed3783d` |
| Frameworks/ExpoModulesWorklets.framework/ExpoModulesWorklets | `d8b372a726ecfd7462cefe0b5f7585e8fa047ecf0dc204c04841de6c23f1df3e` |
| Frameworks/ExpoFont.framework/ExpoFont | `8b746047766745ba7f44acd67fa37c785186da907c60932037542bb3691eac08` |

## Apple 공식 기준 (2026-10-01 조회)

[Apple 암호화 문서 요구 표](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/)는 OS 내부 암호화 사용과 OS가 제공하지 않는 표준 알고리즘 구현을 구분한다. 전자는 App Store Connect 서류가 필요 없다고 안내한다. 따라서 SDK 이름이나 JWT의 RSA/ECDSA 문자열 존재만으로 질문 2를 선택하지 않고 **누가 알고리즘을 구현하는지**를 확인했다.

[Apple 수출 규정 준수 안내](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations)는 OS 기반 HTTPS 등의 일반적인 서류 면제와 `ITSAppUsesNonExemptEncryption`의 의미를 설명한다. 키 NO는 ‘암호화를 전혀 쓰지 않거나 면제되는 형태만 사용’하는 경우이며 third-party library도 포함해 판단해야 한다. 서류 면제와 미국 연례 자기분류 보고 가능성을 별도로 안내하므로 4번을 전 세계 법적 의무 없음으로 해석하면 안 된다. 원문 Markdown도 Apple 공식 호스트에서 확인했다.

[Apple export compliance overview](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/)에 따라 최종 법적 분류 책임은 배포자에게 있다. 이 감사는 제출을 위한 기술 근거를 제공하며 국가별 법률판정과 양식 제출을 대신하지 않는다.

## 확실한 사항과 제한

확인 완료: 지정 IPA 정체성/해시, 지정 커밋 HTML 일치, SDK 실제 코드, 9개 Mach-O 의존·심볼, OS 암호 API 위임, Hermes 내부 해시 존재 및 bytecode checksum 용도, 공식 Apple 문서 대조.

미실행: iOS 실기기 runtime crypto tracing, 전체 바이너리 완전 역어셈블·모든 함수 도달성 증명, Apple 최종 법적 분류/양식 제출, Info.plist 수정/재빌드. 실제 자격증명·private key·프로비저닝 파일은 조사하지 않았다. API키/세션/사용자 데이터 값도 결과에 포함하지 않았다.

실무 답변 요약: **이 정확한 build 11의 제시된 네 가지 보기 중 4번을 권고**. 앱은 Apple OS 암호화 기능을 사용하며 독점 또는 별도 표준 데이터 암호화 엔진은 확인되지 않았다. ‘Hermes 해시까지 전부 Apple 구현’이라는 설명은 사용하지 않는다.

## 읽기 전용 재검증 코드

저장소 루트에서 아래 Python을 메모리로 실행할 수 있다. 파일 생성·추출·실행·네트워크 요청 없이 해시, 허용한 plist 키, native link와 암호 심볼만 출력한다. 프로비저닝·서명 리소스는 읽지 않는다. 기존 IPA만 대상으로 하며 앱을 빌드하지 않는다.

```python
from pathlib import Path
import zipfile, plistlib, hashlib, struct, re, json
p = Path('mobile/.expo/artifacts/oharu-ios-1.0.0-11.ipa')
print('IPA', p.stat().st_size, hashlib.sha256(p.read_bytes()).hexdigest())
with zipfile.ZipFile(p) as z:
    d = plistlib.loads(z.read('Payload/app.app/Info.plist'))
    print({k: d.get(k) for k in ['CFBundleIdentifier',
        'CFBundleShortVersionString', 'CFBundleVersion',
        'ITSAppUsesNonExemptEncryption']})
    b = z.read('Payload/app.app/main.jsbundle')
    print('HBC', struct.unpack_from('<I', b, 8)[0],
        hashlib.sha256(b).hexdigest(), hashlib.sha1(b[:-20]).digest() == b[-20:])
    for n in z.namelist():
        if n.endswith('/') or 'embedded.mobileprovision' in n or '_CodeSignature/' in n:
            continue
        if not (n == 'Payload/app.app/app' or '.framework/' in n):
            continue
        b = z.read(n)
        if b[:4] != b'\xcf\xfa\xed\xfe':
            continue
        print('MACHO', n, hashlib.sha256(b).hexdigest())
        off = 32
        for _ in range(struct.unpack_from('<I', b, 16)[0]):
            cmd, size = struct.unpack_from('<II', b, off)
            if cmd in (0xc, 0x18, 0x80000018, 0x1f, 0x8000001f):
                pos = off + struct.unpack_from('<I', b, off + 8)[0]
                print('LINK', b[pos:b.find(b'\0', pos)].decode())
            if cmd == 2:
                so, num, st, _ = struct.unpack_from('<IIII', b, off + 8)
                for j in range(num):
                    si, ty = struct.unpack_from('<IB', b, so + 16*j)
                    if not si:
                        continue
                    pos = st + si
                    sym = b[pos:b.find(b'\0', pos)].decode(errors='replace')
                    if '/' not in sym and re.search(
                        r'CCCrypt|CC_SHA|CC_MD|SecRandom|SecKey|SSL_|EVP_|AES_|HMAC|SHA256|Crypto|SHA1|MD5', sym):
                        print('SYMBOL', sym, 'undefined' if (ty & 14) == 0 else 'defined')
            off += size
```
