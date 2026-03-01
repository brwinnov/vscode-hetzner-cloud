import * as vscode from 'vscode';
import { HFirewall, HFirewallRule } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';

export class FirewallItem extends vscode.TreeItem {
  constructor(public readonly firewall: HFirewall) {
    super(firewall.name, vscode.TreeItemCollapsibleState.Collapsed);
    const ruleCount = firewall.rules.length;
    const appliedCount = firewall.applied_to.length;
    this.description = `${ruleCount} rule${ruleCount !== 1 ? 's' : ''} · ${appliedCount} server${appliedCount !== 1 ? 's' : ''}`;
    this.tooltip = new vscode.MarkdownString(
      `**${firewall.name}**\n\nRules: ${ruleCount}\nApplied to: ${appliedCount} resource(s)\nCreated: ${new Date(firewall.created).toLocaleDateString()}`
    );
    this.iconPath = new vscode.ThemeIcon('shield');
    this.contextValue = 'firewall';
  }
}

export class RuleItem extends vscode.TreeItem {
  constructor(
    public readonly rule: HFirewallRule,
    public readonly firewallId: number,
    public readonly firewallName: string,
    public readonly ruleIndex: number
  ) {
    const arrow = rule.direction === 'in' ? '↓' : '↑';
    const portPart = rule.port ? `:${rule.port}` : '';
    super(`${arrow} ${rule.protocol.toUpperCase()}${portPart}`, vscode.TreeItemCollapsibleState.None);

    const ips = rule.direction === 'in' ? rule.source_ips : rule.destination_ips;
    this.description = ips.join(', ');

    const tooltipLines = [
      rule.description ? `**${rule.description}**` : undefined,
      `Direction: ${rule.direction === 'in' ? 'Inbound' : 'Outbound'}`,
      `Protocol: ${rule.protocol.toUpperCase()}`,
      rule.port ? `Port: ${rule.port}` : undefined,
      `IPs: ${ips.join(', ')}`,
    ].filter(Boolean);
    this.tooltip = new vscode.MarkdownString(tooltipLines.join('\n\n'));

    this.iconPath = new vscode.ThemeIcon(
      rule.direction === 'in' ? 'arrow-down' : 'arrow-up',
      rule.direction === 'in'
        ? new vscode.ThemeColor('charts.green')
        : new vscode.ThemeColor('charts.blue')
    );
    this.contextValue = 'firewall-rule';
  }
}

export class FirewallsProvider implements vscode.TreeDataProvider<FirewallItem | RuleItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<FirewallItem | RuleItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FirewallItem | RuleItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FirewallItem): Promise<(FirewallItem | RuleItem)[]> {
    if (element) {
      return element.firewall.rules.map(
        (r, i) => new RuleItem(r, element.firewall.id, element.firewall.name, i)
      );
    }

    const client = await this.tokenManager.getActiveClient();
    if (!client) return [];

    try {
      const firewalls = await client.getFirewalls();
      if (firewalls.length === 0) {
        return [new vscode.TreeItem('No firewalls yet') as FirewallItem];
      }
      return firewalls.map((f) => new FirewallItem(f));
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Failed to load firewalls: ${(err as Error).message}`);
      return [];
    }
  }
}
