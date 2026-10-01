# 후속 초기화 검토 — 런타임 변경 없음

검토 커밋은 `d8b288883651a49a4de56cb56f608fa148a2df0a` 및 `65626f08f51db6a38c0f104378dbaea51693d8f3`입니다. 원본/메인 working tree를 읽어 섞지 않았고 고정 커밋 diff만 읽었습니다.

- `d8b2888`: 알림 취소 이후 재확인, 권한 응답 식별/소유자 처리. Toss에는 알림 구현이 없어 적용하지 않았습니다.
- `65626f0`: mobile HTML의 누락된 currentUserId 선언 및 auth 경계 대입, Supabase CDN import 제거와 로컬 SDK 포함, 원격 폰트 비차단 로드. Toss는 이 모바일 HTML을 사용하지 않습니다.
- Toss의 `currentUserId`는 `src/app.js`의 repo 선언에서 null로 초기화되고 사용·render·startApp보다 먼저 실행됩니다. 서버 계정 로그인은 하지 않으며 이 값으로 저장소 권한을 부여하지 않습니다.
- Toss SDK는 ESM static import 후 Vite bundle에 포함됩니다. Supabase와 CDN 모듈 import는 없습니다. 실제 기기 bridge가 준비되었는지는 별도 SDK 약속이며 본 검증을 실제 Toss 통과로 간주하지 않습니다.
- initialize는 익명 키 응답 → 해당 namespace Storage 읽기 → repository → startApp 순서로 await합니다. 응답 지연/실패 시 guest namespace를 대신 열거나 저장 데이터를 빈 배열로 덮어쓰지 않는 테스트를 추가했습니다.
- 기존 snapshot의 index/CSS/icon 3개는 `8c58b86`→`65626f0`에서 `git diff --exit-code` 0으로 내용 동일을 확인했습니다. 기준 snapshot을 불필요하게 교체하지 않았습니다.

검증: Node 테스트 7/7 통과(새 초기화 순서·identity 실패·storage 실패 테스트 3개 포함). 새 브라우저/빈 Storage의 AIT Devtools에서 모든 외부 HTTP 요청 차단 상태로 cold startup 통과, 외부 요청 시도 0, page error 0. 첫 항목 추가와 새로고침 유지도 확인했습니다. 이는 Devtools 모의 bridge 검증이며 실제 Toss QR/네이티브 bridge 오프라인 동작 보증은 아닙니다.

메인의 EAS 빌드 자원을 고려해 npm install, Vite production build, ait build를 반복하지 않았습니다. 런타임 소스와 배포 번들은 변경하지 않았습니다. 테스트와 검토 문서만 추가했습니다.

현재 번들: `oharu.ait` 45,176 bytes, SHA256 `9013f207738e9cf320af225df58cacac1019ff05ecf753d829dda3b35bbaa7d4` (이전 전달본과 동일).

기존 출시 gate 유지: 실제 Toss QR 테스트, native root close/safe area/익명 사용자 전환 확인, 운영 정보·약관·개인정보 및 appName 확정, 별도 승인된 업로드·심사·출시.
