import type { HttpEngine } from "../http-engine.js";
import type { Plugin } from "../types/models.js";

export class PluginsModule {
  constructor(private readonly http: HttpEngine) {}

  /** List all installed plugins/mods. */
  list(): Promise<Plugin[]> {
    return this.http.request("GET", "plugins");
  }

  /**
   * Install a plugin from a URL or identifier.
   * This is a privileged endpoint — requires a write-enabled API key.
   */
  install(source: string): Promise<void> {
    return this.http.request("POST", "plugins", { body: { source } });
  }

  /** Enable a plugin by name. */
  enable(name: string): Promise<void> {
    return this.http.request("POST", `plugins/${encodeURIComponent(name)}/enable`);
  }

  /** Disable a plugin by name. */
  disable(name: string): Promise<void> {
    return this.http.request("POST", `plugins/${encodeURIComponent(name)}/disable`);
  }
}
