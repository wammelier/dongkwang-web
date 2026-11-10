import { beforeAll, describe, expect, it } from "vitest";
import { createDb, type Actor } from "./harness";

let t: Awaited<ReturnType<typeof createDb>>;
let superAdmin: Actor;
let editor: Actor;
let inactive: Actor;
const anon: Actor = { role: "anon" };

beforeAll(async () => {
  t = await createDb();
  superAdmin = { role: "authenticated", userId: await t.createUser("admin@example.com", "super_admin") };
  editor = { role: "authenticated", userId: await t.createUser("editor@example.com") };
  const inactiveId = await t.createUser("former@example.com");
  await t.db.query("update public.profiles set is_active = false where id = $1", [inactiveId]);
  inactive = { role: "authenticated", userId: inactiveId };
}, 60_000);

const count = async (actor: Actor, sql: string) => Number((await t.as<{ n: number }>(actor, sql)).rows[0].n);

describe("공개 읽기 (anon)", () => {
  it("게시된 글만 보이고 임시 저장 글은 보이지 않는다", async () => {
    const { rows } = await t.as<{ title: string }>(anon, "select title from public.posts");
    expect(rows.map((r) => r.title).sort()).toEqual(["11월 예배 시간 변경 안내", "가을 성경공부 · 요한일서"]);
    expect(await count(anon, "select count(*) n from public.posts where status = 'draft'")).toBe(0);
  });

  it("임시 저장 글은 id를 알아도 열 수 없다", async () => {
    const { rows } = await t.db.query<{ id: string }>("select id from public.posts where status = 'draft'");
    const res = await t.as(anon, "select * from public.published_posts where id = $1", [rows[0].id]);
    expect(res.rows).toHaveLength(0);
  });

  it("노출 기간이 끝났거나 시작 전인 공지는 숨는다", async () => {
    await t.db.exec(`
      insert into public.posts (type, title, status, publish_end) values ('notice', '만료 공지', 'published', now() - interval '1 minute');
      insert into public.posts (type, title, status, publish_start) values ('notice', '예약 공지', 'published', now() + interval '1 day');
    `);
    expect(await count(anon, "select count(*) n from public.posts where title in ('만료 공지', '예약 공지')")).toBe(0);
  });

  it("게시 중단·휴지통 글은 숨는다", async () => {
    await t.db.exec(`
      insert into public.posts (type, title, status) values ('notice', '중단 글', 'unpublished'), ('notice', '휴지통 글', 'trashed');
    `);
    expect(await count(anon, "select count(*) n from public.posts where title in ('중단 글', '휴지통 글')")).toBe(0);
  });

  it("교회 정보·예배·공동체·FAQ·게시된 절기 배너를 읽는다", async () => {
    expect(await count(anon, "select count(*) n from public.church_info")).toBe(1);
    expect(await count(anon, "select count(*) n from public.worship_times")).toBe(1);
    expect(await count(anon, "select count(*) n from public.communities")).toBe(5);
    expect(await count(anon, "select count(*) n from public.faqs")).toBe(4);
    // 절기는 기본 '적용 안 함'(임시 저장)이라 방문자에게는 늘 적용되는 연중 배너만 보인다
    expect(await count(anon, "select count(*) n from public.active_main_banners")).toBe(1);
  });

  it("관리자 정보와 수정 기록은 읽을 수 없다", async () => {
    await expect(t.as(anon, "select * from public.profiles")).rejects.toThrow();
    await expect(t.as(anon, "select * from public.audit_logs")).rejects.toThrow();
  });

  it("어떤 것도 쓸 수 없다", async () => {
    await expect(t.as(anon, "insert into public.posts (type, title) values ('notice', '해킹')")).rejects.toThrow();
    const res = await t.as(anon, "update public.church_info set name = '해킹'");
    expect(res.affectedRows).toBe(0);
  });
});

