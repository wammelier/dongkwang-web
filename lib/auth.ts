import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";

export type AdminRole = "super_admin" | "editor";
export type Admin = { id: string; email: string; name: string; role: AdminRole };

export const ROLE_LABEL: Record<AdminRole, string> = { super_admin: "최고 관리자", editor: "콘텐츠 담당자" };

/** 로그인 상태 조회 (요청당 한 번만): 활성 관리자, 로그인 안 함(none), 사용 중지된 계정(inactive) */
const loadAdmin = cache(async (): Promise<{ admin: Admin | null; state: "ok" | "none" | "inactive" }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { admin: null, state: "none" };
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.is_active) return { admin: null, state: "inactive" };
  return { admin: { id: data.id, email: data.email, name: data.name, role: data.role }, state: "ok" };
});

/** 현재 로그인한 활성 관리자 (요청당 한 번만 조회) */
export async function getCurrentAdmin(): Promise<Admin | null> {
  return (await loadAdmin()).admin;
}

export async function requireStaff() {
  const { admin, state } = await loadAdmin();
  if (!admin) redirect(state === "inactive" ? "/admin/login?reason=inactive" : "/admin/login");
  return admin;
}

export async function requireSuperAdmin() {
  const admin = await requireStaff();
  if (admin.role !== "super_admin") redirect("/admin?denied=1");
  return admin;
}
