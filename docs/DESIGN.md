# 아파트 테니스장 예약 시스템 - 설계 문서

> 마지막 갱신: 2026-05-22

## 1. 개요

### 1.1 목적
노후 아파트 단지의 테니스장 예약을 관리실 수기 대장에서 **웹 기반 예약 시스템**으로 전환하여 주민의 편의성을 높이고 관리실의 업무 부담을 줄인다.

### 1.2 범위 (MVP)
- 주민 로그인
- 예약 생성/조회/취소 (2면 코트 × 1시간 단위 슬롯)
- 관리자에 의한 회원 승인 및 예약 수정/삭제
- **모든 운영 파라미터를 관리자 페이지에서 변경 가능** (운영 시간, 코트 수, 인원 범위, 예약 가능 기간, 취소 마감)
- 예약 규칙 자동 검증

### 1.3 비범위 (이후 확장)
- 모바일 앱
- 결제(유료화)
- 카카오/SMS 알림
- 통계 대시보드
- 노쇼(no-show) 페널티 시스템

---

## 2. 기술 스택

| 구분 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | 풀스택 한 번에, 빠른 프로토타이핑 |
| 언어 | TypeScript | 타입 안전성 |
| DB | SQLite (better-sqlite3) | 운영 부담 없음, 단일 파일 백업 |
| ORM | Drizzle ORM | 가볍고 SQL에 가까움 |
| 인증 | iron-session (쿠키 기반) | 외부 의존성 최소화 |
| 비밀번호 해싱 | bcryptjs | 표준 |
| UI | Tailwind CSS + shadcn/ui | 기본 컴포넌트 빠르게 |
| 폼/검증 | react-hook-form + zod | 표준 |
| 배포 | (TBD) Vercel 또는 자체 서버 | MVP 검증 후 결정 |

---

## 3. 운영 파라미터 (모두 관리자 페이지에서 조정)

다음 값들은 코드 상수가 아닌 **DB `settings` 테이블의 키–값**으로 저장하며, 관리자 페이지에서 변경 가능. 변경 즉시 모든 검증 로직에 반영된다.

| 키 | 기본값 | 설명 |
|----|--------|------|
| `operating_hour_start` | 6 | 운영 시작 시(0–23) |
| `operating_hour_end` | 22 | 운영 종료 시(exclusive) |
| `court_count` | 2 | 코트 면 수 |
| `party_size_min` | 1 | 1예약 최소 인원 |
| `party_size_max` | 4 | 1예약 최대 인원 (단/복식 모두 허용) |
| `reservation_horizon_days` | 30 | 오늘로부터 며칠 후까지 예약 가능 |
| `cancel_deadline_hours` | 6 | 예약 시작 몇 시간 전까지 취소 가능 |
| `daily_reservation_limit_per_user` | 1 | 1인당 하루 가능한 예약 수 (코트 무관) |

**코트 수 변경 주의**: 코트 수를 줄일 때 이미 존재하는 미래 예약과 충돌하면 변경 거절하고 관리자에게 어느 예약을 정리해야 하는지 보여준다.

---

## 4. 사용자 시나리오

### 4.1 주민 (User)
1. 관리자가 발급한 계정 정보(동/호수 + 임시 비밀번호)로 로그인
2. 첫 로그인 시 비밀번호 변경 (강제)
3. 날짜 선택 → 코트별/시간별 슬롯 표 확인 → 빈 슬롯 클릭 → 인원수 입력 → 예약
4. 내 예약 목록 조회 / 취소 (시작 `cancel_deadline_hours` 시간 전까지)

### 4.2 관리자 (Admin)
1. 이메일(또는 동/호수) + 비밀번호로 로그인
2. **회원 관리**: 가입 승인/거절, 비밀번호 초기화, 계정 잠금, 신규 계정 직접 등록
3. **예약 관리**: 전체 예약 조회/검색, 수정, 강제 취소, 수기 대장 마이그레이션 입력
4. **설정 관리**: §3의 운영 파라미터 변경

---

## 5. 데이터 모델

### 5.1 users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| dong | TEXT | 동 (관리자는 NULL 가능) |
| ho | TEXT | 호 (관리자는 NULL 가능) |
| email | TEXT | 관리자/연락 용도. 일반 주민은 선택 |
| name | TEXT NOT NULL | 이름 |
| phone | TEXT | 연락처 (선택) |
| password_hash | TEXT NOT NULL | bcrypt 해시 |
| role | TEXT NOT NULL DEFAULT 'user' | 'user' \| 'admin' |
| status | TEXT NOT NULL DEFAULT 'pending' | 'pending' \| 'active' \| 'suspended' |
| must_change_password | INTEGER NOT NULL DEFAULT 1 | 첫 로그인 시 변경 강제 |
| created_at | INTEGER NOT NULL | epoch ms |
| approved_at | INTEGER | |

