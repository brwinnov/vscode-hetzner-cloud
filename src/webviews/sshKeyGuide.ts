import * as vscode from 'vscode';

export class SshKeyGuidePanel {
  static create(context: vscode.ExtensionContext): void {
    const panel = vscode.window.createWebviewPanel(
      'hcloud.sshKeyGuide',
      'SSH Key Generation Guide',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = getGuideHtml();
  }
}

/** Cryptographically-adequate nonce for CSP inline script allowlisting. */
function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let n = '';
  for (let i = 0; i < 32; i++) n += chars.charAt(Math.floor(Math.random() * chars.length));
  return n;
}

function getGuideHtml(): string {
  const nonce = generateNonce();
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSH Key Generation Guide</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    line-height: 1.6;
  }

  .header {
    background: var(--vscode-sideBar-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    padding: 24px 40px;
  }

  .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 6px; }
  .header p { color: var(--vscode-descriptionForeground); font-size: 13px; }

  /* ── Tabs ── */
  .tabs {
    display: flex;
    gap: 0;
    background: var(--vscode-sideBar-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    padding: 0 40px;
  }

  .tab {
    padding: 10px 20px;
    cursor: pointer;
    font-size: 13px;
    border-bottom: 2px solid transparent;
    color: var(--vscode-descriptionForeground);
    user-select: none;
    transition: color 0.15s;
    white-space: nowrap;
  }

  .tab:hover { color: var(--vscode-foreground); }

  .tab.active {
    color: var(--vscode-foreground);
    border-bottom-color: var(--vscode-focusBorder, #007fd4);
    font-weight: 600;
  }

  .tab-icon { margin-right: 6px; }

  /* ── Content ── */
  .content { padding: 32px 40px; max-width: 860px; }

  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  h2 { font-size: 16px; font-weight: 600; margin: 24px 0 10px; }
  h2:first-child { margin-top: 0; }
  h3 { font-size: 13px; font-weight: 600; margin: 18px 0 8px; color: var(--vscode-foreground); }

  p { margin-bottom: 12px; color: var(--vscode-foreground); font-size: 13px; }

  /* ── Code blocks ── */
  .code-block {
    position: relative;
    margin: 10px 0 18px;
  }

  pre {
    background: var(--vscode-textBlockQuote-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 5px;
    padding: 14px 16px;
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
    font-size: 12px;
    overflow-x: auto;
    white-space: pre;
    line-height: 1.6;
  }

  code { font-family: inherit; }

  .copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 3px;
    padding: 3px 10px;
    font-size: 11px;
    cursor: pointer;
    font-family: var(--vscode-font-family);
    opacity: 0.85;
  }

  .copy-btn:hover { opacity: 1; }

  /* ── Info / warning boxes ── */
  .info-box {
    background: rgba(0,127,212,0.1);
    border: 1px solid var(--vscode-focusBorder, #007fd4);
    border-radius: 5px;
    padding: 12px 16px;
    font-size: 12px;
    margin: 12px 0 18px;
  }

  .warn-box {
    background: rgba(255,180,0,0.1);
    border: 1px solid rgba(255,180,0,0.5);
    border-radius: 5px;
    padding: 12px 16px;
    font-size: 12px;
    margin: 12px 0 18px;
  }

  .success-box {
    background: rgba(115,201,145,0.1);
    border: 1px solid var(--vscode-testing-iconPassed, #73c991);
    border-radius: 5px;
    padding: 12px 16px;
    font-size: 12px;
    margin: 12px 0 18px;
  }

  .box-title { font-weight: 600; margin-bottom: 4px; }

  /* ── Steps ── */
  .steps { counter-reset: step; list-style: none; margin: 0 0 20px; }

  .steps li {
    counter-increment: step;
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
    font-size: 13px;
    align-items: flex-start;
  }

  .steps li::before {
    content: counter(step);
    background: var(--vscode-focusBorder, #007fd4);
    color: #fff;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 1px;
  }

  kbd {
    background: var(--vscode-keybindingLabel-background, #333);
    border: 1px solid var(--vscode-keybindingLabel-border, #555);
    border-radius: 3px;
    padding: 1px 6px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
  }

  a { color: var(--vscode-textLink-foreground); }

  hr {
    border: none;
    border-top: 1px solid var(--vscode-panel-border);
    margin: 24px 0;
  }

  .badge {
    display: inline-block;
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 10px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    margin-left: 6px;
    vertical-align: middle;
  }
</style>
</head>
<body>

<div class="header">
  <h1>🔑 SSH Key Generation Guide</h1>
  <p>Generate an Ed25519 SSH key pair and upload the public key to Hetzner Cloud for secure, password-free server access.</p>
</div>

<div class="tabs">
  <div class="tab active" data-tab="windows"><span class="tab-icon">🪟</span> Windows</div>
  <div class="tab" data-tab="macos"><span class="tab-icon">🍎</span> macOS</div>
  <div class="tab" data-tab="wsl"><span class="tab-icon">🐧</span> WSL</div>
  <div class="tab" data-tab="linux"><span class="tab-icon">🎩</span> Linux / RHEL</div>
  <div class="tab" data-tab="bitvise"><span class="tab-icon">🛡️</span> Bitvise Client</div>
  <div class="tab" data-tab="whynot"><span class="tab-icon">❓</span> Why SSH Keys?</div>
  <div class="tab" data-tab="whyed25519"><span class="tab-icon">🔬</span> Why Ed25519?</div>
</div>

<div class="content">

  <!-- ── Windows ── -->
  <div class="tab-panel active" id="tab-windows">
    <h2>Windows — PowerShell (OpenSSH)</h2>

    <div class="info-box">
      <div class="box-title">ℹ Windows 10 (1809+) and Windows 11 include OpenSSH built-in.</div>
      No extra software needed. Open PowerShell or Windows Terminal and follow the steps below.
    </div>

    <ol class="steps">
      <li>Open <strong>PowerShell</strong> or <strong>Windows Terminal</strong></li>
      <li>Generate an Ed25519 key pair (recommended — faster and more secure than RSA):</li>
    </ol>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>ssh-keygen -t ed25519 -C "your-email@example.com"</code></pre>
    </div>

    <ol class="steps" start="3">
      <li>When prompted for a file location, press <kbd>Enter</kbd> to accept the default:<br>
        <code>C:\\Users\\YourName\\.ssh\\id_ed25519</code></li>
      <li>Set a passphrase (recommended) or press <kbd>Enter</kbd> twice to skip</li>
      <li>View your public key to copy it:</li>
    </ol>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>cat $env:USERPROFILE\\.ssh\\id_ed25519.pub</code></pre>
    </div>

    <div class="success-box">
      <div class="box-title">✓ Your keys are at:</div>
      Private key: <code>C:\\Users\\YourName\\.ssh\\id_ed25519</code><br>
      Public key: <code>C:\\Users\\YourName\\.ssh\\id_ed25519.pub</code><br><br>
      The <strong>public key</strong> (.pub) is what you upload to Hetzner. <strong>Never share the private key.</strong>
    </div>

    <h2>Test your connection</h2>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>ssh -i $env:USERPROFILE\\.ssh\\id_ed25519 root@YOUR_SERVER_IP</code></pre>
    </div>

    <hr>
    <h2>Alternative: PuTTYgen (GUI)</h2>
    <p>If you prefer a graphical interface, download <a href="https://www.putty.org" target="_blank">PuTTY</a> which includes PuTTYgen.</p>
    <ol class="steps">
      <li>Open <strong>PuTTYgen</strong></li>
      <li>Select <strong>EdDSA</strong> key type at the bottom</li>
      <li>Click <strong>Generate</strong> and move your mouse to create randomness</li>
      <li>Save both the private key (.ppk) and copy the public key in the top text box</li>
      <li>Paste the public key into Hetzner</li>
    </ol>
    <div class="warn-box">
      <div class="box-title">⚠ PuTTY format vs OpenSSH</div>
      PuTTY saves private keys in .ppk format. If you want to use the key with standard SSH tools, export it via
      <strong>Conversions → Export OpenSSH key</strong> in PuTTYgen.
    </div>
  </div>

  <!-- ── macOS ── -->
  <div class="tab-panel" id="tab-macos">
    <h2>macOS — Terminal</h2>

    <div class="info-box">
      <div class="box-title">ℹ macOS includes OpenSSH out of the box.</div>
      Open <strong>Terminal</strong> from Applications → Utilities, or press <kbd>⌘</kbd> + <kbd>Space</kbd> and type Terminal.
    </div>

    <ol class="steps">
      <li>Generate an Ed25519 key pair:</li>
    </ol>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>ssh-keygen -t ed25519 -C "your-email@example.com"</code></pre>
    </div>

    <ol class="steps" start="2">
      <li>Press <kbd>Enter</kbd> to accept the default path: <code>~/.ssh/id_ed25519</code></li>
      <li>Set a passphrase or press <kbd>Enter</kbd> to skip</li>
      <li>Add the key to your macOS Keychain so you don't re-enter the passphrase:</li>
    </ol>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>ssh-add --apple-use-keychain ~/.ssh/id_ed25519</code></pre>
    </div>

    <ol class="steps" start="5">
      <li>Copy the public key to your clipboard:</li>
    </ol>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>pbcopy &lt; ~/.ssh/id_ed25519.pub</code></pre>
    </div>

    <div class="success-box">
      <div class="box-title">✓ Keys are at:</div>
      Private: <code>~/.ssh/id_ed25519</code> &nbsp;·&nbsp; Public: <code>~/.ssh/id_ed25519.pub</code><br><br>
      Use the <strong>+ Add SSH Key</strong> button in the extension — it auto-detects keys in <code>~/.ssh/</code>.
    </div>

    <h2>Configure SSH for Hetzner</h2>
    <p>Add this to <code>~/.ssh/config</code> for convenience:</p>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>Host hetzner-*
  User root
  IdentityFile ~/.ssh/id_ed25519
  AddKeysToAgent yes
  UseKeychain yes</code></pre>
    </div>

    <h2>Test your connection</h2>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>ssh root@YOUR_SERVER_IP</code></pre>
    </div>
  </div>

  <!-- ── WSL ── -->
  <div class="tab-panel" id="tab-wsl">
    <h2>WSL (Windows Subsystem for Linux)</h2>

    <div class="info-box">
      <div class="box-title">ℹ WSL includes OpenSSH natively.</div>
      Keys generated inside WSL are stored in the Linux filesystem. You can also share keys between WSL and Windows.
    </div>

    <h3>Generate inside WSL</h3>
    <ol class="steps">
      <li>Open your WSL terminal (Ubuntu, Debian, etc.)</li>
      <li>Generate the key:</li>
    </ol>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>ssh-keygen -t ed25519 -C "your-email@example.com"</code></pre>
    </div>

    <ol class="steps" start="3">
      <li>Accept defaults, set a passphrase</li>
      <li>Display your public key:</li>
    </ol>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>cat ~/.ssh/id_ed25519.pub</code></pre>
    </div>

    <hr>
    <h3>Share an existing Windows key with WSL</h3>
    <p>If you already generated a key in Windows PowerShell, copy it into WSL:</p>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code># Copy Windows keys into WSL (run inside WSL)
cp /mnt/c/Users/your-windows-username/.ssh/id_ed25519 ~/.ssh/
cp /mnt/c/Users/your-windows-username/.ssh/id_ed25519.pub ~/.ssh/

# Fix permissions (required — SSH refuses keys with wrong perms)
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub</code></pre>
    </div>

    <hr>
    <h3>Start the SSH agent in WSL</h3>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519</code></pre>
    </div>

    <p>To auto-start the agent, add these lines to your <code>~/.bashrc</code> or <code>~/.zshrc</code>:</p>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>if [ -z "$SSH_AUTH_SOCK" ]; then
  eval "$(ssh-agent -s)" &gt; /dev/null
  ssh-add ~/.ssh/id_ed25519 2&gt;/dev/null
fi</code></pre>
    </div>

    <h2>Test your connection</h2>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>ssh -i ~/.ssh/id_ed25519 root@YOUR_SERVER_IP</code></pre>
    </div>
  </div>

  <!-- ── Linux / RHEL ── -->
  <div class="tab-panel" id="tab-linux">
    <h2>Linux &amp; RHEL / Rocky / AlmaLinux <span class="badge">Fedora · CentOS · Debian · Ubuntu</span></h2>

    <div class="info-box">
      <div class="box-title">ℹ OpenSSH is included on all major Linux distributions.</div>
      If somehow missing, install it first (see below).
    </div>

    <h3>Install OpenSSH client (if needed)</h3>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code># RHEL / Rocky / AlmaLinux / CentOS / Fedora
sudo dnf install openssh-clients -y

# Debian / Ubuntu
sudo apt install openssh-client -y</code></pre>
    </div>

    <h3>Generate the key pair</h3>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>ssh-keygen -t ed25519 -C "your-email@example.com"</code></pre>
    </div>

    <ol class="steps">
      <li>Accept the default path: <code>~/.ssh/id_ed25519</code></li>
      <li>Set a passphrase (recommended)</li>
      <li>Display your public key:</li>
    </ol>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>cat ~/.ssh/id_ed25519.pub</code></pre>
    </div>

    <h3>Fix permissions (important!)</h3>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub</code></pre>
    </div>

    <div class="warn-box">
      <div class="box-title">⚠ SSH is strict about file permissions</div>
      If <code>~/.ssh/id_ed25519</code> is group- or world-readable, SSH will refuse to use it with
      "Permissions too open" error. Always set <code>600</code> on the private key.
    </div>

    <h3>Add to SSH agent</h3>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519</code></pre>
    </div>

    <h3>Configure SSH for Hetzner</h3>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>cat >> ~/.ssh/config &lt;&lt; 'EOF'
Host hetzner-*
  User root
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking no
EOF</code></pre>
    </div>

    <h2>Test your connection</h2>
    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code>ssh -i ~/.ssh/id_ed25519 root@YOUR_SERVER_IP</code></pre>
    </div>

    <hr>
    <h2>RHEL / Rocky — SELinux note</h2>
    <div class="warn-box">
      <div class="box-title">⚠ If you moved your .ssh directory and SSH fails</div>
      SELinux may block access. Restore the context:
      <div class="code-block" style="margin-top:8px">
        <pre><code>restorecon -Rv ~/.ssh</code></pre>
      </div>
    </div>
  </div>

  <!-- ── Why SSH Keys ── -->
  <div class="tab-panel" id="tab-whynot">
    <h2>Why use SSH keys instead of passwords?</h2>

    <div class="success-box">
      <div class="box-title">✓ SSH keys are significantly more secure than passwords</div>
      A modern Ed25519 key is mathematically infeasible to brute-force. Passwords can be guessed, leaked, or phished.
    </div>

    <h3>How it works</h3>
    <p>SSH key authentication uses a <strong>public/private key pair</strong>:</p>
    <ol class="steps">
      <li><strong>Public key</strong> — uploaded to Hetzner and placed in <code>~/.ssh/authorized_keys</code> on your server. Safe to share.</li>
      <li><strong>Private key</strong> — stays only on your machine. Never leaves your computer. This is your identity.</li>
      <li>When you SSH in, your client proves ownership of the private key using cryptographic challenge-response. No password ever travels over the network.</li>
    </ol>

    <h3>Key types compared</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:12px 0">
      <thead>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Type</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Security</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Performance</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Recommendation</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">Ed25519</td>
          <td style="padding:8px">Excellent</td>
          <td style="padding:8px">Fastest</td>
          <td style="padding:8px">✅ <strong>Recommended</strong></td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">RSA 4096</td>
          <td style="padding:8px">Good</td>
          <td style="padding:8px">Slower</td>
          <td style="padding:8px">⚠ Use if Ed25519 unsupported</td>
        </tr>
        <tr>
          <td style="padding:8px">Password</td>
          <td style="padding:8px">Weak</td>
          <td style="padding:8px">N/A</td>
          <td style="padding:8px">❌ Avoid for production</td>
        </tr>
      </tbody>
    </table>

    <h3>What happens if you don't add an SSH key?</h3>
    <p>Hetzner will generate a random <strong>root password</strong> and show it once after server creation. You'll receive it in the extension's notification dialog. While this works, it's less secure and inconvenient for automation.</p>

    <div class="info-box">
      <div class="box-title">💡 Best practice workflow</div>
      1. Generate your Ed25519 key pair using the guides above<br>
      2. Add the public key to Hetzner via <strong>SSH Keys → + Add SSH Key</strong><br>
      3. Select that key when creating a new server<br>
      4. Connect with: <code>ssh root@SERVER_IP</code> — no password prompt
    </div>
  </div>

  <!-- ── Why Ed25519 ── -->
  <div class="tab-panel" id="tab-whyed25519">
    <h2>What is Ed25519 and why do we recommend it?</h2>

    <div class="info-box">
      <div class="box-title">ℹ The <code>-t</code> flag in <code>ssh-keygen -t ed25519</code> means <em>type</em> — the cryptographic algorithm used to generate your key pair.</div>
      Ed25519 is the name of that algorithm. You are not required to use it — RSA works perfectly fine with Hetzner — but Ed25519 is the modern best-practice recommendation.
    </div>

    <h3>Where does the name come from?</h3>
    <p>
      Ed25519 is an <strong>elliptic-curve digital signature scheme</strong> designed by cryptographer Daniel J. Bernstein in 2011.
      The "25519" comes from the prime number 2<sup>255</sup> − 19 that defines the mathematical curve underneath it — <em>Curve25519</em>.
      "Ed" stands for <strong>Edwards-curve</strong> (the geometric shape of the curve used).
    </p>
    <p>You don't need to understand the math. Just know it is widely peer-reviewed, used as the OpenSSH default since 2014, and recommended by NIST and CISA.</p>

    <hr>

    <h3>Algorithm comparison</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:12px 0">
      <thead>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Algorithm</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Flag</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Key size</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Speed</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Public key length</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Recommendation</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--vscode-panel-border);background:rgba(115,201,145,0.07)">
          <td style="padding:8px"><strong>Ed25519</strong></td>
          <td style="padding:8px"><code>-t ed25519</code></td>
          <td style="padding:8px">256-bit (fixed)</td>
          <td style="padding:8px">Fastest</td>
          <td style="padding:8px">~68 chars</td>
          <td style="padding:8px">✅ <strong>Recommended</strong></td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">RSA 4096</td>
          <td style="padding:8px"><code>-t rsa -b 4096</code></td>
          <td style="padding:8px">4096-bit</td>
          <td style="padding:8px">Slower</td>
          <td style="padding:8px">~724 chars</td>
          <td style="padding:8px">⚠ Legacy / max compatibility</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">RSA 2048</td>
          <td style="padding:8px"><code>-t rsa -b 2048</code></td>
          <td style="padding:8px">2048-bit</td>
          <td style="padding:8px">Moderate</td>
          <td style="padding:8px">~372 chars</td>
          <td style="padding:8px">⚠ Minimum acceptable RSA</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">ECDSA</td>
          <td style="padding:8px"><code>-t ecdsa</code></td>
          <td style="padding:8px">256–521-bit</td>
          <td style="padding:8px">Fast</td>
          <td style="padding:8px">~140 chars</td>
          <td style="padding:8px">⚠ Older elliptic curve standard</td>
        </tr>
        <tr>
          <td style="padding:8px">DSA</td>
          <td style="padding:8px"><code>-t dsa</code></td>
          <td style="padding:8px">1024-bit</td>
          <td style="padding:8px">Poor</td>
          <td style="padding:8px">~600 chars</td>
          <td style="padding:8px">❌ Deprecated — do not use</td>
        </tr>
      </tbody>
    </table>

    <hr>

    <h3>I already use RSA keys with PuTTY / Bitvise / WinSCP — do I need to change?</h3>

    <div class="warn-box">
      <div class="box-title">⚠ The algorithm (Ed25519 vs RSA) is a separate concern from the file format (.ppk vs OpenSSH PEM) — these are often confused</div>
      Your existing RSA keys work perfectly with Hetzner. You do not need to regenerate anything.
    </div>

    <p style="margin-bottom:10px">Here is how the major tools relate to each side of this:</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:12px 0">
      <thead>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Tool</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Native private key format</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Ed25519?</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">RSA?</th>
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">OpenSSH (<code>ssh-keygen</code>)</td>
          <td style="padding:8px">OpenSSH PEM</td>
          <td style="padding:8px">✅ Yes</td>
          <td style="padding:8px">✅ Yes</td>
          <td style="padding:8px">Works on every platform command line</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">PuTTY / PuTTYgen</td>
          <td style="padding:8px">.ppk (proprietary)</td>
          <td style="padding:8px">✅ v0.68+ (2017)</td>
          <td style="padding:8px">✅ Always</td>
          <td style="padding:8px">Must convert .ppk → OpenSSH for <code>ssh</code> CLI</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">Bitvise SSH</td>
          <td style="padding:8px">.bssk / imports OpenSSH</td>
          <td style="padding:8px">✅ Yes</td>
          <td style="padding:8px">✅ Yes</td>
          <td style="padding:8px">Can import OpenSSH PEM keys directly</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">WinSCP</td>
          <td style="padding:8px">Uses PuTTY .ppk</td>
          <td style="padding:8px">✅ Yes</td>
          <td style="padding:8px">✅ Yes</td>
          <td style="padding:8px">Use PuTTYgen to convert if needed</td>
        </tr>
        <tr>
          <td style="padding:8px">VS Code Remote SSH</td>
          <td style="padding:8px">OpenSSH PEM</td>
          <td style="padding:8px">✅ Yes</td>
          <td style="padding:8px">✅ Yes</td>
          <td style="padding:8px">Uses the system OpenSSH client</td>
        </tr>
      </tbody>
    </table>

    <div class="info-box">
      <div class="box-title">💡 The public key is always the same format regardless of tool or algorithm</div>
      Whatever tool you used to generate your key pair, the <strong>public key you paste into Hetzner</strong> is always plain-text OpenSSH wire format — a single line starting with <code>ssh-ed25519</code> or <code>ssh-rsa</code>.
      The private key file format difference only matters on your own machine.
    </div>

    <hr>

    <h3>Which should I use?</h3>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code># Modern — recommended for terminal / VS Code / Linux workflows
ssh-keygen -t ed25519 -C "your-email@example.com"</code></pre>
    </div>

    <div class="code-block">
      <button class="copy-btn">Copy</button>
      <pre><code># Legacy — use if you work heavily with PuTTY/WinSCP or enterprise systems
# Also import this into PuTTYgen (File → Load) to get a .ppk for PuTTY/WinSCP
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"</code></pre>
    </div>

    <div class="success-box">
      <div class="box-title">✓ Summary</div>
      <strong>Ed25519</strong> — choose this if you work primarily from the terminal, VS Code, or Linux.<br>
      <strong>RSA 4096</strong> — choose this if you already have RSA keys, use PuTTY or WinSCP regularly, or are in an enterprise environment with older SSH policies.<br><br>
      Both work with Hetzner Cloud. Both work with hcloud. The difference is speed, key size, and compatibility with older tools.
    </div>
  </div>

  <!-- ── Bitvise Client ── -->
  <div class="tab-panel" id="tab-bitvise">
    <h2>Bitvise SSH Client — The Windows Swiss Army Knife</h2>

    <div class="success-box">
      <div class="box-title">✓ One app to replace PuTTY + PuTTYgen + WinSCP — and then some</div>
      Bitvise SSH Client is a free, feature-rich Windows application that combines a terminal emulator, SFTP file browser,
      SSH tunnelling manager, and a built-in key pair generator &amp; manager — all in a single polished GUI.
      If you prefer clicking over typing, this is the definitive SSH client for Windows.
    </div>

    <h3>Why Bitvise over the alternatives?</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:12px 0">
      <thead>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <th style="text-align:left;padding:8px;color:var(--vscode-descriptionForeground)">Feature</th>
          <th style="text-align:center;padding:8px;color:var(--vscode-descriptionForeground)">PuTTY</th>
          <th style="text-align:center;padding:8px;color:var(--vscode-descriptionForeground)">WinSCP</th>
          <th style="text-align:center;padding:8px;color:var(--vscode-descriptionForeground)">PuTTYgen</th>
          <th style="text-align:center;padding:8px;color:var(--vscode-descriptionForeground)">Bitvise</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">SSH terminal emulator</td>
          <td style="text-align:center;padding:8px">✅</td>
          <td style="text-align:center;padding:8px">⚠ Basic</td>
          <td style="text-align:center;padding:8px">❌</td>
          <td style="text-align:center;padding:8px">✅</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">SFTP file browser (GUI)</td>
          <td style="text-align:center;padding:8px">❌</td>
          <td style="text-align:center;padding:8px">✅</td>
          <td style="text-align:center;padding:8px">❌</td>
          <td style="text-align:center;padding:8px">✅</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">Key pair generator</td>
          <td style="text-align:center;padding:8px">❌</td>
          <td style="text-align:center;padding:8px">❌</td>
          <td style="text-align:center;padding:8px">✅</td>
          <td style="text-align:center;padding:8px">✅</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">Ed25519 support</td>
          <td style="text-align:center;padding:8px">✅</td>
          <td style="text-align:center;padding:8px">✅</td>
          <td style="text-align:center;padding:8px">✅ v0.68+</td>
          <td style="text-align:center;padding:8px">✅</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">SSH tunnel / port forwarding</td>
          <td style="text-align:center;padding:8px">✅</td>
          <td style="text-align:center;padding:8px">⚠ Limited</td>
          <td style="text-align:center;padding:8px">❌</td>
          <td style="text-align:center;padding:8px">✅ Full GUI</td>
        </tr>
        <tr style="border-bottom:1px solid var(--vscode-panel-border)">
          <td style="padding:8px">Export public key (OpenSSH format)</td>
          <td style="text-align:center;padding:8px">❌</td>
          <td style="text-align:center;padding:8px">❌</td>
          <td style="text-align:center;padding:8px">✅</td>
          <td style="text-align:center;padding:8px">✅ One click</td>
        </tr>
        <tr>
          <td style="padding:8px">Price</td>
          <td style="text-align:center;padding:8px">Free</td>
          <td style="text-align:center;padding:8px">Free</td>
          <td style="text-align:center;padding:8px">Free (bundled)</td>
          <td style="text-align:center;padding:8px">✅ Free</td>
        </tr>
      </tbody>
    </table>

    <div class="info-box">
      <div class="box-title">⬇ Download Bitvise SSH Client (free for personal and business use)</div>
      Official download page: <a href="https://www.bitvise.com/ssh-client-download" target="_blank">https://www.bitvise.com/ssh-client-download</a><br>
      Direct installer: <strong>BvSshClient-Inst.exe</strong> (~25 MB, no dependencies, works on Windows 8.1 through 11)<br><br>
      Bitvise is developed and maintained by Bitvise Limited. It has been continuously updated since 2001 and is
      widely used in both home and enterprise environments.
    </div>

    <hr>

    <h2>Generating a key pair with the built-in Key Manager</h2>

    <p>Bitvise includes its own key pair manager — no need to open a separate tool like PuTTYgen.</p>

    <ol class="steps">
      <li>Open Bitvise SSH Client. On the <strong>Login</strong> tab, locate the <strong>Client key manager</strong> button in the
        <em>Authentication</em> section (bottom-left area) and click it.</li>
      <li>In the Client Key Manager window, click <strong>Generate new</strong>.</li>
      <li>In the <em>Key generation</em> dialog:
        <ul style="margin-top:6px;margin-left:20px;font-size:13px;line-height:1.8">
          <li>Set <strong>Key algorithm</strong> to <code>Ed25519</code> (recommended) or <code>RSA</code> if you need maximum compatibility</li>
          <li>For RSA, set <strong>Key size</strong> to <code>4096</code> bits</li>
          <li>Add a <strong>Comment</strong> (e.g. your email address) — this is optional but useful for identifying the key later</li>
          <li>Set a <strong>Passphrase</strong> to protect the private key (strongly recommended)</li>
        </ul>
      </li>
      <li>Click <strong>Generate</strong>. Bitvise generates the key pair immediately — no mouse wiggling required.</li>
      <li>The new key appears in the key list. Click it once to select it.</li>
    </ol>

    <div class="warn-box">
      <div class="box-title">⚠ Save your key pair now</div>
      Bitvise stores keys in its own internal profile. To back up the private key or use it in other tools,
      click <strong>Export</strong> in the Client Key Manager and save it as an OpenSSH key file (<code>.pem</code>).
      Store this file somewhere safe — you cannot recover it if lost.
    </div>

    <hr>

    <h2>Exporting the public key for Hetzner</h2>

    <p>Hetzner requires the public key in <strong>OpenSSH wire format</strong> — a single line starting with
    <code>ssh-ed25519</code> or <code>ssh-rsa</code>. Here is how to get it from Bitvise:</p>

    <ol class="steps">
      <li>In the <strong>Client Key Manager</strong>, select your key in the list.</li>
      <li>Click <strong>Export</strong>.</li>
      <li>In the export dialog, set <strong>Export format</strong> to <code>OpenSSH</code> and choose <strong>Public key only</strong>.</li>
      <li>Save the file as <code>id_ed25519.pub</code> (or any name ending in <code>.pub</code>).</li>
      <li>Open the file in Notepad — it is a single line of text. Copy the entire line.</li>
      <li>Paste it into the <strong>+ Add SSH Key</strong> dialog in this extension.</li>
    </ol>

    <div class="success-box">
      <div class="box-title">✓ Alternative — copy directly from Bitvise without saving a file</div>
      In the <strong>Client Key Manager</strong>, select your key and click <strong>Export</strong>.
      In the export dialog choose <strong>Copy to clipboard</strong> → <strong>OpenSSH public key</strong>.
      Then paste directly into the extension's Add SSH Key dialog. No file needed.
    </div>

    <hr>

    <h2>Using your Bitvise key to connect to Hetzner servers</h2>

    <ol class="steps">
      <li>After uploading the public key to Hetzner and creating a server with that key selected,
        open Bitvise SSH Client.</li>
      <li>On the <strong>Login</strong> tab:
        <ul style="margin-top:6px;margin-left:20px;font-size:13px;line-height:1.8">
          <li><strong>Host:</strong> your server IP address</li>
          <li><strong>Port:</strong> <code>22</code></li>
          <li><strong>Username:</strong> <code>root</code></li>
          <li><strong>Initial method:</strong> <code>publickey</code></li>
          <li><strong>Client key:</strong> select the key you just generated from the dropdown</li>
        </ul>
      </li>
      <li>Click <strong>Log in</strong>. Bitvise opens both an SSH terminal tab and an SFTP file browser tab simultaneously.</li>
    </ol>

    <div class="info-box">
      <div class="box-title">💡 Save your session as a profile</div>
      Go to <strong>File → Save profile as…</strong> to save this connection as a named profile.
      Next time, just open Bitvise and double-click the profile — username, host, port, and key are all pre-filled.
    </div>
  </div>

</div><!-- /content -->

<script nonce="${nonce}">
(function () {
  // Tab switching
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      document.getElementById('tab-' + name).classList.add('active');
      tab.classList.add('active');
    });
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = btn.nextElementSibling.textContent.trim();
      navigator.clipboard.writeText(code).then(function () {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = orig; }, 1800);
      });
    });
  });
})();
</script>
</body>
</html>`;
}
