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
   * Replace PlaceholderAPI-style placeholders (e.g. "%player_name%") in
   * `message` for a player, returning the resolved string.
   *
   * Server-side this is `PAPIApi.replacePlaceholders`, which reads
   * `ctx.formParam("message")` and `ctx.formParam("uuid")` — the field is
   * literally named "message", not "text", and the whole body must be
   * form-urlencoded.
   */
  replace(uuid: string, message: string): Promise<string> {
    return this.http.request("POST", "placeholders/replace", {
      body: { uuid, message },
      form: true,
    });
  }
}
