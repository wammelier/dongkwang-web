# Supabase 연결 순서

공개 홈페이지는 연결 전에도 `lib/seed.ts` 예시 데이터로 동작한다. 관리자 페이지는 연결 후에만 열린다.

## 1. 프로젝트 만들기

1. [supabase.com](https://supabase.com)에서 교회 명의 이메일로 계정·프로젝트를 만든다(리전: Northeast Asia (Seoul)).
2. Project Settings → API에서 URL, `anon` 키, `service_role` 키를 복사해 `.env.local`에 넣는다(`.env.example` 참고).

## 2. 스키마와 예시 데이터

SQL Editor에서 순서대로 실행한다.

1. `migrations/20261104000000_init.sql` — 테이블·뷰·RLS·트리거
2. `migrations/20261104000100_storage.sql` — 파일 버킷과 업로드 권한
3. `migrations/20261104000200_main_sections_order.sql` — 메인 구역 켜기·끄기와 순서
4. `migrations/20261104000300_security_hardening.sql` — 보안 보강(초대받은 계정만 관리자, 권한 검사)
5. `migrations/20261104000400_admin_content.sql` — 첨부파일 저장소, 사진 공개 동의, 예배·공동체·FAQ 저장
6. `seed.sql` — 예시 데이터(실제 교회 정보 아님, 운영 전 관리자 화면에서 교체)

CLI를 쓰면 `npx supabase link --project-ref <ref>` 후 `npx supabase db push`.

## 3. 인증 설정 (Authentication)

- **Sign In / Providers → Email**: "Allow new users to sign up" 끄기 (초대 전용)
- **Password**: 최소 길이 10
- **URL Configuration**: Site URL = 실제 주소(개발 중엔 `http://localhost:3000`),
  Redirect URLs에 `<사이트>/admin/auth/**` 추가
- **메일 템플릿은 고치지 않아도 된다.** 기본 메일의 링크를 사이트가 처리한다
  (초대 `#access_token=…` → `/admin/auth/callback`, 재설정 `?code=…` → `/admin/auth/confirm`).
  - 새 무료 프로젝트는 메일 서버(Custom SMTP)를 연결해야 템플릿을 고칠 수 있다.
  - 기본 메일은 프로젝트 팀원 이메일로만, 시간당 몇 통만 보내진다. 운영 전에는 SMTP(Resend 등)를 연결하고
    `templates/invite.html`, `templates/recovery.html`로 한국어 메일을 쓰면 된다(`?token_hash=…` 형태도 처리됨).
  - 비밀번호 재설정 링크는 재설정을 요청한 그 브라우저에서 열어야 한다.

## 4. 첫 최고 관리자

공개 가입이 없으므로 첫 계정만 대시보드에서 만든다.

1. Authentication → Users → **Invite user**로 본인 이메일 초대 (`profiles`에 editor로 자동 생성됨)
   - "Create new user"로 만든 계정이나 공개 가입 계정은 관리자 프로필이 생기지 않는다(초대받은 계정만 관리자).
2. SQL Editor에서 최고 관리자로 올린다.

   ```sql
   update public.profiles set role = 'super_admin', name = '<이름>' where email = '<이메일>';
   ```

3. 메일의 링크로 비밀번호를 정한 뒤 `/admin/login`. 이후 관리자는 `/admin/accounts`에서 초대한다.

## 권한 요약

| 역할 | 읽기 | 쓰기 |
| --- | --- | --- |
| 비로그인 | 게시된 소식·주보·설교·배너, 교회 정보, 활성 예배·공동체·FAQ | 없음 |
| 콘텐츠 담당자 | 전부(임시 저장 포함) | 소식·주보·설교·절기 배너, 파일 업로드. 완전 삭제 불가 |
| 최고 관리자 | 전부 + 수정 기록 | 전부. 계정·교회 정보·예배 시간·공동체·FAQ·메인 구역, 휴지통 완전 삭제 |

- 비활성 계정은 다음 요청부터 바로 차단된다(미들웨어 + RLS).
- 활성 최고 관리자가 0명이 되는 변경은 DB가 거부한다.
- 중요한 수정은 `audit_logs`에 수정자·시각·바뀐 항목이 남는다.

## 검증

Docker 없이 `npm test`가 PGlite(프로세스 내 Postgres)에 위 마이그레이션과 seed를 그대로 실행해 권한 규칙을 검사한다(`tests/db`).
실제 Supabase의 Auth·Storage 동작은 프로젝트 연결 후 직접 확인해야 한다.