describe("콘텐츠 담당자 (editor)", () => {
  it("공지를 임시 저장 → 게시하면 게시 시각과 작성자가 기록된다", async () => {
    const { rows } = await t.as<{ id: string; created_by: string }>(
      editor,
      "insert into public.posts (type, title) values ('notice', '담당자 공지') returning id, created_by",
    );
    expect(rows[0].created_by).toBe((editor as { userId: string }).userId);
    expect(await count(anon, "select count(*) n from public.posts where title = '담당자 공지'")).toBe(0);

    await t.as(editor, "update public.posts set status = 'published' where id = $1", [rows[0].id]);
    const after = await t.db.query<{ published_at: string | null; updated_by: string }>(
      "select published_at, updated_by from public.posts where id = $1",
      [rows[0].id],
    );
    expect(after.rows[0].published_at).not.toBeNull();
    expect(await count(anon, "select count(*) n from public.posts where title = '담당자 공지'")).toBe(1);
  });

  it("게시 중단 후 다시 게시해도 처음 게시 시각이 유지된다", async () => {
    const { rows } = await t.as<{ id: string; published_at: string }>(
      editor,
      "insert into public.posts (type, title, status) values ('story', '재게시 글', 'published') returning id, published_at",
    );
    const first = rows[0].published_at;
    await t.as(editor, "update public.posts set status = 'unpublished' where id = $1", [rows[0].id]);
    const again = await t.as<{ published_at: string }>(
      editor,
      "update public.posts set status = 'published' where id = $1 returning published_at",
      [rows[0].id],
    );
    expect(again.rows[0].published_at).toEqual(first);
  });

  it("임시 저장 글도 관리자에게는 보인다", async () => {
    expect(await count(editor, "select count(*) n from public.posts where status = 'draft'")).toBeGreaterThan(0);
  });

  it("관리자가 공개 뷰를 읽어도 임시 저장 글은 섞이지 않는다", async () => {
    expect(await count(editor, "select count(*) n from public.published_posts where status <> 'published'")).toBe(0);
  });

  it("휴지통으로 옮기면 deleted_at이 기록되고 복구하면 지워진다", async () => {
    const { rows } = await t.as<{ id: string }>(
      editor,
      "insert into public.posts (type, title, status) values ('story', '이야기', 'published') returning id",
    );
    const id = rows[0].id;
    await t.as(editor, "update public.posts set status = 'trashed' where id = $1", [id]);
    expect((await t.db.query<{ d: string | null }>("select deleted_at d from public.posts where id = $1", [id])).rows[0].d).not.toBeNull();
    await t.as(editor, "update public.posts set status = 'draft' where id = $1", [id]);
    expect((await t.db.query<{ d: string | null }>("select deleted_at d from public.posts where id = $1", [id])).rows[0].d).toBeNull();
  });

  it("완전 삭제는 할 수 없다", async () => {
    const res = await t.as(editor, "delete from public.posts where status = 'trashed'");
    expect(res.affectedRows).toBe(0);
  });

  it("주보·설교·절기 배너를 쓸 수 있다", async () => {
    await t.as(editor, "insert into public.bulletins (date, title) values ('2026-11-08', '11월 둘째 주 주보')");
    await t.as(editor, "insert into public.sermons (title, preached_on) values ('설교', '2026-11-08')");
    await t.as(editor, "update public.main_banners set description = '수정' where season = 'ordinary'");
    expect(await count(anon, "select count(*) n from public.main_banners where description = '수정'")).toBe(1);
  });

  it("교회 정보·예배 시간·계정은 바꿀 수 없다", async () => {
    expect((await t.as(editor, "update public.church_info set name = 'x'")).affectedRows).toBe(0);
    expect((await t.as(editor, "update public.worship_times set place = 'x'")).affectedRows).toBe(0);
    expect((await t.as(editor, "update public.profiles set role = 'super_admin'")).affectedRows).toBe(0);
  });

  it("수정 기록을 읽을 수 없다", async () => {
    expect(await count(editor, "select count(*) n from public.audit_logs")).toBe(0);
  });
});

describe("비활성 계정", () => {
  it("즉시 아무것도 쓰거나 비공개 글을 볼 수 없다", async () => {
    await expect(t.as(inactive, "insert into public.posts (type, title) values ('notice', 'x')")).rejects.toThrow();
    expect(await count(inactive, "select count(*) n from public.posts where status = 'draft'")).toBe(0);
  });
});

