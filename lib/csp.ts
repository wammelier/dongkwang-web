// 콘텐츠 보안 정책(CSP). 브라우저가 이 사이트에서 어디로 접속하고 무엇을 불러올 수 있는지 제한한다.
// 목적: 만에 하나 화면에 악성 스크립트가 끼어들어도 로그인 토큰을 다른 사이트로 빼돌리지 못하게 한다.
//
// 스크립트에 'unsafe-inline'을 허용한다: Next.js가 화면마다 인라인 스크립트를 넣는데, 매 요청마다 nonce를 쓰려면
// 모든 페이지를 정적 캐시 없이 그려야 해서 속도와 서버 부담이 커진다. 대신 외부 접속(connect-src, img-src, form-action 등)을
// 이 사이트와 Supabase로만 좁혀 '빼돌리기'를 막는다.

export type CspOptions = {
  /** 예: https://abcd.supabase.co (없으면 Supabase 주소는 허용 목록에서 빠진다) */
  supabaseUrl?: string;
  /** 개발 서버: React 개발 도구(eval)와 핫 리로드(ws)가 필요하다 */
  dev?: boolean;
};

export function buildCsp({ supabaseUrl, dev = false }: CspOptions = {}) {
  const supabase = supabaseUrl ? [new URL(supabaseUrl).origin] : [];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    // 글꼴: Google Fonts (app/layout.tsx). 인라인 style 속성은 next/image와 편집 화면이 쓴다
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    // 사진·주보 이미지는 Supabase 저장소에서 온다
    "img-src": ["'self'", "data:", "blob:", ...supabase],
    // 브라우저에서 저장소로 파일을 올리고 로그인 토큰을 갱신할 때 Supabase에 접속한다
    "connect-src": ["'self'", ...supabase, ...(dev ? ["ws://localhost:*", "http://localhost:*"] : [])],
    // 관리자 주보 미리보기: 저장소의 PDF를 iframe으로 연다
    "frame-src": ["'self'", ...supabase],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  if (!dev) directives["upgrade-insecure-requests"] = [];

  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}
