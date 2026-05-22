# 아파트 테니스장 예약 시스템 - 설계 문서

## 1. 개요

### 1.1 목적
노후 아파트 단지의 테니스장 예약을 관리실 수기 대장에서 **웹 기반 예약 시스템**으로 전환하여 주민의 편의성을 높이고 관리실의 업무 부담을 줄인다.

### 1.2 범위 (MVP)
- 주민 로그인
- 예약 생성/조회/취소
- 관리자에 의한 회원 승인
- 관리자에 의한 모든 예약 수정/삭제
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

## 3. 사용자 시나리오

### 3.1 주민 (User)
1. 관리자가 발급한 계정 정보(동/호수, 임시 비밀번호)로 로그인
2. 첫 로그인 시 비밀번호 변경
3. 날짜 선택 → 비어있는 시간 슬롯 확인 → 인원수 입력 → 예약
4. 본인 예약 목록 조회 / 취소 (예약 시작 1시간 전까지)

### 3.2 관리자 (Admin)
1. 관리자 계정으로 로그인
2. **회원 관리**: 가입 신청 승인/거절, 비밀번호 초기화, 계정 잠금
3. **예약 관리**: 전체 예약 조회, 수정, 강제 취소 (수기 대장 마이그레이션 포함)
4. **운영 설정**: 운영 시간, 휴장일 설정 (V2)

---

## 4. 데이터 모델

### 4.1 users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| dong | TEXT NOT NULL | 동 (예: "101") |
| ho | TEXT NOT NULL | 호 (예: "1502") |
| name | TEXT NOT NULL | 입주민 이름 |
| phone | TEXT | 연락처 (선택) |
| password_hash | TEXT NOT NULL | bcrypt 해시 |
| role | TEXT NOT NULL DEFAULT 'user' | 'user' \| 'admin' |
| status | TEXT NOT NULL DEFAULT 'pending' | 'pending' \| 'active' \| 'suspended' |
| must_change_password | INTEGER NOT NULL DEFAULT 1 | 첫 로그인 시 변경 강제 |
| created_at | INTEGER NOT NULL | epoch ms |
| approved_at | INTEGER | |

**제약**: `UNIQUE(dong, ho)` — 한 세대당 1계정

### 4.2 reservations
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| user_id | INTEGER NOT NULL FK→users.id | |
| date | TEXT NOT NULL | 'YYYY-MM-DD' (KST 기준) |
| start_hour | INTEGER NOT NULL | 0–23 (시작 시각, 정시) |
| end_hour | INTEGER NOT NULL | start_hour + 1 (현재는 항상 1시간) |
| party_size | INTEGER NOT NULL | 인원수 (1–4 검증) |
| status | TEXT NOT NULL DEFAULT 'active' | 'active' \| 'cancelled' |
| note | TEXT | 관리자 비고 (수기 대장 마이그레이션 시 사용) |
| created_at | INTEGER NOT NULL | |
| created_by | INTEGER NOT NULL FK→users.id | 본인 또는 관리자 |
| cancelled_at | INTEGER | |
| cancelled_by | INTEGER FK→users.id | |

**제약 (애플리케이션 레벨)**:
- 중복 예약 방지: `(date, start_hour)`에 `status='active'`인 행이 이미 있으면 거절
  - DB 레벨에서는 partial unique index로 강제:
    `CREATE UNIQUE INDEX uniq_active_slot ON reservations(date, start_hour) WHERE status = 'active'`
- 1인 1일 1회: 같은 `user_id`+`date`에 `status='active'` 행이 이미 있으면 거절 (관리자 예외)
- 운영 시간: `06 <= start_hour < 22`

### 4.3 audit_log (V1.1 확장)
관리자 액션 추적. MVP에서는 reservations.created_by/cancelled_by로 대체.

---

## 5. API 설계

모두 Next.js Route Handlers (`app/api/.../route.ts`).
인증은 `iron-session` 쿠키. 보호 라우트는 미들웨어로 검증.

### 5.1 인증
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | `{ dong, ho, password }` → 세션 발급 |
| POST | `/api/auth/logout` | 세션 파기 |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }` |

### 5.2 예약 (사용자)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/reservations?date=YYYY-MM-DD` | 해당 날짜의 active 예약 목록 (모두 공개, 본인 여부 플래그 포함) |
| GET | `/api/reservations/mine` | 내 예약 목록 (과거/미래 분리) |
| POST | `/api/reservations` | `{ date, startHour, partySize }` → 생성. 위 규칙 검증 |
| DELETE | `/api/reservations/:id` | 본인 + 시작 1시간 전까지만 허용 |

