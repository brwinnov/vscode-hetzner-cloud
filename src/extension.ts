import * as vscode from 'vscode';
import { TokenManager, RobotCredentialManager, StorageBoxPasswordManager } from './utils/secretStorage';
import { ServersProvider } from './providers/serversProvider';
import { NetworksProvider } from './providers/networksProvider';
import { ImagesProvider } from './providers/imagesProvider';
import { SshKeysProvider } from './providers/sshKeysProvider';
import { SetupProvider } from './providers/setupProvider';
import { ProjectsProvider } from './providers/projectsProvider';
import { FirewallsProvider } from './providers/firewallsProvider';
import { VolumesProvider } from './providers/volumesProvider';
import { StorageBoxProvider } from './providers/storageBoxProvider';
import { LoadBalancersProvider } from './providers/loadBalancersProvider';
import { registerTokenCommands } from './commands/manageTokens';
import { registerServerCommands } from './commands/serverCommands';
import { registerNetworkCommands } from './commands/networkCommands';
import { registerSshKeyCommands } from './commands/sshKeyCommands';
import { registerFirewallCommands } from './commands/firewallCommands';
import { registerVolumeCommands } from './commands/volumeCommands';
import { registerStorageBoxCommands } from './commands/storageBoxCommands';
import { registerLoadBalancerCommands } from './commands/loadBalancerCommands';
import { TailscaleAuthKeyManager } from './tailscale/authKeyManager';
import { SshKeyGuidePanel } from './webviews/sshKeyGuide';
import { WelcomePage } from './webviews/welcomePage';
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
  const robotCredManager = new RobotCredentialManager(context.secrets);
  const boxPwdManager = new StorageBoxPasswordManager(context.secrets);

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
  const storageBoxProvider = new StorageBoxProvider(robotCredManager);
  const loadBalancersProvider = new LoadBalancersProvider(tokenManager);

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
  vscode.window.createTreeView('hcloud.storageBoxes', {
    treeDataProvider: storageBoxProvider,
    showCollapseAll: false,
  });
  vscode.window.createTreeView('hcloud.loadBalancers', {
    treeDataProvider: loadBalancersProvider,
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

  // Cloud Console command (Coming Soon placeholder)
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.cloudConsole', () => {
      vscode.window.showInformationMessage(
        '☁️ Cloud Console - Coming Soon! This will provide a custom-designed Hetzner Cloud Console view inside VS Code.',
        'Learn More'
      ).then(selection => {
        if (selection === 'Learn More') {
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/brwinnov/vscode-hetzner-cloud/issues'));
        }
      });
    })
  );

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
    sshKeysProvider,
    firewallsProvider,
    volumesProvider,
    loadBalancersProvider
  );
  registerServerCommands(context, tokenManager, serversProvider, tailscaleKeyManager, robotCredManager, boxPwdManager);
  registerNetworkCommands(context, tokenManager, networksProvider);
  registerSshKeyCommands(context, tokenManager, sshKeysProvider);
  registerFirewallCommands(context, tokenManager, tailscaleKeyManager, firewallsProvider);
  registerVolumeCommands(context, tokenManager, volumesProvider);
  registerStorageBoxCommands(context, tokenManager, robotCredManager, boxPwdManager, storageBoxProvider);
  registerLoadBalancerCommands(context, tokenManager, loadBalancersProvider);
}

export function deactivate() {
  console.log('Hetzner Cloud Toolkit extension deactivated');
}
