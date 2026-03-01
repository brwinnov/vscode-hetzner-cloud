import * as vscode from 'vscode';
import { TokenManager } from './utils/secretStorage';
import { ServersProvider } from './providers/serversProvider';
import { NetworksProvider } from './providers/networksProvider';
import { ImagesProvider } from './providers/imagesProvider';
import { SshKeysProvider } from './providers/sshKeysProvider';
import { registerTokenCommands } from './commands/manageTokens';
import { registerServerCommands } from './commands/serverCommands';
import { registerNetworkCommands } from './commands/networkCommands';
import { registerSshKeyCommands } from './commands/sshKeyCommands';
import { TailscaleAuthKeyManager } from './tailscale/authKeyManager';

export async function activate(context: vscode.ExtensionContext) {
  console.log('HetzNet extension activated');

  const tokenManager = new TokenManager(context.secrets);
  const tailscaleKeyManager = new TailscaleAuthKeyManager(context.secrets);

  // Tree data providers
  const serversProvider = new ServersProvider(tokenManager);
  const networksProvider = new NetworksProvider(tokenManager);
  const imagesProvider = new ImagesProvider(tokenManager);
  const sshKeysProvider = new SshKeysProvider(tokenManager);

  // Register tree views
  vscode.window.createTreeView('hetznet.servers', {
    treeDataProvider: serversProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hetznet.networks', {
    treeDataProvider: networksProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hetznet.images', {
    treeDataProvider: imagesProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hetznet.sshKeys', {
    treeDataProvider: sshKeysProvider,
    showCollapseAll: false,
  });

  // Status bar item — shows active project name
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'hetznet.switchToken';
  context.subscriptions.push(statusBar);

  const refreshStatusBar = async () => {
    const name = await tokenManager.getActiveProjectName();
    if (name) {
      statusBar.text = `$(cloud) HetzNet: ${name}`;
      statusBar.tooltip = 'Click to switch Hetzner project';
      statusBar.show();
    } else {
      statusBar.text = `$(cloud) HetzNet: No project`;
      statusBar.tooltip = 'Click to add a Hetzner API token';
      statusBar.show();
    }
  };

  await refreshStatusBar();

  // Register all commands
  registerTokenCommands(context, tokenManager, refreshStatusBar, serversProvider, networksProvider, imagesProvider, sshKeysProvider);
  registerServerCommands(context, tokenManager, serversProvider, tailscaleKeyManager);
  registerNetworkCommands(context, tokenManager, networksProvider);
  registerSshKeyCommands(context, tokenManager, sshKeysProvider);

  // Tailscale key command
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.setTailscaleKey', async () => {
      await tailscaleKeyManager.promptAndSave();
    })
  );
}

export function deactivate() {
  console.log('HetzNet extension deactivated');
}
