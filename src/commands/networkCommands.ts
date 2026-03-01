import * as vscode from 'vscode';
import { TokenManager } from '../utils/secretStorage';
import { NetworksProvider, NetworkItem } from '../providers/networksProvider';

export function registerNetworkCommands(
  context: vscode.ExtensionContext,
  tokenManager: TokenManager,
  networksProvider: NetworksProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.refreshNetworks', () => networksProvider.refresh())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.createNetwork', async () => {
      const client = await tokenManager.getActiveClient();
      if (!client) {
        vscode.window.showErrorMessage('No active Hetzner project.');
        return;
      }

      const name = await vscode.window.showInputBox({
        title: 'Create Network — Name',
        prompt: 'Enter a name for the private network',
        placeHolder: 'e.g. my-network',
        validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
      });
      if (!name) return;

      const ipRange = await vscode.window.showInputBox({
        title: 'Create Network — IP Range',
        prompt: 'Enter the IP range in CIDR notation',
        placeHolder: 'e.g. 10.0.0.0/8',
        value: '10.0.0.0/8',
        validateInput: (v) => {
          if (!v?.trim()) return 'IP range cannot be empty';
          if (!/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(v.trim())) return 'Must be a valid CIDR range';
          return undefined;
        },
      });
      if (!ipRange) return;

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Creating network "${name}"...` },
        () => client.createNetwork(name.trim(), ipRange.trim())
      );

      networksProvider.refresh();
      vscode.window.showInformationMessage(`Network "${name}" created.`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.deleteNetwork', async (item: NetworkItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Delete network "${item.network.name}"?`,
        { modal: true },
        'Delete'
      );
      if (confirm !== 'Delete') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;
      await client.deleteNetwork(item.network.id);
      networksProvider.refresh();
      vscode.window.showInformationMessage(`Network "${item.network.name}" deleted.`);
    })
  );
}
