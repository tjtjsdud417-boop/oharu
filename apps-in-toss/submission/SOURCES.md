# 공식 확인 자료

2026-09-30 원문 및 설치된 SDK 3.6.0 타입 선언을 확인했습니다.

- [SDK 3.x](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x): 설정 파일·webBundleDir·웹 빌드 뒤 ait build·Devtools.
- [시작하기](https://developers-apps-in-toss.toss.im/documentation/integration/getting-started): WebView/서버 API 역할, iframe 제한, mTLS.
- [Storage](https://developers-apps-in-toss.toss.im/documentation/common/file-storage/storage): 기기 로컬 저장, 토스 삭제 시 저장 데이터 삭제.
- [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame): 네이티브 탐색/뒤로가기/닫기, light mode, 자사 로그인 및 설치 유도 제한.
- [미니앱 등록](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace): 영문 앱명 15자, 제작자 10자, 로고 600×600, 세로 스크린샷 636×1048 최소 3장, 압축 해제 100MB 제한, 실제 테스트 필요, 기능별 딥링크.
- [UX 가이드](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide): 탭은 필수 아님. 존재하면 floating 형태 2–5개. 기존 화면에서 탭을 추가하지 않음.
- [소개 가이드](https://developers-apps-in-toss.toss.im/intro/guide): 플랫폼 개요 재확인.
- npm 공식 패키지 `@apps-in-toss/web-framework@3.6.0`의 `dist/index.d.ts`, `dist/config.d.ts`에서 사용 API 확인. 정확한 의존성 및 integrity는 package-lock.json.
