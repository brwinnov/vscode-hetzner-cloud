import * as vscode from 'vscode';
import { RobotCredentialManager } from '../utils/secretStorage';
import { RobotClient } from '../api/robot';
import { StorageBoxProvider } from '../providers/storageBoxProvider';

export class RobotCredentialsPanel {
  private static panel: vscode.WebviewPanel | undefined;

  static async open(
    context: vscode.ExtensionContext,
    robotCredManager: RobotCredentialManager,
    storageBoxProvider: StorageBoxProvider
  ): Promise<void> {
    if (RobotCredentialsPanel.panel) {
      RobotCredentialsPanel.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.robotCredentials',
      'Robot API — Set Credentials',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    RobotCredentialsPanel.panel = panel;

    panel.onDidDispose(() => {
      RobotCredentialsPanel.panel = undefined;
    });

    // Pre-fill username if already stored
    const existing = await robotCredManager.getCredentials();
    panel.webview.html = getRobotCredentialsHtml(generateNonce(), existing?.username ?? '');

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'save': {
          const username: string = (msg.username ?? '').trim();
          const password: string = (msg.password ?? '').trim();

          if (!username || !password) {
            panel.webview.postMessage({ command: 'error', message: 'Username and password are required.' });
            return;
          }

          panel.webview.postMessage({ command: 'validating' });

          try {
            const client = new RobotClient(username, password);
            await client.getStorageBoxes();
            await robotCredManager.setCredentials(username, password);
            storageBoxProvider.refresh();
            panel.webview.postMessage({ command: 'saved' });
          } catch (err: unknown) {
            panel.webview.postMessage({
              command: 'error',
              message: `Credentials invalid: ${(err as Error).message}`,
            });
          }
          break;
        }
        case 'openRobot':
          vscode.env.openExternal(vscode.Uri.parse('https://robot.hetzner.com'));
          break;
        case 'close':
          panel.dispose();
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

function getRobotCredentialsHtml(nonce: string, existingUsername: string): string {
  // Safely inject the existing username into the HTML
  const safeUsername = existingUsername
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Robot API — Set Credentials</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    line-height: 1.65;
    padding: 40px;
    max-width: 520px;
  }

  h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; }

  .subtitle {
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 28px;
  }

  .callout {
    background: color-mix(in srgb, var(--vscode-inputValidation-infoBackground, #003366) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-inputValidation-infoBorder, #007acc) 55%, transparent);
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 12px;
    margin-bottom: 24px;
    line-height: 1.6;
  }

  .form-group {
    margin-bottom: 18px;
  }

  label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 5px;
  }

  .field-hint {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 5px;
  }

  input[type="text"],
  input[type="password"] {
    width: 100%;
    padding: 7px 10px;
    font-family: var(--vscode-font-family);
    font-size: 13px;
    color: var(--vscode-input-foreground);
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 3px;
    outline: none;
  }

  input[type="text"]:focus,
  input[type="password"]:focus {
    border-color: var(--vscode-focusBorder);
  }

  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 24px;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 20px; border-radius: 4px; font-size: 13px;
    font-family: var(--vscode-font-family); cursor: pointer; border: none;
    font-weight: 600;
  }

  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  .btn-primary:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }

  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--vscode-button-secondaryHoverBackground); }

  .btn-link {
    background: none;
    color: var(--vscode-textLink-foreground);
    padding: 0;
    font-size: 12px;
    font-weight: 400;
    text-decoration: underline;
    cursor: pointer;
    border: none;
  }
  .btn-link:hover { color: var(--vscode-textLink-activeForeground); }

  /* Status area */
  .status {
    margin-top: 16px;
    font-size: 13px;
    min-height: 22px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status.hidden { visibility: hidden; }

  .status-ok {
    color: var(--vscode-charts-green, #4ec9b0);
    font-weight: 700;
  }

  .status-err {
    color: var(--vscode-inputValidation-errorForeground, #f48771);
  }

  .status-busy {
    color: var(--vscode-descriptionForeground);
  }

  .spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid var(--vscode-panel-border);
    border-top-color: var(--vscode-focusBorder);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .divider {
    border: none;
    border-top: 1px solid var(--vscode-panel-border);
    margin: 28px 0 20px;
  }

  .link-row {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }

  .link-row a {
    color: var(--vscode-textLink-foreground);
    text-decoration: underline;
    cursor: pointer;
    background: none;
    border: none;
    font: inherit;
    padding: 0;
  }
</style>
</head>
<body>

<h1>🔑 Robot API Credentials</h1>
<p class="subtitle">Enter your Hetzner Robot web-service username and password. You can paste both fields freely before saving.</p>

<div class="callout">
  These are <strong>not</strong> your Hetzner Cloud API token. Robot credentials are created at
  <strong>robot.hetzner.com → Settings → Webservice &amp; App</strong>.
  The username looks like <code style="font-family:monospace;font-size:11px;background:var(--vscode-textBlockQuote-background);padding:1px 4px;border-radius:3px">#ws+xxxxx</code>.
</div>

<div class="form-group">
  <label for="field-username">Username</label>
  <div class="field-hint">Format: #ws+xxxxx</div>
  <input type="text" id="field-username" autocomplete="off" spellcheck="false"
         placeholder="#ws+xxxxx" value="${safeUsername}">
</div>

<div class="form-group">
  <label for="field-password">Password</label>
  <div class="field-hint">The password you set when creating the web-service user</div>
  <input type="password" id="field-password" autocomplete="new-password" spellcheck="false"
         placeholder="••••••••">
</div>

<div class="actions">
  <button class="btn btn-primary" id="btn-save">Save &amp; Validate</button>
  <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
  <button class="btn btn-link" id="btn-open-robot">Open robot.hetzner.com ↗</button>
</div>

<div class="status hidden" id="status"></div>

<hr class="divider">

<div class="link-row">
  Credentials are stored in VS Code's encrypted <strong>SecretStorage</strong> — never in plain text or settings files.
</div>

<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  var btnSave   = document.getElementById('btn-save');
  var btnCancel = document.getElementById('btn-cancel');
  var btnRobot  = document.getElementById('btn-open-robot');
  var fUser     = document.getElementById('field-username');
  var fPass     = document.getElementById('field-password');
  var status    = document.getElementById('status');

  function setStatus(type, html) {
    status.className = 'status ' + type;
    status.innerHTML = html;
  }

  function setWorking(busy) {
    btnSave.disabled = busy;
    btnCancel.disabled = busy;
    fUser.disabled = busy;
    fPass.disabled = busy;
  }

  btnSave.addEventListener('click', function () {
    var u = fUser.value.trim();
    var p = fPass.value.trim();
    if (!u || !p) {
      setStatus('status-err', '⚠ Both username and password are required.');
      return;
    }
    vscode.postMessage({ command: 'save', username: u, password: p });
  });

  btnCancel.addEventListener('click', function () {
    vscode.postMessage({ command: 'close' });
  });

  btnRobot.addEventListener('click', function () {
    vscode.postMessage({ command: 'openRobot' });
  });

  // Allow Enter key to submit from either field
  [fUser, fPass].forEach(function (el) {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') btnSave.click();
    });
  });

  window.addEventListener('message', function (event) {
    var msg = event.data;
    switch (msg.command) {
      case 'validating':
        setWorking(true);
        setStatus('status-busy', '<span class="spinner"></span> Validating credentials…');
        break;
      case 'saved':
        setWorking(false);
        setStatus('status-ok', '✔ Credentials saved. Storage Boxes refreshed.');
        fPass.value = '';
        break;
      case 'error':
        setWorking(false);
        setStatus('status-err', '✖ ' + msg.message);
        break;
    }
  });
})();
</script>
</body>
</html>`;
}
