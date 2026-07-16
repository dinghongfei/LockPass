export interface SshCommand {
  label: string;
  command: string;
}

/** 根据用户名与 IP 生成 SSH 登录指令（仅在有值时返回） */
export function buildSshCommands(
  username?: string,
  privateIp?: string,
  publicIp?: string
): SshCommand[] {
  const user = username?.trim();
  if (!user) return [];

  const commands: SshCommand[] = [];
  const inner = privateIp?.trim();
  const outer = publicIp?.trim();

  if (inner) {
    commands.push({ label: "内网", command: `ssh ${user}@${inner}` });
  }
  if (outer) {
    commands.push({ label: "公网", command: `ssh ${user}@${outer}` });
  }
  return commands;
}
