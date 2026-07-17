"use client";

import * as React from "react";
import { Eye, X } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { InputProps } from "@/components/ui/input";

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      onClear,
      disabled,
      ...props
    },
    ref
  ) => {
    const t = useT();
    const [revealed, setRevealed] = React.useState(false);
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      defaultValue?.toString() ?? ""
    );
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : uncontrolledValue;
    const hasValue = String(currentValue ?? "").length > 0;
    const canClear = !disabled && hasValue && Boolean(onChange || onClear);

    const hide = React.useCallback(() => setRevealed(false), []);
    const show = React.useCallback(() => setRevealed(true), []);

    const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (onClear) {
        onClear();
        return;
      }
      if (onChange) {
        const event = {
          target: { value: "" },
          currentTarget: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
      if (!isControlled) {
        setUncontrolledValue("");
      }
    };

    return (
      <div className="relative w-full">
        <input
          type={revealed ? "text" : "password"}
          className={cn(
            "flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            canClear ? "pr-16" : "pr-9",
            className
          )}
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            if (!isControlled) {
              setUncontrolledValue(e.target.value);
            }
            onChange?.(e);
          }}
          disabled={disabled}
          {...props}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {canClear && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="cursor-pointer rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("sensitive.clear")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            className="cursor-pointer select-none rounded-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label={t("sensitive.holdToRevealPassword")}
            onMouseDown={(e) => {
              e.preventDefault();
              show();
            }}
            onMouseUp={hide}
            onMouseLeave={hide}
            onTouchStart={(e) => {
              e.preventDefault();
              show();
            }}
            onTouchEnd={hide}
            onTouchCancel={hide}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