### 5.3 관리자
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/users?status=pending` | 회원 목록 |
| PATCH | `/api/admin/users/:id` | `{ status, role }` 등 변경 |
| POST | `/api/admin/users/:id/reset-password` | 임시 비밀번호 발급, `must_change_password=1` |
| POST | `/api/admin/users` | 관리자가 직접 계정 생성 (동/호수/이름/임시PW) |
| GET | `/api/admin/reservations?from=&to=&userId=` | 전체 예약 검색 |
| PATCH | `/api/admin/reservations/:id` | 시간/인원/상태/비고 수정 (규칙 우회 가능) |
| DELETE | `/api/admin/reservations/:id` | 강제 취소 |

---

## 6. 화면 구성

### 6.1 공통
- 헤더: 로고, 로그인한 동/호수, 로그아웃
- 푸터: 관리실 연락처

### 6.2 사용자 화면
- `/login` — 로그인
- `/password/change` — 비밀번호 변경 (강제 시 자동 이동)
- `/` — 오늘 날짜의 시간표 (06–22시 × 가로 슬롯) + 날짜 네비게이션
  - 슬롯 클릭 → 인원수 입력 → 예약
  - 본인 예약은 다른 색으로 표시, 클릭 시 취소 버튼
- `/me/reservations` — 내 예약 목록 (다가오는/지난)

### 6.3 관리자 화면
- `/admin` — 대시보드 (오늘 예약 수, 승인 대기 회원 수)
- `/admin/users` — 회원 목록/승인/비밀번호 초기화/신규 등록
- `/admin/reservations` — 전체 예약 검색 테이블, 수기 대장 입력(과거 날짜 포함 가능)

---

## 7. 예약 규칙 (검증 로직)

```
POST /api/reservations 검증 순서:
1. 로그인 + status='active' 사용자인가
2. date가 오늘 또는 미래인가 (KST)
3. 06 <= startHour < 22
4. 1 <= partySize <= 4
5. (user_id, date, status='active') 행 존재 여부 → 존재 시 거절
6. (date, startHour, status='active') 행 존재 여부 → 존재 시 거절
7. INSERT (트랜잭션, partial unique index가 race condition 막아줌)

DELETE /api/reservations/:id 검증:
- 예약의 user_id == 세션 user_id
- now < (date + startHour - 1h)  (KST)
- status='active'
→ UPDATE status='cancelled', cancelled_at=now, cancelled_by=self
```

관리자 라우트는 위 규칙을 우회한다(과거 날짜 입력, 중복 강제 입력 모두 허용 — 단, partial unique index 때문에 active 중복은 여전히 불가하므로 관리자가 기존 예약을 먼저 cancel 처리해야 함).

---

## 8. 보안

- 비밀번호: bcrypt cost 10, 최소 8자
- 세션: `iron-session` (HttpOnly, Secure, SameSite=Lax 쿠키, 30일 만료)
- CSRF: SameSite=Lax + POST에 origin 검사
- 권한 검사는 모든 보호 라우트의 핸들러 첫 줄에서 명시적으로
- 비밀번호 초기화/변경 등 민감 액션은 rate limit (간단한 메모리 카운터 — MVP)
- SQL Injection: Drizzle prepared statements 사용
- 입력 검증: zod 스키마 (서버 측)

---

## 9. 디렉토리 구조 (예정)

```
/
├── docs/
│   └── DESIGN.md           (이 문서)
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (user)/page.tsx
│   │   ├── (user)/me/reservations/page.tsx
│   │   ├── admin/page.tsx
│   │   ├── admin/users/page.tsx
│   │   ├── admin/reservations/page.tsx
│   │   └── api/
│   │       ├── auth/{login,logout,change-password}/route.ts
│   │       ├── reservations/route.ts
│   │       ├── reservations/[id]/route.ts
│   │       ├── reservations/mine/route.ts
│   │       └── admin/...
│   ├── db/
│   │   ├── schema.ts        (Drizzle 스키마)
│   │   ├── client.ts
│   │   └── migrations/
│   ├── lib/
│   │   ├── session.ts       (iron-session 설정)
│   │   ├── auth.ts          (권한 헬퍼)
│   │   ├── reservation-rules.ts
│   │   └── kst.ts           (시간대 유틸)
│   └── components/
├── scripts/
│   └── seed-admin.ts        (초기 관리자 생성)
├── data/
│   └── app.db               (gitignored)
├── package.json
└── README.md
```

---

## 10. 마이그레이션 / 운영 절차

1. **초기 관리자 계정**: `npm run seed:admin` 으로 동/호수/임시PW 입력하여 생성
2. **기존 수기 대장**: 관리자가 관리자 화면에서 과거 날짜로 일괄 입력 가능
3. **백업**: SQLite 파일을 매일 cron으로 복사 (운영 단계에서 결정)

---

## 11. 마일스톤

| 단계 | 산출물 | 검증 |
|------|--------|------|
| M0 | 설계 문서 (현재) | 사용자 확인 ← **여기** |
| M1 | 프로젝트 스캐폴딩, DB 스키마, seed:admin | `npm run dev` 동작 |
| M2 | 로그인/비밀번호 변경 | 수동 테스트 시나리오 통과 |
| M3 | 예약 생성/조회/취소 + 규칙 검증 | 자동화 테스트 + 수동 |
| M4 | 관리자 화면 (회원/예약) | 수동 시나리오 통과 |
| M5 | UI 다듬기, 모바일 반응형 | 휴대폰에서 확인 |
| M6 | 운영 배포 + 백업 cron | 실 사용 시작 |

---

## 12. 결정 필요 항목 (다음 단계 전 확인)

1. **인원수 범위**: 1–4명이 맞나요? (테니스 단/복식 기준)
2. **예약 가능 기간**: 며칠 전부터 예약 가능? (예: 오늘부터 7일 후까지)
3. **취소 가능 시점**: 시작 1시간 전까지가 맞나요?
4. **테니스장 개수**: 1면인가요, 여러 면인가요? (여러 면이면 스키마에 `court_id` 추가 필요)
5. **운영 시간**: 06:00–22:00 가정이 맞나요?
6. **첫 관리자 계정**: 누구로 시작하나요? (`seed:admin` 입력값)
