import * as vscode from 'vscode';
import { TokenManager, RobotCredentialManager, StorageBoxPasswordManager } from '../utils/secretStorage';
import { StorageBoxProvider, StorageBoxItem } from '../providers/storageBoxProvider';
import { generateMountScript, StorageBoxMount } from '../utils/storageBoxInjector';
import { RobotCredentialsPanel } from '../webviews/robotCredentialsPanel';

export function registerStorageBoxCommands(
  context: vscode.ExtensionContext,
  tokenManager: TokenManager,
  robotCredManager: RobotCredentialManager,
  boxPwdManager: StorageBoxPasswordManager,
  storageBoxProvider: StorageBoxProvider
) {
  // ── Set Robot API credentials ────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.setRobotCredentials', async () => {
      await RobotCredentialsPanel.open(context, robotCredManager, storageBoxProvider);
    })
  );

  // ── Clear Robot API credentials ──────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.clearRobotCredentials', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Remove stored Robot API credentials? You will need to re-enter them to access Storage Boxes.',
        { modal: true },
        'Remove'
      );
      if (confirm !== 'Remove') return;
      await robotCredManager.clearCredentials();
      storageBoxProvider.refresh();
      vscode.window.showInformationMessage('Robot API credentials removed.');
    })
  );

  // ── Refresh ──────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.refreshStorageBoxes', () => storageBoxProvider.refresh())
  );

  // ── Mount Storage Box to Server ──────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.mountStorageBoxToServer', async (item: StorageBoxItem) => {
      await mountBox(item, tokenManager, boxPwdManager, /* openSsh */ true);
    })
  );

  // ── Copy Mount Commands to Clipboard ────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.copyStorageBoxMountCommands', async (item: StorageBoxItem) => {
      await mountBox(item, tokenManager, boxPwdManager, /* openSsh */ false);
    })
  );
}

// ── Shared mount prompt + script generation ──────────────────────────────────

async function mountBox(
  item: StorageBoxItem,
  tokenManager: TokenManager,
  boxPwdManager: StorageBoxPasswordManager,
  openSsh: boolean
) {
  // 1. Pick target server
  const client = await tokenManager.getActiveClient();
  if (!client) {
    vscode.window.showErrorMessage('No active Hetzner project.');
    return;
  }

  let servers;
  try {
    servers = await client.getServers();
  } catch (err: unknown) {
    vscode.window.showErrorMessage(`Failed to fetch servers: ${(err as Error).message}`);
    return;
  }

  if (servers.length === 0) {
    vscode.window.showInformationMessage('No servers found in the active project.');
    return;
  }

  const serverPick = await vscode.window.showQuickPick(
    servers.map((s) => ({
      label: s.name,
      description: `${s.status} · ${s.public_net.ipv4?.ip ?? 'no ip'}`,
      ip: s.public_net.ipv4?.ip ?? s.public_net.ipv6?.ip,
    })),
    { title: `Mount "${item.box.name}" — Select Target Server`, placeHolder: 'Select server' }
  );
  if (!serverPick) return;

  // 2. Mount point name
  const defaultName = item.box.login.replace(/[^a-z0-9_-]/gi, '-');
  const mountName = await vscode.window.showInputBox({
    title: 'Mount Point Name',
    prompt: `Storage box will be mounted at /mnt/<name>`,
    value: defaultName,
    placeHolder: 'e.g. backups',
    validateInput: (v) => {
      if (!v?.trim()) return 'Name cannot be empty';
      if (/[^a-z0-9._-]/i.test(v.trim())) return 'Use only letters, numbers, dots, hyphens, underscores';
      return undefined;
    },
  });
  if (!mountName) return;

  // 3. Storage box CIFS password (separate from Robot API credentials)
  let password = await boxPwdManager.getPassword(item.box.login);
  if (!password) {
    password = await vscode.window.showInputBox({
      title: `Storage Box Password — ${item.box.login}`,
      prompt: 'Enter the CIFS/Samba password for this Storage Box (set at robot.hetzner.com)',
      password: true,
      validateInput: (v) => (!v?.trim() ? 'Password cannot be empty' : undefined),
    });
    if (!password) return;

    const save = await vscode.window.showQuickPick(
      [
        { label: '$(check) Save password securely (VS Code SecretStorage)', value: true },
        { label: '$(close) Use once, do not save', value: false },
      ],
      { title: 'Save Storage Box Password?' }
    );
    if (!save) return;
    if (save.value) {
      await boxPwdManager.setPassword(item.box.login, password);
    }
  }

  // 4. Generate script + copy to clipboard
  const mount: StorageBoxMount = {
    login: item.box.login,
    server: item.box.server,
    password,
    mountName: mountName.trim(),
  };
  const script = generateMountScript([mount]);
  await vscode.env.clipboard.writeText(script);

  if (openSsh && serverPick.ip) {
    const terminal = vscode.window.createTerminal(`SSH: ${serverPick.label}`);
    terminal.sendText(`ssh root@${serverPick.ip}`);
    terminal.show();
    vscode.window.showInformationMessage(
      `Mount script copied to clipboard. Paste and run in the SSH terminal to mount "${item.box.login}" at /mnt/${mountName}.`
    );
  } else {
    vscode.window.showInformationMessage(
      `Mount script for "${item.box.login}" → /mnt/${mountName} copied to clipboard. Run as root on ${serverPick.label}.`
    );
  }
}

