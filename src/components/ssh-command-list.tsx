"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { buildSshCommands } from "@/lib/it-commands";

interface SshCommandListProps {
  username?: string;
  privateIp?: string;
  publicIp?: string;
}

export function SshCommandList({
  username,
  privateIp,
  publicIp,
}: SshCommandListProps) {
  const commands = buildSshCommands(username, privateIp, publicIp);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (commands.length === 0) return null;

  const handleCopy = async (command: string, index: number) => {
    await copyText(command);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">SSH 登录指令</p>
      <ul className="space-y-2">
        {commands.map((cmd, index) => (
          <li
            key={cmd.label}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
          >
            <span className="shrink-0 text-xs text-muted-foreground">
              {cmd.label}
            </span>
            <code className="flex-1 break-all font-mono text-sm">
              {cmd.command}
            </code>
            <button
              type="button"
              className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label={copiedIndex === index ? "已复制" : "复制"}
              onClick={() => handleCopy(cmd.command, index)}
            >
              <Copy className="h-4 w-4" />
            </button>
            {copiedIndex === index && (
              <span className="shrink-0 text-xs text-muted-foreground">
                已复制
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
