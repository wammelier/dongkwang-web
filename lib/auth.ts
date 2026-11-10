import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";

export type AdminRole = "super_admin" | "editor";
export type Admin = { id: string; email: string; name: string; role: AdminRole };

export const ROLE_LABEL: Record<AdminRole, string> = { super_admin: "최고 관리자", editor: "콘텐츠 담당자" };

/** 현재 로그인한 활성 관리자 (요청당 한 번만 조회) */
export const getCurrentAdmin = cache(async (): Promise<Admin | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.is_active) return null;
  return { id: data.id, email: data.email, name: data.name, role: data.role };
});

export async function requireStaff() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function requireSuperAdmin() {
  const admin = await requireStaff();
  if (admin.role !== "super_admin") redirect("/admin?denied=1");
  return admin;
}
