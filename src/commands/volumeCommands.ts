import * as vscode from 'vscode';
import { TokenManager } from '../utils/secretStorage';
import { VolumesProvider, VolumeItem } from '../providers/volumesProvider';

const FORMATS = ['ext4', 'xfs'];
const VOLUME_LOCATIONS = ['nbg1', 'fsn1', 'hel1', 'ash', 'hil'];

export function registerVolumeCommands(
  context: vscode.ExtensionContext,
  tokenManager: TokenManager,
  volumesProvider: VolumesProvider
) {
  // Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.refreshVolumes', () => volumesProvider.refresh())
  );

  // Create Volume
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.createVolume', async () => {
      const client = await tokenManager.getActiveClient();
      if (!client) {
        vscode.window.showErrorMessage('No active Hetzner project.');
        return;
      }

      const name = await vscode.window.showInputBox({
        title: 'Create Volume — Name',
        prompt: 'Enter a name for the volume',
        placeHolder: 'e.g. db-data',
        validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
      });
      if (!name) return;

      const sizeInput = await vscode.window.showInputBox({
        title: 'Create Volume — Size (GB)',
        prompt: 'Minimum 10 GB, maximum 10240 GB',
        value: '10',
        validateInput: (v) => {
          const n = parseInt(v ?? '', 10);
          if (isNaN(n) || n < 10 || n > 10240) return 'Must be a number between 10 and 10240';
          return undefined;
        },
      });
      if (!sizeInput) return;
      const size = parseInt(sizeInput, 10);

      const locationPick = await vscode.window.showQuickPick(
        VOLUME_LOCATIONS.map((l) => ({ label: l })),
        { title: 'Create Volume — Location', placeHolder: 'Select datacenter' }
      );
      if (!locationPick) return;

      const formatPick = await vscode.window.showQuickPick(
        FORMATS.map((f) => ({ label: f })),
        { title: 'Create Volume — Format', placeHolder: 'Choose filesystem format' }
      );
      if (!formatPick) return;

      // Optionally attach to a server in the same location
      let serverId: number | undefined;
      const attachNow = await vscode.window.showQuickPick(
        [
          { label: '$(vm) Attach to a server now', value: true },
          { label: '$(circle-outline) Create detached', value: false },
        ],
        { title: 'Create Volume — Attach' }
      );
      if (!attachNow) return;

      if (attachNow.value) {
        let servers;
        try {
          servers = await client.getServers();
        } catch (err: unknown) {
          vscode.window.showErrorMessage(`Failed to fetch servers: ${(err as Error).message}`);
          return;
        }
        const localServers = servers.filter(
          (s) => s.datacenter.location.name === locationPick.label
        );
        if (localServers.length === 0) {
          vscode.window.showWarningMessage(
            `No servers found in ${locationPick.label}. Creating volume detached.`
          );
        } else {
          const serverPick = await vscode.window.showQuickPick(
            localServers.map((s) => ({
              label: s.name,
              description: `${s.status} · ${s.public_net.ipv4?.ip ?? 'no ip'}`,
              id: s.id,
            })),
            { title: 'Create Volume — Select Server', placeHolder: 'Select server to attach to' }
          );
          if (!serverPick) return;
          serverId = serverPick.id;
        }
      }

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Creating volume "${name}"...` },
          () =>
            client.createVolume(
              name.trim(),
              size,
              locationPick.label,
              formatPick.label,
              serverId !== undefined, // automount
              serverId
            )
        );
        volumesProvider.refresh();
        const msg = serverId !== undefined
          ? `Volume "${name}" (${size} GB) created and attached.`
          : `Volume "${name}" (${size} GB) created.`;
        vscode.window.showInformationMessage(msg);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to create volume: ${(err as Error).message}`);
      }
    })
  );

  // Delete Volume
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.deleteVolume', async (item: VolumeItem) => {
      if (item.volume.server !== null) {
        vscode.window.showErrorMessage(
          `Volume "${item.volume.name}" is still attached. Detach it before deleting.`
        );
        return;
      }
      const confirm = await vscode.window.showWarningMessage(
        `Permanently delete volume "${item.volume.name}" (${item.volume.size} GB)? All data will be lost.`,
        { modal: true },
        'Delete'
      );
      if (confirm !== 'Delete') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Deleting volume "${item.volume.name}"...` },
          () => client.deleteVolume(item.volume.id)
        );
        volumesProvider.refresh();
        vscode.window.showInformationMessage(`Volume "${item.volume.name}" deleted.`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to delete volume: ${(err as Error).message}`);
      }
    })
  );

  // Attach Volume
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.attachVolume', async (item: VolumeItem) => {
      const client = await tokenManager.getActiveClient();
      if (!client) return;

      let servers;
      try {
        servers = await client.getServers();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to fetch servers: ${(err as Error).message}`);
        return;
      }

      const localServers = servers.filter(
        (s) => s.datacenter.location.name === item.volume.location.name
      );

      if (localServers.length === 0) {
        vscode.window.showInformationMessage(
          `No servers found in ${item.volume.location.name}. Volumes can only be attached to servers in the same location.`
        );
        return;
      }

      const serverPick = await vscode.window.showQuickPick(
        localServers.map((s) => ({
          label: s.name,
          description: `${s.status} · ${s.public_net.ipv4?.ip ?? 'no ip'}`,
          id: s.id,
        })),
        { title: `Attach "${item.volume.name}" to Server`, placeHolder: 'Select server' }
      );
      if (!serverPick) return;

      const automountPick = await vscode.window.showQuickPick(
        [
          { label: '$(check) Yes — automount', value: true },
          { label: '$(close) No — attach only', value: false },
        ],
        { title: 'Automount volume on server?', placeHolder: 'Automount adds a fstab entry' }
      );
      if (!automountPick) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Attaching "${item.volume.name}" to "${serverPick.label}"...` },
          () => client.attachVolume(item.volume.id, serverPick.id, automountPick.value)
        );
        volumesProvider.refresh();
        vscode.window.showInformationMessage(`Volume "${item.volume.name}" attached to "${serverPick.label}".`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to attach volume: ${(err as Error).message}`);
      }
    })
  );

  // Detach Volume
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.detachVolume', async (item: VolumeItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Detach volume "${item.volume.name}" from its server?`,
        { modal: true },
        'Detach'
      );
      if (confirm !== 'Detach') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Detaching "${item.volume.name}"...` },
          () => client.detachVolume(item.volume.id)
        );
        volumesProvider.refresh();
        vscode.window.showInformationMessage(`Volume "${item.volume.name}" detached.`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to detach volume: ${(err as Error).message}`);
      }
    })
  );

  // Resize Volume
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.resizeVolume', async (item: VolumeItem) => {
      const sizeInput = await vscode.window.showInputBox({
        title: `Resize Volume "${item.volume.name}"`,
        prompt: `Current size: ${item.volume.size} GB. Enter a new size (must be larger).`,
        value: String(item.volume.size),
        validateInput: (v) => {
          const n = parseInt(v ?? '', 10);
          if (isNaN(n) || n <= item.volume.size) return `Must be larger than current size (${item.volume.size} GB)`;
          if (n > 10240) return 'Maximum volume size is 10240 GB';
          return undefined;
        },
      });
      if (!sizeInput) return;
      const newSize = parseInt(sizeInput, 10);

      const confirm = await vscode.window.showWarningMessage(
        `Resize "${item.volume.name}" from ${item.volume.size} GB to ${newSize} GB?\n\nNote: the filesystem must be resized manually after this operation.`,
        { modal: true },
        'Resize'
      );
      if (confirm !== 'Resize') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Resizing "${item.volume.name}"...` },
          () => client.resizeVolume(item.volume.id, newSize)
        );
        volumesProvider.refresh();
        vscode.window.showInformationMessage(
          `Volume "${item.volume.name}" resized to ${newSize} GB. Remember to resize the filesystem (e.g. \`resize2fs\` for ext4).`
        );
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to resize volume: ${(err as Error).message}`);
      }
    })
  );
}
