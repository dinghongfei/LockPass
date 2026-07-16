"use client";

import * as React from "react";
import { Copy, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface SensitiveValueProps {
  value?: string;
  className?: string;
  multiline?: boolean;
  copyable?: boolean;
  /** 紧凑行内布局，适用于变更记录等并排场景 */
  inline?: boolean;
}

export function SensitiveValue({
  value,
  className,
  multiline = false,
  copyable = false,
  inline = false,
}: SensitiveValueProps) {
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const hide = React.useCallback(() => setRevealed(false), []);
  const show = React.useCallback(() => setRevealed(true), []);

  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  const display = revealed ? value : "••••••••";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
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
            aria-label={copied ? "已复制" : "复制"}
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          className="select-none rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="按住显示"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerRelease}
          onPointerCancel={handlePointerRelease}
        >
          <Eye className="h-4 w-4" />
        </button>
        {copied && (
          <span className="text-xs text-muted-foreground">已复制</span>
        )}
      </div>
    </div>
  );
}
