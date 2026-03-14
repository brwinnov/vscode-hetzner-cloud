import * as vscode from 'vscode';

export class CidrCalculator {
  private static panel: vscode.WebviewPanel | undefined;

  static open(context: vscode.ExtensionContext): void {
    if (CidrCalculator.panel) {
      CidrCalculator.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.cidrCalculator',
      'CIDR Calculator',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    CidrCalculator.panel = panel;
    panel.onDidDispose(() => { CidrCalculator.panel = undefined; });
    panel.webview.html = getCidrCalculatorHtml(generateNonce());

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'createNetwork':
          await vscode.commands.executeCommand('hcloud.createNetwork');
          break;
        case 'addSubnet':
          await vscode.commands.executeCommand('hcloud.addSubnetToNetwork');
          break;
        case 'copyToClipboard':
          if (typeof msg.text === 'string') {
            await vscode.env.clipboard.writeText(msg.text);
            vscode.window.showInformationMessage(`Copied: ${msg.text}`);
          }
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

function getCidrCalculatorHtml(nonce: string): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CIDR Calculator</title>
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

  h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  h2 {
    font-size: 11px; font-weight: 700; margin: 28px 0 10px;
    text-transform: uppercase; letter-spacing: .07em;
    color: var(--vscode-descriptionForeground);
  }

  .subtitle {
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 28px;
  }

  .divider {
    border: none;
    border-top: 1px solid var(--vscode-panel-border);
    margin: 28px 0;
  }

  /* Quick-fill chips */
  .quick-label {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .05em;
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 20px;
  }

  .chip {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 12px;
    border: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBar-background);
    color: var(--vscode-foreground);
    cursor: pointer;
  }
  .chip:hover {
    border-color: var(--vscode-focusBorder);
    background: color-mix(in srgb, var(--vscode-button-background) 12%, transparent);
  }

  /* Input row */
  .input-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .cidr-input {
    flex: 1;
    max-width: 260px;
    padding: 6px 10px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 13px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 3px;
    outline: none;
  }
  .cidr-input:focus { border-color: var(--vscode-focusBorder); }

  .error-msg {
    font-size: 11px;
    color: var(--vscode-inputValidation-errorForeground, #f48771);
    display: none;
    margin-bottom: 8px;
  }
  .error-msg.visible { display: block; }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 16px; border-radius: 3px; font-size: 13px;
    font-family: var(--vscode-font-family); cursor: pointer; border: none;
    font-weight: 600;
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
  .btn-copy {
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 400;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .btn-copy:hover { background: var(--vscode-button-secondaryHoverBackground); }

  /* Results panel */
  .results { display: none; }
  .results.visible { display: block; }

  .result-cidr-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .result-cidr {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 20px;
    font-weight: 700;
    color: var(--vscode-textLink-foreground);
  }

  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }

  @media (max-width: 560px) {
    .cards { grid-template-columns: 1fr; }
  }

  .card {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 14px 16px;
  }

  .card-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 10px;
  }

  .dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; align-items: baseline; }

  .dl dt {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
  }

  .dl dd {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    color: var(--vscode-foreground);
  }

  .host-count {
    font-size: 22px;
    font-weight: 700;
    color: var(--vscode-foreground);
    display: block;
    margin-bottom: 2px;
  }

  .host-label {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }

  /* Subnet splitter */
  .splitter-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .splitter-row label {
    font-size: 13px;
    color: var(--vscode-foreground);
  }

  .prefix-select {
    padding: 5px 8px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 13px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  }
  .prefix-select:focus { border-color: var(--vscode-focusBorder); }

  .split-summary {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 10px;
    min-height: 18px;
  }

