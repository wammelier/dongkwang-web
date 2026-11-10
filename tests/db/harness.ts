// PGlite(프로세스 내 Postgres)에 Supabase의 auth·storage·역할을 최소한으로 흉내 내고
// 실제 마이그레이션과 seed.sql을 그대로 실행한다. Docker 없이 RLS를 검증하기 위한 용도.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "supabase");

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}',
  invited_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id), name text, owner uuid
);
alter table storage.objects enable row level security;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
`;

export type Actor = { role: "anon" } | { role: "authenticated"; userId: string };

export async function createDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const migrations = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrations) await db.exec(readFileSync(join(root, "migrations", file), "utf8"));
  await db.exec(readFileSync(join(root, "seed.sql"), "utf8"));

  /** 관리자 계정 생성 (초대와 같은 경로: auth.users insert → 트리거가 profiles 생성) */
  async function createUser(email: string, role: "super_admin" | "editor" = "editor") {
    const { rows } = await db.query<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data, invited_at) values ($1, $2, now()) returning id",
      [email, JSON.stringify({ name: email.split("@")[0] })],
    );
    const id = rows[0].id;
    if (role !== "editor") await db.query("update public.profiles set role = $1 where id = $2", [role, id]);
    return id;
  }

  /** 지정한 사용자로 SQL 실행 후 원래(postgres)로 복귀 */
  async function as<T = Record<string, unknown>>(actor: Actor, sql: string, params: unknown[] = []) {
    await db.exec(
      `set role ${actor.role}; select set_config('request.jwt.claim.sub', '${
        actor.role === "authenticated" ? actor.userId : ""
      }', false);`,
    );
    try {
      return await db.query<T>(sql, params);
    } finally {
      await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
    }
  }

  return { db, createUser, as };
}
