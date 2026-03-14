import * as vscode from 'vscode';
import { HFirewallRule } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';
import { FirewallsProvider, FirewallItem, RuleItem } from '../providers/firewallsProvider';

// ── Default rule sets ──────────────────────────────────────────────────────

const DEFAULT_RULES: HFirewallRule[] = [
  {
    direction: 'in', protocol: 'tcp', port: '22',
    source_ips: ['0.0.0.0/0', '::/0'], destination_ips: [],
    description: 'SSH',
  },
  {
    direction: 'in', protocol: 'tcp', port: '80',
    source_ips: ['0.0.0.0/0', '::/0'], destination_ips: [],
    description: 'HTTP',
  },
  {
    direction: 'in', protocol: 'tcp', port: '443',
    source_ips: ['0.0.0.0/0', '::/0'], destination_ips: [],
    description: 'HTTPS',
  },
  {
    direction: 'in', protocol: 'icmp',
    source_ips: ['0.0.0.0/0', '::/0'], destination_ips: [],
    description: 'ICMP / Ping',
  },
];

// ── Command registration ───────────────────────────────────────────────────

export function registerFirewallCommands(
  context: vscode.ExtensionContext,
  tokenManager: TokenManager,
  firewallsProvider: FirewallsProvider
) {
  // Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.refreshFirewalls', () => firewallsProvider.refresh())
  );

  // Create Firewall
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.createFirewall', async () => {
      const client = await tokenManager.getActiveClient();
      if (!client) {
        vscode.window.showErrorMessage('No active Hetzner project.');
        return;
      }

      const name = await vscode.window.showInputBox({
        title: 'Create Firewall — Name',
        prompt: 'Enter a name for the firewall',
        placeHolder: 'e.g. web-server',
        validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
      });
      if (!name) return;

      const ruleChoice = await vscode.window.showQuickPick(
        [
          { label: '$(shield) Default rule set', description: 'SSH · HTTP · HTTPS · ICMP', value: 'default' },
          { label: '$(add) Empty — add rules manually', description: 'Start with no rules', value: 'empty' },
        ],
        { title: 'Create Firewall — Initial Rules', placeHolder: 'Choose starting rule set' }
      );
      if (!ruleChoice) return;

      let rules: HFirewallRule[] = [];
      if (ruleChoice.value === 'default') {
        rules = [...DEFAULT_RULES];
      }

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Creating firewall "${name}"...` },
          () => client.createFirewall(name.trim(), rules)
        );
        firewallsProvider.refresh();
        vscode.window.showInformationMessage(`Firewall "${name}" created with ${rules.length} rule(s).`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to create firewall: ${(err as Error).message}`);
      }
    })
  );

  // Delete Firewall
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.deleteFirewall', async (item: FirewallItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Delete firewall "${item.firewall.name}"? It will be removed from all servers it is applied to.`,
        { modal: true },
        'Delete'
      );
      if (confirm !== 'Delete') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Deleting firewall "${item.firewall.name}"...` },
          () => client.deleteFirewall(item.firewall.id)
        );
        firewallsProvider.refresh();
        vscode.window.showInformationMessage(`Firewall "${item.firewall.name}" deleted.`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to delete firewall: ${(err as Error).message}`);
      }
    })
  );

  // Add Firewall Rule
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.addFirewallRule', async (item: FirewallItem) => {
      const client = await tokenManager.getActiveClient();
      if (!client) return;

      // Direction
      const dirChoice = await vscode.window.showQuickPick(
        [
          { label: '$(arrow-down) Inbound', value: 'in' as const },
          { label: '$(arrow-up) Outbound', value: 'out' as const },
        ],
        { title: 'Add Rule — Direction' }
      );
      if (!dirChoice) return;

      // Protocol
      const protoChoice = await vscode.window.showQuickPick(
        [
          { label: 'TCP', value: 'tcp' as const },
          { label: 'UDP', value: 'udp' as const },
          { label: 'ICMP', value: 'icmp' as const },
          { label: 'ESP', value: 'esp' as const },
          { label: 'GRE', value: 'gre' as const },
        ],
        { title: 'Add Rule — Protocol' }
      );
      if (!protoChoice) return;

      // Port (TCP / UDP only)
      let port: string | undefined;
      if (protoChoice.value === 'tcp' || protoChoice.value === 'udp') {
        const portInput = await vscode.window.showInputBox({
          title: 'Add Rule — Port',
          prompt: 'Single port (22) or range (8000-9000)',
          placeHolder: 'e.g. 443',
          validateInput: (v) => {
            if (!v?.trim()) return 'Port cannot be empty';
            if (!/^\d+(-\d+)?$/.test(v.trim())) return 'Must be a port number or range like 8000-9000';
            return undefined;
          },
        });
        if (!portInput) return;
        port = portInput.trim();
      }

      // Source / Destination IPs
      const ipLabel = dirChoice.value === 'in' ? 'Source IPs' : 'Destination IPs';
      const ipInput = await vscode.window.showInputBox({
        title: `Add Rule — ${ipLabel}`,
        prompt: 'Comma-separated CIDR ranges',
        value: '0.0.0.0/0, ::/0',
        validateInput: (v) => {
          if (!v?.trim()) return 'Must specify at least one IP range';
          const parts = v.split(',').map((s) => s.trim()).filter(Boolean);
          const invalid = parts.find((p) => !/^[\d:.a-fA-F/]+$/.test(p));
          if (invalid) return `Invalid CIDR: ${invalid}`;
          return undefined;
        },
      });
      if (!ipInput) return;
      const ips = ipInput.split(',').map((s) => s.trim()).filter(Boolean);

      // Description (optional)
      const description = await vscode.window.showInputBox({
        title: 'Add Rule — Description (optional)',
        prompt: 'Short label for this rule',
        placeHolder: 'e.g. Custom HTTPS',
      });
      // description === undefined means cancelled; empty string is fine

      if (description === undefined) return;

      const newRule: HFirewallRule = {
        direction: dirChoice.value,
        protocol: protoChoice.value,
        ...(port !== undefined ? { port } : {}),
        source_ips: dirChoice.value === 'in' ? ips : [],
        destination_ips: dirChoice.value === 'out' ? ips : [],
        ...(description.trim() ? { description: description.trim() } : {}),
      };

      try {
        // Fetch fresh rules, append new one, push back
        const fresh = await client.getFirewall(item.firewall.id);
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Adding rule...' },
          () => client.setFirewallRules(item.firewall.id, [...fresh.rules, newRule])
        );
        firewallsProvider.refresh();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to add rule: ${(err as Error).message}`);
      }
    })
  );

  // Delete Firewall Rule
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.deleteFirewallRule', async (item: RuleItem) => {
      const ruleLabel = `${item.rule.protocol.toUpperCase()}${item.rule.port ? ':' + item.rule.port : ''}`
        + (item.rule.description ? ` (${item.rule.description})` : '');
      const confirm = await vscode.window.showWarningMessage(
        `Remove rule "${ruleLabel}" from firewall "${item.firewallName}"?`,
        { modal: true },
        'Remove'
      );
      if (confirm !== 'Remove') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;

      try {
        const fresh = await client.getFirewall(item.firewallId);
        const target = item.rule;
        const updatedRules = fresh.rules.filter((r) =>
          !(r.direction === target.direction &&
            r.protocol === target.protocol &&
            r.port === target.port &&
            JSON.stringify(r.source_ips) === JSON.stringify(target.source_ips) &&
            JSON.stringify(r.destination_ips) === JSON.stringify(target.destination_ips))
        );
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Removing rule...' },
          () => client.setFirewallRules(item.firewallId, updatedRules)
        );
        firewallsProvider.refresh();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to remove rule: ${(err as Error).message}`);
      }
    })
  );

  // Apply Firewall to Server
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.applyFirewallToServer', async (item: FirewallItem) => {
      const client = await tokenManager.getActiveClient();
      if (!client) return;

      const appliedIds = new Set(
        item.firewall.applied_to
          .filter((a) => a.type === 'server' && a.server !== undefined)
          .map((a) => a.server!.id)
      );

      let servers;
      try {
        servers = await client.getServers();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to fetch servers: ${(err as Error).message}`);
        return;
      }

      const available = servers.filter((s) => !appliedIds.has(s.id));
      if (available.length === 0) {
        vscode.window.showInformationMessage(
          'This firewall is already applied to all servers, or there are no servers.'
        );
        return;
      }

      const picked = await vscode.window.showQuickPick(
        available.map((s) => ({
          label: s.name,
          description: `${s.status} · ${s.public_net.ipv4?.ip ?? 'no ip'}`,
          id: s.id,
        })),
        { title: `Apply "${item.firewall.name}" to Server`, placeHolder: 'Select a server' }
      );
      if (!picked) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Applying firewall to "${picked.label}"...` },
          () => client.applyFirewallToServer(item.firewall.id, picked.id)
        );
        firewallsProvider.refresh();
        vscode.window.showInformationMessage(`Firewall "${item.firewall.name}" applied to "${picked.label}".`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to apply firewall: ${(err as Error).message}`);
      }
    })
  );

  // Remove Firewall from Server
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.removeFirewallFromServer', async (item: FirewallItem) => {
      const client = await tokenManager.getActiveClient();
      if (!client) return;

      const appliedServerIds = item.firewall.applied_to
        .filter((a) => a.type === 'server' && a.server !== undefined)
        .map((a) => a.server!.id);

      if (appliedServerIds.length === 0) {
        vscode.window.showInformationMessage(`Firewall "${item.firewall.name}" is not applied to any servers.`);
        return;
      }

      let servers;
      try {
        servers = await client.getServers();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to fetch servers: ${(err as Error).message}`);
        return;
      }

      const serverMap = new Map(servers.map((s) => [s.id, s]));
      const appliedServers = appliedServerIds
        .map((id) => serverMap.get(id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined);

      const picked = await vscode.window.showQuickPick(
        appliedServers.map((s) => ({
          label: s.name,
          description: s.public_net.ipv4?.ip ?? 'no ip',
          id: s.id,
        })),
        { title: `Remove "${item.firewall.name}" from Server`, placeHolder: 'Select a server' }
      );
      if (!picked) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Removing firewall from "${picked.label}"...` },
          () => client.removeFirewallFromServer(item.firewall.id, picked.id)
        );
        firewallsProvider.refresh();
        vscode.window.showInformationMessage(`Firewall "${item.firewall.name}" removed from "${picked.label}".`);
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to remove firewall: ${(err as Error).message}`);
      }
    })
  );
}
