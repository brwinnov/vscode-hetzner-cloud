import * as vscode from 'vscode';
import { HLoadBalancer } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';

export class LoadBalancerItem extends vscode.TreeItem {
  constructor(public readonly lb: HLoadBalancer) {
    super(lb.name, vscode.TreeItemCollapsibleState.Collapsed);

    const targetCount = lb.targets.length;
    const serviceCount = lb.services.length;
    this.description = `${targetCount} target${targetCount !== 1 ? 's' : ''} · ${serviceCount} service${serviceCount !== 1 ? 's' : ''}`;

    const ipv4 = lb.public_net.ipv4?.ip ?? 'no public IPv4';
    this.tooltip = new vscode.MarkdownString(
      [
        `**${lb.name}**`,
        `Type: ${lb.load_balancer_type.name} — ${lb.load_balancer_type.description}`,
        `Algorithm: ${lb.algorithm.type === 'round_robin' ? 'Round Robin' : 'Least Connections'}`,
        `Location: ${lb.location.city} (${lb.location.name})`,
        `Public IPv4: \`${ipv4}\``,
        `Targets: ${targetCount}`,
        `Services: ${serviceCount}`,
        `Created: ${new Date(lb.created).toLocaleDateString()}`,
      ].join('\n\n')
    );
    this.tooltip.isTrusted = true;

    this.iconPath = new vscode.ThemeIcon(
      'broadcast',
      new vscode.ThemeColor('charts.blue')
    );
    this.contextValue = 'loadbalancer';
  }
}

export class LBTargetItem extends vscode.TreeItem {
  constructor(
    public readonly target: HLoadBalancer['targets'][number],
    public readonly lbId: number,
    public readonly lbName: string
  ) {
    let label: string;
    let icon: string;
    let iconColor: string;

    if (target.type === 'server') {
      label = `Server #${target.server!.id}`;
      icon = 'vm';
      iconColor = 'charts.green';
    } else if (target.type === 'label_selector') {
      label = `${target.label_selector!.selector}`;
      icon = 'tag';
      iconColor = 'charts.yellow';
    } else {
      label = `${target.ip!.ip}`;
      icon = 'remote';
      iconColor = 'charts.orange';
    }

    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = target.type === 'server' ? 'server' : target.type === 'label_selector' ? 'label selector' : 'IP';
    this.iconPath = new vscode.ThemeIcon(icon, new vscode.ThemeColor(iconColor));
    this.contextValue = 'lb-target';
  }
}

export class LBServiceItem extends vscode.TreeItem {
  constructor(
    public readonly service: HLoadBalancer['services'][number],
    public readonly lbId: number
  ) {
    super(
      `${service.protocol.toUpperCase()} :${service.listen_port} → :${service.destination_port}`,
      vscode.TreeItemCollapsibleState.None
    );
    this.description = service.proxyprotocol ? 'proxy protocol' : undefined;
    this.tooltip = new vscode.MarkdownString(
      [
        `Protocol: **${service.protocol.toUpperCase()}**`,
        `Listen port: ${service.listen_port}`,
        `Destination port: ${service.destination_port}`,
        `Proxy protocol: ${service.proxyprotocol ? 'enabled' : 'disabled'}`,
      ].join('\n\n')
    );

    const iconName = service.protocol === 'tcp' ? 'plug' : 'globe';
    this.iconPath = new vscode.ThemeIcon(iconName, new vscode.ThemeColor('charts.purple'));
    this.contextValue = 'lb-service';
  }
}

type LBTreeItem = LoadBalancerItem | LBTargetItem | LBServiceItem;

export class LoadBalancersProvider implements vscode.TreeDataProvider<LBTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<LBTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: LBTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: LoadBalancerItem): Promise<LBTreeItem[]> {
    if (element) {
      const children: LBTreeItem[] = [];
      for (const t of element.lb.targets) {
        children.push(new LBTargetItem(t, element.lb.id, element.lb.name));
      }
      for (const s of element.lb.services) {
        children.push(new LBServiceItem(s, element.lb.id));
      }
      return children;
    }

    const client = await this.tokenManager.getActiveClient();
    if (!client) return [];

    try {
      const lbs = await client.getLoadBalancers();
      if (lbs.length === 0) {
        return [new vscode.TreeItem('No load balancers yet') as LBTreeItem];
      }
      return lbs.map((lb) => new LoadBalancerItem(lb));
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Failed to load load balancers: ${(err as Error).message}`);
      return [];
    }
  }
}
