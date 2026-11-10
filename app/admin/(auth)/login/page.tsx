import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "로그인" };

const REASONS: Record<string, string> = {
  inactive: "사용이 중지된 계정입니다. 최고 관리자에게 문의해 주세요.",
  "signed-out": "로그아웃했습니다.",
  "link-expired": "링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기로 새 링크를 받아 주세요.",
};

type Props = { searchParams: Promise<{ next?: string; reason?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, reason } = await searchParams;
  return (
    <>
      <h1 className="m-0 mb-1 text-[22px] font-bold">관리자 로그인</h1>
      <p className="m-0 mb-6 text-[15px] text-ink-muted">초대받은 관리자 계정으로 로그인해 주세요.</p>
      <LoginForm next={next} notice={reason ? REASONS[reason] : undefined} ok={reason === "signed-out"} />
    </>
  );
}
