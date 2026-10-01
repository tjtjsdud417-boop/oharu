# 8c58b86 고정 커밋 동기화 검토

기준: `0e9ef40e8628401714b96d76dd7b411e7c0b1def` → `8c58b86f12ff0bb02c935bdcfc0f87d6bc256ae5`.

원본/메인 tree에 쓰지 않았습니다. 진행 중인 추가 알림 수정은 읽거나 포함하지 않았습니다. git diff/show의 대상은 위 두 SHA뿐입니다. 최초 스냅샷 정보는 `previous-snapshot.json`, 상세 diff는 `upstream-8c58b86.patch`입니다.

| 변경 | Toss 적용 판단 |
|---|---|
| MCP 호환성 안내, 토큰 URL 제거 | 기준 index 스냅샷을 갱신. Toss에는 MCP 진입/구현이 없으므로 신규 기능 미노출 |
| Supabase sign-out/user-switch 알림 정리 | Toss는 Supabase auth·알림을 로드하지 않아 불필요. 관련 코드 계속 제거 |
| reminders snapshot/ledger/retry/ACK/desktop status | 미지원 알림에 관한 수정. 파일 가져오지 않음 |
| theme owner/generation/preview/undo 경계 | 계정/테마 기능 없음. 파일 가져오지 않음 |
| desktop/mobile runtime 및 dependency 수정 | 별도 플랫폼 대상. 가져오지 않음 |
| 할 일 CRUD/달력/IME/기본 CSS | 해당 diff에 행동 변경 없음. 현재 Toss 저장 adapter 유지 |

스냅샷 3파일(index, 기존 icon, theme CSS)의 커밋·해시를 갱신했습니다. theme CSS와 icon의 내용은 변하지 않았으며 기준 자료일 뿐 런타임에 주입하지 않습니다. 알림/계정 연동을 억지로 추가하지 않았습니다.

후속 검증: repository 4개 테스트, JS 문법, Vite/ait 빌드, 실제 AIT Devtools 추가/완료/삭제/재로드 유지/IME/달력 직접 진입/360px overflow/라이트 모드 및 미지원 조작 부재를 확인했습니다. 설정에는 '기기 간 동기화 안 됨', '계정 동기화 · 알림 · 결제는 제공하지 않아요.'가 표시되며 설정의 버튼/링크/input은 0개입니다.

픽셀 검수 시 최초 캡처가 전환 애니메이션 중간 상태임을 발견해 안정 상태로 다시 캡처했습니다. 개발 도구 패널만 숨겼고 실제 앱 내용을 조작하거나 네이티브 바를 합성하지 않았습니다. 로고와 3장 스크린샷 모두 규격·불투명도·실제 이미지 열기 검수를 통과했습니다.

남은 gate: appName/계정 자격 확인, 운영주체·문의·약관·개인정보 확정, 실제 Toss QR·기기별 safe area·root close·익명 사용자 전환 검증, 사용자 승인된 업로드/심사/출시. 이번에는 외부 등록·업로드를 실행하지 않았습니다.
