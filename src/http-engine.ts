import {
  NoxAeApiError,
  NoxAeApiForbiddenError,
  NoxAeApiNetworkError,
  NoxAeApiNotFoundError,
  NoxAeApiRateLimitError,
  NoxAeApiServerError,
  NoxAeApiUnauthorizedError,
} from "./errors.js";

export interface RetryOptions {
  /** Max number of attempts including the first one. Default 3. */
  attempts?: number;
  /** Base delay in ms used for exponential backoff. Default 300. */
  baseDelayMs?: number;
  /** Upper bound for any single backoff delay. Default 5000. */
  maxDelayMs?: number;
}

export interface NoxAeApiClientOptions {
  /** Base URL of the server, e.g. "http://localhost:8080" or "https://mc.example.com". */
  baseUrl: string;
  /** The API key configured on the server (sent as the `key` header). */
  apiKey?: string;
  /** Request timeout in ms. Default 10000. */
  timeoutMs?: number;
  /** Retry behavior for network errors, 429s, and 5xx responses. */
  retry?: RetryOptions | false;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
  /** Override fetch, mainly for testing. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_RETRY: Required<RetryOptions> = {
  attempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 5000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, opts: Required<RetryOptions>): number {
  const exp = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** attempt);
  // full jitter
  return Math.floor(Math.random() * exp);
}

export type QueryValue = string | number | boolean | null | undefined;

export class HttpEngine {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly retry: Required<RetryOptions> | false;
  private readonly extraHeaders: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: NoxAeApiClientOptions) {
    if (!options.baseUrl) {
      throw new Error("NoxAeApiClient requires a non-empty baseUrl");
    }
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.retry =
      options.retry === false
        ? false
        : { ...DEFAULT_RETRY, ...(options.retry ?? {}) };
    this.extraHeaders = options.headers ?? {};
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error(
        "No fetch implementation available. Pass `fetchImpl` in options for this runtime.",
      );
    }
    this.fetchImpl = fetchImpl;
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(`${this.baseUrl}/v1/${path.replace(/^\/+/, "")}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    opts: {
      body?: unknown;
      query?: Record<string, QueryValue>;
      /**
       * Encode `body` as `application/x-www-form-urlencoded` (Javalin's
       * `ctx.formParam(...)`) instead of JSON. Most NoxAeApi endpoints
       * expect form-urlencoded bodies — only the LuckPerms and NoxAuth
       * routes use `ctx.bodyAsClass(...)` and need real JSON. Defaults to
       * `false` (JSON) to preserve existing behavior; each module call
       * site is responsible for passing `form: true` where the server
       * actually expects it.
       */
      form?: boolean;
    } = {},
  ): Promise<T> {
    const url = this.buildUrl(path, opts.query);
    const maxAttempts = this.retry ? this.retry.attempts : 1;

    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
          ...this.extraHeaders,
        };
        if (this.apiKey) headers["key"] = this.apiKey;

        let encodedBody: string | undefined;
        if (opts.body !== undefined) {
          if (opts.form) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            encodedBody = encodeFormBody(opts.body);
          } else {
            headers["Content-Type"] = "application/json";
            encodedBody = JSON.stringify(opts.body);
          }
        }

        const response = await this.fetchImpl(url, {
          method,
          headers,
          body: encodedBody,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          const text = await response.text();
          return (text ? JSON.parse(text) : undefined) as T;
        }

        const errorBody = await response.text().catch(() => undefined);
        const parsedBody = safeJsonParse(errorBody);
        const info = { status: response.status, method, path, body: parsedBody };

        if (response.status === 401) throw new NoxAeApiUnauthorizedError(info);
        if (response.status === 403) throw new NoxAeApiForbiddenError(info);
        if (response.status === 404) throw new NoxAeApiNotFoundError(info);

        if (response.status === 429) {
          const retryAfterHeader = response.headers.get("Retry-After");
          const retryAfterMs = retryAfterHeader
            ? parseRetryAfter(retryAfterHeader)
            : undefined;
          const err = new NoxAeApiRateLimitError(info, retryAfterMs);
          if (this.retry && attempt < maxAttempts - 1) {
            lastError = err;
            await sleep(retryAfterMs ?? backoffDelay(attempt, this.retry));
            continue;
          }
          throw err;
        }

        if (response.status >= 500) {
          const err = new NoxAeApiServerError(info);
          if (this.retry && attempt < maxAttempts - 1) {
            lastError = err;
            await sleep(backoffDelay(attempt, this.retry));
            continue;
          }
          throw err;
        }

        throw new NoxAeApiError(
          `Unexpected status ${response.status} on ${method} ${path}`,
          info,
        );
      } catch (err) {
        clearTimeout(timeout);

        if (err instanceof NoxAeApiError) throw err;

        const isAbort = err instanceof Error && err.name === "AbortError";
        const networkErr = new NoxAeApiNetworkError(
          isAbort
            ? `Request timed out after ${this.timeoutMs}ms: ${method} ${path}`
            : `Network error on ${method} ${path}: ${(err as Error).message}`,
          method,
          path,
          err,
        );

        if (this.retry && attempt < maxAttempts - 1) {
          lastError = networkErr;
          await sleep(backoffDelay(attempt, this.retry));
          continue;
        }
        throw networkErr;
      }
    }

    // Unreachable in practice, but keeps TS happy and surfaces the last error if we exit the loop.
    throw lastError instanceof Error
      ? lastError
      : new Error("Request failed after retries");
  }
}

/**
 * Encodes a plain object as `application/x-www-form-urlencoded`, matching
 * what Javalin's `ctx.formParam(name)` reads server-side. `undefined`/`null`
 * values are omitted (so optional fields can be left out entirely rather
 * than sent as the literal string "undefined"). Non-primitive values are
 * JSON.stringify'd as a fallback, though no current endpoint needs that.
 */
function encodeFormBody(body: unknown): string {
  const params = new URLSearchParams();
  if (body && typeof body === "object") {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (value === undefined || value === null) continue;
      params.set(
        key,
        typeof value === "string" || typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value),
      );
    }
  }
  return params.toString();
}

function safeJsonParse(text: string | undefined): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseRetryAfter(headerValue: string): number | undefined {
  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(headerValue);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}
