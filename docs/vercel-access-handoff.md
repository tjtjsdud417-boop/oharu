# 기존 Oharu 웹 배포 권한 인수

**2026-10-01 후속 확인:** 같은 기존 계정·동일 프로젝트로 재시도한 배포가 성공했다. 아래는 과거 거절 당시 기록이며 현재 차단 상태가 아니다. 새 계정/token/권한 변경은 없었다. 원인은 확인되지 않았다. [현재 운영 검증](release-2026-10-01.md).

## 확인한 사실

- 기존 CLI identity: `tjtjsdud417-3291`.
- 정확한 frontend: scope `moodweb`, project `oharu`, ID `prj_LfIMV5Vk0OpSAaz1hjH71J2pbCc0`, org `team_XIhamC09IOC4J0rnxpDQOilm`.
- 도메인 `https://oharu.today`, 배포 입력은 저장소의 **web/**. 별도 admin 프로젝트는 `prj_nNLIzW2ZCZOEBkTH9iqumHUR3kaN`이며 대상이 아니다.
- `vercel whoami` 및 `vercel project inspect oharu --scope moodweb`는 기존 세션으로 성공했다. 하지만 후속 frontend 배포 요청은 정확히 **`Not authorized`**로 거절됐다.
- 이 응답에는 권한 역할·토큰 범위·조직 정책 중 어느 것이 원인인지 판별할 상세 근거가 없었다. 읽기 성공은 쓰기 권한 증거가 아니다. 재로그인으로 해결된다고 확인하지 않았다.
- 마지막 바이트 검증된 운영 snapshot은 `d8b2888`, deployment `dpl_6C4MJanmLcpsGF6rfiZ3HvumPHu4`. 이후 게스트 저장 복사 수정은 배포되지 않았다. GitHub admin 성공 상태를 frontend 성공으로 대체하지 않는다.

## 사용자 또는 기존 프로젝트 관리자의 최소 조치

1. 기존 Vercel 관리 화면에서 위 **정확한 frontend project ID**와 `moodweb`에 대해 `tjtjsdud417-3291`의 현재 배포 가능 여부를 확인한다. 조직 전체 권한 확대나 새 계정이 필요한 것으로 단정하지 않는다.
2. 해당 사용자에게 이미 의도된 배포 권한이 있는지 확인하고, 제한이 있다면 **이 프로젝트의 필요한 배포 권한에 한정해** 관리자/사용자가 처리한다. 새 token·OAuth grant·계정 연결이 요구되면 그 구체 권한을 먼저 검토한다. 기존 권한으로도 거절되면 이 오류와 project/deployment 식별자로 Vercel 지원에서 원인을 확인한다.
3. 원인과 권한이 확인된 뒤 동일 계정·동일 web 프로젝트로 배포를 재시도한다. Ready 확인 및 실제 도메인의 파일 SHA256 비교 후에만 수정 배포 완료로 기록한다.

이 문서는 권한 변경을 실행하지 않는다. 다른 계정/token/배포 경로로 거절을 우회하거나 인증정보를 보고서에 복사하지 않았다. 최신 소스는 PR #1 및 release branch에 보존돼 있다.
