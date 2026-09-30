# Oharu 운영 확인 — 2026-09-30

## 배포 대상과 성공 기준

- GitHub: `tjtjsdud417-boop/oharu`. 변경은 이 저장소에만 반영한다.
- 프런트엔드: Vercel `moodweb/oharu`, 프로젝트 `prj_LfIMV5Vk0OpSAaz1hjH71J2pbCc0`.
- 정식 도메인: https://oharu.today (www 및 oharu.vercel.app도 동일 배포 별칭).
- `admin`은 별개 프로젝트 `prj_nNLIzW2ZCZOEBkTH9iqumHUR3kaN`. GitHub의 admin 성공 상태만으로 웹 배포 성공을 판단하지 않는다.
- 배포는 반드시 `web/`에서 실행하며, 배포 전 변경을 커밋하고 해당 디렉터리의 프로젝트 연결을 확인한다. 다른 프로젝트 파일을 섞지 않는다.
- 완료 조건: 새 production 배포 Ready, 정식 도메인에서 새 기능 확인, Supabase DNS 및 인증·동기화 실제 성공을 각각 확인한다.

## 확인된 현황

기존 Vercel CLI 인증과 GitHub 인증은 읽기 전용 호출에 성공했다. 9월 30일 확인 당시 웹 production은 `dpl_6myBC7YpYmkEeTsVwSLA86xjUhWr`, `oharu-hwyvx4njr-moodweb.vercel.app`이고 상태는 Ready였다(9월 17일 생성). 이 상태는 백엔드 정상 동작을 보장하지 않는다.

공개 웹 HTML과 로컬 HTML 모두 Supabase 호스트 `tcaghsjndfaxlsgaqrdi.supabase.co`를 사용한다. 로컬 DNS, Google DNS, Cloudflare DNS 모두 이름을 찾지 못했다. 두 공개 DNS의 응답 상태는 NXDOMAIN(3)이었다. 프로젝트 일시중지·삭제·도메인 변경 여부는 관리 콘솔 확인 전에는 단정할 수 없다.

이 작업자의 Supabase 커넥터 조회에는 Oharu가 없었지만, 상위 담당자가 별도 기존 도구·계정에서 09:14 UTC에 프로젝트 `tcaghsjndfaxlsgaqrdi`, 이름 `oharu`, 리전 `ap-southeast-1`, 상태 `INACTIVE`를 확인했다. 따라서 현재는 프로젝트 비활성 상태가 확인된 차단 요인이며, 추가 인증을 요청할 필요 없이 해당 담당자가 안전한 재개 절차를 확인 중이다. 다른 프로젝트는 수정하지 않았다.

GitHub keepalive 최근 7회가 실패했고, [최신 실패 로그](https://github.com/tjtjsdud417-boop/oharu/actions/runs/36668196718)는 curl exit 6(호스트 해석 실패)이었다. `SUPABASE_URL`, `SUPABASE_ANON_KEY` 시크릿 이름은 존재한다. 값은 출력하거나 변경하지 않았다. 가려진 시크릿 URL이 프런트엔드 URL과 일치하는지는 기존 로그로 확인할 수 없다.

## 변경 내용과 검증

워크플로가 프런트엔드의 공개 프로젝트 주소를 추출하고 기존 URL 시크릿과 비교한다. 주소 불일치·키 누락·DNS·네트워크·HTTP 실패를 구분한다. DNS와 일시적 네트워크/429/5xx에는 제한된 재시도를 적용하고 작업 전체에 5분 제한을 둔다. 시크릿을 셸 코드에 직접 보간하지 않고 환경변수로 전달한다.

요청은 기존 anon key로 `todos`에 HEAD 조회만 보낸다. 데이터 본문은 요청하지 않고 RLS를 변경하지 않는다. 리디렉션은 거부하며 키·응답 본문은 기록하지 않는다. 서비스 역할 키 대체, 새 인증정보 발급, DB 쓰기는 하지 않는다.

로컬 검증: `node --check scripts/keepalive.mjs`, `node --test scripts/keepalive.test.mjs`. 테스트는 URL 혼선 차단, 키 누락, DNS 재시도, 자격증명 전송 전 실패, HEAD/리디렉션 거부, 네트워크·429·5xx 재시도 및 401 즉시 실패를 검사한다. 실제 GitHub 새 실행은 변경 push 후 별도로 확인해야 한다.

## 남은 운영 조치

1. 기존 Supabase 관리 권한으로 해당 프로젝트 상태를 확인한다. 복원·일시중지 해제의 데이터·비용 영향을 확인한다. 프로젝트를 새로 만들거나 DB를 삭제하지 않는다.
2. 프로젝트가 복구되면 공개 DNS와 사용자 로그인·기존 데이터 동기화를 다시 확인한다.
3. 새 keepalive workflow를 수동 실행하고 성공 로그를 기록한다. 일정 실행은 09:00 KST를 목표로 하지만 GitHub 스케줄 지연이 가능하며 예약 알림 엔진으로 쓰면 안 된다.
4. 시크릿 불일치가 확인될 때만 승인된 기존 자격증명으로 정정한다. URL을 추측하거나 DNS 실패를 성공으로 처리하지 않는다.

현재 판정: 배포 대상 식별 및 진단 코드 검증 가능. Supabase 실제 서비스 정상화와 새 CI 실행 성공은 아직 미검증/차단 상태다.
