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
  /** Only works if `network.enabled: true` is set in the server config. */
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
