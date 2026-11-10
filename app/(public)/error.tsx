"use client";

import { ErrorContent } from "@/components/ErrorContent";

// 공개 페이지 오류: 머리말·꼬리말은 그대로 두고 본문만 바꾼다
export default function PublicError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent {...props} />;
}
