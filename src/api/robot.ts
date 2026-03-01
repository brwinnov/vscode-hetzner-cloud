/**
 * Hetzner Robot API client.
 * Used for Storage Box management. Auth is HTTP Basic (Robot API credentials),
 * which are separate from the Cloud API token.
 *
 * Robot API credentials: https://robot.hetzner.com → Settings → Webservice & API
 */

const ROBOT_BASE = 'https://robot-ws.your-server.de';

export interface HStorageBox {
  id: number;
  login: string;         // e.g. "u123456"
  name: string;          // human-readable label
  server: string;        // hostname: u123456.your-storagebox.de
  host_system: string;
  disk: number;          // GB
  webdav: boolean;
  samba: boolean;
  ssh: boolean;
  external_reachability: boolean;
  zfs: boolean;
  status: string;
  paid_until: string;
}

export class RobotClient {
  constructor(
    private readonly username: string,
    private readonly password: string
  ) {}

  private async request<T>(path: string): Promise<T> {
    // Buffer.from is safe in VS Code extension (Node.js) context
    const creds = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    const res = await fetch(`${ROBOT_BASE}${path}`, {
      headers: {
        Authorization: `Basic ${creds}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as { error?: { message?: string } })?.error?.message ?? res.statusText;
      throw new Error(`Robot API ${res.status}: ${msg}`);
    }

    return res.json() as Promise<T>;
  }

  async getStorageBoxes(): Promise<HStorageBox[]> {
    const data = await this.request<Array<{ storagebox: HStorageBox }>>('/storagebox');
    return data.map((d) => d.storagebox);
  }

  async getStorageBox(id: number): Promise<HStorageBox> {
    const data = await this.request<{ storagebox: HStorageBox }>(`/storagebox/${id}`);
    return data.storagebox;
  }
}