describe("최고 관리자", () => {
  it("교회 정보를 수정하면 수정자와 변경 내용이 기록된다", async () => {
    await t.as(superAdmin, "update public.church_info set phone = '02-000-0000'");
    const { rows } = await t.as<{ actor_id: string; diff: Record<string, { new: string }> }>(
      superAdmin,
      "select actor_id, diff from public.audit_logs where table_name = 'church_info' order by id desc limit 1",
    );
    expect(rows[0].actor_id).toBe((superAdmin as { userId: string }).userId);
    expect(Object.keys(rows[0].diff)).toEqual(["phone"]);
  });

  it("담당자 역할을 바꾸고 비활성화할 수 있다", async () => {
    const id = await t.createUser("temp@example.com");
    expect((await t.as(superAdmin, "update public.profiles set is_active = false where id = $1", [id])).affectedRows).toBe(1);
  });

  it("휴지통 글만 완전 삭제할 수 있다", async () => {
    expect((await t.as(superAdmin, "delete from public.posts where status = 'published'")).affectedRows).toBe(0);
    expect((await t.as(superAdmin, "delete from public.posts where status = 'trashed'")).affectedRows).toBeGreaterThan(0);
  });

  it("마지막 활성 최고 관리자는 강등·비활성화할 수 없다", async () => {
    const me = (superAdmin as { userId: string }).userId;
    await expect(t.as(superAdmin, "update public.profiles set role = 'editor' where id = $1", [me])).rejects.toThrow(
      /최소 1명/,
    );
  });
});

