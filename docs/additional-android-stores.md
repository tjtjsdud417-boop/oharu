# 추가 Android 배포 대상 경계

2026-09-30 상위 마켓 조사 인계 사항. 별도 스토어 빌드·계정 생성·패키지 변경·제출은 실행하지 않았다.

| 대상 | 준비 상태 / 필요한 확인 |
|---|---|
| Galaxy Store | 후보. 현재 Play/EAS 패키지 존재만으로 등록 준비 완료가 아니다. 실제 Corporate Commercial Seller 자격, 적용 국가의 Android Developer Verification, 기존 서명 fingerprint 등록과 업데이트 정책을 확인해야 한다. |
| Huawei AppGallery | 후보. HMS-only 기기에서 FCM/Google 로그인 지원을 가정하지 않는다. 로그인·원격 push provider별 어댑터, 서명 및 동일 package 정책 검토 후 별도 기기 검증이 필요하다. |
| Amazon | 일반 Android 휴대폰 출시 목록에서 제외. 상위 조사상 2025-08-20 일반 Android 배포 종료; Fire는 별도 대상이며 Fire OS 실기기/알림 provider 검증이 없다. |

현재 모바일 기능은 Expo **로컬 예약 알림**과 Android AppWidget이다. APNs/FCM 원격 push 시스템을 구축·검증했다는 뜻이 아니다. 향후 Expo Android 원격 push의 FCM 의존성을 HMS/Fire에서도 지원된다고 확대 해석하지 않는다. 로그인·토큰 발급·원격 전달 provider는 native reminder/widget 모듈과 별도 계층으로 유지한다.

기존 식별자 `com.oharu.today`, EAS owner `saiapp` 및 기존 서명을 임의로 바꾸지 않는다. 실제 signing fingerprint는 승인된 산출물에서 확인하여 각 공식 콘솔에 필요한 최소 정보만 등록한다. 비밀 키/keystore를 등록 문서나 공개 저장소에 넣지 않는다. 구체 공식 근거·등록팩은 상위 마켓 조사 문서와 함께 확정한다.
