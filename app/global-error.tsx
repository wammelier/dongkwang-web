"use client";

import { ErrorContent } from "@/components/ErrorContent";
import "./globals.css";

// 최상위 레이아웃까지 실패했을 때 (드묾)
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body className="bg-white text-ink">
        <ErrorContent {...props} />
      </body>
    </html>
  );
}
