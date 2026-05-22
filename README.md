# 아파트 테니스장 예약 시스템

노후 아파트 단지의 수기 테니스장 예약 대장을 웹으로 옮기는 프로젝트.

설계 문서: [`docs/DESIGN.md`](./docs/DESIGN.md)

## 요구 환경

- Node.js 20 이상 (개발은 22에서 검증)
- npm 10 이상

## 설치 & 초기화

```bash
npm install

# 1) 세션 암호화 키 생성 (최소 32자). .env.example 참고
node -e "console.log('SESSION_SECRET='+require('crypto').randomBytes(32).toString('hex'))" > .env.local

# 2) DB 초기화
npm run db:generate   # 스키마 → SQL 마이그레이션 파일 생성 (스키마 변경 시)
npm run db:migrate    # data/app.db 생성 및 마이그레이션 적용
npm run db:seed       # settings 테이블에 기본값 시드
npm run seed:admin    # 첫 관리자 계정 생성 (이메일/비밀번호 prompt)
                      # 또는: ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... npm run seed:admin

# 3) 개발 서버
npm run dev           # http://localhost:3000
```

## 로그인

- **주민**: 동-호수 형식 (`101-1502`) + 비밀번호
- **관리자**: 이메일 (`kfmjang@gmail.com`) + 비밀번호
- 첫 로그인 시 비밀번호 강제 변경 (`must_change_password=1` 사용자)

## 배포 (Docker)

서버에 Docker / Docker Compose가 설치되어 있다고 가정합니다.

```bash
# 1) .env 작성 (반드시 SESSION_SECRET 32자 이상)
cat > .env <<EOF
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
APP_PORT=3000
BACKUP_KEEP=30
BACKUP_INTERVAL_SECONDS=86400
EOF

# 2) 빌드 + 실행 (백업 컨테이너 포함)
docker compose up -d --build

# 3) 첫 관리자 계정 등록 (컨테이너 내에서)
docker compose exec app sh -c 'ADMIN_EMAIL=kfmjang@gmail.com ADMIN_NAME=관리자 ADMIN_PASSWORD="원하는비밀번호8자이상" npm run seed:admin'

# 로그 확인
docker compose logs -f app

# 헬스체크
curl http://localhost:3000/api/health
# → {"ok":true,"time":"..."}
```

리버스 프록시(Caddy, nginx 등) 뒤에 두는 것을 권장합니다. HTTPS 종료를 프록시에서 처리하고 `SESSION_SECRET` 쿠키의 `Secure` 플래그가 작동합니다 (`NODE_ENV=production`일 때 자동).

## 백업 / 복구

`docker-compose.yml`의 `backup` 서비스가 매일 (기본 86400초마다) SQLite 백업을 `./data/backups/` 에 저장합니다. `BACKUP_KEEP=30` 기본값으로 최근 30개를 보관합니다.

**수동 백업** (호스트에서 직접):

```bash
npm run db:backup            # ./data/backups/app-YYYYMMDD-HHMMSS.db
# 또는 컨테이너 내:
docker compose exec app npm run db:backup
```

**복구**:

```bash
docker compose stop app
npm run db:restore ./data/backups/app-20260522-091917.db
docker compose start app
```

복구 시 기존 DB는 `app.db.before-restore-<timestamp>` 로 자동 백업됩니다.

## 베어메탈 배포 (대안)

Docker 없이 systemd로 운영하려면:

```bash
# 빌드
npm ci
npm run db:migrate && npm run db:seed
npm run build

# /etc/systemd/system/tennis.service
# (예시 — 경로/사용자 환경에 맞게 수정)
# [Unit]
# Description=Tennis reservation
# After=network.target
# [Service]
# Type=simple
# WorkingDirectory=/srv/tennis
# EnvironmentFile=/srv/tennis/.env
# ExecStart=/usr/bin/npm start
# Restart=on-failure
# User=tennis
# [Install]
# WantedBy=multi-user.target

# 백업 cron 예시 (/etc/cron.d/tennis-backup)
# 0 3 * * * tennis cd /srv/tennis && /usr/bin/npm run db:backup >> /var/log/tennis-backup.log 2>&1
```

## 운영 파라미터

모두 `settings` 테이블에 저장되며 관리자 페이지에서 변경 가능 (M4 단계). 기본값은
`src/lib/settings-defaults.ts` 참고.

## 진행 상황

- [x] M0 설계 문서
- [x] M1 스캐폴딩 (DB 스키마, settings 시드, seed:admin)
- [x] M2 로그인 / 비밀번호 변경 / 권한 가드
- [x] M3 예약 생성·조회·취소 + 코트×시간 격자 UI
- [x] M4 관리자 화면 (회원/예약/설정)
- [x] M5 모바일 반응형
- [x] M6 배포
