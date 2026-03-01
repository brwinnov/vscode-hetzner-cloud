/**
 * Hetzner Cloud REST API client.
 * Wraps the hcloud REST API v1 with typed responses.
 */

const API_BASE = 'https://api.hetzner.cloud/v1';

/** Typed envelope for all Hetzner paginated list responses. */
interface HetznerPage {
  meta?: { pagination?: { next_page: number | null } };
  [key: string]: unknown;
}

export interface HServer {
  id: number;
  name: string;
  status: 'running' | 'off' | 'starting' | 'stopping' | 'rebuilding' | 'migrating' | 'deleting' | 'unknown';
  public_net: {
    ipv4: { ip: string } | null;
    ipv6: { ip: string } | null;
  };
  server_type: { name: string; cores: number; memory: number; disk: number };
  datacenter: { name: string; location: { name: string; city: string } };
  image: { name: string; description: string } | null;
  created: string;
  labels: Record<string, string>;
}

export interface HNetwork {
  id: number;
  name: string;
  ip_range: string;
  subnets: { type: string; ip_range: string; network_zone: string }[];
  servers: number[];
  created: string;
}

export interface HImage {
  id: number;
  name: string | null;
  description: string;
  type: 'system' | 'snapshot' | 'backup' | 'app';
  os_flavor: string;
  os_version: string | null;
  status: string;
  created: string;
}

export interface HSshKey {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
  created: string;
}

export interface HLocation {
  id: number;
  name: string;
  description: string;
  country: string;
  city: string;
  network_zone: string;
}

export interface HServerType {
  id: number;
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  storage_type: string;
  cpu_type: string;
  architecture: string;
}

export interface CreateServerOptions {
  name: string;
  server_type: string;
  image: string | number;
  location?: string;
  ssh_keys?: string[];
  networks?: number[];
  user_data?: string;
  labels?: Record<string, string>;
  start_after_create?: boolean;
}

export class HetznerClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(`Hetzner API error ${res.status}: ${(err as any).error?.message ?? res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Follows Hetzner's cursor-based pagination, collecting all items across pages.
   * @param basePath Path with optional query params (e.g. '/servers' or '/images?type=system')
   * @param arrayKey The key in the response body that holds the array of items
   */
  private async paginateList<T>(basePath: string, arrayKey: string): Promise<T[]> {
    const results: T[] = [];
    let page: number | null = 1;
    const sep = basePath.includes('?') ? '&' : '?';
    while (page !== null) {
      const data = await this.request<HetznerPage>('GET', `${basePath}${sep}per_page=50&page=${page}`);
      const items = data[arrayKey] as T[] | undefined;
      if (Array.isArray(items)) {
        results.push(...items);
      }
      page = data.meta?.pagination?.next_page ?? null;
    }
    return results;
  }

  // ── Servers ────────────────────────────────────────────────────────────────

  async getServers(): Promise<HServer[]> {
    return this.paginateList<HServer>('/servers', 'servers');
  }

  async getServer(id: number): Promise<HServer> {
    const data = await this.request<{ server: HServer }>('GET', `/servers/${id}`);
    return data.server;
  }

  async createServer(opts: CreateServerOptions): Promise<{ server: HServer; root_password: string | null }> {
    const data = await this.request<{ server: HServer; root_password: string | null }>('POST', '/servers', opts);
    return { server: data.server, root_password: data.root_password ?? null };
  }

  async powerOnServer(id: number): Promise<void> {
    await this.request('POST', `/servers/${id}/actions/poweron`);
  }

  async powerOffServer(id: number): Promise<void> {
    await this.request('POST', `/servers/${id}/actions/poweroff`);
  }

  async rebootServer(id: number): Promise<void> {
    await this.request('POST', `/servers/${id}/actions/reboot`);
  }

  async deleteServer(id: number): Promise<void> {
    await this.request('DELETE', `/servers/${id}`);
  }

  // ── Networks ───────────────────────────────────────────────────────────────

  async getNetworks(): Promise<HNetwork[]> {
    return this.paginateList<HNetwork>('/networks', 'networks');
  }

  async createNetwork(name: string, ipRange: string): Promise<HNetwork> {
    const data = await this.request<{ network: HNetwork }>('POST', '/networks', {
      name,
      ip_range: ipRange,
    });
    return data.network;
  }

  async deleteNetwork(id: number): Promise<void> {
    await this.request('DELETE', `/networks/${id}`);
  }

  // ── Images ─────────────────────────────────────────────────────────────────

  async getImages(type?: string): Promise<HImage[]> {
    const basePath = type ? `/images?type=${type}` : '/images';
    return this.paginateList<HImage>(basePath, 'images');
  }

  async deleteImage(id: number): Promise<void> {
    await this.request('DELETE', `/images/${id}`);
  }

  // ── SSH Keys ───────────────────────────────────────────────────────────────

  async getSshKeys(): Promise<HSshKey[]> {
    return this.paginateList<HSshKey>('/ssh_keys', 'ssh_keys');
  }

  async addSshKey(name: string, publicKey: string): Promise<HSshKey> {
    const data = await this.request<{ ssh_key: HSshKey }>('POST', '/ssh_keys', {
      name,
      public_key: publicKey,
    });
    return data.ssh_key;
  }

  async deleteSshKey(id: number): Promise<void> {
    await this.request('DELETE', `/ssh_keys/${id}`);
  }

  // ── Locations & Server Types ───────────────────────────────────────────────

  async getLocations(): Promise<HLocation[]> {
    const data = await this.request<{ locations: HLocation[] }>('GET', '/locations');
    return data.locations;
  }

  async getServerTypes(): Promise<HServerType[]> {
    return this.paginateList<HServerType>('/server_types', 'server_types');
  }

  // ── Validate token ─────────────────────────────────────────────────────────

  async validateToken(): Promise<{ id: number; description: string }> {
    const data = await this.request<{ token: { id: number; description: string } }>('GET', '/');
    return data.token;
  }
}
