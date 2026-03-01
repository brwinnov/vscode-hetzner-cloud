import * as vscode from 'vscode';
import { TokenManager } from '../utils/secretStorage';
import { ServersProvider, ServerItem } from '../providers/serversProvider';
import { TailscaleAuthKeyManager } from '../tailscale/authKeyManager';
import { injectTailscale, isTailscaleEnabled } from '../tailscale/cloudInitInjector';
import { HetznerClient, CreateServerOptions } from '../api/hetzner';

export function registerServerCommands(
  context: vscode.ExtensionContext,
  tokenManager: TokenManager,
  serversProvider: ServersProvider,
  tailscaleKeyManager: TailscaleAuthKeyManager
) {
  // Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.refreshServers', () => serversProvider.refresh())
  );

  // Start
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.startServer', async (item: ServerItem) => {
      const client = await tokenManager.getActiveClient();
      if (!client) return;
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Starting ${item.server.name}...` },
        () => client.powerOnServer(item.server.id)
      );
      serversProvider.refresh();
    })
  );

  // Stop
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.stopServer', async (item: ServerItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Stop server "${item.server.name}"?`,
        { modal: true },
        'Stop'
      );
      if (confirm !== 'Stop') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Stopping ${item.server.name}...` },
        () => client.powerOffServer(item.server.id)
      );
      serversProvider.refresh();
    })
  );

  // Reboot
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.rebootServer', async (item: ServerItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Reboot server "${item.server.name}"?`,
        { modal: true },
        'Reboot'
      );
      if (confirm !== 'Reboot') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Rebooting ${item.server.name}...` },
        () => client.rebootServer(item.server.id)
      );
      serversProvider.refresh();
    })
  );

  // Delete
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.deleteServer', async (item: ServerItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Permanently delete server "${item.server.name}"? This cannot be undone.`,
        { modal: true },
        'Delete'
      );
      if (confirm !== 'Delete') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Deleting ${item.server.name}...` },
        () => client.deleteServer(item.server.id)
      );
      serversProvider.refresh();
    })
  );

  // SSH
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.sshServer', (item: ServerItem) => {
      const ip = item.server.public_net.ipv4?.ip ?? item.server.public_net.ipv6?.ip;
      if (!ip) {
        vscode.window.showErrorMessage('Server has no public IP address.');
        return;
      }
      const terminal = vscode.window.createTerminal(`SSH: ${item.server.name}`);
      terminal.sendText(`ssh root@${ip}`);
      terminal.show();
    })
  );

  // Create Server
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.createServer', async () => {
      const client = await tokenManager.getActiveClient();
      if (!client) {
        vscode.window.showErrorMessage('No active Hetzner project. Add a token first.');
        return;
      }
      await runCreateServerWizard(client, tokenManager, tailscaleKeyManager, serversProvider);
    })
  );
}

async function runCreateServerWizard(
  client: HetznerClient,
  tokenManager: TokenManager,
  tailscaleKeyManager: TailscaleAuthKeyManager,
  serversProvider: ServersProvider
) {
  // Step 1: Name
  const name = await vscode.window.showInputBox({
    title: 'Create Server (1/5) — Name',
    prompt: 'Enter a name for the server',
    placeHolder: 'e.g. web-01',
    validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
  });
  if (!name) return;

  // Step 2: Location
  const locations = await client.getLocations();
  const locationPick = await vscode.window.showQuickPick(
    locations.map((l) => ({ label: l.name, description: `${l.city}, ${l.country}`, detail: l.network_zone })),
    { title: 'Create Server (2/5) — Location' }
  );
  if (!locationPick) return;

  // Step 3: Server type
  const serverTypes = await client.getServerTypes();
  const typePick = await vscode.window.showQuickPick(
    serverTypes.map((t) => ({
      label: t.name,
      description: `${t.cores} vCPU · ${t.memory}GB RAM · ${t.disk}GB ${t.storage_type}`,
      detail: `${t.cpu_type} · ${t.architecture}`,
    })),
    { title: 'Create Server (3/5) — Server Type' }
  );
  if (!typePick) return;

  // Step 4: Image (system + snapshots)
  const [systemImages, snapshots] = await Promise.all([
    client.getImages('system'),
    client.getImages('snapshot'),
  ]);

  const customImageOption = { label: '$(package) Use custom image ID', description: 'Enter a custom image ID or name', isCustom: true };
  const imagePick = await vscode.window.showQuickPick(
    [
      customImageOption,
      ...systemImages.map((i) => ({ label: i.name ?? i.description, description: `${i.os_flavor} ${i.os_version ?? ''}`, isCustom: false })),
      ...snapshots.map((i) => ({ label: i.description, description: `snapshot · ${new Date(i.created).toLocaleDateString()}`, isCustom: false })),
    ],
    { title: 'Create Server (4/5) — OS Image' }
  );
  if (!imagePick) return;

  let imageValue: string;
  if (imagePick.isCustom) {
    const custom = await vscode.window.showInputBox({
      title: 'Custom Image',
      prompt: 'Enter a custom image ID or name',
      placeHolder: 'e.g. 12345678 or my-custom-image',
    });
    if (!custom) return;
    imageValue = custom.trim();
  } else {
    imageValue = imagePick.label;
  }

  // Step 5: SSH Keys
  const sshKeys = await client.getSshKeys();
  const sshPicks = await vscode.window.showQuickPick(
    sshKeys.map((k) => ({ label: k.name, description: k.fingerprint, picked: false })),
    { title: 'Create Server (5/5) — SSH Keys', canPickMany: true }
  );

  // Cloud-init + Tailscale
  let cloudInit = '';
  if (isTailscaleEnabled()) {
    let tsKey = await tailscaleKeyManager.getAuthKey();
    if (!tsKey) {
      const setNow = await vscode.window.showInformationMessage(
        'Tailscale is enabled by default. Set your Tailscale auth key to auto-configure.',
        'Set Key',
        'Skip'
      );
      if (setNow === 'Set Key') {
        tsKey = await tailscaleKeyManager.promptAndSave();
      }
    }
    if (tsKey) {
      cloudInit = injectTailscale('', tsKey);
    }
  }

  // Create
  const opts: CreateServerOptions = {
    name: name.trim(),
    server_type: typePick.label,
    image: imageValue,
    location: locationPick.label,
    ssh_keys: sshPicks?.map((k) => k.label) ?? [],
    user_data: cloudInit || undefined,
    start_after_create: true,
  };

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Creating server "${name}"...` },
    () => client.createServer(opts)
  );

  serversProvider.refresh();
  vscode.window.showInformationMessage(`Server "${name}" created successfully!`);
}
