// E2E 시험 전용 계정 만들기·지우기 (콘텐츠 담당자 권한)
//   npm run e2e:setup   → 계정을 만들고 .env.local에 E2E_EMAIL·E2E_PASSWORD를 적는다 (비밀번호는 화면에 출력하지 않음)
//   npm run e2e:remove  → 계정을 지우고 .env.local에서 뺀다
// 메일을 보내지 않도록 example.com 주소에 '이메일 확인 완료' 상태로 만든다.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ENV_FILE = new URL("../.env.local", import.meta.url);
const EMAIL = "e2e-editor@example.com";

const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/) : [];
const env = Object.fromEntries(lines.filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(".env.local에 NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  process.exit(1);
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const writeEnv = (values) => {
  const kept = lines.filter((l) => !/^E2E_(EMAIL|PASSWORD)=/.test(l) && l !== "# E2E 시험 전용 계정 (npm run e2e:setup)");
  while (kept.length && kept.at(-1) === "") kept.pop();
  const extra = values ? ["", "# E2E 시험 전용 계정 (npm run e2e:setup)", `E2E_EMAIL=${values.email}`, `E2E_PASSWORD=${values.password}`] : [];
  writeFileSync(ENV_FILE, [...kept, ...extra, ""].join("\n"));
};

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const existing = list.users.find((u) => u.email === EMAIL);

if (process.argv.includes("--remove")) {
  if (existing) {
    const { error } = await admin.auth.admin.deleteUser(existing.id);
    if (error) throw error;
  }
  writeEnv(null);
  console.log(existing ? "시험 계정을 지웠습니다." : "지울 시험 계정이 없습니다.");
  process.exit(0);
}

const password = randomBytes(18).toString("base64url");
let id = existing?.id;
if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
  if (error) throw error;
} else {
  const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password, email_confirm: true, user_metadata: { name: "E2E 시험" } });
  if (error) throw error;
  id = data.user.id;
}
// 초대가 아닌 계정은 트리거가 프로필을 만들지 않으므로 직접 만든다 (콘텐츠 담당자)
const { error: profileError } = await admin.from("profiles").upsert({ id, email: EMAIL, name: "E2E 시험", role: "editor", is_active: true }, { onConflict: "id" });
if (profileError) throw profileError;

writeEnv({ email: EMAIL, password });
console.log(`${existing ? "시험 계정 비밀번호를 새로 정했습니다" : "시험 계정을 만들었습니다"}: ${EMAIL} (콘텐츠 담당자)`);
console.log(".env.local에 E2E_EMAIL·E2E_PASSWORD를 적었습니다. 이제 npm run e2e 로 실행하세요.");
