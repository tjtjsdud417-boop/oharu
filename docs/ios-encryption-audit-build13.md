# Oharu iOS 1.0.0 (13) 최종 IPA 암호 감사

정확한 build 13 IPA에 대해 Apple 질문의 **4번 ‘위에 언급된 알고리즘 모두 아님’**을 기술적으로 권고한다. build 12의 실제 실행 코드·라이브러리 구성·암호 심볼과 포함 SDK를 다시 대조했으며 모두 동일하다. build 12 감사가 이미 build 11과 같은 항목의 동등성을 확인했으므로 기존 기술적 결론이 유지된다.

## 대상과 제출 증거

- 소스 커밋: `9bd379a3588ca919dfb56afd60c6ef76a7f336da`.
- 최소 네이티브 stage 커밋: `1061f434b1355001d020fa3dd11fc78113cd56ba`.
- EAS build: `c311f5b3-8c83-4220-b4c0-c9726d15d4a7`, FINISHED.
- IPA: `output/native-artifacts/oharu-ios-1.0.0-13.ipa`, **9,598,094 bytes**.
- SHA256: `BF5F8B3CF1121A00A3C956FC6E30A4A557A2E00DB1010E503E93B281F121AD3C`.
- 실제 Info.plist: `com.oharu.today`, `1.0.0`, build `13`, 최소 iOS `16.4`.
- `ITSAppUsesNonExemptEncryption` 및 `ITSEncryptionExportComplianceCode`: **키 없음**. 수출 규정 질문을 자동 완료한 상태가 아니다.
- EAS submission: `fd63770a-b10a-4a57-8090-816c3cd007fb`, **FINISHED**, ASC app `6807312683`, error null. 공식 읽기 재확인 시각 `2026-10-01T11:38:49.910Z`.
- EAS 제출 완료는 Apple 업로드 완료의 증거다. Apple `processingState=VALID`, 수출 규정 답변, 심사 승인 또는 공개 출시의 증거로 사용하지 않는다.

## 정확한 산출물 대조

`output/native-artifacts/verification.json`에 최종 IPA·AAB를 직접 읽은 상세 결과를 기록했다. 이전 사본의 build 12 IPA는 읽기만 했다.

9개 Mach-O의 `__text` 실행 구간, 연결 dylib/framework 목록, 암호 관련 심볼 및 defined/undefined 분류가 전부 build 12와 동일하다. 바이너리 전체가 동일하다고 주장하지 않는다. 서명·메타데이터 등의 전체 차이를 완전히 역분석한 것은 아니다.

실제 IPA 내 `assets/assets/web/app.html`은 **385,672 bytes**, SHA256 `71FD5FCB73BBDDC0F03EC38E729D213E703F3CA3CEEE485DF18262DF27CE55AB`이며 검토한 모바일 헤더 수정본과 정확히 일치한다. 내부 Supabase UMD block은 build 12와 bytes 단위로 동일하다. PKCE SHA-256과 JWT RSA/ECDSA 검증은 기존처럼 OS WebCrypto 호출에 위임한다.

Hermes `main.jsbundle`은 **1,562,462 bytes**, SHA256 `22E74DCD95F4A350EA2A77AD849DC8C375866ECD73A8374054547D675777AEA1`, bytecode 98이다. 마지막 20 bytes가 그 앞 전체 내용의 SHA-1과 일치한다. 검사한 crypto marker의 개수는 build 12와 같으며 모두 0이다. SDK는 별도 HTML에 포함되므로 bundle marker 부재를 앱의 암호 기능 부재로 해석하지 않는다.

Hermes에는 기존 자체 SHA-1 체크섬 코드와 MD5 오브젝트 표식이 있다. 모든 해시가 OS 구현이라는 설명은 부정확하다. 기존 감사에서 확인한 파일·bytecode 체크섬 용도와 동일한 실행 코드이며, 별도 데이터 암호화 엔진이 추가된 근거는 없다. 실제 통신은 OS TLS/WebKit을 사용한다.

[Apple 공식 암호화 문서 요구 표](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/)는 OS 내 암호화 사용을 별도 구현과 구분한다. 따라서 이 정확한 산출물에 대해 기존 4번 권고를 유지한다. 이는 정적 기술 판단이며 실제 iOS crypto tracing, 법적 분류 확정, Apple 승인 완료를 의미하지 않는다.

## 남은 Apple 작업

부모의 유지된 App Store Connect 로그인에서 build **1.0.0 (13)**의 처리 상태를 읽고 수출 규정 답변을 완료해야 한다. 이 작업 환경에는 ASC 브라우저·API 읽기 도구가 노출되어 있지 않다. EAS submission 공식 API는 Apple 처리 상태를 반환하지 않으므로 이를 추정하지 않았다. 기존 서버 API key를 내려받거나 새 key를 만들지 않았다.

build 13을 실제 iPhone에서 검수하고 Guideline 2.1 추가정보 요청에 맞는 실제 기기 영상을 제출해야 한다. 기존 `docs/apple-review-pack-2026-10-01.md` 초안을 최종 build 13으로 갱신하고 심사자 접근 정보를 확인하는 작업은 부모가 관리한다. 이 작업에서 실사용자 계정 삭제 시험은 하지 않았다.
