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
    // Append to existing runcmd list
    return cloudInit.replace(
      /^(runcmd:\s*\n)/m,
      `$1${tailscaleBlock
        .split('\n')
        .filter((l) => l.startsWith('  -'))
        .map((l) => `  ${l}`)
        .join('\n')}\n`
    );
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
