import type { HttpEngine } from "../http-engine.js";
import type { LeaderboardEntry, LeaderboardSourceInfo } from "../types/models.js";

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
}
