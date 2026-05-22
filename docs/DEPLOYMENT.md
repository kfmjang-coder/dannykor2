# 배포 런북

> 실제 서버에 처음 배포할 때 따라 실행하는 단계별 가이드.

## 사전 요구사항

- Docker / Docker Compose v2 설치된 Linux 서버
- 리버스 프록시 (Caddy 권장 — HTTPS 자동) 또는 nginx
- 도메인 또는 IP 접근 경로

## 1. 소스 가져오기

```bash
git clone https://github.com/kfmjang-coder/dannykor2.git /srv/tennis
cd /srv/tennis
```

## 2. .env 작성

```bash
cp .env.docker.example .env
# SESSION_SECRET 값 채우기:
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s|REPLACE_ME_WITH_RANDOM_64_HEX_CHARS_FROM_ABOVE_COMMAND|$SECRET|" .env
```

`.env` 내용 확인 — `SESSION_SECRET`이 64자 hex로 채워져 있어야 함.

## 3. 컨테이너 빌드 & 시작

```bash
docker compose up -d --build
docker compose logs -f app    # 로그 모니터, Ctrl+C로 빠져나옴
```

`Ready in ...` 메시지가 보이면 시작 완료.

## 4. 헬스 체크

```bash
curl http://localhost:3000/api/health
# 기대: {"ok":true,"time":"..."}
```

## 5. 관리자 계정 생성

```bash
docker compose exec app sh -c \
  'ADMIN_EMAIL=kfmjang@gmail.com ADMIN_NAME=관리자 ADMIN_PASSWORD="원하는비밀번호8자이상" npm run seed:admin'
```

## 6. 주민 계정 일괄 등록 (선택)

```bash
# CSV 파일을 컨테이너 안으로 복사
docker cp users.csv tennis-app:/app/data/users.csv

# 컨테이너 내에서 import
docker compose exec app npm run import:users -- /app/data/users.csv

# 결과 파일 가져오기 (임시 비밀번호 목록)
docker cp tennis-app:/app/data/users.passwords.csv ./users.passwords.csv
```

CSV 형식: `dong,ho,name,phone,email` (헤더 필수, phone/email은 빈 셀 허용)

## 7. 리버스 프록시 설정 (Caddy 예시)

`/etc/caddy/Caddyfile`:
```
tennis.example.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

HTTPS는 Caddy가 Let's Encrypt로 자동 발급/갱신. `NODE_ENV=production`일 때 세션 쿠키의 `Secure` 플래그가 자동 켜지므로 HTTPS 종료가 프록시에서 일어나야 정상 동작.

## 8. 백업 확인

`backup` 컨테이너가 매일 백업을 만듭니다.

```bash
ls -la /srv/tennis/data/backups/
# 24시간 후 첫 백업이 생성되어야 함
docker compose logs backup --tail 20
```

수동 백업이 필요하면:
```bash
docker compose exec app npm run db:backup
```

## 9. 운영 점검

- `docker compose ps` — 두 컨테이너 모두 `Up (healthy)` 상태여야 함
- `docker compose logs app --since 1h` — 에러 확인
- 디스크 사용량: `du -sh /srv/tennis/data/` — backups가 30개 누적되면 약 1.5MB

## 복구 절차

```bash
docker compose stop app
docker compose run --rm app npm run db:restore /app/data/backups/app-YYYYMMDD-HHMMSS.db
docker compose start app
```

`data/app.db.before-restore-<timestamp>` 가 자동 생성되므로, 잘못 복구해도 되돌릴 수 있음.

## 업데이트 절차

```bash
cd /srv/tennis
git pull
docker compose up -d --build    # 기존 컨테이너 교체
```

DB 마이그레이션은 컨테이너 시작 시 자동 실행 (`Dockerfile`의 `CMD` 참고).

## 문제 해결

| 증상 | 원인 / 조치 |
|------|-------------|
| `SESSION_SECRET is required` 에러 | `.env` 파일이 누락되거나 SESSION_SECRET 값이 비어있음 |
| 로그인 후 즉시 로그아웃 | HTTPS 환경에서 `Secure` 쿠키가 안 떨어지는 경우 — 프록시 설정 점검 |
| 헬스체크 503 | `docker compose logs app` 으로 에러 확인. 보통 DB 권한 또는 마이그레이션 실패 |
| 백업이 안 생김 | `docker compose logs backup` — DATABASE_URL 경로 확인 |
