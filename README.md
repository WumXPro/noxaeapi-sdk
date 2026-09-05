# @wumx-labs/noxaeapi-sdk

Typed JS/TS SDK for [NoxAeApi](https://github.com/WumXPro/noxaeapi-sdk), a REST + WebSocket API plugin/mod for Minecraft servers — ships for both Fabric and Bukkit/Spigot/PaperMC. The REST surface is identical across platforms, so this SDK works against either without any platform-specific configuration.

Zero runtime dependencies — uses native `fetch` and `WebSocket`.

📖 **Docs:** [noxapi.noxlydev.xyz](https://noxapi.noxlydev.xyz)

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

// Multi-currency (ExcellentEconomy), leaderboards, and network aggregator:
const coins = await client.economy.getCurrencyBalance("coins", players[0].uuid);
const top = await client.leaderboards.getTop("mcmmo-power", 10);
const network = await client.network.statusAll();

// Resolve a name to a UUID, then get their one-call profile (identity,
// ban/whitelist status, Vault balance, and every leaderboard entry at once):
const { uuid } = await client.players.resolve("NoxlyDev");
const profile = await client.leaderboards.getPlayerProfile(uuid);
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

## Request encoding

The server is a Javalin app, and most endpoints read their body with
`ctx.formParam(...)` — i.e. `application/x-www-form-urlencoded` — rather
than JSON. The SDK follows the same split:

- **Form-urlencoded**: everything in `economy` (including the
  `economy.currency*`/ExcellentEconomy methods), `players`, `server`
  (except `luckperms`/`noxauth`), `worlds`, `plugins`, `placeholders`, and
  `network.broadcast`.
- **JSON**: `client.luckperms.*` (except `luckperms.checkPlayerPermission`'s
  siblings, which are also JSON) and `client.noxauth.checkPassword` only —
  these are read server-side with `ctx.bodyAsClass(...)`.
- **N/A (GET only)**: `client.leaderboards.*` and most of `client.network.*`
  are read-only.

If you're adding a new SDK method, check which one the corresponding
Javalin handler uses before wiring it up, and pass `form: true` to
`http.request(...)` if it's form-urlencoded (this is also the more common
case). Getting this wrong won't throw a type error — the request just
silently sends the wrong content type and the server won't see the field.

## Optional modules

Some modules only work depending on the target server's setup:

- `client.luckperms.*` — requires the LuckPerms mod to be loaded on the server
- `client.noxauth.*` — requires `noxauth.enabled: true` in the server's `noxaeapi-config.yml`
- `client.economy.getCurrencyBalance()`/`.payCurrency()`/`.debitCurrency()`/`.setCurrencyBalance()`/`.getCurrencyTop()`/`.listCurrencies()` — requires ExcellentEconomy (throws a 424 error if it isn't installed)
- `client.network.*` — requires `network.enabled: true` with at least one backend server configured in the server's config

Calling these against a server without the corresponding feature enabled will fail (typically 404).

## NoxAeApi-Velocity network hub

If your network runs the **NoxAeApi-Velocity** proxy plugin, use
`NoxAeApiNetworkHubClient` instead of (or alongside) `NoxAeApiClient` —
point it at the hub's own REST port, not a backend server's port.
Backend servers push register/heartbeat updates to the hub over
WebSocket, so hub calls answer from its in-memory registry rather than
fanning out live requests the way `client.network.*` above does — and
the response shapes differ accordingly (e.g. `players()` is one flat
proxy-wide list, not a per-backend breakdown, and there's no hub
equivalent of `network/health` — see each node's `health` field in
`statusAll()`/`statusById()` instead).

```ts
import { NoxAeApiNetworkHubClient } from "@wumx-labs/noxaeapi-sdk";

const hub = new NoxAeApiNetworkHubClient({
  baseUrl: "http://localhost:9090", // the hub's api-port, not a backend's port
  apiKey: "your-hub-key",
});

const status = await hub.network.statusAll();
const players = await hub.network.players();
const found = await hub.network.findPlayer(players.players[0]?.uuid ?? "");
await hub.network.broadcast("Hello from the hub!");

// Reach a specific backend's own REST routes through the hub:
await hub.network.forward("survival", "POST", "server/exec", {
  body: { command: "say hi" },
  form: true,
});
```

Or from environment variables (`NOXAEAPI_HUB_BASE_URL` / `NOXAEAPI_HUB_KEY`,
kept separate from `NoxAeApiClient.fromEnv()`'s `NOXAEAPI_*` vars so a
process can hold both clients at once):

```ts
const hub = NoxAeApiNetworkHubClient.fromEnv();
```

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