  .subnet-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px;
    background: var(--vscode-sideBar-background);
  }

  .subnet-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 6px;
    border-radius: 3px;
  }
  .subnet-row:hover { background: color-mix(in srgb, var(--vscode-list-hoverBackground, #555) 25%, transparent); }

  .subnet-cidr {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
  }

  .subnet-detail {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-left: 12px;
    flex: 1;
  }

  /* Action row */
  .action-row {
    display: flex;
    gap: 8px;
    margin-top: 24px;
    flex-wrap: wrap;
  }

  /* Callout */
  .callout {
    background: color-mix(in srgb, var(--vscode-inputValidation-infoBackground, #003366) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-inputValidation-infoBorder, #007acc) 55%, transparent);
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 12px;
    margin-bottom: 24px;
    line-height: 1.7;
  }

  code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    background: var(--vscode-textBlockQuote-background);
    padding: 1px 5px;
    border-radius: 3px;
  }
</style>
</head>
<body>

<h1>🔢 CIDR Calculator</h1>
<p class="subtitle">Calculate network details and plan subnets — enter values with confidence before using Create Network or Add Subnet.</p>

<div class="callout">
  Hetzner Cloud networks must use RFC 1918 private address space:
  <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, or <code>192.168.0.0/16</code>.
  The network range must fully contain all subnets you plan to add.
</div>

<h2>Quick fill — common ranges</h2>
<div class="quick-label">Hetzner allowed (network range)</div>
<div class="chip-row" id="chips-network">
  <button class="chip" data-cidr="10.0.0.0/8">10.0.0.0/8</button>
  <button class="chip" data-cidr="172.16.0.0/12">172.16.0.0/12</button>
  <button class="chip" data-cidr="192.168.0.0/16">192.168.0.0/16</button>
</div>
<div class="quick-label">Common subnet sizes</div>
<div class="chip-row" id="chips-subnet">
  <button class="chip" data-cidr="10.0.0.0/16">10.0.0.0/16</button>
  <button class="chip" data-cidr="10.0.1.0/24">10.0.1.0/24</button>
  <button class="chip" data-cidr="172.16.0.0/16">172.16.0.0/16</button>
  <button class="chip" data-cidr="192.168.1.0/24">192.168.1.0/24</button>
  <button class="chip" data-cidr="192.168.0.0/24">192.168.0.0/24</button>
</div>

<h2>Enter CIDR</h2>
<div class="input-row">
  <input id="cidr-input" class="cidr-input" type="text" placeholder="e.g. 10.0.0.0/16" spellcheck="false" autocomplete="off">
  <button class="btn btn-primary" id="btn-calculate">Calculate</button>
</div>
<div id="error-msg" class="error-msg">Invalid CIDR — use format <code>a.b.c.d/prefix</code> with octets 0–255 and prefix 0–32.</div>

<hr class="divider">

<!-- Results (hidden until calculated) -->
<div id="results" class="results">

  <div class="result-cidr-row">
    <span id="result-cidr" class="result-cidr"></span>
    <button class="btn btn-copy" id="btn-copy-cidr">Copy</button>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-title">Network Details</div>
      <dl class="dl">
        <dt>Network address</dt><dd id="r-network"></dd>
        <dt>Broadcast address</dt><dd id="r-broadcast"></dd>
        <dt>Subnet mask</dt><dd id="r-mask"></dd>
        <dt>First usable host</dt><dd id="r-first"></dd>
        <dt>Last usable host</dt><dd id="r-last"></dd>
      </dl>
    </div>
    <div class="card">
      <div class="card-title">Capacity</div>
      <span id="r-usable-count" class="host-count"></span>
      <span class="host-label">usable host addresses</span>
      <dl class="dl" style="margin-top:12px">
        <dt>Total IPs</dt><dd id="r-total"></dd>
        <dt>Prefix length</dt><dd id="r-prefix"></dd>
        <dt>Network class</dt><dd id="r-class"></dd>
      </dl>
    </div>
  </div>

  <h2>Subnet splitter</h2>
  <div class="splitter-row">
    <label>Split <strong id="split-parent"></strong> into</label>
    <select id="prefix-select" class="prefix-select"></select>
    <label>subnets</label>
    <button class="btn btn-secondary" id="btn-split">Split</button>
  </div>
  <div id="split-summary" class="split-summary"></div>
  <div id="subnet-list" class="subnet-list" style="display:none"></div>

  <div class="action-row">
    <button class="btn btn-primary" id="btn-create-network">+ Create Network</button>
    <button class="btn btn-secondary" id="btn-add-subnet">+ Add Subnet</button>
  </div>

</div>

<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();

  // ── CIDR math ──────────────────────────────────────────────────────────
  function ipToInt(ip) {
    var p = ip.split('.').map(Number);
    return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  }
  function intToIp(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }
  function fmt(n) {
    return n.toLocaleString();
  }

  function parseCIDR(cidr) {
    var s = cidr.trim();
    var slash = s.lastIndexOf('/');
    if (slash < 0) return null;
    var ip = s.slice(0, slash);
    var prefix = parseInt(s.slice(slash + 1), 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
    var parts = ip.split('.');
    if (parts.length !== 4) return null;
    var octs = parts.map(Number);
    if (octs.some(function(o){ return isNaN(o) || o < 0 || o > 255; })) return null;

    var mask     = prefix === 0 ? 0 : ((0xFFFFFFFF << (32 - prefix)) >>> 0);
    var netInt   = (ipToInt(ip) & mask) >>> 0;
    var bcastInt = (netInt | (~mask >>> 0)) >>> 0;
    var total    = Math.pow(2, 32 - prefix);
    var usable   = prefix >= 31 ? total : Math.max(0, total - 2);
    var firstInt = prefix >= 31 ? netInt  : (netInt   + 1) >>> 0;
    var lastInt  = prefix >= 31 ? bcastInt: (bcastInt - 1) >>> 0;

    var firstOctet = (netInt >>> 24) & 255;
    var cls = firstOctet < 128 ? 'A' : firstOctet < 192 ? 'B' : firstOctet < 224 ? 'C' : 'D/E';

    return {
      cidr:             intToIp(netInt) + '/' + prefix,
      networkAddress:   intToIp(netInt),
      broadcastAddress: intToIp(bcastInt),
      subnetMask:       intToIp(mask),
      firstHost:        intToIp(firstInt),
      lastHost:         intToIp(lastInt),
      totalHosts:       total,
      usableHosts:      usable,
      prefix:           prefix,
      networkInt:       netInt,
      cls:              cls
    };
  }

  function splitSubnets(info, childPrefix) {
    if (childPrefix <= info.prefix || childPrefix > 32) return { subnets: [], total: 0 };
    var total    = Math.pow(2, childPrefix - info.prefix);
    var step     = Math.pow(2, 32 - childPrefix);
    var show     = Math.min(total, 64);
    var subnets  = [];
    for (var i = 0; i < show; i++) {
      var net = (info.networkInt + i * step) >>> 0;
      subnets.push(intToIp(net) + '/' + childPrefix);
    }
    return { subnets: subnets, total: total };
  }

  // ── State ───────────────────────────────────────────────────────────────
  var currentInfo = null;

  // ── DOM refs ────────────────────────────────────────────────────────────
  var inputEl      = document.getElementById('cidr-input');
  var errorEl      = document.getElementById('error-msg');
  var resultsEl    = document.getElementById('results');
  var splitSummary = document.getElementById('split-summary');
  var subnetListEl = document.getElementById('subnet-list');
  var prefixSel    = document.getElementById('prefix-select');

  // ── Helpers ─────────────────────────────────────────────────────────────
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function showResults(info) {
    currentInfo = info;

    setText('result-cidr', info.cidr);
    setText('r-network',   info.networkAddress);
    setText('r-broadcast', info.broadcastAddress);
    setText('r-mask',      info.subnetMask);
    setText('r-first',     info.prefix >= 31 ? '(all IPs usable)' : info.firstHost);
    setText('r-last',      info.prefix >= 31 ? '(all IPs usable)' : info.lastHost);
    setText('r-usable-count', fmt(info.usableHosts));
    setText('r-total',    fmt(info.totalHosts));
    setText('r-prefix',   '/' + info.prefix + '  (' + info.subnetMask + ')');
    setText('r-class',    'Class ' + info.cls);
    setText('split-parent', info.cidr);

    // Rebuild prefix selector: (parent+1) to max of 30
    prefixSel.innerHTML = '';
    var maxChild = Math.min(30, 32);
    for (var p = info.prefix + 1; p <= maxChild; p++) {
      var count = Math.pow(2, p - info.prefix);
      var hosts = p >= 31 ? Math.pow(2, 32 - p) : Math.max(0, Math.pow(2, 32 - p) - 2);
      var opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = '/' + p + '  (' + fmt(count) + ' subnets, ' + fmt(hosts) + ' hosts each)';
      prefixSel.appendChild(opt);
    }
    // Default to a /24 if within range, else first option
    var def = 24;
    if (def <= info.prefix || def > maxChild) def = info.prefix + 1;
    prefixSel.value = String(def);

    subnetListEl.style.display = 'none';
    subnetListEl.innerHTML = '';
    splitSummary.textContent = '';

    errorEl.classList.remove('visible');
    resultsEl.classList.add('visible');
  }

  function doCalculate() {
    var val = inputEl.value;
    var info = parseCIDR(val);
    if (!info) {
      errorEl.classList.add('visible');
      resultsEl.classList.remove('visible');
      return;
    }
    showResults(info);
  }

  function doSplit() {
    if (!currentInfo) return;
    var childPrefix = parseInt(prefixSel.value, 10);
    var result = splitSubnets(currentInfo, childPrefix);
    if (result.total === 0) {
      splitSummary.textContent = 'Child prefix must be larger than parent prefix.';
      subnetListEl.style.display = 'none';
      return;
    }

    var hosts = childPrefix >= 31
      ? Math.pow(2, 32 - childPrefix)
      : Math.max(0, Math.pow(2, 32 - childPrefix) - 2);
    var showing = result.subnets.length < result.total
      ? 'Showing first ' + result.subnets.length + ' of ' + fmt(result.total) + ' subnets'
      : fmt(result.total) + ' subnet' + (result.total === 1 ? '' : 's');
    splitSummary.textContent = showing + ' — ' + fmt(hosts) + ' usable hosts each';

    subnetListEl.innerHTML = '';
    result.subnets.forEach(function(cidr) {
      var row = document.createElement('div');
      row.className = 'subnet-row';

      var cidrSpan = document.createElement('span');
      cidrSpan.className = 'subnet-cidr';
      cidrSpan.textContent = cidr;

      var copyBtn = document.createElement('button');
      copyBtn.className = 'btn btn-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', function() {
        vscode.postMessage({ command: 'copyToClipboard', text: cidr });
      });

      row.appendChild(cidrSpan);
      row.appendChild(copyBtn);
      subnetListEl.appendChild(row);
    });

    subnetListEl.style.display = 'flex';
  }

  // ── Event wiring ─────────────────────────────────────────────────────────
  document.getElementById('btn-calculate').addEventListener('click', doCalculate);

  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doCalculate();
  });

  document.getElementById('btn-copy-cidr').addEventListener('click', function() {
    if (currentInfo) vscode.postMessage({ command: 'copyToClipboard', text: currentInfo.cidr });
  });

  document.getElementById('btn-split').addEventListener('click', doSplit);

  document.getElementById('btn-create-network').addEventListener('click', function() {
    vscode.postMessage({ command: 'createNetwork' });
  });
  document.getElementById('btn-add-subnet').addEventListener('click', function() {
    vscode.postMessage({ command: 'addSubnet' });
  });

  // Chips
  document.querySelectorAll('.chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      inputEl.value = chip.getAttribute('data-cidr');
      doCalculate();
    });
  });

  // Auto-calculate if the user pastes/types a valid CIDR
  inputEl.addEventListener('input', function() {
    errorEl.classList.remove('visible');
    var val = inputEl.value.trim();
    if (/^[0-9.]+[/][0-9]+$/.test(val)) doCalculate();
  });
})();
</script>
</body>
</html>`;
}
