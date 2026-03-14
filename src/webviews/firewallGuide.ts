import * as vscode from 'vscode';

export class FirewallGuide {
  private static panel: vscode.WebviewPanel | undefined;

  static open(context: vscode.ExtensionContext): void {
    if (FirewallGuide.panel) {
      FirewallGuide.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.firewallGuide',
      'Firewalls — Guide',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    FirewallGuide.panel = panel;

    panel.onDidDispose(() => {
      FirewallGuide.panel = undefined;
    });

    panel.webview.html = getFirewallGuideHtml(generateNonce());

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'createFirewall':
          await vscode.commands.executeCommand('hcloud.createFirewall');
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://docs.hetzner.cloud/#firewalls'));
          break;
      }
    }, undefined, context.subscriptions);
  }
}

function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let n = '';
  for (let i = 0; i < 32; i++) n += chars.charAt(Math.floor(Math.random() * chars.length));
  return n;
}

function getFirewallGuideHtml(nonce: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Firewalls — Guide</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    line-height: 1.65;
    padding: 32px 40px 48px;
    max-width: 860px;
  }

  a { color: var(--vscode-textLink-foreground); text-decoration: none; }
  a:hover { text-decoration: underline; }

  h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  h2 { font-size: 14px; font-weight: 700; margin: 28px 0 10px; text-transform: uppercase;
       letter-spacing: .06em; color: var(--vscode-descriptionForeground); }
  p  { font-size: 13px; margin-bottom: 12px; }

  .subtitle {
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 28px;
  }

  .callout {
    background: color-mix(in srgb, var(--vscode-inputValidation-infoBackground, #003366) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-inputValidation-infoBorder, #007acc) 55%, transparent);
    border-radius: 6px;
    padding: 14px 18px;
    font-size: 13px;
    margin-bottom: 24px;
  }

  .callout strong { display: block; margin-bottom: 4px; }

  /* Rule options grid */
  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }

  .option-card {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 14px 16px;
  }

  .option-card .label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
  }

  .option-card .title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .option-card p {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 0;
  }

  /* Rule table */
  .rule-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 24px;
  }

  .rule-table th {
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--vscode-descriptionForeground);
    padding: 6px 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  .rule-table td {
    padding: 7px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 50%, transparent);
    vertical-align: top;
  }

  .rule-table tr:last-child td { border-bottom: none; }

  code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    background: var(--vscode-textBlockQuote-background);
    padding: 1px 5px;
    border-radius: 3px;
  }

  .badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: .04em;
  }

  .badge-in {
    background: color-mix(in srgb, var(--vscode-charts-green, #4ec9b0) 20%, transparent);
    color: var(--vscode-charts-green, #4ec9b0);
  }

  .badge-out {
    background: color-mix(in srgb, var(--vscode-charts-blue, #007acc) 20%, transparent);
    color: var(--vscode-charts-blue, #007acc);
  }

  /* Use cases */
  .use-cases {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 28px;
  }

  .use-case {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 16px 18px;
  }

  .use-case-title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .use-case-desc {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 12px;
    line-height: 1.6;
  }

  .use-case .rule-table { margin-bottom: 0; }

  .tip {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 10px;
    font-style: italic;
  }

  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 18px; border-radius: 4px; font-size: 13px;
    font-family: var(--vscode-font-family); cursor: pointer; border: none;
    font-weight: 600; margin-top: 16px; margin-right: 8px;
  }

  .btn-primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  .btn-primary:hover { background: var(--vscode-button-hoverBackground); }

  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

  .divider {
    border: none;
    border-top: 1px solid var(--vscode-panel-border);
    margin: 28px 0;
  }
</style>
</head>
<body>

<h1>🛡 Firewalls</h1>
<p class="subtitle">Hetzner Cloud Firewalls are stateful packet filters applied directly at the hypervisor level — traffic is blocked before it reaches your server's network interface.</p>

<div class="callout">
  <strong>ℹ Default deny — inbound</strong>
  All inbound traffic not explicitly allowed by a rule is blocked. Outbound traffic is fully open by default.
  You can add outbound rules to restrict what your server can reach (e.g. block all egress except port 443).
</div>

<h2>Rule options</h2>
<div class="options-grid">
  <div class="option-card">
    <div class="label">Direction</div>
    <div class="title">Inbound vs Outbound</div>
    <p><strong>Inbound</strong> — traffic coming in to the server. You specify source IP ranges.<br><br>
       <strong>Outbound</strong> — traffic leaving the server. You specify destination IP ranges.<br><br>
       Most firewalls only need inbound rules. Add outbound rules to lock down what your server can connect to.</p>
  </div>
  <div class="option-card">
    <div class="label">Protocol</div>
    <div class="title">TCP · UDP · ICMP · ESP · GRE</div>
    <p><strong>TCP</strong> — web, SSH, databases, most services.<br><br>
       <strong>UDP</strong> — DNS, VPNs (WireGuard, game servers), custom services.<br><br>
       <strong>ICMP</strong> — ping / traceroute. No port field.<br><br>
       <strong>ESP / GRE</strong> — IPsec and GRE tunnel encapsulation. No port field.</p>
  </div>
  <div class="option-card">
    <div class="label">Port</div>
    <div class="title">Single or range</div>
    <p>For TCP and UDP rules you can specify:<br><br>
       A <strong>single port</strong>: <code>22</code>, <code>443</code><br><br>
       A <strong>range</strong>: <code>8000-9000</code>, <code>30000-32767</code><br><br>
       ICMP, ESP, and GRE rules have no port field.</p>
  </div>
  <div class="option-card">
    <div class="label">Source / Destination IPs</div>
    <div class="title">CIDR ranges</div>
    <p>Comma-separated IPv4 and IPv6 CIDR blocks.<br><br>
       <code>0.0.0.0/0, ::/0</code> — allow from anywhere (IPv4 + IPv6)<br>
       <code>10.0.0.0/8</code> — private network only<br>
       <code>1.2.3.4/32</code> — single IP address<br>
       <code>203.0.113.0/24</code> — office subnet</p>
  </div>
</div>

<hr class="divider">

<h2>Default rule set</h2>
<p>When you create a firewall with the <em>Default rule set</em> option, these inbound rules are added automatically:</p>

<table class="rule-table">
  <thead>
    <tr>
      <th>Direction</th><th>Protocol</th><th>Port</th><th>Source</th><th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="badge badge-in">in</span></td>
      <td>TCP</td><td><code>22</code></td><td><code>0.0.0.0/0, ::/0</code></td><td>SSH</td>
    </tr>
    <tr>
      <td><span class="badge badge-in">in</span></td>
      <td>TCP</td><td><code>80</code></td><td><code>0.0.0.0/0, ::/0</code></td><td>HTTP</td>
    </tr>
    <tr>
      <td><span class="badge badge-in">in</span></td>
      <td>TCP</td><td><code>443</code></td><td><code>0.0.0.0/0, ::/0</code></td><td>HTTPS</td>
    </tr>
    <tr>
      <td><span class="badge badge-in">in</span></td>
      <td>ICMP</td><td>—</td><td><code>0.0.0.0/0, ::/0</code></td><td>Ping / Traceroute</td>
    </tr>
  </tbody>
</table>

<hr class="divider">

<h2>Use case examples</h2>
<div class="use-cases">

  <div class="use-case">
    <div class="use-case-title">🌐 Public web server</div>
    <div class="use-case-desc">
      A server running Nginx or Caddy. HTTPS is public; SSH is restricted to your office/home IP only.
    </div>
    <table class="rule-table">
      <thead><tr><th>Dir</th><th>Protocol</th><th>Port</th><th>Source</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td><span class="badge badge-in">in</span></td><td>TCP</td><td><code>443</code></td><td><code>0.0.0.0/0, ::/0</code></td><td>HTTPS — public</td></tr>
        <tr><td><span class="badge badge-in">in</span></td><td>TCP</td><td><code>80</code></td><td><code>0.0.0.0/0, ::/0</code></td><td>HTTP redirect</td></tr>
        <tr><td><span class="badge badge-in">in</span></td><td>TCP</td><td><code>22</code></td><td><code>203.0.113.5/32</code></td><td>SSH — your IP only</td></tr>
        <tr><td><span class="badge badge-in">in</span></td><td>ICMP</td><td>—</td><td><code>0.0.0.0/0, ::/0</code></td><td>Ping</td></tr>
      </tbody>
    </table>
  </div>

  <div class="use-case">
    <div class="use-case-title">🗄 Private database server</div>
    <div class="use-case-desc">
      A PostgreSQL or MySQL server that should never be reachable from the internet — only from servers on the same private network.
    </div>
    <table class="rule-table">
      <thead><tr><th>Dir</th><th>Protocol</th><th>Port</th><th>Source</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td><span class="badge badge-in">in</span></td><td>TCP</td><td><code>5432</code></td><td><code>10.0.0.0/8</code></td><td>PostgreSQL — private network only</td></tr>
        <tr><td><span class="badge badge-in">in</span></td><td>TCP</td><td><code>22</code></td><td><code>10.0.0.0/8</code></td><td>SSH — private network only</td></tr>
        <tr><td><span class="badge badge-in">in</span></td><td>ICMP</td><td>—</td><td><code>10.0.0.0/8</code></td><td>Ping from internal only</td></tr>
      </tbody>
    </table>
    <p class="tip">Pair this with a Hetzner private network so the DB server has no public IPv4 at all, or combine with an outbound deny-all rule for maximum isolation.</p>
  </div>

  <div class="use-case">
    <div class="use-case-title">🎮 Game / UDP server</div>
    <div class="use-case-desc">
      A game server or media relay using a custom UDP port range, with SSH restricted to a management IP.
    </div>
    <table class="rule-table">
      <thead><tr><th>Dir</th><th>Protocol</th><th>Port</th><th>Source</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td><span class="badge badge-in">in</span></td><td>UDP</td><td><code>7000-7100</code></td><td><code>0.0.0.0/0, ::/0</code></td><td>Game — public UDP range</td></tr>
        <tr><td><span class="badge badge-in">in</span></td><td>TCP</td><td><code>7000</code></td><td><code>0.0.0.0/0, ::/0</code></td><td>Game — TCP control port</td></tr>
        <tr><td><span class="badge badge-in">in</span></td><td>TCP</td><td><code>22</code></td><td><code>203.0.113.5/32</code></td><td>SSH — admin IP only</td></tr>
        <tr><td><span class="badge badge-in">in</span></td><td>ICMP</td><td>—</td><td><code>0.0.0.0/0, ::/0</code></td><td>Ping</td></tr>
      </tbody>
    </table>
  </div>

  <div class="use-case">
    <div class="use-case-title">🔐 Locked-down egress (outbound rules)</div>
    <div class="use-case-desc">
      A server that should only be able to call out to HTTPS endpoints — useful for build agents or
      data pipelines where you want to prevent unexpected outbound connections.
    </div>
    <table class="rule-table">
      <thead><tr><th>Dir</th><th>Protocol</th><th>Port</th><th>Destination</th><th>Note</th></tr></thead>
      <tbody>
        <tr><td><span class="badge badge-out">out</span></td><td>TCP</td><td><code>443</code></td><td><code>0.0.0.0/0, ::/0</code></td><td>HTTPS outbound allowed</td></tr>
        <tr><td><span class="badge badge-out">out</span></td><td>UDP</td><td><code>53</code></td><td><code>0.0.0.0/0, ::/0</code></td><td>DNS lookups allowed</td></tr>
        <tr><td><span class="badge badge-in">in</span></td><td>TCP</td><td><code>22</code></td><td><code>203.0.113.5/32</code></td><td>SSH — admin IP inbound</td></tr>
      </tbody>
    </table>
    <p class="tip">When outbound rules are present, only the listed outbound traffic is allowed — all other egress is blocked.</p>
  </div>

</div>

<button class="btn btn-primary" id="btn-create">+ Create Firewall</button>
<button class="btn btn-secondary" id="btn-docs">📖 Hetzner Firewall Docs</button>

<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  function wire(id, command) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function () { vscode.postMessage({ command: command }); });
  }
  wire('btn-create', 'createFirewall');
  wire('btn-docs',   'openDocs');
})();
</script>
</body>
</html>`;
}
