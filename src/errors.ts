export interface NoxAeApiErrorInfo {
  status: number;
  method: string;
  path: string;
  body?: unknown;
}

/**
 * Base error thrown for any non-2xx response from a NoxAeApi server.
 * Prefer catching the more specific subclasses below when you need to
 * branch on the failure reason.
 */
export class NoxAeApiError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;
  readonly body?: unknown;

  constructor(message: string, info: NoxAeApiErrorInfo) {
    super(message);
    this.name = "NoxAeApiError";
    this.status = info.status;
    this.method = info.method;
    this.path = info.path;
    this.body = info.body;
  }
}

/** 401 — the API key is missing or not recognized by the server. */
export class NoxAeApiUnauthorizedError extends NoxAeApiError {
  constructor(info: NoxAeApiErrorInfo) {
    super(
      `Unauthorized: the API key was missing or invalid for ${info.method} ${info.path}`,
      info,
    );
    this.name = "NoxAeApiUnauthorizedError";
  }
}

/**
 * 403 — the API key is valid but isn't allowed to call this endpoint
 * (read-only key hitting a write route, or an endpoint restriction set
 * on the key). This is a server-side permission decision; the SDK does
 * not attempt to predict or enforce it client-side.
 */
export class NoxAeApiForbiddenError extends NoxAeApiError {
  constructor(info: NoxAeApiErrorInfo) {
    super(
      `Forbidden: this API key does not have permission to call ${info.method} ${info.path}`,
      info,
    );
    this.name = "NoxAeApiForbiddenError";
  }
}

/** 404 — the target resource (player, world, plugin, etc.) wasn't found. */
export class NoxAeApiNotFoundError extends NoxAeApiError {
  constructor(info: NoxAeApiErrorInfo) {
    super(`Not found: ${info.method} ${info.path}`, info);
    this.name = "NoxAeApiNotFoundError";
  }
}

/** 429 — rate limited. `retryAfterMs` is populated when the server sends a Retry-After header. */
export class NoxAeApiRateLimitError extends NoxAeApiError {
  readonly retryAfterMs?: number;

  constructor(info: NoxAeApiErrorInfo, retryAfterMs?: number) {
    super(
      `Rate limited on ${info.method} ${info.path}${retryAfterMs ? ` — retry after ${retryAfterMs}ms` : ""}`,
      info,
    );
    this.name = "NoxAeApiRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** 5xx — the server errored out. Usually safe to retry. */
export class NoxAeApiServerError extends NoxAeApiError {
  constructor(info: NoxAeApiErrorInfo) {
    super(`Server error (${info.status}) on ${info.method} ${info.path}`, info);
    this.name = "NoxAeApiServerError";
  }
}

/** The request could not complete at all (DNS, connection refused, timeout, abort). */
export class NoxAeApiNetworkError extends Error {
  readonly method: string;
  readonly path: string;
  readonly cause?: unknown;

  constructor(message: string, method: string, path: string, cause?: unknown) {
    super(message);
    this.name = "NoxAeApiNetworkError";
    this.method = method;
    this.path = path;
    this.cause = cause;
  }
}
