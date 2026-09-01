import type { HttpEngine, QueryValue } from "../http-engine.js";
import type {
  NetworkHubBroadcastResponse,
  NetworkHubFindPlayerResponse,
  NetworkHubNode,
  NetworkHubPlayersResponse,
  NetworkHubStatusResponse,
} from "../types/models.js";

/**
 * Wraps the `/v1/network/*` routes exposed by the **NoxAeApi-Velocity**
 * network hub — a separate plugin/process from NoxAeApi-main, run on the
 * Velocity proxy and listening on its own port (`NetworkHubConfig`'s
 * `api-port`, distinct from any individual backend's own REST port).
 *
 * Point a `NoxAeApiNetworkHubClient` (not the regular `NoxAeApiClient`) at
 * that port to use this module. Backend Paper/Bukkit servers connect out
 * to the hub over WebSocket (`/network/register`) and push register /
 * heartbeat / player-join / player-quit events; the hub answers every
 * method below from its own in-memory registry, so calls here are cheap
 * and don't block on a live round trip to each backend the way the older
 * `NetworkModule` (NoxAeApi-main's built-in aggregator) does.
 *
 * Response shapes differ from `NetworkModule` even where the route names
 * match — e.g. `players()` returns one flat proxy-wide player list here,
 * not a per-server breakdown — so the two modules' types aren't
 * interchangeable. There's also no hub equivalent of `/v1/network/health`;
 * each node's last-reported health is embedded in `status*()`'s
 * `NetworkHubNode.health` field instead.
 */
export class NetworkHubModule {
  constructor(private readonly http: HttpEngine) {}

  /** Get last-known status (from the registry) for every backend node that has ever registered. */
  statusAll(): Promise<NetworkHubStatusResponse> {
    return this.http.request("GET", "network/status");
  }

  /** Get last-known status for a single node by its configured ID. */
  statusById(id: string): Promise<NetworkHubNode> {
    return this.http.request("GET", `network/status/${encodeURIComponent(id)}`);
  }

  /**
   * List every player currently connected to the proxy, read straight from
   * Velocity's own player registry (not reported by backends), along with
   * which backend server each is on.
   */
  players(): Promise<NetworkHubPlayersResponse> {
    return this.http.request("GET", "network/players");
  }

  /** Find which backend server a player is currently on by UUID (proxy-authoritative). */
  findPlayer(uuid: string): Promise<NetworkHubFindPlayerResponse> {
    return this.http.request("GET", `network/players/${encodeURIComponent(uuid)}`);
  }

  /**
   * Broadcast a message directly to every player connected to the proxy.
   * Unlike `NetworkModule.broadcast`, this doesn't forward to each
   * backend's `/v1/chat/broadcast` — the proxy already has every player
   * in hand — so it still delivers even to servers with no REST API of
   * their own reachable from the hub.
   */
  broadcast(message: string): Promise<NetworkHubBroadcastResponse> {
    return this.http.request("POST", "network/broadcast", { body: { message }, form: true });
  }

  /**
   * Forward an arbitrary request to a specific backend node's own REST
   * API, e.g. `hub.forward("survival", "POST", "server/exec", { body:
   * { command: "say hi" }, form: true })` reaches that backend's
   * `POST /v1/server/exec` directly. Useful for endpoints the hub doesn't
   * have a dedicated method for (economy, worlds, etc) without
   * instantiating a second client pointed at that backend directly.
   *
   * The target backend responds according to its own route's expected
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
