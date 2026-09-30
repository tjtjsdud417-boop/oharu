# 브라우저가 열려 있지 않을 때의 알림 준비

현재 `web/reminders.js`는 페이지 실행 중 알림이고 `web/sw.js`에는 알림 클릭 처리만 있다. **서버 Web Push는 미구현·미배포**다. 서비스워커 등록만으로 예약 시각에 실행되지는 않는다. Push API는 페이지가 로드되지 않은 상태에서도 서버 메시지를 받을 수 있지만 OS 강제 종료·네트워크·전원·브라우저 정책까지 보장하지 않는다. [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

## 승인 없이 준비한 코드

`push-draft/protocol.cjs`는 운영과 분리한, 네트워크/키 생성이 없는 실행 가능한 프로토콜 초안이다. `node --test push-draft/protocol.test.cjs` 5/5 통과.

- 구독 endpoint의 정확한 HTTPS provider host allowlist 및 키 형식 검사. 임의 URL을 서버 요청 대상으로 쓰지 않는다. 실제 provider 목록은 빈 값으로 두어 기본 거부한다.
- 서버 작업은 owner·todo·subscription·revision·UTC dueAt을 비교한다. 편집/삭제/완료/옵트아웃/과거 일정은 무효다. `claimCurrent`는 DB 원자적 비교와 durable lease를 구현해야 하는 인터페이스이며 현재 DB 구현은 없다.
- 전송 payload에는 할 일 내용이나 사용자 ID 대신 delivery ID만 포함한다. TTL은 예정 시각 이후 5분까지다. provider 404/410은 구독 만료, 401/403은 설정 오류, 429/5xx는 지수 backoff 재시도 대상으로 분리한다. [Web Push protocol](https://web.dev/articles/push-notifications-web-push-protocol).
- 표시 직전에 인증된 서버에서 현재 상태를 다시 조회하고, IndexedDB 등의 durable delivery claim으로 중복을 막도록 인터페이스를 분리했다. 알림 문구는 일반 문구이고 외부 URL을 열지 않는다. 서버를 조회하지 못하면 개인정보·취소된 내용을 추측해서 표시하지 않는다. 이 설계는 오프라인 알림 누락 가능성을 명시적으로 선택하며 정확히 한 번의 OS 전달을 보장하지 않는다.
- 현재 테스트는 주입한 저장소/전송 어댑터로 프로토콜을 검증한다. 실제 DB 트랜잭션, VAPID 전송, SW/IndexedDB 통합이나 OS 수신을 통과했다고 해석하면 안 된다.

## 실제 연결 전 필요한 작업과 승인

`push-draft/config.example.json`은 enabled=false이고 키/secret/provider가 없다. 코드에서 자동 키 생성·원격 변경을 하지 않는다.

1. 사용자 승인 후 장기 VAPID 서명 키의 생성/보관 책임자와 운영 연락처를 정한다. 브라우저에는 public key만 배포한다. Supabase service key 및 VAPID private key를 웹 번들·로그에 넣지 않는다.
2. 기존 Supabase 사용자 인증을 확인하는 구독 API, owner RLS, 구독 폐기/로그아웃 정책, CSRF 방어, per-device 서버 상태 조회 권한을 구현한다. URL 구독 endpoint 자체가 capability이므로 저장·로그 노출을 제한한다. 새 지속 접근 발급은 별도 승인한다.
3. 원자적 outbox/lease·revision 갱신·재시도 저장소 및 서버 스케줄러가 필요하다. 기존 DB 테이블/정책를 조사한 뒤 **추가형 migration 초안 검토**부터 진행하며 여기서는 적용하지 않았다. 권한 없는 cron/service 접근을 만들지 않는다.
4. 사용자가 명시적으로 누르는 권한 버튼, push subscription 저장/해제, SW push/notificationclick 및 durable display 기록을 연결한다. 현재 운영 SW는 변경하지 않았다. iPhone은 지원 OS의 홈 화면 웹앱과 사용자 동작 권한 요청이 필요하며 실제 iPhone 검증을 해야 한다.
5. 권한 거부/철회, 404/410, 계정 변경, 일정 수정·삭제·완료, 서버 전송 중 취소, 동시 worker/재시작, 시간대 변경, offline TTL, iPhone/Android/desktop 실제 수신을 검증한 뒤에만 활성화한다. Vercel 쓰기 권한 복구도 선행 조건이다.

새 credential·DB 정책·스케줄러·구독은 생성하지 않았다. 기존 93개 검증과 Android6/iOS10·Windows 최종 산출물은 바꾸지 않는다.
