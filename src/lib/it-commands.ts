export interface SshCommand {
  /** Network key: private | public — translate in UI */
  network: "private" | "public";
  command: string;
}

/** Build SSH login commands when username + IP are present */
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
    commands.push({ network: "private", command: `ssh ${user}@${inner}` });
  }
  if (outer) {
    commands.push({ network: "public", command: `ssh ${user}@${outer}` });
  }
  return commands;
}
