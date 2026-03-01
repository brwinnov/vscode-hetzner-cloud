import * as vscode from 'vscode';
import { TokenManager, CloudInitLibrary, RobotCredentialManager, StorageBoxPasswordManager } from '../utils/secretStorage';
import { ServersProvider } from '../providers/serversProvider';
import { TailscaleAuthKeyManager } from '../tailscale/authKeyManager';
import { injectTailscale } from '../tailscale/cloudInitInjector';
import { HetznerClient, HLocation, HServerType, HImage, HSshKey, HNetwork } from '../api/hetzner';
import { injectStorageBoxMounts } from '../utils/storageBoxInjector';
import { promptStorageBoxMounts } from '../commands/storageBoxCommands';

interface WizardData {
  locations: HLocation[];
  serverTypes: HServerType[];
  images: HImage[];
  sshKeys: HSshKey[];
  networks: HNetwork[];
  tailscaleEnabled: boolean;
  defaultRegion: string;
}

export class ServerWizardPanel {
  private panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly client: HetznerClient,
    private readonly tailscaleKeyManager: TailscaleAuthKeyManager,
    private readonly serversProvider: ServersProvider,
    private readonly library: CloudInitLibrary,
    private readonly robotCredManager: RobotCredentialManager,
    private readonly boxPwdManager: StorageBoxPasswordManager
  ) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables
    );
  }

  static async create(
    context: vscode.ExtensionContext,
    tokenManager: TokenManager,
    tailscaleKeyManager: TailscaleAuthKeyManager,
    serversProvider: ServersProvider,
    robotCredManager: RobotCredentialManager,
    boxPwdManager: StorageBoxPasswordManager
  ): Promise<void> {
    const client = await tokenManager.getActiveClient();
    if (!client) {
      vscode.window.showErrorMessage('No active Hetzner project. Add a token first.');
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.serverWizard',
      'Create Server',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'resources')],
      }
    );

    const wizard = new ServerWizardPanel(
      panel,
      client,
      tailscaleKeyManager,
      serversProvider,
      new CloudInitLibrary(context.globalState),
      robotCredManager,
      boxPwdManager
    );
    await wizard.loadAndRender();
  }

  private async loadAndRender() {
    this.panel.webview.html = getLoadingHtml();

    try {
      const cfg = vscode.workspace.getConfiguration('hcloud');
      const tailscaleCfg = vscode.workspace.getConfiguration('hcloud.tailscale');

      const [locations, serverTypes, systemImages, snapshots, sshKeys, networks] =
        await Promise.all([
          this.client.getLocations(),
          this.client.getServerTypes(),
          this.client.getImages('system'),
          this.client.getImages('snapshot'),
          this.client.getSshKeys(),
          this.client.getNetworks(),
        ]);

      const data: WizardData = {
        locations,
        serverTypes,
        images: [...systemImages, ...snapshots],
        sshKeys,
        networks,
        tailscaleEnabled: tailscaleCfg.get<boolean>('enableByDefault', true),
        defaultRegion: cfg.get<string>('defaultRegion', 'nbg1'),
      };

      this.panel.webview.html = getWizardHtml(data);
    } catch (err: unknown) {
      this.panel.webview.html = getErrorHtml((err as Error).message);
    }
  }

  private async handleMessage(msg: { command: string; payload?: Record<string, unknown> }) {
    switch (msg.command) {
      case 'createServer':
        await this.handleCreateServer(msg.payload as CreateServerPayload);
        break;
      case 'cancel':
        this.panel.dispose();
        break;
      case 'setTailscaleKey':
        await this.tailscaleKeyManager.promptAndSave();
        this.panel.webview.postMessage({ command: 'tailscaleKeySet' });
        break;
      case 'addSshKey': {
        // Snapshot existing keys so we can detect what was newly added
        const existingKeys = await this.client.getSshKeys();
        const existingNames = new Set(existingKeys.map((k) => k.name));

        await vscode.commands.executeCommand('hcloud.addSshKey');

        // Re-fetch and diff — don't reload the whole wizard (that loses all state)
        const updatedKeys = await this.client.getSshKeys();
        const newKeyNames = updatedKeys
          .filter((k) => !existingNames.has(k.name))
          .map((k) => k.name);

        this.panel.webview.postMessage({
          command: 'sshKeysUpdated',
          keys: updatedKeys,
          newKeyNames,
        });
        break;
      }
      case 'createNetwork': {
        const name = await vscode.window.showInputBox({
          title: 'Create Network — Name',
          prompt: 'Enter a name for the private network',
          placeHolder: 'e.g. my-network',
          validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
        });
        if (!name) break;
        const ipRange = await vscode.window.showInputBox({
          title: 'Create Network — IP Range',
          prompt: 'CIDR notation',
          placeHolder: '10.0.0.0/8',
          value: '10.0.0.0/8',
          validateInput: (v) => (!v?.trim() || !/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(v.trim()) ? 'Must be a valid CIDR range' : undefined),
        });
        if (!ipRange) break;
        try {
          await this.client.createNetwork(name.trim(), ipRange.trim());
          const updatedNetworks = await this.client.getNetworks();
          this.panel.webview.postMessage({ command: 'networksUpdated', networks: updatedNetworks });
          vscode.window.showInformationMessage(`Network "${name}" created.`);
        } catch (err: unknown) {
          vscode.window.showErrorMessage(`Failed to create network: ${(err as Error).message}`);
        }
        break;
      }
      case 'saveCloudInitTemplate': {
        const content = (msg.payload as { content: string }).content;
        if (!content.trim()) {
          vscode.window.showWarningMessage('Cannot save an empty cloud-init template.');
          break;
        }
        const tplName = await vscode.window.showInputBox({
          title: 'Save Cloud-init Template',
          prompt: 'Enter a name for this template',
          placeHolder: 'e.g. nodejs-setup',
          validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
        });
        if (!tplName) break;
        await this.library.saveTemplate(tplName.trim(), content);
        vscode.window.showInformationMessage(`Cloud-init template "${tplName}" saved.`);
        break;
      }
      case 'loadCloudInitTemplate': {
        const templates = await this.library.listTemplates();
        if (templates.length === 0) {
          vscode.window.showInformationMessage(
            'No saved cloud-init templates. Write a script and click \u201cSave as Template\u201d first.'
          );
          break;
        }
        const picked = await vscode.window.showQuickPick(
          templates.map((t) => ({ label: t, description: 'cloud-init template' })),
          { placeHolder: 'Select a template to load', title: 'Load Cloud-init Template' }
        );
        if (!picked) break;
        const tplContent = await this.library.loadTemplate(picked.label);
        if (tplContent !== undefined) {
          this.panel.webview.postMessage({ command: 'cloudInitTemplateLoaded', content: tplContent });
        }
        break;
      }
      case 'deleteCloudInitTemplate': {
        const allTemplates = await this.library.listTemplates();
        if (allTemplates.length === 0) {
          vscode.window.showInformationMessage('No saved cloud-init templates.');
          break;
        }
        const pickedDel = await vscode.window.showQuickPick(
          allTemplates.map((t) => ({ label: t })),
          { placeHolder: 'Select a template to delete', title: 'Delete Cloud-init Template' }
        );
        if (!pickedDel) break;
        const confirmDel = await vscode.window.showWarningMessage(
          `Delete cloud-init template "${pickedDel.label}"?`,
          { modal: true },
          'Delete'
        );
        if (confirmDel !== 'Delete') break;
        await this.library.deleteTemplate(pickedDel.label);
        vscode.window.showInformationMessage(`Template "${pickedDel.label}" deleted.`);
        break;
      }
      case 'requestStorageBoxMounts': {
        const existingCloudInit = ((msg.payload as { existingCloudInit?: string }) ?? {}).existingCloudInit ?? '';
        const mounts = await promptStorageBoxMounts(this.robotCredManager, this.boxPwdManager);
        if (!mounts || mounts.length === 0) break;
        const injected = injectStorageBoxMounts(existingCloudInit, mounts);
        this.panel.webview.postMessage({ command: 'cloudInitTemplateLoaded', content: injected });
        vscode.window.showInformationMessage(
          `Storage Box mount config injected into cloud-init (${mounts.length} box${mounts.length > 1 ? 'es' : ''}).`
        );
        break;
      }
    }
  }

  private async handleCreateServer(payload: CreateServerPayload) {
    this.panel.webview.postMessage({ command: 'setLoading', message: 'Creating server...' });

    try {
      let cloudInit = payload.cloudInit || '';

      if (payload.tailscaleEnabled) {
        const tsKey = await this.tailscaleKeyManager.getAuthKey();
        if (!tsKey) {
          this.panel.webview.postMessage({
            command: 'error',
            message: 'Tailscale is enabled but no auth key is set. Click "Set Tailscale Key" in the wizard.',
          });
          return;
        }
        cloudInit = injectTailscale(cloudInit, tsKey);
      }

      const { root_password } = await this.client.createServer({
        name: payload.name,
        server_type: payload.serverType,
        image: payload.image,
        location: payload.location,
        ssh_keys: payload.sshKeys,
        networks: payload.networks,
        user_data: cloudInit || undefined,
        start_after_create: true,
      });

      this.serversProvider.refresh();
      this.panel.dispose();

      if (root_password) {
        // Show root password in a modal — only time it's ever displayed
        const copy = await vscode.window.showInformationMessage(
          `✓ Server "${payload.name}" created!\n\nRoot password (save this now — shown only once):\n${root_password}`,
          { modal: true },
          'Copy Password'
        );
        if (copy === 'Copy Password') {
          await vscode.env.clipboard.writeText(root_password);
          vscode.window.showInformationMessage('Root password copied to clipboard.');
        }
      } else {
        vscode.window.showInformationMessage(`✓ Server "${payload.name}" created successfully!`);
      }
    } catch (err: unknown) {
      this.panel.webview.postMessage({
        command: 'error',
        message: (err as Error).message,
      });
    }
  }

  dispose() {
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

interface CreateServerPayload {
  name: string;
  location: string;
  serverType: string;
  image: string;
  sshKeys: string[];
  networks: number[];
  cloudInit: string;
  tailscaleEnabled: boolean;
}

/** Cryptographically-adequate nonce for CSP inline script allowlisting. */
function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let n = '';
  for (let i = 0; i < 32; i++) n += chars.charAt(Math.floor(Math.random() * chars.length));
  return n;
}

