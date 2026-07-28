import type { HttpEngine } from "../http-engine.js";
import type {
  InventoryItem,
  OfflinePlayer,
  OnlinePlayer,
  PlayerStats,
} from "../types/models.js";

export class PlayersModule {
  constructor(private readonly http: HttpEngine) {}

  /** List currently online players. */
  list(): Promise<OnlinePlayer[]> {
    return this.http.request("GET", "players");
  }

  /** List all players the server has ever seen (online + offline). */
  listAll(): Promise<OfflinePlayer[]> {
    return this.http.request("GET", "players/all");
  }

  /** Get a single player by UUID (works for online or offline players). */
  get(uuid: string): Promise<OnlinePlayer | OfflinePlayer> {
    return this.http.request("GET", `players/${encodeURIComponent(uuid)}`);
  }

  /** Get a player's inventory in a specific world. */
  getInventory(playerUuid: string, worldUuid: string): Promise<InventoryItem[]> {
    return this.http.request(
      "GET",
      `players/${encodeURIComponent(playerUuid)}/${encodeURIComponent(worldUuid)}/inventory`,
    );
  }

  /** Kick an online player, optionally with a reason. */
  kick(uuid: string, reason?: string): Promise<void> {
    return this.http.request("POST", `players/${encodeURIComponent(uuid)}/kick`, {
      body: reason ? { reason } : undefined,
      form: true,
    });
  }

  /**
   * Ban a player, optionally with a reason and an ISO-8601 expiry
   * (e.g. "2030-01-01T00:00:00Z"). Omit `expiry` for a permanent ban.
   */
  ban(uuid: string, reason?: string, expiry?: string): Promise<void> {
    return this.http.request("POST", `players/${encodeURIComponent(uuid)}/ban`, {
      body: reason || expiry ? { reason, expiry } : undefined,
      form: true,
    });
  }

  /** Remove a player's ban. */
  unban(uuid: string): Promise<void> {
    return this.http.request("DELETE", `players/${encodeURIComponent(uuid)}/ban`);
  }

  /** Teleport a player to a location. */
  teleport(
    uuid: string,
    location: { x: number; y: number; z: number; world?: string },
  ): Promise<void> {
    return this.http.request("POST", `players/${encodeURIComponent(uuid)}/teleport`, {
      body: location,
      form: true,
    });
  }

  /** Change a player's gamemode. */
  setGamemode(
    uuid: string,
    gamemode: "survival" | "creative" | "adventure" | "spectator",
  ): Promise<void> {
    return this.http.request("PUT", `players/${encodeURIComponent(uuid)}/gamemode`, {
      body: { gamemode },
      form: true,
    });
  }

  /** Get kill/death/playtime/block stats for a player. */
  getStats(uuid: string): Promise<PlayerStats> {
    return this.http.request("GET", `players/${encodeURIComponent(uuid)}/stats`);
  }
}
