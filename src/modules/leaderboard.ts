import type { HttpEngine } from "../http-engine.js";
import type {
  LeaderboardEntry,
  LeaderboardSourceInfo,
  PlayerProfile,
  PlayerProfilesResponse,
} from "../types/models.js";

/**
 * Wraps the generic, pluggable `/v1/leaderboards/*` routes. This is a
 * unified view over every ranking source registered on the server —
 * economy currencies, mcMMO power level, AuraSkills power level, etc —
 * so you don't need to know ahead of time which plugins are installed.
 *
 * Use `list()` to discover available source IDs, then pass one to
 * `getTop(id)`. Sources that are registered but currently unavailable
 * (e.g. the backing plugin isn't loaded) throw `NoxAeApiError` with the
 * source's own unavailable status (424 for economy currencies, 503 for
 * mcMMO/AuraSkills) when you call `getTop`.
 *
 * This module also wraps the player-profile routes (`/v1/players/{uuid}/profile`
 * and `/v1/players/profiles`), which live server-side alongside the
 * leaderboard sources since they're built on top of them.
 */
export class LeaderboardModule {
  constructor(private readonly http: HttpEngine) {}

  /** List every registered leaderboard source and its availability. */
  list(): Promise<LeaderboardSourceInfo[]> {
    return this.http.request("GET", "leaderboards");
  }

  /** Get ranked entries for one leaderboard source (see `list()` for valid IDs). */
  getTop(id: string, limit?: number): Promise<LeaderboardEntry[]> {
    return this.http.request("GET", `leaderboards/${encodeURIComponent(id)}/top`, {
      query: { limit },
    });
  }

  /**
   * One-call player profile: identity, whitelist/ban status, Vault balance,
   * and this player's entry in every registered leaderboard source. Built so
   * clients never have to know how many leaderboard sources exist or scan
   * top-N lists themselves.
   *
   * Throws `NoxAeApiNotFoundError` if no known player with that UUID has
   * ever joined.
   */
  getPlayerProfile(uuid: string): Promise<PlayerProfile> {
    return this.http.request("GET", `players/${encodeURIComponent(uuid)}/profile`);
  }

  /**
   * Bulk player profiles — same shape as `getPlayerProfile`, for many
   * players at once. Computes each leaderboard source's full ranking
   * exactly once for the whole batch rather than once per player, so this
   * is far cheaper than calling `getPlayerProfile` in a loop.
   *
   * Pass `uuids` to fetch an exact, specific set of players — unknown UUIDs
   * are silently skipped rather than throwing. Omit `uuids` to page through
   * every known player instead, using `page`/`limit`, optionally narrowed
   * to only currently-online players via `onlineOnly`.
   */
  getPlayerProfiles(
    opts: {
      uuids?: string[];
      page?: number;
      limit?: number;
      onlineOnly?: boolean;
    } = {},
  ): Promise<PlayerProfilesResponse> {
    return this.http.request("GET", "players/profiles", {
      query: {
        uuids: opts.uuids?.length ? opts.uuids.join(",") : undefined,
        page: opts.page,
        limit: opts.limit,
        onlineOnly: opts.onlineOnly,
      },
    });
  }
}

