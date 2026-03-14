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
import { registerNetworkDetailCommand } from './webviews/networkDetail';
import { registerSshKeyCommands } from './commands/sshKeyCommands';
import { registerFirewallCommands } from './commands/firewallCommands';
import { registerVolumeCommands } from './commands/volumeCommands';
import { SshKeyGuidePanel } from './webviews/sshKeyGuide';
import { WelcomePage } from './webviews/welcomePage';
import { NetworkGuide } from './webviews/networkGuide';
import { CidrCalculator } from './webviews/cidrCalculator';
import { FirewallGuide } from './webviews/firewallGuide';
import { VolumeGuide } from './webviews/volumeGuide';
import { ImageGuide } from './webviews/imageGuide';
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

  // Welcome page command (also shown automatically on first install)
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.welcome', () => {
      WelcomePage.open(context);
    })
  );
  WelcomePage.openOnFirstInstall(context);

  // SSH Key Guide command
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.sshKeyGuide', () => {
      SshKeyGuidePanel.create(context);
    })
  );

  // Network Guide command
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.networkGuide', () => {
      NetworkGuide.open(context);
    })
  );

  // CIDR Calculator command
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.cidrCalculator', () => {
      CidrCalculator.open(context);
    })
  );

  // Firewall Guide command
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.firewallGuide', () => {
      FirewallGuide.open(context);
    })
  );

  // Volume Guide command
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.volumeGuide', () => {
      VolumeGuide.open(context);
    })
  );

  // Image Guide command
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.imageGuide', () => {
      ImageGuide.open(context);
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
    sshKeysProvider,
    firewallsProvider,
    volumesProvider
  );
  registerServerCommands(context, tokenManager, serversProvider);
  registerNetworkCommands(context, tokenManager, networksProvider);
  registerNetworkDetailCommand(context);
  registerSshKeyCommands(context, tokenManager, sshKeysProvider);
  registerFirewallCommands(context, tokenManager, firewallsProvider);
  registerVolumeCommands(context, tokenManager, volumesProvider);
}

export function deactivate() {
  console.log('Hetzner Cloud Toolkit extension deactivated');
}
