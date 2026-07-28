# @wumx-labs/noxaeapi-sdk

Typed JS/TS SDK for [NoxAeApi](https://github.com), a REST + WebSocket API plugin/mod for Minecraft servers — ships for both Fabric and Bukkit/Spigot/PaperMC. The REST surface is identical across platforms, so this SDK works against either without any platform-specific configuration.

Zero runtime dependencies — uses native `fetch` and `WebSocket`.

## Install

```bash
npm install @wumx-labs/noxaeapi-sdk
```

## Usage

```ts
import { NoxAeApiClient } from "@wumx-labs/noxaeapi-sdk";

const client = new NoxAeApiClient({
  baseUrl: "http://localhost:8080",
  apiKey: "your-api-key",
});

const players = await client.players.list();
const balance = await client.economy.getBalance(players[0].uuid);
await client.server.broadcast("Hello from the SDK!");
```

### From environment variables

```ts
// Reads NOXAEAPI_BASE_URL and NOXAEAPI_KEY from process.env.
// If you keep those in a .env file, load it yourself first (e.g. with `dotenv`) —
// the SDK never reads .env files or process.env implicitly outside this method.
const client = NoxAeApiClient.fromEnv();
```

### Realtime (console tail / events)

```ts
const ws = client.connect({ route: "console" });
ws.on("console", (line) => console.log(line));
ws.on("close", () => console.log("disconnected"));
```

The socket auto-reconnects with exponential backoff on unexpected disconnects.

## Error handling

All non-2xx responses throw a subclass of `NoxAeApiError`:

- `NoxAeApiUnauthorizedError` — 401, missing/invalid API key
- `NoxAeApiForbiddenError` — 403, key valid but not permitted for this endpoint
- `NoxAeApiNotFoundError` — 404
- `NoxAeApiRateLimitError` — 429 (SDK auto-retries these by default; thrown only once retries are exhausted)
- `NoxAeApiServerError` — 5xx (also auto-retried by default)
- `NoxAeApiNetworkError` — request never completed (timeout, DNS, connection refused)

```ts
import { NoxAeApiForbiddenError } from "@wumx-labs/noxaeapi-sdk";

try {
  await client.server.restart();
} catch (err) {
  if (err instanceof NoxAeApiForbiddenError) {
    console.error("This API key isn't allowed to restart the server.");
  } else {
    throw err;
  }
}
```

## Optional modules

Some modules only work depending on the target server's setup:

- `client.luckperms.*` — requires the LuckPerms mod to be loaded on the server
- `client.noxauth.*` — requires `noxauth.enabled: true` in the server's `noxaeapi-config.yml`

Calling these against a server without the corresponding feature enabled will fail (typically 404).

## Configuration

```ts
new NoxAeApiClient({
  baseUrl: "https://mc.example.com",
  apiKey: "...",
  timeoutMs: 10_000,          // per-request timeout, default 10s
  retry: {
    attempts: 3,               // total attempts including the first, default 3
    baseDelayMs: 300,
    maxDelayMs: 5000,
  },
  // retry: false,             // disable retries entirely
  headers: { "X-Extra": "..." },
});
```

## License

MIT
