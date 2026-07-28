import type { HttpEngine } from "../http-engine.js";
import type { ServerInfo, WhitelistEntry } from "../types/models.js";

export class ServerModule {
  constructor(private readonly http: HttpEngine) {}

  /** Basic liveness check. */
  ping(): Promise<{ status: string }> {
    return this.http.request("GET", "ping");
  }

  /** Get server info: version, MOTD, TPS, health, player counts, etc. */
  info(): Promise<ServerInfo> {
    return this.http.request("GET", "server");
  }

  /**
   * Run a console command on the server.
   * This is a privileged endpoint — requires a write-enabled API key.
   */
  exec(command: string): Promise<{ lines: string[] }> {
    return this.http.request("POST", "server/exec", { body: { command } });
  }

  /** List server operators. */
  getOps(): Promise<WhitelistEntry[]> {
    return this.http.request("GET", "server/ops");
  }

  /** Grant operator status to a player. */
  opPlayer(uuid: string): Promise<void> {
    return this.http.request("POST", "server/ops", { body: { uuid } });
  }

  /** Revoke operator status from a player. */
  deopPlayer(uuid: string): Promise<void> {
    return this.http.request("DELETE", "server/ops", { body: { uuid } });
  }

  /** Get the current whitelist. */
  getWhitelist(): Promise<WhitelistEntry[]> {
    return this.http.request("GET", "server/whitelist");
  }

  /** Add a player to the whitelist. */
  addToWhitelist(uuid: string, name?: string): Promise<void> {
    return this.http.request("POST", "server/whitelist", { body: { uuid, name } });
  }

  /** Remove a player from the whitelist. */
  removeFromWhitelist(uuid: string): Promise<void> {
    return this.http.request("DELETE", "server/whitelist", { body: { uuid } });
  }

  /**
   * Restart the server.
   * This is a privileged endpoint — requires a write-enabled API key.
   */
  restart(): Promise<void> {
    return this.http.request("POST", "server/restart");
  }

  /** Tail the server console log. */
  getLogs(lines?: number): Promise<{ lines: string[] }> {
    return this.http.request("GET", "server/logs", { query: { lines } });
  }

  /** Get entity counts on the server, optionally scoped to a world. */
  getEntities(world?: string): Promise<{ world: string; count: number; entities: Record<string, number> }> {
    return this.http.request("GET", "server/entities", { query: { world } });
  }

  /** Get loaded chunk counts, optionally scoped to a world. */
  getChunks(world?: string): Promise<{ world: string; loadedChunks: number }> {
    return this.http.request("GET", "server/chunks", { query: { world } });
  }

  /** Ban an IP address. */
  banIp(ip: string, reason?: string): Promise<void> {
    return this.http.request("POST", "server/ban-ip", { body: { ip, reason } });
  }

  /** Get a scoreboard objective's scores by objective name. */
  getObjective(name: string) {
    return this.http.request("GET", `scoreboard/${encodeURIComponent(name)}`);
  }

  /** List all scoreboard objectives and tracked entries. */
  getScoreboard() {
    return this.http.request("GET", "scoreboard");
  }

  /** Set a score for an entry on an objective. */
  setScore(objective: string, entry: string, value: number): Promise<void> {
    return this.http.request("POST", `scoreboard/${encodeURIComponent(objective)}/score`, {
      body: { entry, value },
    });
  }

  /** Reset (remove) a score for an entry on an objective. */
  resetScore(objective: string, entry: string): Promise<void> {
    return this.http.request("DELETE", `scoreboard/${encodeURIComponent(objective)}/score`, {
      body: { entry },
    });
  }

  /** Broadcast a message to every player on the server. */
  broadcast(message: string): Promise<void> {
    return this.http.request("POST", "chat/broadcast", { body: { message } });
  }

  /** Send a private message to a specific player. */
  tell(uuid: string, message: string): Promise<void> {
    return this.http.request("POST", "chat/tell", { body: { uuid, message } });
  }
}