function getLoadingHtml(): string {
  return `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)">
    <div style="text-align:center"><div style="font-size:24px;margin-bottom:12px">⏳</div><div>Loading Hetzner data...</div></div>
  </body></html>`;
}

function getErrorHtml(msg: string): string {
  const safe = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html><html><body style="padding:24px;font-family:var(--vscode-font-family);color:var(--vscode-errorForeground);background:var(--vscode-editor-background)">
    <h2>Failed to load wizard</h2><p>${safe}</p>
  </body></html>`;
}

function getWizardHtml(data: WizardData): string {
  const nonce = generateNonce();
  const locationsJson = JSON.stringify(data.locations);
  const serverTypesJson = JSON.stringify(data.serverTypes);
  const imagesJson = JSON.stringify(data.images);
  const sshKeysJson = JSON.stringify(data.sshKeys);
  const networksJson = JSON.stringify(data.networks);

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Create Server</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 0;
    min-height: 100vh;
  }

  /* ── Layout ── */
  .wizard {
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 100vh;
  }

  /* ── Sidebar ── */
  .sidebar {
    background: var(--vscode-sideBar-background, #252526);
    border-right: 1px solid var(--vscode-panel-border, #3c3c3c);
    padding: 24px 0;
  }

  .sidebar h2 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
    padding: 0 16px 16px;
  }

  .step-nav { list-style: none; }

  .step-nav li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: background 0.15s;
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
  }

  .step-nav li.active {
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
    border-left-color: var(--vscode-focusBorder, #007fd4);
  }

  .step-nav li.done {
    color: var(--vscode-foreground);
  }

  .step-badge {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--vscode-badge-background, #4d4d4d);
    color: var(--vscode-badge-foreground, #fff);
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-weight: 600;
  }

  .step-nav li.done .step-badge {
    background: var(--vscode-testing-iconPassed, #73c991);
    color: #000;
  }

  .step-nav li.active .step-badge {
    background: var(--vscode-focusBorder, #007fd4);
    color: #fff;
  }

  /* ── Main content ── */
  .main {
    display: flex;
    flex-direction: column;
    padding: 32px 40px;
    max-width: 860px;
  }

  .step-panel { display: none; }
  .step-panel.active { display: block; }

  h1 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .subtitle {
    color: var(--vscode-descriptionForeground);
    margin-bottom: 28px;
    font-size: 13px;
  }

  /* ── Form controls ── */
  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
  }

  input[type="text"], textarea, select {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, #3c3c3c);
    border-radius: 3px;
    padding: 6px 10px;
    font-family: inherit;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s;
  }

  input[type="text"]:focus, textarea:focus {
    border-color: var(--vscode-focusBorder, #007fd4);
  }

  .field { margin-bottom: 20px; }

  .field-hint {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 4px;
  }

  /* ── Cards grid ── */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
  }

  .cards.wide {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .card {
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    border-radius: 6px;
    padding: 12px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    user-select: none;
  }

  .card:hover {
    border-color: var(--vscode-focusBorder, #007fd4);
    background: var(--vscode-list-hoverBackground);
  }

  .card.selected {
    border-color: var(--vscode-focusBorder, #007fd4);
    background: var(--vscode-list-activeSelectionBackground);
  }

  .card-title {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .card-desc {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
  }

  .card-badge {
    display: inline-block;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    margin-bottom: 6px;
  }

  /* ── Checkbox cards ── */
  .check-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    margin-bottom: 20px;
  }

  .check-card {
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    border-radius: 6px;
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: border-color 0.15s;
    user-select: none;
  }

  .check-card:hover { border-color: var(--vscode-focusBorder, #007fd4); }
  .check-card.selected {
    border-color: var(--vscode-focusBorder, #007fd4);
    background: var(--vscode-list-activeSelectionBackground);
  }

  .check-card input[type="checkbox"] { display: none; }

  .check-icon {
    width: 16px;
    height: 16px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
  }

  .check-card.selected .check-icon {
    background: var(--vscode-focusBorder, #007fd4);
    border-color: var(--vscode-focusBorder, #007fd4);
    color: #fff;
  }

  /* ── Toggle ── */
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .toggle-label { font-size: 13px; font-weight: 600; }
  .toggle-sub { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; }

  .toggle {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }

  .toggle input { opacity: 0; width: 0; height: 0; }

  .toggle-slider {
    position: absolute;
    inset: 0;
    background: var(--vscode-input-border);
    border-radius: 20px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    left: 3px;
    top: 3px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle input:checked + .toggle-slider { background: var(--vscode-focusBorder, #007fd4); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }

  /* ── Cloud-init editor ── */
  textarea.code {
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
    font-size: 12px;
    min-height: 200px;
    resize: vertical;
    white-space: pre;
    tab-size: 2;
  }

  /* ── Summary table ── */
  .summary {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .summary-row {
    display: flex;
    align-items: flex-start;
    padding: 10px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    font-size: 13px;
  }

  .summary-row:last-child { border-bottom: none; }
  .summary-key { width: 140px; flex-shrink: 0; color: var(--vscode-descriptionForeground); font-size: 12px; padding-top: 1px; }
  .summary-val { font-weight: 500; }

  /* ── Buttons ── */
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid var(--vscode-panel-border);
  }

  button {
    padding: 7px 18px;
    border-radius: 3px;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: opacity 0.15s;
  }

  button:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-primary {
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
  }
  .btn-primary:hover:not(:disabled) { background: var(--vscode-button-hoverBackground, #1177bb); }

  .btn-secondary {
    background: var(--vscode-button-secondaryBackground, #3a3d41);
    color: var(--vscode-button-secondaryForeground, #fff);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--vscode-button-secondaryHoverBackground, #45494e); }

  .btn-danger {
    background: var(--vscode-errorForeground, #f48771);
    color: #fff;
  }

  .ml-auto { margin-left: auto; }

  /* ── Search ── */
  .search-wrap { position: relative; margin-bottom: 12px; }
  .search-wrap input {
    padding-left: 28px;
  }
  .search-icon {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--vscode-descriptionForeground);
    pointer-events: none;
    font-size: 13px;
  }

  /* ── Error / info banner ── */
  .banner {
    padding: 10px 14px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 16px;
    display: none;
  }

  .banner.error {
    background: rgba(244,135,113,0.15);
    border: 1px solid var(--vscode-errorForeground);
    color: var(--vscode-errorForeground);
    display: block;
  }

  .banner.info {
    background: rgba(0,127,212,0.12);
    border: 1px solid var(--vscode-focusBorder);
    color: var(--vscode-foreground);
    display: block;
  }

  .banner.warning {
    background: rgba(255,180,0,0.1);
    border: 1px solid rgba(255,180,0,0.5);
    color: var(--vscode-foreground);
    display: block;
  }

  .loading-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    font-size: 14px;
    z-index: 999;
  }

  .loading-overlay.active { display: flex; }

  .spinner {
    width: 32px; height: 32px;
    border: 3px solid var(--vscode-panel-border);
    border-top-color: var(--vscode-focusBorder, #007fd4);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Filter tabs ── */
  .filter-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .filter-tab {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    cursor: pointer;
    border: 1px solid var(--vscode-panel-border);
    background: transparent;
    color: var(--vscode-foreground);
    transition: background 0.15s;
  }

  .filter-tab.active {
    background: var(--vscode-focusBorder, #007fd4);
    border-color: var(--vscode-focusBorder, #007fd4);
    color: #fff;
  }

  .empty-state {
    text-align: center;
    padding: 32px;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
  }
</style>
</head>
<body>

<div class="loading-overlay" id="loadingOverlay">
  <div class="spinner"></div>
  <div id="loadingMsg">Creating server...</div>
</div>

<div class="wizard">
  <!-- Sidebar -->
  <nav class="sidebar">
    <h2>Create Server</h2>
    <ul class="step-nav" id="stepNav">
      <li class="active" onclick="goToStep(0)"><span class="step-badge" id="badge0">1</span> Basics</li>
      <li onclick="goToStep(1)"><span class="step-badge" id="badge1">2</span> Server Type</li>
      <li onclick="goToStep(2)"><span class="step-badge" id="badge2">3</span> OS Image</li>
      <li onclick="goToStep(3)"><span class="step-badge" id="badge3">4</span> SSH Keys</li>
      <li onclick="goToStep(4)"><span class="step-badge" id="badge4">5</span> Network</li>
      <li onclick="goToStep(5)"><span class="step-badge" id="badge5">6</span> Cloud-init</li>
      <li onclick="goToStep(6)"><span class="step-badge" id="badge6">7</span> Review</li>
    </ul>
  </nav>

  <!-- Main -->
  <div class="main">

    <!-- ── Step 0: Basics ── -->
    <div class="step-panel active" id="step0">
      <h1>Basics</h1>
      <p class="subtitle">Name your server and choose a datacenter location.</p>

      <div class="field">
        <label>Server Name</label>
        <input type="text" id="serverName" placeholder="e.g. web-01" autocomplete="off" />
        <div class="field-hint">Lowercase letters, numbers, and hyphens only.</div>
      </div>

      <div class="field">
        <label>Datacenter Location</label>
        <div class="cards wide" id="locationCards"></div>
      </div>

      <div class="actions">
        <button class="btn-secondary" onclick="cancel()">Cancel</button>
        <button class="btn-primary ml-auto" onclick="nextStep(0)">Next →</button>
      </div>
    </div>

    <!-- ── Step 1: Server Type ── -->
    <div class="step-panel" id="step1">
      <h1>Server Type</h1>
      <p class="subtitle">Choose the CPU, RAM, and disk configuration.</p>

      <div class="filter-tabs" id="typeFilter">
        <button class="filter-tab active" onclick="filterTypes('all', this)">All</button>
        <button class="filter-tab" onclick="filterTypes('shared', this)">Shared vCPU</button>
        <button class="filter-tab" onclick="filterTypes('dedicated', this)">Dedicated vCPU</button>
        <button class="filter-tab" onclick="filterTypes('arm', this)">Arm64</button>
      </div>

      <div class="cards wide" id="typeCards"></div>

      <div class="actions">
        <button class="btn-secondary" onclick="prevStep(1)">← Back</button>
        <button class="btn-primary ml-auto" onclick="nextStep(1)">Next →</button>
      </div>
    </div>

    <!-- ── Step 2: OS Image ── -->
    <div class="step-panel" id="step2">
      <h1>OS Image</h1>
      <p class="subtitle">Select a system image, snapshot, or enter a custom image.</p>

      <div class="filter-tabs" id="imageFilter">
        <button class="filter-tab active" onclick="filterImages('system', this)">System</button>
        <button class="filter-tab" onclick="filterImages('snapshot', this)">Snapshots</button>
        <button class="filter-tab" onclick="filterImages('custom', this)">Custom Image</button>
      </div>

      <div class="search-wrap" id="imageSearchWrap">
        <span class="search-icon">⌕</span>
        <input type="text" id="imageSearch" placeholder="Search images..." oninput="renderImages()" />
      </div>

      <div class="cards wide" id="imageCards"></div>

      <div id="customImagePanel" style="display:none">
        <div class="field">
          <label>Custom Image ID or Name</label>
          <input type="text" id="customImageInput" placeholder="e.g. 12345678 or my-image-name" autocomplete="off"/>
          <div class="field-hint">Enter a Hetzner image ID, snapshot ID, or ISO name not listed in the catalog.</div>
        </div>
      </div>

      <div class="actions">
        <button class="btn-secondary" onclick="prevStep(2)">← Back</button>
        <button class="btn-primary ml-auto" onclick="nextStep(2)">Next →</button>
      </div>
    </div>

    <!-- ── Step 3: SSH Keys ── -->
    <div class="step-panel" id="step3">
      <h1>SSH Keys</h1>
      <p class="subtitle">Select which SSH keys to authorize on this server. Multiple allowed.</p>

      <div id="sshKeyCards" class="check-cards"></div>
      <div id="noSshKeysMsg" class="empty-state" style="display:none">
        No SSH keys found. Proceeding without one will generate a root password shown after creation.
      </div>

      <div class="actions">
        <button class="btn-secondary" onclick="prevStep(3)">← Back</button>
        <button class="btn-secondary" onclick="addSshKeyFromWizard()">+ Add SSH Key</button>
        <button class="btn-primary ml-auto" onclick="nextStep(3)">Next →</button>
      </div>
    </div>

    <!-- ── Step 4: Network ── -->
    <div class="step-panel" id="step4">
      <h1>Network</h1>
      <p class="subtitle">Attach private networks (optional). The server always gets a public IPv4 address.</p>

      <div class="toggle-row" style="margin-bottom:16px">
        <div>
          <div class="toggle-label">🌐 Public IPv4</div>
          <div class="toggle-sub">Always enabled — every server gets a public IP</div>
        </div>
        <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:var(--vscode-testing-iconPassed,#73c991);color:#000">Always on</span>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <label style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Private Networks</label>
        <button class="btn-secondary" style="padding:4px 12px;font-size:12px" onclick="createNetworkFromWizard()">+ Create Network</button>
      </div>

      <div id="networkCards" class="check-cards"></div>
      <div id="noNetworksMsg" class="empty-state" style="display:none">
        No private networks yet. Click "+ Create Network" to add one, or continue with public IP only.
      </div>

      <div class="actions">
        <button class="btn-secondary" onclick="prevStep(4)">← Back</button>
        <button class="btn-primary ml-auto" onclick="nextStep(4)">Next →</button>
      </div>
    </div>

    <!-- ── Step 5: Cloud-init ── -->
    <div class="step-panel" id="step5">
      <h1>Cloud-init &amp; Tailscale</h1>
      <p class="subtitle">Customize startup scripts. Tailscale is injected automatically when enabled.</p>

      <div class="toggle-row">
        <div>
          <div class="toggle-label">🔒 Tailscale Auto-install</div>
          <div class="toggle-sub">Installs Tailscale and activates it on first boot</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="tailscaleToggle" ${data.tailscaleEnabled ? 'checked' : ''} onchange="updateTailscaleState()"/>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div id="tailscaleKeyBanner" class="banner info" style="display:none">
        ⚠ No Tailscale auth key set. <a href="#" onclick="setTailscaleKey()" style="color:var(--vscode-textLink-foreground)">Set key now</a>
      </div>

      <div class="banner warning">
        🔒 <strong>Security notice:</strong> The Tailscale auth key is embedded as plaintext in cloud-init user-data and is readable via the Hetzner API by anyone with API access. Use a <strong>short-lived ephemeral key</strong> to minimise exposure.
      </div>

      <div class="field">
        <label>Cloud-init Script <span style="font-weight:400;text-transform:none">(optional)</span></label>
        <textarea class="code" id="cloudInitInput" placeholder="#cloud-config&#10;&#10;# Your cloud-init YAML here.&#10;# Tailscale block will be appended automatically if enabled."></textarea>
        <div class="field-hint">YAML cloud-config format. Tailscale runcmd will be merged in automatically.</div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button class="btn-secondary" style="font-size:12px;padding:4px 10px" onclick="saveCloudInitTemplate()">&#128190; Save as Template</button>
          <button class="btn-secondary" style="font-size:12px;padding:4px 10px" onclick="loadCloudInitTemplate()">&#128194; Load Template</button>
          <button class="btn-secondary" style="font-size:12px;padding:4px 10px" onclick="deleteCloudInitTemplate()">&#128465; Delete Template</button>
          <button class="btn-secondary" style="font-size:12px;padding:4px 10px" onclick="requestStorageBoxMounts()">&#128230; Mount Storage Boxes</button>
        </div>
      </div>

      <div class="actions">
        <button class="btn-secondary" onclick="prevStep(5)">← Back</button>
        <button class="btn-primary ml-auto" onclick="nextStep(5)">Review →</button>
      </div>
    </div>

    <!-- ── Step 6: Review ── -->
    <div class="step-panel" id="step6">
      <h1>Review &amp; Create</h1>
      <p class="subtitle">Confirm your configuration before creating the server.</p>

      <div id="errorBanner" class="banner"></div>

      <div class="summary" id="summaryTable"></div>

      <div class="actions">
        <button class="btn-secondary" onclick="prevStep(6)">← Back</button>
        <button class="btn-primary ml-auto" id="createBtn" onclick="createServer()">⚡ Create Server</button>
      </div>
    </div>

  </div><!-- /main -->
</div><!-- /wizard -->

<script nonce="${nonce}">
const vscode = acquireVsCodeInstance();
const LOCATIONS = ${locationsJson};
const SERVER_TYPES = ${serverTypesJson};
const IMAGES = ${imagesJson};
let SSH_KEYS = ${sshKeysJson};
let NETWORKS = ${networksJson};

// HTML-escape helper — used in all innerHTML renders
function h(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  currentStep: 0,
  completedSteps: new Set(),
  name: '',
  location: ${JSON.stringify(data.defaultRegion)},
  serverType: '',
  image: '',
  imageDisplay: '',
  customImage: '',
  useCustomImage: false,
  sshKeys: [],
  networks: [],
  cloudInit: '',
  tailscaleEnabled: ${data.tailscaleEnabled},
  imageFilter: 'system',
};

// ── Init ───────────────────────────────────────────────────────────────────
window.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg.command === 'setLoading') showLoading(msg.message);
  if (msg.command === 'error') { hideLoading(); showError(msg.message); }
  if (msg.command === 'tailscaleKeySet') {
    document.getElementById('tailscaleKeyBanner').style.display = 'none';
  }
  if (msg.command === 'sshKeysUpdated') {
    SSH_KEYS = msg.keys;
    // Auto-select any newly added keys
    msg.newKeyNames.forEach(name => {
      if (!state.sshKeys.includes(name)) state.sshKeys.push(name);
    });
    renderSshKeys();
  }
  if (msg.command === 'cloudInitTemplateLoaded') {
    document.getElementById('cloudInitInput').value = msg.content;
    state.cloudInit = msg.content;
  }
  if (msg.command === 'networksUpdated') {
    NETWORKS = msg.networks;
    renderNetworks();
  }
});

function saveCloudInitTemplate() {
  vscode.postMessage({ command: 'saveCloudInitTemplate', payload: { content: document.getElementById('cloudInitInput').value } });
}
function loadCloudInitTemplate() {
  vscode.postMessage({ command: 'loadCloudInitTemplate' });
}
function deleteCloudInitTemplate() {
  vscode.postMessage({ command: 'deleteCloudInitTemplate' });
}
function requestStorageBoxMounts() {
  vscode.postMessage({ command: 'requestStorageBoxMounts', payload: { existingCloudInit: document.getElementById('cloudInitInput').value } });
}

function acquireVsCodeInstance() {
  try { return acquireVsCodeApi(); } catch(e) { return { postMessage: console.log }; }
}

document.addEventListener('DOMContentLoaded', () => {
  renderLocations();
  renderServerTypes('all');
  renderImages();
  renderSshKeys();
  renderNetworks();
  updateTailscaleState();
});

// ── Navigation ─────────────────────────────────────────────────────────────
function goToStep(idx) {
  // Only allow going back to completed steps
  if (idx >= state.currentStep && !state.completedSteps.has(idx)) return;
  showStep(idx);
}

function nextStep(from) {
  if (!validateStep(from)) return;
  state.completedSteps.add(from);
  updateBadge(from);
  if (from === 5) renderSummary();
  showStep(from + 1);
}

function prevStep(from) {
  showStep(from - 1);
}

function showStep(idx) {
  document.querySelectorAll('.step-panel').forEach((p, i) => {
    p.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.step-nav li').forEach((li, i) => {
    li.classList.toggle('active', i === idx);
  });
  state.currentStep = idx;
}

function updateBadge(idx) {
  const badge = document.getElementById('badge' + idx);
  badge.textContent = '✓';
  document.querySelectorAll('.step-nav li')[idx].classList.add('done');
}

// ── Validation ─────────────────────────────────────────────────────────────
function validateStep(step) {
  switch(step) {
    case 0:
      state.name = document.getElementById('serverName').value.trim();
      if (!state.name) { alert('Please enter a server name.'); return false; }
      if (!/^[a-z0-9-]+$/.test(state.name)) { alert('Name must be lowercase letters, numbers, and hyphens only.'); return false; }
      if (!state.location) { alert('Please select a location.'); return false; }
      return true;
    case 1:
      if (!state.serverType) { alert('Please select a server type.'); return false; }
      return true;
    case 2:
      if (state.useCustomImage) {
        state.customImage = document.getElementById('customImageInput').value.trim();
        if (!state.customImage) { alert('Please enter a custom image ID or name.'); return false; }
        state.image = state.customImage;
        state.imageDisplay = 'Custom: ' + state.customImage;
      } else {
        if (!state.image) { alert('Please select an OS image.'); return false; }
      }
      return true;
    case 5:
      state.cloudInit = document.getElementById('cloudInitInput').value;
      state.tailscaleEnabled = document.getElementById('tailscaleToggle').checked;
      return true;
    default: return true;
  }
}

// ── Step 0: Locations ──────────────────────────────────────────────────────
function renderLocations() {
  const container = document.getElementById('locationCards');
  const locationFlags = { nbg1:'🇩🇪', fsn1:'🇩🇪', hel1:'🇫🇮', ash:'🇺🇸', hil:'🇺🇸', sin:'🇸🇬' };
  container.innerHTML = LOCATIONS.map(l => \`
    <div class="card \${l.name === state.location ? 'selected' : ''}"
         onclick="selectLocation('\${l.name}', this)"
         data-val="\${l.name}">
      <div class="card-title">\${locationFlags[l.name] || '🌍'} \${l.name.toUpperCase()}</div>
      <div class="card-desc">\${l.city}, \${l.country}</div>
      <div class="card-desc" style="margin-top:4px;opacity:0.7">\${l.network_zone}</div>
    </div>
  \`).join('');
}

function selectLocation(val, el) {
  state.location = val;
  document.querySelectorAll('#locationCards .card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Step 1: Server Types ───────────────────────────────────────────────────
function filterTypes(filter, btn) {
  document.querySelectorAll('#typeFilter .filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderServerTypes(filter);
}

function renderServerTypes(filter) {
  const container = document.getElementById('typeCards');
  let types = SERVER_TYPES;
  if (filter === 'shared') types = types.filter(t => t.cpu_type === 'shared');
  if (filter === 'dedicated') types = types.filter(t => t.cpu_type === 'dedicated');
  if (filter === 'arm') types = types.filter(t => t.architecture === 'arm');

  container.innerHTML = types.map(t => \`
    <div class="card \${t.name === state.serverType ? 'selected' : ''}"
         onclick="selectType('\${t.name}', this)">
      <div class="card-badge">\${t.cpu_type}</div>
      <div class="card-title">\${t.name}</div>
      <div class="card-desc">
        \${t.cores} vCPU · \${t.memory}GB RAM<br>
        \${t.disk}GB \${t.storage_type}<br>
        \${t.architecture}
      </div>
    </div>
  \`).join('');
}

function selectType(val, el) {
  state.serverType = val;
  document.querySelectorAll('#typeCards .card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Step 2: Images ─────────────────────────────────────────────────────────
function filterImages(filter, btn) {
  state.imageFilter = filter;
  document.querySelectorAll('#imageFilter .filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const isCustom = filter === 'custom';
  document.getElementById('customImagePanel').style.display = isCustom ? 'block' : 'none';
  document.getElementById('imageCards').style.display = isCustom ? 'none' : 'grid';
  document.getElementById('imageSearchWrap').style.display = isCustom ? 'none' : 'block';
  state.useCustomImage = isCustom;
  if (!isCustom) renderImages();
}

function renderImages() {
  const container = document.getElementById('imageCards');
  const search = (document.getElementById('imageSearch').value || '').toLowerCase();
  const osIcons = { ubuntu:'🟠', debian:'🔴', fedora:'💙', centos:'🟣', rocky:'🟢', alma:'🔵', default:'📦' };

  let imgs = IMAGES.filter(i => i.type === state.imageFilter || (state.imageFilter === 'system' && i.type === 'system'));
  if (search) imgs = imgs.filter(i => (i.name || i.description || '').toLowerCase().includes(search));

  if (imgs.length === 0) {
    container.innerHTML = '<div class="empty-state">No images found.</div>';
    return;
  }

  container.innerHTML = imgs.map(i => {
    const label = i.name || i.description;
    const iconKey = Object.keys(osIcons).find(k => label.toLowerCase().includes(k)) || 'default';
    return \`
      <div class="card \${i.name === state.image ? 'selected' : ''}"
           onclick="selectImage(\${JSON.stringify(i.name || i.id)}, \${JSON.stringify(label)}, this)">
        <div class="card-badge">\${h(i.type)}</div>
        <div class="card-title">\${osIcons[iconKey]} \${h(label)}</div>
        <div class="card-desc">\${h(i.os_flavor)} \${h(i.os_version || '')}</div>
      </div>
    \`;
  }).join('');
}

function selectImage(val, display, el) {
  state.image = val;
  state.imageDisplay = display;
  document.querySelectorAll('#imageCards .card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Step 3: SSH Keys ───────────────────────────────────────────────────────
function renderSshKeys() {
  const container = document.getElementById('sshKeyCards');
  if (SSH_KEYS.length === 0) {
    document.getElementById('noSshKeysMsg').style.display = 'block';
    container.style.display = 'none';
    return;
  }
  container.innerHTML = SSH_KEYS.map(k => \`
    <label class="check-card \${state.sshKeys.includes(k.name) ? 'selected' : ''}"
           onclick="toggleSshKey(\${JSON.stringify(k.name)}, this)">
      <div class="check-icon">\${state.sshKeys.includes(k.name) ? '✓' : ''}</div>
      <div>
        <div style="font-size:13px;font-weight:600">\${h(k.name)}</div>
        <div style="font-size:11px;color:var(--vscode-descriptionForeground)">\${h(k.fingerprint.substring(0, 28))}…</div>
      </div>
    </label>
  \`).join('');
}

function toggleSshKey(name, el) {
  if (state.sshKeys.includes(name)) {
    state.sshKeys = state.sshKeys.filter(k => k !== name);
    el.classList.remove('selected');
    el.querySelector('.check-icon').textContent = '';
  } else {
    state.sshKeys.push(name);
    el.classList.add('selected');
    el.querySelector('.check-icon').textContent = '✓';
  }
}

// ── Step 4: Networks ───────────────────────────────────────────────────────
function renderNetworks() {
  const container = document.getElementById('networkCards');
  if (NETWORKS.length === 0) {
    document.getElementById('noNetworksMsg').style.display = 'block';
    container.style.display = 'none';
    return;
  }
  container.innerHTML = NETWORKS.map(n => \`
    <label class="check-card \${state.networks.includes(n.id) ? 'selected' : ''}"
           onclick="toggleNetwork(\${n.id}, this)">
      <div class="check-icon">\${state.networks.includes(n.id) ? '✓' : ''}</div>
      <div>
        <div style="font-size:13px;font-weight:600">\${h(n.name)}</div>
        <div style="font-size:11px;color:var(--vscode-descriptionForeground)">\${h(n.ip_range)}</div>
      </div>
    </label>
  \`).join('');
}

function toggleNetwork(id, el) {
  if (state.networks.includes(id)) {
    state.networks = state.networks.filter(n => n !== id);
    el.classList.remove('selected');
    el.querySelector('.check-icon').textContent = '';
  } else {
    state.networks.push(id);
    el.classList.add('selected');
    el.querySelector('.check-icon').textContent = '✓';
  }
}

function addSshKeyFromWizard() {
  vscode.postMessage({ command: 'addSshKey' });
}

function createNetworkFromWizard() {
  vscode.postMessage({ command: 'createNetwork' });
}

// ── Step 5: Cloud-init / Tailscale ─────────────────────────────────────────
function updateTailscaleState() {
  state.tailscaleEnabled = document.getElementById('tailscaleToggle').checked;
  // Banner is shown/hidden by the extension host after key check
}

function setTailscaleKey() {
  vscode.postMessage({ command: 'setTailscaleKey' });
}

// ── Step 6: Review ─────────────────────────────────────────────────────────
function renderSummary() {
  const rows = [
    ['Name', state.name],
    ['Location', state.location.toUpperCase()],
    ['Server Type', state.serverType],
    ['OS Image', state.imageDisplay || state.image],
    ['SSH Keys', state.sshKeys.length ? state.sshKeys.join(', ') : 'None'],
    ['Networks', state.networks.length ? state.networks.length + ' network(s)' : 'Public only'],
    ['Tailscale', state.tailscaleEnabled ? '✓ Auto-install enabled' : '✗ Disabled'],
    ['Cloud-init', state.cloudInit.trim() ? '✓ Custom script provided' : 'None'],
  ];

  document.getElementById('summaryTable').innerHTML = rows.map(([k, v]) => \`
    <div class="summary-row">
      <span class="summary-key">\${h(k)}</span>
      <span class="summary-val">\${h(v)}</span>
    </div>
  \`).join('');
}

// ── Create ─────────────────────────────────────────────────────────────────
function createServer() {
  document.getElementById('errorBanner').className = 'banner';
  vscode.postMessage({
    command: 'createServer',
    payload: {
      name: state.name,
      location: state.location,
      serverType: state.serverType,
      image: state.image,
      sshKeys: state.sshKeys,
      networks: state.networks,
      cloudInit: state.cloudInit,
      tailscaleEnabled: state.tailscaleEnabled,
    }
  });
}

function cancel() {
  vscode.postMessage({ command: 'cancel' });
}

function showLoading(msg) {
  document.getElementById('loadingMsg').textContent = msg || 'Working...';
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = '⚠ ' + msg;
  banner.className = 'banner error';
  showStep(6);
}
</script>
</body>
</html>`;
}
