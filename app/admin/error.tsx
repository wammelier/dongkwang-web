"use client";

import { ErrorContent } from "@/components/ErrorContent";

export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent {...props} home="/admin" />;
}
