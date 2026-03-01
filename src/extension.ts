import * as vscode from 'vscode';
import { TokenManager } from './utils/secretStorage';
import { ServersProvider } from './providers/serversProvider';
import { NetworksProvider } from './providers/networksProvider';
import { ImagesProvider } from './providers/imagesProvider';
import { SshKeysProvider } from './providers/sshKeysProvider';
import { SetupProvider } from './providers/setupProvider';
import { ProjectsProvider } from './providers/projectsProvider';
import { FirewallsProvider } from './providers/firewallsProvider';
import { VolumesProvider } from './providers/volumesProvider';
import { registerTokenCommands } from './commands/manageTokens';
import { registerServerCommands } from './commands/serverCommands';
import { registerNetworkCommands } from './commands/networkCommands';
import { registerSshKeyCommands } from './commands/sshKeyCommands';
import { registerFirewallCommands } from './commands/firewallCommands';
import { registerVolumeCommands } from './commands/volumeCommands';
import { TailscaleAuthKeyManager } from './tailscale/authKeyManager';
import { SshKeyGuidePanel } from './webviews/sshKeyGuide';
import { cleanupLegacyKeys } from './utils/secretStorage';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Hetzner Cloud Toolkit extension activated');

  // One-time cleanup of old hetznet.* SecretStorage keys from pre-rename installs
  if (!context.globalState.get<boolean>('hcloud.legacyKeysCleaned')) {
    const cleaned = await cleanupLegacyKeys(context.secrets);
    await context.globalState.update('hcloud.legacyKeysCleaned', true);
    if (cleaned) {
      console.log('Hetzner Cloud Toolkit: removed legacy hetznet.* SecretStorage keys');
    }
  }

  const tokenManager = new TokenManager(context.secrets);
  const tailscaleKeyManager = new TailscaleAuthKeyManager(context.secrets);

  // Tree data providers
  const setupProvider = new SetupProvider(tokenManager);
  const projectsProvider = new ProjectsProvider(tokenManager);
  const serversProvider = new ServersProvider(tokenManager);
  context.subscriptions.push(serversProvider);
  const networksProvider = new NetworksProvider(tokenManager);
  const imagesProvider = new ImagesProvider(tokenManager);
  const sshKeysProvider = new SshKeysProvider(tokenManager);
  const firewallsProvider = new FirewallsProvider(tokenManager);
  const volumesProvider = new VolumesProvider(tokenManager);

  // Register tree views
  vscode.window.createTreeView('hcloud.setup', {
    treeDataProvider: setupProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hcloud.projects', {
    treeDataProvider: projectsProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hcloud.servers', {
    treeDataProvider: serversProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hcloud.networks', {
    treeDataProvider: networksProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hcloud.images', {
    treeDataProvider: imagesProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hcloud.sshKeys', {
    treeDataProvider: sshKeysProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hcloud.firewalls', {
    treeDataProvider: firewallsProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hcloud.volumes', {
    treeDataProvider: volumesProvider,
    showCollapseAll: false,
  });

  // Status bar item — shows active project name
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'hcloud.switchToken';
  context.subscriptions.push(statusBar);

  const refreshStatusBar = async () => {
    const name = await tokenManager.getActiveProjectName();
    if (name) {
      statusBar.text = `$(cloud) Hetzner Cloud: ${name}`;
      statusBar.tooltip = 'Click to switch Hetzner project';
      statusBar.show();
    } else {
      statusBar.text = `$(cloud) Hetzner Cloud: No project`;
      statusBar.tooltip = 'Click to add a Hetzner API token';
      statusBar.show();
    }
  };

  await refreshStatusBar();

  // SSH Key Guide command
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.sshKeyGuide', () => {
      SshKeyGuidePanel.create(context);
    })
  );

  // Tailscale key command
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.setTailscaleKey', async () => {
      await tailscaleKeyManager.promptAndSave();
    })
  );

  // Register all commands
  registerTokenCommands(
    context,
    tokenManager,
    refreshStatusBar,
    setupProvider,
    projectsProvider,
    serversProvider,
    networksProvider,
    imagesProvider,
    sshKeysProvider
  );
  registerServerCommands(context, tokenManager, serversProvider, tailscaleKeyManager);
  registerNetworkCommands(context, tokenManager, networksProvider);
  registerSshKeyCommands(context, tokenManager, sshKeysProvider);
  registerFirewallCommands(context, tokenManager, tailscaleKeyManager, firewallsProvider);
  registerVolumeCommands(context, tokenManager, volumesProvider);
}

export function deactivate() {
  console.log('Hetzner Cloud Toolkit extension deactivated');
}
