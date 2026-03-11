import * as vscode from 'vscode';
import { TokenManager } from '../utils/secretStorage';
import { NetworksProvider, NetworkItem, SubnetItem } from '../providers/networksProvider';

const NETWORK_ZONES = ['eu-central', 'us-east', 'us-west', 'ap-southeast'];

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


  // Add Subnet to Network (with network picker)
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.addSubnetToNetwork', async () => {
      const client = await tokenManager.getActiveClient();
      if (!client) {
        vscode.window.showErrorMessage('No active Hetzner project.');
        return;
      }
      const networks = await client.getNetworks();
      if (!networks.length) {
        vscode.window.showErrorMessage('No networks found.');
        return;
      }
      const selected = await vscode.window.showQuickPick(
        networks.map(n => ({ label: n.name, description: n.ip_range, network: n })),
        { title: 'Select Network to Add Subnet', placeHolder: 'Choose a network' }
      );
      if (!selected) return;
      const item = new NetworkItem(selected.network);
      // Reuse existing addSubnet logic
      const ipRange = await vscode.window.showInputBox({
        title: `Add Subnet to "${item.network.name}"`,
        prompt: 'Enter subnet CIDR range (must be within the network range)',
        placeHolder: 'e.g. 10.0.1.0/24',
        validateInput: (v) => {
          if (!v?.trim()) return 'IP range cannot be empty';
          if (!/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(v.trim())) return 'Must be a valid CIDR range';
          return undefined;
        },
      });
      if (!ipRange) return;
      const zone = await vscode.window.showQuickPick(NETWORK_ZONES, {
        title: 'Network Zone',
        placeHolder: 'Select the network zone for this subnet',
      });
      if (!zone) return;
      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Adding subnet ${ipRange}...` },
          () => client.addSubnet(item.network.id, ipRange.trim(), zone)
        );
        networksProvider.refresh();
        vscode.window.showInformationMessage(`Subnet ${ipRange} added to "${item.network.name}".`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to add subnet: ${(err as Error).message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.deleteSubnet', async (item: SubnetItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Remove subnet ${item.subnet.ip_range} from network "${item.networkName}"?`,
        { modal: true },
        'Remove'
      );
      if (confirm !== 'Remove') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Removing subnet ${item.subnet.ip_range}...` },
          () => client.deleteSubnet(item.networkId, item.subnet.ip_range)
        );
        networksProvider.refresh();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to remove subnet: ${(err as Error).message}`);
      }
    })
  );
}
