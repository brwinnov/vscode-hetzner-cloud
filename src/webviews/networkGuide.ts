import * as vscode from 'vscode';

export class NetworkGuide {
  private static panel: vscode.WebviewPanel | undefined;

  static open(context: vscode.ExtensionContext): void {
    if (NetworkGuide.panel) {
      NetworkGuide.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.networkGuide',
      'Networks — Setup Guide',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    NetworkGuide.panel = panel;

    panel.onDidDispose(() => {
      NetworkGuide.panel = undefined;
    });

    panel.webview.html = getNetworkGuideHtml(generateNonce());

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'createNetwork':
          await vscode.commands.executeCommand('hcloud.createNetwork');
          break;
        case 'addSubnet':
          await vscode.commands.executeCommand('hcloud.addSubnetToNetwork');
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://docs.hetzner.cloud/#networks'));
          break;
        case 'cidrCalculator':
          await vscode.commands.executeCommand('hcloud.cidrCalculator');
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

function getNetworkGuideHtml(nonce: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Networks — Setup Guide</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    line-height: 1.65;
    padding: 32px 40px 48px;
    max-width: 820px;
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

  .steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 28px; }

  .step {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    position: relative;
    padding-bottom: 24px;
  }

  .step:last-child { padding-bottom: 0; }

  .step:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 15px; top: 32px; bottom: 0;
    width: 2px;
    background: var(--vscode-panel-border);
  }

  .step-num {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; z-index: 1;
  }

  .step-body { padding-top: 4px; }
  .step-heading { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
  .step-text { font-size: 12px; color: var(--vscode-descriptionForeground); line-height: 1.6; }

  code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    background: var(--vscode-textBlockQuote-background);
    padding: 1px 5px;
    border-radius: 3px;
  }

  .use-cases {
    display: flex;
    flex-direction: column;
    gap: 12px;
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
    margin-bottom: 8px;
  }

  .use-case-desc {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 10px;
    line-height: 1.6;
  }

  .subnet-list {
    list-style: none;
    font-size: 12px;
    line-height: 1.8;
  }

  .subnet-list li { display: flex; gap: 8px; align-items: baseline; }

  .subnet-tag {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    background: var(--vscode-textBlockQuote-background);
    padding: 1px 6px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .subnet-label {
    color: var(--vscode-descriptionForeground);
  }

  .tip {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 8px;
    font-style: italic;
  }

  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 18px; border-radius: 4px; font-size: 13px;
    font-family: var(--vscode-font-family); cursor: pointer; border: none;
    font-weight: 600; margin-top: 0; margin-right: 8px;
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

<h1>🔗 Private Networks &amp; Subnets</h1>
<p class="subtitle">Private networks let your servers communicate over a fast, isolated internal network — without exposing traffic to the internet.</p>

<button class="btn btn-primary" id="btn-create-network">+ Create Network</button>
<button class="btn btn-secondary" id="btn-add-subnet">+ Add Subnet</button>
<button class="btn btn-secondary" id="btn-cidr-calc">🔢 CIDR Calculator</button>
<button class="btn btn-secondary" id="btn-open-docs">📖 Hetzner Networks Docs</button>

<hr class="divider">

<div class="callout">
  <strong>ℹ Order of operations</strong>
  You must create the <strong>network</strong> first, then add one or more <strong>subnets</strong> to it.
  Servers are then attached to a subnet when they are created (or afterwards via the API).
  A network with no subnets cannot have servers attached.
</div>

<h2>How to set up a network</h2>
<div class="steps">

  <div class="step">
    <div class="step-num">1</div>
    <div class="step-body">
      <div class="step-heading">Create the network</div>
      <div class="step-text">
        Click the <strong>+</strong> button in the Networks panel toolbar (or use the <em>Create Network</em> command).
        Give the network a name and choose an IP range — the entire address space for all future subnets.
        A typical choice is <code>10.0.0.0/8</code> or <code>172.16.0.0/12</code>.
      </div>
    </div>
  </div>

  <div class="step">
    <div class="step-num">2</div>
    <div class="step-body">
      <div class="step-heading">Add a subnet</div>
      <div class="step-text">
        Use the <strong>Add Subnet</strong> toolbar button to carve out a subnet within the network range.
        Choose a zone (e.g. <code>eu-central</code>) and a CIDR like <code>10.0.1.0/24</code>.
        You can add multiple subnets to the same network — one per zone, or several within one zone.
      </div>
    </div>
  </div>

  <div class="step">
    <div class="step-num">3</div>
    <div class="step-body">
      <div class="step-heading">Attach servers</div>
      <div class="step-text">
        When creating a server in the wizard, select your private network on the <em>Network</em> step.
        The server will receive a private IP from the subnet automatically.
        Existing servers can be attached via the Hetzner Cloud Console or API.
      </div>
    </div>
  </div>

  <div class="step">
    <div class="step-num">4</div>
    <div class="step-body">
      <div class="step-heading">Adding a subnet to an existing network</div>
      <div class="step-text">
        Select the network in the tree view and use right-click → <em>Add Subnet</em>,
        or use the <strong>Add Subnet</strong> toolbar button and pick the network from the dropdown.
        No downtime is required — subnets can be added at any time.
      </div>
    </div>
  </div>

</div>

<hr class="divider">

<h2>Use case examples</h2>
<div class="use-cases">

  <div class="use-case">
    <div class="use-case-title">🌐 Web + Database tier</div>
    <div class="use-case-desc">
      A simple two-tier app where web servers reach the database over a private network, with no public DB port exposed.
    </div>
    <ul class="subnet-list">
      <li><span class="subnet-tag">10.0.1.0/24</span><span class="subnet-label">Web servers (public + private NIC)</span></li>
      <li><span class="subnet-tag">10.0.2.0/24</span><span class="subnet-label">Database servers (private NIC only)</span></li>
    </ul>
    <p class="tip">Network range: <code>10.0.0.0/16</code> — zone: eu-central (Nuremberg / Helsinki)</p>
  </div>

  <div class="use-case">
    <div class="use-case-title">🏗 Multi-tier application (3-tier)</div>
    <div class="use-case-desc">
      Load balancer → App servers → Cache + DB, each layer in its own subnet for segmentation and firewall rules.
    </div>
    <ul class="subnet-list">
      <li><span class="subnet-tag">10.10.1.0/24</span><span class="subnet-label">Load balancers / edge nodes</span></li>
      <li><span class="subnet-tag">10.10.2.0/24</span><span class="subnet-label">App / API servers</span></li>
      <li><span class="subnet-tag">10.10.3.0/24</span><span class="subnet-label">Cache (Redis) + Database</span></li>
    </ul>
    <p class="tip">Network range: <code>10.10.0.0/16</code> — all in the same Hetzner zone</p>
  </div>

  <div class="use-case">
    <div class="use-case-title">🌍 Multi-region deployment</div>
    <div class="use-case-desc">
      Servers spread across EU and US zones, each zone with its own subnet. Traffic between regions goes over public IPs (Hetzner networks are zone-local), but internal traffic within each zone stays private.
    </div>
    <ul class="subnet-list">
      <li><span class="subnet-tag">10.20.1.0/24</span><span class="subnet-label">eu-central zone (Nuremberg / Helsinki / Falkenstein)</span></li>
      <li><span class="subnet-tag">10.20.2.0/24</span><span class="subnet-label">us-east zone (Ashburn)</span></li>
      <li><span class="subnet-tag">10.20.3.0/24</span><span class="subnet-label">us-west zone (Hillsboro)</span></li>
    </ul>
    <p class="tip">Network range: <code>10.20.0.0/16</code> — one subnet per Hetzner zone</p>
  </div>


</div>

<hr class="divider">

<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  function wire(id, command) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function () { vscode.postMessage({ command: command }); });
  }
  wire('btn-create-network', 'createNetwork');
  wire('btn-add-subnet',     'addSubnet');
  wire('btn-cidr-calc',      'cidrCalculator');
  wire('btn-open-docs',      'openDocs');
})();
</script>
</body>
</html>`;
}
