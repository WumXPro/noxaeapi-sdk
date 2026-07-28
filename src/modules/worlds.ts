import type { HttpEngine } from "../http-engine.js";
import type { World } from "../types/models.js";

export class WorldsModule {
  constructor(private readonly http: HttpEngine) {}

  /** List all worlds. */
  list(): Promise<World[]> {
    return this.http.request("GET", "worlds");
  }

  /** Save all worlds to disk. */
  saveAll(): Promise<void> {
    return this.http.request("POST", "worlds/save");
  }

  /** Get a download link/stream reference for all worlds. */
  downloadAll(): Promise<{ url: string }> {
    return this.http.request("GET", "worlds/download");
  }

  /** Get a single world by UUID. */
  get(uuid: string): Promise<World> {
    return this.http.request("GET", `worlds/${encodeURIComponent(uuid)}`);
  }

  /** Save a specific world to disk. */
  save(uuid: string): Promise<void> {
    return this.http.request("POST", `worlds/${encodeURIComponent(uuid)}/save`);
  }

  /** Get a download link/stream reference for a specific world. */
  download(uuid: string): Promise<{ url: string }> {
    return this.http.request("GET", `worlds/${encodeURIComponent(uuid)}/download`);
  }

  /** Set the in-game time for a world (0-24000). */
  setTime(uuid: string, time: number): Promise<void> {
    return this.http.request("POST", `worlds/${encodeURIComponent(uuid)}/time`, {
      body: { time },
      form: true,
    });
  }

  /**
   * Set the weather for a world.
   *
   * Server-side (`WorldApi.setWorldWeather`) reads a single
   * `ctx.formParam("weather")` enum string — "clear" | "rain" | "thunder" —
   * not separate storm/thundering booleans.
   */
  setWeather(uuid: string, weather: "clear" | "rain" | "thunder"): Promise<void> {
    return this.http.request("POST", `worlds/${encodeURIComponent(uuid)}/weather`, {
      body: { weather },
      form: true,
    });
  }

  /** Get entity counts within a specific world. */
  getEntities(uuid: string): Promise<{ world: string; count: number; entities: Record<string, number> }> {
    return this.http.request("GET", `worlds/${encodeURIComponent(uuid)}/entities`);
  }
}
