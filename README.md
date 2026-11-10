# 동광교회 홈페이지

Next.js 16 · React 19 · Tailwind 4 · Supabase. 계획서와 기획서는 저장소 바깥(`개발-계획서.md`, `교회-홈페이지-기획서.md`)에 있다.

## 실행 환경

| 항목 | 버전 |
| --- | --- |
| Node.js | **LTS 26 (Lithium)** 권장, 최소 24 — `.nvmrc`, `package.json`의 `engines` |
| Next.js | 16.4.x (Turbopack) |
| 패키지 관리 | npm. `engine-strict`라 Node 24 미만에서는 설치가 막힌다 |

- Node는 **패치 업데이트를 자주** 받는 편이 안전하다(보안 수정). 설치 확인: `node -v`
- Windows: [nodejs.org](https://nodejs.org)의 LTS 설치 파일 또는 `winget upgrade OpenJS.NodeJS.LTS`
- 배포(Vercel)는 프로젝트 설정의 Node.js Version에서 **지원되는 가장 높은 LTS**를 고른다.

## 처음 시작

```bash
npm install
cp .env.example .env.local   # 값 채우기: supabase/README.md
npm run dev                  # http://localhost:3000
```

Supabase 값이 없으면 공개 페이지는 예시 데이터로, 관리자 페이지는 설정 안내로 열린다.

## 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` / `build` / `start` | 개발 / 배포용 빌드 / 빌드 결과 실행 |
| `npm test` | 단위·DB 권한 테스트 (Docker 불필요, 로컬에서 Postgres를 흉내 냄) |
| `npm run lint` | 코드 검사 |
| `npm run e2e` | 브라우저 E2E 4건 — [docs/E2E-테스트.md](docs/E2E-테스트.md) |
| `npm run e2e:video` | 홈페이지·어드민 둘러보기 영상 촬영 — [e2e-videos/README.md](e2e-videos/README.md) |

## 문서

- [supabase/README.md](supabase/README.md) — Supabase 연결 순서(SQL, 인증, 첫 관리자)
- [docs/관리자-사용-설명서.md](docs/관리자-사용-설명서.md) — 교회 담당자용
- [docs/교회-입력-필요-항목.md](docs/교회-입력-필요-항목.md) — 공개 전에 교회에서 준비할 자료 (자리표시 문구 목록)
- [docs/E2E-테스트.md](docs/E2E-테스트.md)

## 보안 의존성 점검

```bash
npm audit --omit=dev
```

배포 전과 의존성을 올린 뒤에 실행한다. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용이므로 저장소와 브라우저에 두지 않는다.
