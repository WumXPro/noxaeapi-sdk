export type NoxAeApiWsEvent =
  | "open"
  | "close"
  | "error"
  | "console"
  | "event"
  | "message";

type Listener = (payload: unknown) => void;

export interface NoxAeApiWsOptions {
  /** Base URL of the server, same one passed to the client (http/https). */
  baseUrl: string;
  apiKey?: string;
  /** Route suffix under the websocket base, e.g. "console" or "events". Default "events". */
  route?: string;
  /** Whether to auto-reconnect on unexpected close. Default true. */
  autoReconnect?: boolean;
  /** Max reconnect delay in ms. Default 30000. */
  maxReconnectDelayMs?: number;
  /** Override the WebSocket implementation, mainly for testing / non-browser runtimes. */
  webSocketImpl?: typeof WebSocket;
}

function toWsUrl(baseUrl: string, route: string, apiKey?: string): string {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/v1/ws/${route.replace(/^\/+/, "")}`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (apiKey) url.searchParams.set("key", apiKey);
  return url.toString();
}

/**
 * Thin wrapper around the server's WebSocket endpoints (console tail and
 * event broadcasts). Handles reconnection with exponential backoff so
 * consumers can just attach listeners and not think about the socket
 * lifecycle.
 *
 * Usage:
 * ```ts
 * const ws = client.connect({ route: "console" });
 * ws.on("console", (line) => console.log(line));
 * ws.on("close", () => console.log("disconnected"));
 * ```
 */
export class NoxAeApiSocket {
  private socket: WebSocket | null = null;
  private readonly listeners = new Map<NoxAeApiWsEvent, Set<Listener>>();
  private reconnectAttempt = 0;
  private closedByUser = false;
  private readonly wsImpl: typeof WebSocket;

  constructor(private readonly options: NoxAeApiWsOptions) {
    const impl = options.webSocketImpl ?? (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
    if (!impl) {
      throw new Error(
        "No WebSocket implementation available in this runtime. Pass `webSocketImpl` in options.",
      );
    }
    this.wsImpl = impl;
    this.open();
  }

  private open(): void {
    const url = toWsUrl(this.options.baseUrl, this.options.route ?? "events", this.options.apiKey);
    const socket = new this.wsImpl(url);

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.emit("open", undefined);
    };

    socket.onmessage = (event: MessageEvent) => {
      const raw = typeof event.data === "string" ? event.data : String(event.data);
      const parsed = safeParse(raw);
      this.emit("message", parsed);
      // Best-effort routing: if the payload has a `type` field of "console"
      // or "event", also emit on that specific channel.
      if (parsed && typeof parsed === "object" && "type" in (parsed as Record<string, unknown>)) {
        const type = (parsed as Record<string, unknown>).type;
        if (type === "console" || type === "event") this.emit(type, parsed);
      }
    };

    socket.onerror = (event) => {
      this.emit("error", event);
    };

    socket.onclose = () => {
      this.emit("close", undefined);
      if (!this.closedByUser && this.options.autoReconnect !== false) {
        this.scheduleReconnect();
      }
    };

    this.socket = socket;
  }

  private scheduleReconnect(): void {
    const maxDelay = this.options.maxReconnectDelayMs ?? 30_000;
    const delay = Math.min(maxDelay, 500 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt++;
    setTimeout(() => {
      if (!this.closedByUser) this.open();
    }, delay);
  }

  on(event: NoxAeApiWsEvent, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  off(event: NoxAeApiWsEvent, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: NoxAeApiWsEvent, payload: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(payload);
  }

  /** Send a raw payload over the socket, JSON-stringified if not already a string. */
  send(payload: unknown): void {
    if (!this.socket || this.socket.readyState !== this.wsImpl.OPEN) {
      throw new Error("Cannot send: socket is not open");
    }
    this.socket.send(typeof payload === "string" ? payload : JSON.stringify(payload));
  }

  /** Close the socket and stop reconnecting. */
  close(): void {
    this.closedByUser = true;
    this.socket?.close();
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
