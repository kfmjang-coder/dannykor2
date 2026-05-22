# 아파트 테니스장 예약 시스템

노후 아파트 단지의 수기 테니스장 예약 대장을 웹으로 옮기는 프로젝트.

설계 문서: [`docs/DESIGN.md`](./docs/DESIGN.md)

## 요구 환경

- Node.js 20 이상 (개발은 22에서 검증)
- npm 10 이상

## 설치 & 초기화

```bash
npm install
npm run db:generate   # 스키마 → SQL 마이그레이션 파일 생성
npm run db:migrate    # data/app.db 생성 및 마이그레이션 적용
npm run db:seed       # settings 테이블에 기본값 시드
npm run seed:admin    # 첫 관리자 계정 생성 (이메일/비밀번호 prompt)
npm run dev           # http://localhost:3000
```

## 운영 파라미터

모두 `settings` 테이블에 저장되며 관리자 페이지에서 변경 가능 (M4 단계). 기본값은
`src/lib/settings-defaults.ts` 참고.

## 진행 상황

- [x] M0 설계 문서
- [x] M1 스캐폴딩 (DB 스키마, settings 시드, seed:admin)
- [ ] M2 로그인 / 비밀번호 변경 / 권한 가드
- [ ] M3 예약 생성·조회·취소 + 코트×시간 격자 UI
- [ ] M4 관리자 화면 (회원/예약/설정)
- [ ] M5 모바일 반응형
- [ ] M6 배포