/**
 * Prompts the user to select and configure Storage Box mounts interactively.
 * Returns the list of configured mounts, or undefined if cancelled.
 * Used by both the tree commands and the server wizard.
 */
export async function promptStorageBoxMounts(
  robotCredManager: RobotCredentialManager,
  boxPwdManager: StorageBoxPasswordManager
): Promise<StorageBoxMount[] | undefined> {
  const client = await robotCredManager.getClient();
  if (!client) {
    const setup = await vscode.window.showWarningMessage(
      'Robot API credentials are not set. They are required to access Storage Boxes.',
      'Set credentials now'
    );
    if (setup) {
      await vscode.commands.executeCommand('hcloud.setRobotCredentials');
    }
    return undefined;
  }

  let boxes;
  try {
    boxes = await client.getStorageBoxes();
  } catch (err: unknown) {
    vscode.window.showErrorMessage(`Failed to fetch Storage Boxes: ${(err as Error).message}`);
    return undefined;
  }

  if (boxes.length === 0) {
    vscode.window.showInformationMessage('No Storage Boxes found on this account.');
    return undefined;
  }

  // Multi-select boxes to mount
  const selected = await vscode.window.showQuickPick(
    boxes.map((b) => ({
      label: b.name,
      description: `${b.login} · ${b.disk} GB`,
      picked: false,
      box: b,
    })),
    {
      title: 'Mount Storage Boxes — Select boxes to mount',
      placeHolder: 'Select one or more Storage Boxes',
      canPickMany: true,
    }
  );
  if (!selected || selected.length === 0) return undefined;

  const mounts: StorageBoxMount[] = [];

  for (const pick of selected) {
    const b = pick.box;

    // Mount name
    const defaultName = b.login.replace(/[^a-z0-9_-]/gi, '-');
    const mountName = await vscode.window.showInputBox({
      title: `Mount Point — ${b.name}`,
      prompt: `Where should "${b.name}" (${b.login}) be mounted? Will use /mnt/<name>`,
      value: defaultName,
      placeHolder: 'e.g. backups',
      validateInput: (v) => {
        if (!v?.trim()) return 'Name cannot be empty';
        if (/[^a-z0-9._-]/i.test(v.trim())) return 'Use only letters, numbers, dots, hyphens, underscores';
        return undefined;
      },
    });
    if (!mountName) return undefined; // user cancelled mid-flow

    // Password
    let password = await boxPwdManager.getPassword(b.login);
    if (!password) {
      password = await vscode.window.showInputBox({
        title: `Storage Box Password — ${b.login}`,
        prompt: 'Enter the CIFS/Samba password for this Storage Box',
        password: true,
        validateInput: (v) => (!v?.trim() ? 'Password cannot be empty' : undefined),
      });
      if (!password) return undefined;

      const save = await vscode.window.showQuickPick(
        [
          { label: '$(check) Save password securely', value: true },
          { label: '$(close) Use once only', value: false },
        ],
        { title: `Save password for ${b.login}?` }
      );
      if (!save) return undefined;
      if (save.value) {
        await boxPwdManager.setPassword(b.login, password);
      }
    }

    mounts.push({ login: b.login, server: b.server, password, mountName: mountName.trim() });
  }

  return mounts;
}
