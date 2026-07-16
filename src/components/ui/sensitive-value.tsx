"use client";

import * as React from "react";
import { Copy, Eye } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface SensitiveValueProps {
  value?: string;
  className?: string;
  multiline?: boolean;
  copyable?: boolean;
  /** Compact inline layout for change history and similar side-by-side views */
  inline?: boolean;
}

export function SensitiveValue({
  value,
  className,
  multiline = false,
  copyable = false,
  inline = false,
}: SensitiveValueProps) {
  const t = useT();
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const hide = React.useCallback(() => setRevealed(false), []);
  const show = React.useCallback(() => setRevealed(true), []);

  if (!value) {
    return <span className="text-muted-foreground">{t("common.empty")}</span>;
  }

  const display = revealed ? value : "••••••••";

  const handleCopy = async () => {
    await copyText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    show();
  };

  const handlePointerRelease = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    hide();
  };

  return (
    <div
      className={cn(
        inline ? "inline-flex items-center gap-1" : "flex items-start gap-2",
        className
      )}
    >
      {multiline ? (
        <pre
          className={cn(
            "whitespace-pre-wrap break-all font-mono text-sm",
            !inline && "flex-1"
          )}
        >
          {display}
        </pre>
      ) : (
        <span
          className={cn(
            "break-all font-mono text-sm",
            !inline && "flex-1"
          )}
        >
          {display}
        </span>
      )}
      <div className="flex shrink-0 items-center gap-1">
        {copyable && (
          <button
            type="button"
            tabIndex={-1}
            className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label={copied ? t("common.copied") : t("common.copy")}
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          className="select-none rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("sensitive.holdToReveal")}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerRelease}
          onPointerCancel={handlePointerRelease}
        >
          <Eye className="h-4 w-4" />
        </button>
        {copied && (
          <span className="text-xs text-muted-foreground">{t("common.copied")}</span>
        )}
      </div>
    </div>
  );
}
