import * as vscode from 'vscode';
import { TokenManager } from '../utils/secretStorage';
import { LoadBalancersProvider, LoadBalancerItem, LBTargetItem } from '../providers/loadBalancersProvider';

const ALGORITHMS: { label: string; value: 'round_robin' | 'least_connections' }[] = [
  { label: 'Round Robin', value: 'round_robin' },
  { label: 'Least Connections', value: 'least_connections' },
];

export function registerLoadBalancerCommands(
  context: vscode.ExtensionContext,
  tokenManager: TokenManager,
  lbProvider: LoadBalancersProvider
) {
  // Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.refreshLoadBalancers', () => lbProvider.refresh())
  );

  // ── Create Load Balancer ────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.createLoadBalancer', async () => {
      const client = await tokenManager.getActiveClient();
      if (!client) {
        vscode.window.showErrorMessage('No active Hetzner project.');
        return;
      }

      const name = await vscode.window.showInputBox({
        title: 'Create Load Balancer — Name',
        prompt: 'Enter a name for the load balancer',
        placeHolder: 'e.g. web-lb',
        validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
      });
      if (!name) return;

      let lbTypes;
      try {
        lbTypes = await client.getLoadBalancerTypes();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to fetch load balancer types: ${(err as Error).message}`);
        return;
      }

      const typePick = await vscode.window.showQuickPick(
        lbTypes.map((t) => ({
          label: t.name,
          description: t.description,
          detail: `Max ${t.max_targets} targets · ${t.max_connections} connections · ${t.max_services} services`,
        })),
        { title: 'Create Load Balancer — Type', placeHolder: 'Select load balancer type' }
      );
      if (!typePick) return;

      let locations;
      try {
        locations = await client.getLocations();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to fetch locations: ${(err as Error).message}`);
        return;
      }

      const locationPick = await vscode.window.showQuickPick(
        locations.map((l) => ({ label: l.name, description: l.city })),
        { title: 'Create Load Balancer — Location', placeHolder: 'Select datacenter' }
      );
      if (!locationPick) return;

      const algoPick = await vscode.window.showQuickPick(
        ALGORITHMS.map((a) => ({ label: a.label, value: a.value })),
        { title: 'Create Load Balancer — Algorithm', placeHolder: 'Select balancing algorithm' }
      );
      if (!algoPick) return;

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Creating load balancer "${name.trim()}"...`,
          },
          () => client.createLoadBalancer(name.trim(), typePick.label, locationPick.label, algoPick.value)
        );
        lbProvider.refresh();
        vscode.window.showInformationMessage(`Load balancer "${name.trim()}" created.`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to create load balancer: ${(err as Error).message}`);
      }
    })
  );

  // ── Delete Load Balancer ────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.deleteLoadBalancer', async (item: LoadBalancerItem) => {
      if (!item) return;
      const client = await tokenManager.getActiveClient();
      if (!client) return;

      const confirm = await vscode.window.showWarningMessage(
        `Delete load balancer "${item.lb.name}"? This cannot be undone.`,
        { modal: true },
        'Delete'
      );
      if (confirm !== 'Delete') return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Deleting "${item.lb.name}"...` },
          () => client.deleteLoadBalancer(item.lb.id)
        );
        lbProvider.refresh();
        vscode.window.showInformationMessage(`Load balancer "${item.lb.name}" deleted.`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to delete load balancer: ${(err as Error).message}`);
      }
    })
  );

  // ── Add Target ─────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.addLoadBalancerTarget', async (item: LoadBalancerItem) => {
      if (!item) return;
      const client = await tokenManager.getActiveClient();
      if (!client) return;

      let servers;
      try {
        servers = await client.getServers();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to fetch servers: ${(err as Error).message}`);
        return;
      }

      const existingTargetIds = new Set(
        item.lb.targets.filter((t) => t.type === 'server').map((t) => t.server!.id)
      );
      const available = servers.filter((s) => !existingTargetIds.has(s.id));

      if (available.length === 0) {
        vscode.window.showInformationMessage('All servers are already targets of this load balancer.');
        return;
      }

      const serverPick = await vscode.window.showQuickPick(
        available.map((s) => ({
          label: s.name,
          description: `${s.status} · ${s.datacenter.location.name} · ${s.public_net.ipv4?.ip ?? 'no ip'}`,
          id: s.id,
        })),
        { title: `Add Target — ${item.lb.name}`, placeHolder: 'Select a server to add as target' }
      );
      if (!serverPick) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Adding target...' },
          () => client.addLoadBalancerTarget(item.lb.id, serverPick.id)
        );
        lbProvider.refresh();
        vscode.window.showInformationMessage(`Server "${serverPick.label}" added as target.`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to add target: ${(err as Error).message}`);
      }
    })
  );

  // ── Remove Target ──────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.removeLoadBalancerTarget', async (item: LBTargetItem) => {
      if (!item || item.target.type !== 'server') return;
      const client = await tokenManager.getActiveClient();
      if (!client) return;

      const confirm = await vscode.window.showWarningMessage(
        `Remove Server #${item.target.server!.id} from load balancer "${item.lbName}"?`,
        { modal: true },
        'Remove'
      );
      if (confirm !== 'Remove') return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Removing target...' },
          () => client.removeLoadBalancerTarget(item.lbId, item.target.server!.id)
        );
        lbProvider.refresh();
        vscode.window.showInformationMessage(`Target removed from "${item.lbName}".`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to remove target: ${(err as Error).message}`);
      }
    })
  );
}
