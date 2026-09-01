import { HttpEngine, type NoxAeApiClientOptions } from "./http-engine.js";
import { PlayersModule } from "./modules/players.js";
import { EconomyModule } from "./modules/economy.js";
import { ServerModule } from "./modules/server.js";
import { WorldsModule } from "./modules/worlds.js";
import { PluginsModule } from "./modules/plugins.js";
import { AdvancementsModule, PlaceholdersModule } from "./modules/misc.js";
import { LuckPermsModule } from "./modules/luckperms.js";
import { NoxAuthModule } from "./modules/noxauth.js";
import { SkillsModule } from "./modules/skills.js";
import { LeaderboardModule } from "./modules/leaderboard.js";
import { NetworkModule } from "./modules/network.js";
import { NetworkHubModule } from "./modules/network-hub.js";
import { NoxAeApiSocket, type NoxAeApiWsOptions } from "./socket.js";

export class NoxAeApiClient {
  readonly players: PlayersModule;
  readonly economy: EconomyModule;
  readonly server: ServerModule;
  readonly worlds: WorldsModule;
  readonly plugins: PluginsModule;
  readonly advancements: AdvancementsModule;
  readonly placeholders: PlaceholdersModule;
  /** Only works if LuckPerms is loaded on the target server. */
  readonly luckperms: LuckPermsModule;
  /** Only works if `noxauth.enabled: true` is set in the server config. */
  readonly noxauth: NoxAuthModule;
  /** Requires mcMMO and/or AuraSkills to be loaded on the target server. */
  readonly skills: SkillsModule;
  /** Generic ranked leaderboards (economy currencies, mcMMO, AuraSkills, ...). */
  readonly leaderboards: LeaderboardModule;
  /**
   * Only works if `network.enabled: true` is set in the server config.
   *
   * This is NoxAeApi-main's built-in polling aggregator — it lives on the
   * *same* backend server you're already connected to and fans requests
   * out to the other backends listed in that server's own config. If the
   * network is running NoxAeApi-Velocity instead, use
   * `NoxAeApiNetworkHubClient` (pointed at the proxy's hub port) rather
   * than this module — the hub replaces this aggregator with a push model
   * and its response shapes differ.
   */
  readonly network: NetworkModule;

  private readonly http: HttpEngine;
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(options: NoxAeApiClientOptions) {
    this.http = new HttpEngine(options);
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;

    this.players = new PlayersModule(this.http);
    this.economy = new EconomyModule(this.http);
    this.server = new ServerModule(this.http);
    this.worlds = new WorldsModule(this.http);
    this.plugins = new PluginsModule(this.http);
    this.advancements = new AdvancementsModule(this.http);
    this.placeholders = new PlaceholdersModule(this.http);
    this.luckperms = new LuckPermsModule(this.http);
    this.noxauth = new NoxAuthModule(this.http);
    this.skills = new SkillsModule(this.http);
    this.leaderboards = new LeaderboardModule(this.http);
    this.network = new NetworkModule(this.http);
  }

  /**
   * Build a client from environment variables:
   * `NOXAEAPI_BASE_URL` and `NOXAEAPI_KEY`.
   *
   * This is a convenience for Node-like runtimes; the SDK itself never
   * reads `process.env` implicitly outside of this method, and does not
   * load `.env` files — use a library like `dotenv` in your own app if
   * you want that, then call `NoxAeApiClient.fromEnv()` after it's loaded.
   */
  static fromEnv(overrides: Partial<NoxAeApiClientOptions> = {}): NoxAeApiClient {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env;
    const baseUrl = overrides.baseUrl ?? env?.NOXAEAPI_BASE_URL;
    const apiKey = overrides.apiKey ?? env?.NOXAEAPI_KEY;

    if (!baseUrl) {
      throw new Error(
        "NoxAeApiClient.fromEnv(): NOXAEAPI_BASE_URL is not set and no baseUrl override was given.",
      );
    }

    return new NoxAeApiClient({ ...overrides, baseUrl, apiKey });
  }

  /** Open a WebSocket connection to the server (console tail or event stream). */
  connect(options: Partial<NoxAeApiWsOptions> = {}): NoxAeApiSocket {
    return new NoxAeApiSocket({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      ...options,
    });
  }
}

/**
 * Client for the **NoxAeApi-Velocity** network hub — a separate plugin
 * that runs on the Velocity proxy, not on any individual backend server.
 * Point `baseUrl` at the hub's own REST port (`NetworkHubConfig`'s
 * `api-port`), not a backend's port, and use `NOXAEAPI_HUB_*` env vars
 * (via `fromEnv`) if you keep that separate from a regular backend's
 * `NOXAEAPI_*` vars.
 *
 * Only exposes `.network` — the hub doesn't run any of the other REST
 * modules (players, economy, worlds, ...) that a backend `NoxAeApiClient`
 * does. To reach a specific backend's own routes through the hub, use
 * `hub.network.forward(id, ...)`.
 */
export class NoxAeApiNetworkHubClient {
  /** The network hub's aggregated view of every registered backend node. */
  readonly network: NetworkHubModule;

  constructor(options: NoxAeApiClientOptions) {
    const http = new HttpEngine(options);
    this.network = new NetworkHubModule(http);
  }

  /**
   * Build a hub client from environment variables:
   * `NOXAEAPI_HUB_BASE_URL` and `NOXAEAPI_HUB_KEY`.
   *
   * Same convenience as `NoxAeApiClient.fromEnv()`, under separate env var
   * names so a process can hold both a backend client and a hub client at
   * once without the two colliding.
   */
  static fromEnv(overrides: Partial<NoxAeApiClientOptions> = {}): NoxAeApiNetworkHubClient {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env;
    const baseUrl = overrides.baseUrl ?? env?.NOXAEAPI_HUB_BASE_URL;
    const apiKey = overrides.apiKey ?? env?.NOXAEAPI_HUB_KEY;

    if (!baseUrl) {
      throw new Error(
        "NoxAeApiNetworkHubClient.fromEnv(): NOXAEAPI_HUB_BASE_URL is not set and no baseUrl override was given.",
      );
    }

    return new NoxAeApiNetworkHubClient({ ...overrides, baseUrl, apiKey });
  }
}