describe("데이터 규칙", () => {
  it("같은 날짜 주보는 하나만 (휴지통 제외)", async () => {
    await expect(
      t.db.query("insert into public.bulletins (date, title) values ('2026-11-01', '중복')"),
    ).rejects.toThrow();
    await t.db.query("insert into public.bulletins (date, title, status) values ('2026-11-01', '지운 것', 'trashed')");
  });

  it("특별 배너는 종료일이 필요하다", async () => {
    await expect(
      t.db.query("insert into public.main_banners (season, kind, title) values ('special', 'special', '행사')"),
    ).rejects.toThrow();
  });

  it("행사가 아닌 글에는 행사 일시를 넣을 수 없다", async () => {
    await expect(
      t.db.query("insert into public.posts (type, title, event_start) values ('notice', 'x', now())"),
    ).rejects.toThrow();
  });

  it("초대로 만든 계정은 항상 editor로 시작한다", async () => {
    const { rows } = await t.db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data, invited_at) values ('sneaky@example.com', '{"role":"super_admin"}', now()) returning id`,
    );
    const p = await t.db.query<{ role: string }>("select role from public.profiles where id = $1", [rows[0].id]);
    expect(p.rows[0].role).toBe("editor");
  });

  it("초대 없이 직접 가입한 계정은 관리자 권한이 없다", async () => {
    const { rows } = await t.db.query<{ id: string }>(
      "insert into auth.users (email) values ('signup@example.com') returning id",
    );
    expect(await count(superAdmin, `select count(*) n from public.profiles where id = '${rows[0].id}'`)).toBe(0);
    const selfSigned: Actor = { role: "authenticated", userId: rows[0].id };
    await expect(t.as(selfSigned, "insert into public.posts (type, title) values ('notice', '가입자 글')")).rejects.toThrow();
    expect(await count(selfSigned, "select count(*) n from public.posts where status = 'draft'")).toBe(0);
  });

  it("업로드는 활성 관리자만", async () => {
    await expect(
      t.as(anon, "insert into storage.objects (bucket_id, name) values ('bulletins', 'x.pdf')"),
    ).rejects.toThrow();
    await t.as(editor, "insert into storage.objects (bucket_id, name) values ('bulletins', 'bulletins/1/a.pdf')");
  });
});

describe("메인 구역 순서", () => {
  const items = JSON.stringify([
    { key: "news", is_visible: true, sort: 1 },
    { key: "welcome", is_visible: true, sort: 2 },
    { key: "about", is_visible: false, sort: 3 },
    { key: "sermon", is_visible: true, sort: 4 },
    { key: "community", is_visible: true, sort: 5 },
  ]);

  it("기본값은 5개 구역이 모두 켜진 기획서 순서", async () => {
    const { rows } = await t.as<{ key: string }>(anon, "select key from public.main_sections where is_visible order by sort");
    expect(rows.map((r) => r.key)).toEqual(["welcome", "about", "sermon", "news", "community"]);
  });

  it("콘텐츠 담당자는 바꿀 수 없다", async () => {
    await expect(t.as(editor, "select public.save_main_sections($1::jsonb)", [items])).rejects.toThrow(/최고 관리자/);
  });

  it("비로그인은 빈 목록으로도 호출할 수 없다", async () => {
    await expect(t.as(anon, "select public.save_main_sections('[]'::jsonb)")).rejects.toThrow(/최고 관리자/);
  });

  it("최고 관리자가 저장하면 순서·노출이 한 번에 바뀌고 기록이 남는다", async () => {
    await t.as(superAdmin, "select public.save_main_sections($1::jsonb)", [items]);
    const { rows } = await t.as<{ key: string }>(anon, "select key from public.main_sections where is_visible order by sort");
    expect(rows.map((r) => r.key)).toEqual(["news", "welcome", "sermon", "community"]);
    expect(await count(superAdmin, "select count(*) n from public.audit_logs where table_name = 'main_sections'")).toBeGreaterThan(0);
  });

  it("없는 구역이 섞이면 전부 취소된다", async () => {
    const bad = JSON.stringify([
      { key: "welcome", is_visible: false, sort: 1 },
      { key: "hacked", is_visible: true, sort: 2 },
    ]);
    await expect(t.as(superAdmin, "select public.save_main_sections($1::jsonb)", [bad])).rejects.toThrow(/없는 구역/);
    const { rows } = await t.db.query<{ is_visible: boolean }>("select is_visible from public.main_sections where key = 'welcome'");
    expect(rows[0].is_visible).toBe(true);
  });
});

describe("교회 정보 목록 저장", () => {
  const worship = (items: object[]) => JSON.stringify(items);

  it("콘텐츠 담당자는 예배 시간·공동체·FAQ를 바꿀 수 없다", async () => {
    await expect(t.as(editor, "select public.save_faqs('[]'::jsonb)")).rejects.toThrow(/최고 관리자/);
    await expect(t.as(editor, "select public.save_worship_times('[]'::jsonb)")).rejects.toThrow(/최고 관리자/);
    await expect(t.as(anon, "select public.save_communities('[]'::jsonb)")).rejects.toThrow(/최고 관리자/);
  });

  it("대표 예배를 다른 예배로 옮기고, 목록에서 뺀 예배는 지워진다", async () => {
    const { rows } = await t.db.query<{ id: string }>("select id from public.worship_times where is_main");
    const mainId = rows[0].id;
    const base = { target: "", place: "본당", is_online: false, is_active: true };
    await t.as(superAdmin, "select public.save_worship_times($1::jsonb)", [
      worship([
        { ...base, id: mainId, name: "주일 1부", weekday: 0, start_time: "09:00", is_main: false, sort: 1 },
        { ...base, id: null, name: "주일 2부", weekday: 0, start_time: "11:00", is_main: true, sort: 2 },
      ]),
    ]);
    const after = await t.as<{ name: string; is_main: boolean }>(anon, "select name, is_main from public.worship_times order by sort");
    expect(after.rows).toEqual([
      { name: "주일 1부", is_main: false },
      { name: "주일 2부", is_main: true },
    ]);

    await t.as(superAdmin, "select public.save_worship_times($1::jsonb)", [
      worship([{ ...base, id: mainId, name: "주일 1부", weekday: 0, start_time: "09:00", is_main: true, sort: 1 }]),
    ]);
    expect(await count(anon, "select count(*) n from public.worship_times")).toBe(1);
  });

  it("대표 예배가 둘이면 전부 취소된다", async () => {
    const base = { id: null, target: "", place: "", weekday: 0, start_time: "11:00", is_online: false, is_active: true, sort: 1, is_main: true };
    await expect(
      t.as(superAdmin, "select public.save_worship_times($1::jsonb)", [worship([{ ...base, name: "가" }, { ...base, name: "나" }])]),
    ).rejects.toThrow(/하나만/);
    expect(await count(anon, "select count(*) n from public.worship_times")).toBe(1);
  });

  it("공동체 주소 이름(slug)은 고칠 때 유지되고 새 공동체는 자동으로 정해진다", async () => {
    const { rows } = await t.db.query<{ id: string; slug: string }>("select id, slug from public.communities order by sort limit 1");
    const keep = { ...rows[0], name: "영아부", target: "", age_range: "", meet_time: "", place: "", activities: "", how_to_join: "", contact: "", is_active: true, sort: 1 };
    await t.as(superAdmin, "select public.save_communities($1::jsonb)", [
      JSON.stringify([keep, { ...keep, id: null, slug: null, name: "새가족부", sort: 2 }]),
    ]);
    const after = await t.as<{ name: string; slug: string }>(anon, "select name, slug from public.communities order by sort");
    expect(after.rows[0]).toEqual({ name: "영아부", slug: rows[0].slug });
    expect(after.rows[1].slug).toMatch(/^group-[0-9a-f]{8}$/);
    expect(after.rows).toHaveLength(2);
  });

  it("FAQ를 고치고 순서를 바꾼다", async () => {
    await t.as(superAdmin, "select public.save_faqs($1::jsonb)", [
      JSON.stringify([
        { id: null, question: "주차는요?", answer: "교회 앞", is_active: true, sort: 1 },
        { id: null, question: "숨긴 질문", answer: "", is_active: false, sort: 2 },
      ]),
    ]);
    const { rows } = await t.as<{ question: string }>(anon, "select question from public.faqs order by sort");
    expect(rows.map((r) => r.question)).toEqual(["주차는요?"]);
  });
});

describe("글 사진·첨부파일", () => {
  it("공개 동의를 확인한 사진과 첨부파일만 공개된다", async () => {
    const { rows } = await t.as<{ id: string }>(editor, "insert into public.posts (type, title, status) values ('story', '사진 글', 'published') returning id");
    const postId = rows[0].id;
    await t.as(editor, "insert into public.post_files (post_id, kind, path, name) values ($1, 'image', 'a', '단체 사진'), ($1, 'image', 'b', '풍경'), ($1, 'attachment', 'c', '신청서.hwp')", [postId]);
    await t.as(editor, "update public.post_files set has_consent = true where name = '풍경'");
    const pub = await t.as<{ name: string }>(anon, "select name from public.post_files where post_id = $1 order by name", [postId]);
    expect(pub.rows.map((r) => r.name)).toEqual(["신청서.hwp", "풍경"]);
    expect(await count(editor, `select count(*) n from public.post_files where post_id = '${postId}'`)).toBe(3);
  });

  it("첨부파일 저장소에는 활성 관리자만 올릴 수 있다", async () => {
    await expect(t.as(anon, "insert into storage.objects (bucket_id, name) values ('attachments', 'x.pdf')")).rejects.toThrow();
    await t.as(editor, "insert into storage.objects (bucket_id, name) values ('attachments', 'posts/1/a.pdf')");
  });
});

describe("메인 배너", () => {
  it("비로그인 방문자에게는 기간 안의 특별 배너만 보인다", async () => {
    await t.as(
      editor,
      `insert into public.main_banners (season, kind, title, status, publish_start, publish_end) values
        ('special', 'special', '진행 중', 'published', now() - interval '1 day', now() + interval '1 day'),
        ('special', 'special', '예정', 'published', now() + interval '3 days', now() + interval '5 days'),
        ('special', 'special', '임시', 'draft', null, now() + interval '5 days')`,
    );
    const { rows } = await t.as<{ title: string }>(anon, "select title from public.main_banners where kind = 'special' order by title");
    expect(rows.map((r) => r.title)).toEqual(["진행 중"]);
    expect(await count(editor, "select count(*) n from public.main_banners where kind = 'special'")).toBe(3);
  });

  it("켜지 않은 절기는 방문자에게 안 보이고, 켜면 보이고, 끄면 다시 숨는다", async () => {
    const advent = "select count(*) n from public.main_banners where kind = 'season' and season = 'advent'";
    expect(await count(anon, advent)).toBe(0);
    await t.as(editor, "update public.main_banners set status = 'published' where kind = 'season' and season = 'advent'");
    expect(await count(anon, advent)).toBe(1);
    await t.as(editor, "update public.main_banners set status = 'unpublished' where kind = 'season' and season = 'advent'");
    expect(await count(anon, advent)).toBe(0);
  });

  it("한 절기에 게시된 기본 배너는 하나만", async () => {
    await expect(
      t.as(editor, "insert into public.main_banners (season, kind, title, status) values ('ordinary', 'season', '둘째 연중', 'published')"),
    ).rejects.toThrow();
  });
});
