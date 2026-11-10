import { NotFoundContent } from "@/components/NotFoundContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

// 어떤 경로에도 맞지 않는 주소
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
