import type { HttpEngine } from "../http-engine.js";
import type { Advancement } from "../types/models.js";

export class AdvancementsModule {
  constructor(private readonly http: HttpEngine) {}

  /** List all advancements known to the server. */
  list(): Promise<Advancement[]> {
    return this.http.request("GET", "advancements");
  }
}

export class PlaceholdersModule {
  constructor(private readonly http: HttpEngine) {}

  /**
   * Replace PlaceholderAPI-style placeholders (e.g. "%player_name%") for a
   * player, returning the resolved string.
   */
  replace(uuid: string, text: string): Promise<{ result: string }> {
    return this.http.request("POST", "placeholders/replace", {
      body: { uuid, text },
    });
  }
}
