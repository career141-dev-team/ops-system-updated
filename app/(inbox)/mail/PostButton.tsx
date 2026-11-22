"use client";

import { useFormStatus } from "react-dom";

/** Post button that waits while sending (22 Nov): a slow post was clicked again and saved 4+ times. */
export default function PostButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className + " disabled:opacity-60"}>
      {pending ? "Posting…" : "Post"}
    </button>
  );
}