**제약**:
- `UNIQUE(dong, ho)` (둘 다 NULL이 아닌 행에 한해 — partial unique index)
- `UNIQUE(email)` (NULL이 아닌 행에 한해)

**로그인 식별자**: 동/호수 + 비밀번호, 또는 이메일 + 비밀번호. 로그인 폼에서 둘 다 시도.

### 5.2 reservations
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| user_id | INTEGER NOT NULL FK→users.id | |
| court_id | INTEGER NOT NULL | 1, 2, ... (`court_count`까지) |
| date | TEXT NOT NULL | 'YYYY-MM-DD' (KST 기준) |
| start_hour | INTEGER NOT NULL | 0–23 (시작 정시) |
| end_hour | INTEGER NOT NULL | 현재 항상 start_hour + 1 |
| party_size | INTEGER NOT NULL | `party_size_min`–`party_size_max` |
| status | TEXT NOT NULL DEFAULT 'active' | 'active' \| 'cancelled' |
| note | TEXT | 관리자 비고 |
| created_at | INTEGER NOT NULL | |
| created_by | INTEGER NOT NULL FK→users.id | 본인 또는 관리자 |
| cancelled_at | INTEGER | |
| cancelled_by | INTEGER FK→users.id | |

**제약**:
- Partial unique index: `(court_id, date, start_hour) WHERE status='active'`
  → 같은 코트·날짜·시간에 active 예약 1개만 허용 (race condition 차단)

### 5.3 settings
| 컬럼 | 타입 | 설명 |
|------|------|------|
| key | TEXT PK | §3의 키 |
| value | TEXT NOT NULL | JSON 또는 단순 문자열 |
| updated_at | INTEGER NOT NULL | |
| updated_by | INTEGER FK→users.id | |

마이그레이션 시 §3의 기본값으로 시드.

### 5.4 audit_log (V1.1, 우선 미포함)
관리자 액션 추적. MVP에서는 reservations.created_by/cancelled_by + settings.updated_by 로 대체.

---

## 6. API 설계

모두 Next.js Route Handlers. 인증은 iron-session 쿠키.

### 6.1 인증
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | `{ identifier, password }` — identifier는 `"동-호"`("101-1502") 또는 이메일 |
| POST | `/api/auth/logout` | |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }` |

### 6.2 설정 (모두 공개 GET, 변경은 관리자만)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/settings` | 현재 운영 파라미터 조회 (UI 렌더링에 사용) |
| PUT | `/api/admin/settings` | `{ key, value }` 일괄 수정. court_count 축소 시 충돌 검사 |

### 6.3 예약 (사용자)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/reservations?date=YYYY-MM-DD` | 해당 날짜 모든 코트의 active 예약. 본인 여부 플래그 포함 |
| GET | `/api/reservations/mine` | 내 예약 (다가오는/지난 분리) |
| POST | `/api/reservations` | `{ date, courtId, startHour, partySize }` |
| DELETE | `/api/reservations/:id` | 본인 + `cancel_deadline_hours` 전까지만 |

### 6.4 관리자
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/users?status=pending` | 회원 목록 (필터링) |
| PATCH | `/api/admin/users/:id` | status / role 변경 |
| POST | `/api/admin/users` | 신규 계정 생성 (동/호수/이름/임시PW) |
| POST | `/api/admin/users/:id/reset-password` | 임시 비밀번호 발급 |
| GET | `/api/admin/reservations?from=&to=&userId=&courtId=` | 전체 검색 |
| POST | `/api/admin/reservations` | 관리자 직접 입력 (수기 대장 마이그레이션) |
| PATCH | `/api/admin/reservations/:id` | 수정 (규칙 우회 가능, 단 partial unique index는 유효) |
| DELETE | `/api/admin/reservations/:id` | 강제 취소 |

---

## 7. 화면 구성

### 7.1 사용자
- `/login` — 로그인 (동-호수 / 이메일 둘 다 받는 단일 입력란)
- `/password/change` — 첫 로그인 시 강제 이동
- `/` — 날짜 선택 + **코트 2면 × 시간 슬롯 격자**
  - 각 셀: 비어있음(클릭 가능) / 본인 예약(취소 버튼) / 타인 예약(비활성)
  - 예약 가능 기간(`reservation_horizon_days`)을 넘는 날짜는 비활성
- `/me/reservations` — 내 예약 목록 (다가오는 / 지난)

### 7.2 관리자
- `/admin` — 대시보드 (오늘 코트별 예약 현황, 승인 대기 회원 수)
- `/admin/users` — 회원 목록, 승인/거절, 비밀번호 초기화, 신규 등록
- `/admin/reservations` — 전체 예약 검색·수정·삭제. 과거 날짜 입력 모드
- `/admin/settings` — §3 파라미터 편집

---

## 8. 검증 로직

```
POST /api/reservations:
1. 로그인 + status='active'
2. settings 조회 (S)
3. courtId in [1..S.court_count]
4. S.operating_hour_start <= startHour < S.operating_hour_end
5. S.party_size_min <= partySize <= S.party_size_max
6. (오늘 KST) <= date <= (오늘 + S.reservation_horizon_days)
7. (user_id, date, status='active')의 active 예약 수 < S.daily_reservation_limit_per_user
8. 트랜잭션 INSERT — partial unique index가 슬롯 중복 race 차단

