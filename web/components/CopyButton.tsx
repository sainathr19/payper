"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** Small copy-to-clipboard affordance used next to IDs, tx hashes, addresses. */
export default function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <button
      type="button"
      className="copy-btn"
      onClick={onCopy}
      aria-label={copied ? "Copied" : `Copy ${label ?? "value"}`}
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? <Check /> : <Copy />}
    </button>
  );
}
