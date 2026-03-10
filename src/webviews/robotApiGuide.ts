import * as vscode from 'vscode';

export class RobotApiGuide {
  private static panel: vscode.WebviewPanel | undefined;

  static open(context: vscode.ExtensionContext): void {
    if (RobotApiGuide.panel) {
      RobotApiGuide.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.robotApiGuide',
      'Storage Boxes — Robot API Guide',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    RobotApiGuide.panel = panel;

    panel.onDidDispose(() => {
      RobotApiGuide.panel = undefined;
    });

    panel.webview.html = getRobotGuideHtml(generateNonce());

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'setCredentials':
          await vscode.commands.executeCommand('hcloud.setRobotCredentials');
          break;
        case 'openRobot':
          vscode.env.openExternal(vscode.Uri.parse('https://robot.hetzner.com'));
          break;
        case 'openRobotDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://robot.hetzner.com/doc/webservice/en.html'));
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

function getRobotGuideHtml(nonce: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Storage Boxes — Robot API Guide</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    line-height: 1.65;
    padding: 32px 40px 48px;
    max-width: 800px;
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
    background: color-mix(in srgb, var(--vscode-inputValidation-warningBackground, #6c4f00) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-inputValidation-warningBorder, #b89500) 55%, transparent);
    border-radius: 6px;
    padding: 14px 18px;
    font-size: 13px;
    margin-bottom: 24px;
  }

  .callout strong { display: block; margin-bottom: 4px; }

  .compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }

  .compare-card {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 16px 18px;
  }

  .compare-card.active { border-color: var(--vscode-focusBorder); }

  .compare-card .label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
  }

  .compare-card .title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .compare-card ul {
    list-style: none;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.7;
  }

  .compare-card ul li::before { content: '• '; }

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

<h1>📦 Storage Boxes &amp; the Robot API</h1>
<p class="subtitle">Storage Boxes are a Hetzner Robot product — they require separate credentials from your Hetzner Cloud API token.</p>

<div class="callout">
  <strong>⚠ Different account, different credentials</strong>
  Your Hetzner Cloud API token (used for servers, networks, volumes etc.) does <em>not</em> work here.
  Storage Boxes are managed through the Hetzner Robot portal using a dedicated web-service username and password.
</div>

<h2>Hetzner Cloud vs Hetzner Robot</h2>
<div class="compare">
  <div class="compare-card">
    <div class="label">Hetzner Cloud</div>
    <div class="title">☁️ Cloud API</div>
    <ul>
      <li>Cloud VMs (CX, CCX, CAX…)</li>
      <li>Private networks &amp; subnets</li>
      <li>Block volumes</li>
      <li>Load balancers</li>
      <li>Firewalls &amp; floating IPs</li>
      <li>Auth: API Token (bearer)</li>
      <li>Console: console.hetzner.cloud</li>
    </ul>
  </div>
  <div class="compare-card active">
    <div class="label">Hetzner Robot — this section</div>
    <div class="title">🤖 Robot API</div>
    <ul>
      <li>Dedicated/bare-metal servers</li>
      <li><strong>Storage Boxes (BX plans)</strong></li>
      <li>Snapshots &amp; subaccounts</li>
      <li>Auth: HTTP Basic (username + password)</li>
      <li>Console: robot.hetzner.com</li>
    </ul>
  </div>
</div>

<hr class="divider">

<h2>How to set up Robot API credentials</h2>
<div class="steps">

  <div class="step">
    <div class="step-num">1</div>
    <div class="step-body">
      <div class="step-heading">Log in to Hetzner Robot</div>
      <div class="step-text">
        Go to <a href="https://robot.hetzner.com" id="link-robot">robot.hetzner.com</a> and sign in
        with your Hetzner account. This is separate from the Cloud Console.
      </div>
    </div>
  </div>

  <div class="step">
    <div class="step-num">2</div>
    <div class="step-body">
      <div class="step-heading">Open Web Service settings</div>
      <div class="step-text">
        Navigate to <strong>Settings → Webservice &amp; App</strong> in the Robot portal.
      </div>
    </div>
  </div>

  <div class="step">
    <div class="step-num">3</div>
    <div class="step-body">
      <div class="step-heading">Create a web-service user</div>
      <div class="step-text">
        Click <strong>Create Webservice User</strong>. Robot will generate a username in the format
        <code>#ws+xxxxx</code> and let you set a password. Save both — the username is not shown again.
      </div>
    </div>
  </div>

  <div class="step">
    <div class="step-num">4</div>
    <div class="step-body">
      <div class="step-heading">Enter the credentials here</div>
      <div class="step-text">
        Click the button below (or use the 🔑 button in the Storage Boxes panel toolbar)
        and enter the <code>#ws+xxxxx</code> username and password.
        Credentials are stored in VS Code's encrypted SecretStorage — never in plain text.
      </div>
    </div>
  </div>

</div>

<button class="btn btn-primary" id="btn-set-creds">🔑 Set Robot API Credentials</button>
<button class="btn btn-secondary" id="btn-open-robot">🌐 Open robot.hetzner.com</button>
<button class="btn btn-secondary" id="btn-open-docs">📖 Robot API Docs</button>

<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  function wire(id, command) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function () { vscode.postMessage({ command: command }); });
  }
  wire('btn-set-creds',  'setCredentials');
  wire('btn-open-robot', 'openRobot');
  wire('btn-open-docs',  'openRobotDocs');
  // Intercept the inline link too
  var link = document.getElementById('link-robot');
  if (link) link.addEventListener('click', function (e) {
    e.preventDefault();
    vscode.postMessage({ command: 'openRobot' });
  });
})();
</script>
</body>
</html>`;
}
