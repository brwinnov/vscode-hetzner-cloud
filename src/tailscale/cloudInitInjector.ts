import * as vscode from 'vscode';

/**
 * Injects a Tailscale installation block into a cloud-init YAML string.
 * If no cloud-init is provided it returns a minimal valid cloud-init with
 * only the Tailscale block.
 */
export function injectTailscale(cloudInit: string, authKey: string, extraArgs?: string): string {
  const cfg = vscode.workspace.getConfiguration('hcloud.tailscale');
  const args = extraArgs ?? cfg.get<string>('extraArgs') ?? '--accept-routes --ssh';

  const tailscaleBlock = buildTailscaleBlock(authKey, args);

  if (!cloudInit || cloudInit.trim() === '') {
    return `#cloud-config\n${tailscaleBlock}`;
  }

  // Merge into existing cloud-init
  if (cloudInit.includes('runcmd:')) {
    // Truly append after the last existing runcmd entry (not after the header)
    const newLines = tailscaleBlock
      .split('\n')
      .filter((l) => l.startsWith('  -'));
    const lines = cloudInit.split('\n');
    const runcmdIdx = lines.findIndex((l) => /^runcmd:\s*$/.test(l));
    if (runcmdIdx === -1) {
      // runcmd found via includes() but not as a standalone key — append new block
      return `${cloudInit.trimEnd()}\n${tailscaleBlock}`;
    }
    // Scan past all indented lines that form the existing sequence
    let insertIdx = runcmdIdx + 1;
    while (insertIdx < lines.length && /^\s/.test(lines[insertIdx])) {
      insertIdx++;
    }
    lines.splice(insertIdx, 0, ...newLines);
    return lines.join('\n');
  }

  return `${cloudInit.trimEnd()}\n${tailscaleBlock}`;
}

function buildTailscaleBlock(authKey: string, extraArgs: string): string {
  return `
runcmd:
  - curl -fsSL https://tailscale.com/install.sh | sh
  - tailscale up --authkey=${authKey} ${extraArgs}
`.trimStart();
}

/**
 * Returns whether Tailscale auto-inject is enabled in settings.
 */
export function isTailscaleEnabled(): boolean {
  return vscode.workspace
    .getConfiguration('hcloud.tailscale')
    .get<boolean>('enableByDefault', true);
}
