import type { HttpEngine, QueryValue } from "../http-engine.js";
import type {
  NetworkFindPlayerResponse,
  NetworkHealthResponse,
  NetworkPlayersResponse,
  NetworkServerStatus,
} from "../types/models.js";

/**
 * Wraps the `/v1/network/*` routes. These only exist when `network.enabled:
 * true` is set in the server's config with at least one backend server
 * configured — calling any method here against a server without the
 * network aggregator enabled will 404.
 *
 * The aggregator fans requests out to every configured backend server
 * (each with its own base URL + key) and merges the results, so a single
 * call here can reflect the state of an entire network rather than just
 * the server you connected to.
 */
export class NetworkModule {
  constructor(private readonly http: HttpEngine) {}

  /** Get status (server info + online players) for every configured network server. */
  statusAll(): Promise<{ network: NetworkServerStatus[] }> {
    return this.http.request("GET", "network/status");
  }

  /** Get status for a single network server by its configured ID. */
  statusById(id: string): Promise<NetworkServerStatus> {
    return this.http.request("GET", `network/status/${encodeURIComponent(id)}`);
  }

  /** Aggregate online players across every network server. */
  players(): Promise<NetworkPlayersResponse> {
    return this.http.request("GET", "network/players");
  }

  /** Find which network server a player is currently on by UUID. */
  findPlayer(uuid: string): Promise<NetworkFindPlayerResponse> {
    return this.http.request("GET", `network/players/${encodeURIComponent(uuid)}`);
  }

  /** Get aggregate health (TPS/memory) from every network server. */
  health(): Promise<NetworkHealthResponse> {
    return this.http.request("GET", "network/health");
  }

  /**
   * Broadcast a message to every server on the network.
   * Returns a map of server ID -> "success" | "error" (per-server delivery
   * result; a network-wide failure is only thrown for a malformed request).
   */
  broadcast(message: string): Promise<Record<string, "success" | "error">> {
    return this.http.request("POST", "network/broadcast", { body: { message }, form: true });
  }

  /**
   * Forward an arbitrary request to a specific network server's own REST
   * API, e.g. `network.forward("survival", "POST", "server/exec", { body:
   * { command: "say hi" }, form: true })` reaches that server's
   * `POST /v1/server/exec` directly. Useful for endpoints the aggregator
   * doesn't have a dedicated method for (economy, worlds, etc) on a
   * specific server without instantiating a second client pointed at it.
   *
   * Note the target server responds according to its own route's expected
   * encoding (form vs JSON) — pass `form: true` the same way you would for
   * a direct call to that endpoint.
   */
  forward<T = unknown>(
    id: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    opts: { body?: unknown; query?: Record<string, QueryValue>; form?: boolean } = {},
  ): Promise<T> {
    return this.http.request(method, `network/${encodeURIComponent(id)}/${path.replace(/^\/+/, "")}`, opts);
  }
}
