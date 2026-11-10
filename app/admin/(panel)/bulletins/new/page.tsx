import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { suggestBulletinTitle, upcomingSunday } from "@/lib/bulletins";
import { BulletinEditor } from "../BulletinEditor";

export const metadata: Metadata = { title: "주보 올리기" };

export default async function NewBulletinPage() {
  await requireStaff();
  const date = upcomingSunday();
  return (
    <div className="flex max-w-[1080px] flex-col gap-4">
      <h1 className="m-0 text-[26px] font-bold">주보 올리기</h1>
      <BulletinEditor id={null} initial={{ date, title: suggestBulletinTitle(date), note: "", filePath: "" }} meta={null} />
    </div>
  );
}