DELETE /api/reservations/:id (본인):
- 본인 예약 + status='active'
- now < (date+startHour 시각 − S.cancel_deadline_hours)
- UPDATE status='cancelled', cancelled_at=now, cancelled_by=self
```

관리자 라우트는 §3 파라미터 검증을 건너뛴다 (시간 외 입력, 과거 날짜 마이그레이션 허용). 단 partial unique index로 동일 슬롯에 active 둘은 불가 — 기존 것을 먼저 cancel 처리.

`court_count` 축소 시: `court_id > 새 값`이고 `status='active'`이며 `date >= 오늘`인 예약을 찾아 충돌 보고. 0건이면 변경 적용.

---

## 9. 보안

- 비밀번호: bcrypt cost 10, 최소 8자
- 세션: iron-session (HttpOnly, Secure, SameSite=Lax, 30일)
- CSRF: SameSite=Lax + POST origin 검사
- 권한 검사는 보호 라우트 핸들러 첫 줄에서 명시적으로
- 비밀번호 초기화 등 민감 액션 rate limit (메모리 카운터로 MVP)
- 입력 검증은 zod 서버 측에서 항상 수행
- SQL Injection: Drizzle prepared statements

---

## 10. 디렉토리 구조 (예정)

```
/
├── docs/
│   └── DESIGN.md
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (user)/page.tsx                  # 코트×시간 격자
│   │   ├── (user)/me/reservations/page.tsx
│   │   ├── admin/page.tsx
│   │   ├── admin/users/page.tsx
│   │   ├── admin/reservations/page.tsx
│   │   ├── admin/settings/page.tsx
│   │   └── api/
│   │       ├── auth/{login,logout,change-password}/route.ts
│   │       ├── settings/route.ts
│   │       ├── reservations/{route,[id]/route,mine/route}.ts
│   │       └── admin/{users,reservations,settings}/...
│   ├── db/
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   └── migrations/
│   ├── lib/
│   │   ├── session.ts
│   │   ├── auth.ts
│   │   ├── settings.ts            # 캐시 + 무효화
│   │   ├── reservation-rules.ts
│   │   └── kst.ts
│   └── components/
├── scripts/
│   └── seed-admin.ts              # 이메일/비밀번호 prompt
├── data/
│   └── app.db                     # gitignored
└── package.json
```

---

## 11. 운영 절차

1. **초기 관리자**: `npm run seed:admin` 실행 → 이메일(`kfmjang@gmail.com`)·이름·비밀번호 입력 → role='admin', status='active' 계정 생성
2. **수기 대장 마이그레이션**: 관리자가 `/admin/reservations`에서 과거 날짜로 일괄 입력
3. **백업**: SQLite 파일을 일 1회 cron으로 복사 (운영 단계 결정)

---

## 12. 마일스톤

| 단계 | 산출물 | 검증 |
|------|--------|------|
| M0 | 설계 문서 (현재) | 사용자 확인 |
| M1 | 프로젝트 스캐폴딩, DB 스키마, settings 시드, seed:admin | `npm run dev` 동작 |
| M2 | 로그인 / 비밀번호 변경 / 권한 가드 | 수동 시나리오 |
| M3 | 예약 생성/조회/취소 + 코트×시간 격자 UI + 검증 규칙 | 자동화 + 수동 |
| M4 | 관리자 화면 (회원/예약/설정) | 수동 시나리오 |
| M5 | UI 다듬기, 모바일 반응형 | 휴대폰 확인 |
| M6 | 배포 + 백업 cron | 실 사용 시작 |

---

## 13. 확정된 의사결정

| 항목 | 값 | 비고 |
|------|-----|------|
| 코트 수 | 2 | 관리자 변경 가능 |
| 1예약 인원 | 1–4명 | 관리자 변경 가능 |
| 예약 가능 기간 | 오늘 + 30일 | 관리자 변경 가능 |
| 취소 마감 | 시작 6시간 전 | 관리자 변경 가능 |
| 운영 시간 | 06:00–22:00 | 관리자 변경 가능 |
| 1인 1일 한도 | 1슬롯 (코트 무관) | 관리자 변경 가능 |
| 첫 관리자 | kfmjang@gmail.com | seed:admin 실행 시 입력 |
| 로그인 방식 | 동-호 또는 이메일 | 관리자는 이메일 사용 |
| 기술 스택 | Next.js 14 + SQLite + Drizzle | 변경 없음 |
