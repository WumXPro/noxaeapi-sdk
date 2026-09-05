export interface OnlinePlayer {
  uuid: string;
  displayName: string;
  address: string | null;
  port: number | null;
  exhaustion: number;
  exp: number;
  expLevel: number;
  whitelisted: boolean;
  banned: boolean;
  op: boolean;
  balance: number | null;
  location: [number, number, number] | null;
  dimension: string | null;
  health: number;
  hunger: number;
  saturation: number;
  gamemode: string;
  lastPlayed: number;
  authenticated: boolean | null;
  registered: boolean | null;
}

export interface OfflinePlayer {
  uuid: string;
  displayName: string;
  whitelisted: boolean;
  banned: boolean;
  op: boolean;
  balance: number | null;
  lastPlayed: number;
}

/** Result of resolving a player name to their UUID via `GET /players/resolve/{name}`. */
export interface PlayerResolveResult {
  name: string;
  uuid: string;
}

export interface ServerHealth {
  cpus: number;
  uptime: number;
  totalMemory: number;
  maxMemory: number;
  freeMemory: number;
}

export interface ServerBan {
  target: string;
  source: string | null;
  reason: string | null;
  expiration: string | null;
}

export interface WhitelistEntry {
  uuid: string;
  name: string;
}

export interface ServerInfo {
  name: string;
  motd: string;
  version: string;
  bukkitVersion: string;
  tps: string;
  health: ServerHealth;
  bannedIps: ServerBan[];
  bannedPlayers: ServerBan[];
  whitelistedPlayers: WhitelistEntry[];
  maxPlayers: number;
  onlinePlayers: number;
}

export interface World {
  name: string;
  uuid: string;
  time: number;
  storm: boolean;
  thundering: boolean;
  generateStructures: boolean;
  allowAnimals: boolean;
  allowMonsters: boolean;
  difficulty: string;
  environment: string;
  seed: string;
}

export interface Score {
  entry: string;
  value: number;
}

export interface Objective {
  name: string;
  displayName: string;
  criterion: string;
  scores: Score[];
  displaySlot: string | null;
}

export interface Scoreboard {
  objectives: string[];
  entries: string[];
}

export interface InventoryItem {
  id: string;
  count: number;
  slot: number;
}

export interface Plugin {
  name: string;
  enabled: boolean;
  version: string;
  website: string | null;
  authors: string[];
  depends: string[];
  softDepends: string[];
  apiVersion: string | null;
  description: string | null;
}

export interface EconomyInfo {
  available: boolean;
  [key: string]: unknown;
}

export interface PlayerBalance {
  uuid: string;
  balance: number;
}

export interface TopBalanceEntry {
  uuid: string;
  balance: number;
}

export interface GroupInfo {
  name: string;
  permissions: string[];
}

export interface PermissionNode {
  permission: string;
  value: boolean;
  expiry: number;
  server: string | null;
  world: string | null;
}

export interface Advancement {
  key: string;
  criteria: string[];
}

export interface NoxAuthPlayerInfo {
  uuid: string;
  name: string;
  registered: boolean;
  authenticated: boolean;
  lastIp: string | null;
  lastLoginTime: number | null;
  countryCode: string | null;
  countryName: string | null;
}

export interface PasswordCheckResult {
  name: string;
  valid: boolean;
}

export interface PlayerStats {
  uuid: string;
  name: string;
  kills: number;
  deaths: number;
  playtime: number;
  blocksPlaced: number;
  blocksBroken: number;
}

export interface SkillInfo {
  uuid: string;
  /** Skill name -> level. */
  skills: Record<string, number>;
  powerLevel: number;
}

/** A single currency configured on ExcellentEconomy (multi-currency, non-Vault). */
export interface CurrencyBalance {
  uuid: string;
  name: string | null;
  currency: string;
  balance: number;
}

export interface CurrencyTopEntry {
  uuid: string;
  name: string;
  balance: number;
}

/** Entry returned by `GET /v1/leaderboards` describing one registered leaderboard source. */
export interface LeaderboardSourceInfo {
  id: string;
  displayName: string;
  available: boolean;
  /** True if this source can only rank currently-online players (e.g. mcMMO). */
  onlineOnly: boolean;
}

/** A single ranked entry from `GET /v1/leaderboards/{id}/top`. Shape can vary slightly by source. */
export interface LeaderboardEntry {
  uuid: string;
  name: string;
  value: number;
  [key: string]: unknown;
}

/** Ban details for a player, as reported by `GET /v1/players/{uuid}/profile`'s `status.ban`. */
export interface PlayerProfileBan {
  banned: boolean;
  /** Only present when `banned` is true. */
  reason?: string;
  /** Only present when `banned` is true. */
  source?: string;
  /** Only present when `banned` is true. Serialized server-side as a locale-formatted date string, not ISO-8601. */
  created?: string;
  /** Only present when `banned` is true. `null`/absent means a permanent ban. Same date-string format as `created`. */
  expires?: string | null;
}

/** Whitelist + ban status for a player, as reported by `GET /v1/players/{uuid}/profile`'s `status` field. */
export interface PlayerProfileStatus {
  whitelisted: boolean;
  ban: PlayerProfileBan;
}

/**
 * Vault economy info for a player, as reported by `GET /v1/players/{uuid}/profile`'s `economy`
 * field. Single-currency (Vault), not ExcellentEconomy's multi-currency system - see
 * `EconomyModule.getCurrencyBalance` for that.
 */
export interface PlayerProfileEconomy {
  available: boolean;
  /** Only present when `available` is true. */
  balance?: number;
}

/** One leaderboard source's contribution to a player profile's `stats` array. */
export interface PlayerProfileStatTile {
  id: string;
  label: string;
  status: "ranked" | "not_ranked" | "unavailable";
  /** Only present when `status` is "ranked". */
  value?: number;
  /** Only present when `status` is "ranked" and the source reports a positive rank. */
  rank?: number;
}

/**
 * One-call player profile combining identity, whitelist/ban status, Vault balance, and this
 * player's entry in every registered leaderboard source. Returned by
 * `GET /v1/players/{uuid}/profile` and (as the `players` array) by `GET /v1/players/profiles`.
 */
export interface PlayerProfile {
  name: string | null;
  uuid: string;
  online: boolean;
  status: PlayerProfileStatus;
  economy: PlayerProfileEconomy;
  stats: PlayerProfileStatTile[];
}

/** Response shape of `GET /v1/players/profiles` (bulk player profiles). */
export interface PlayerProfilesResponse {
  count: number;
  players: PlayerProfile[];
}

export interface NetworkServerStatus {
  id: string;
  label: string;
  online: boolean;
  server: ServerInfo | null;
  players: OnlinePlayer[];
}

export interface NetworkPlayersServerEntry {
  id: string;
  label: string;
  online: boolean;
  players: OnlinePlayer[];
}

export interface NetworkPlayersResponse {
  total: number;
  servers: NetworkPlayersServerEntry[];
}

export interface NetworkFindPlayerResponse {
  found: boolean;
  server?: string;
  player?: OnlinePlayer;
}

export interface NetworkHealthServerEntry {
  id: string;
  label: string;
  online: boolean;
  tps?: unknown;
  health?: unknown;
}

export interface NetworkHealthResponse {
  servers: NetworkHealthServerEntry[];
}

/** Per-server "success" | "error" result, keyed by network server ID. */
export type NetworkBroadcastResponse = Record<string, "success" | "error">;

// ─── NoxAeApi-Velocity network hub (v0.4+) ───────────────────────────────
//
// These shapes belong to the newer NoxAeApi-Velocity proxy plugin, which
// replaces the polling `/v1/network/*` aggregator above with a push model:
// backend servers connect out to the proxy over WebSocket and report
// register/heartbeat events, and the hub answers REST calls from its own
// in-memory registry instead of fanning out live requests to each backend.
// Same route names, different response shapes — do not mix these with the
// NetworkServerStatus/NetworkPlayersResponse family above. There is no hub
// equivalent of `/v1/network/health`; per-node health is embedded in
// `NetworkHubNode.health` instead. See `NetworkHubModule`.

/** Last-known state of one backend node, as tracked by the network hub. */
export interface NetworkHubNode {
  id: string;
  label: string;
  online: boolean;
  tps: string;
  onlinePlayers: number;
  maxPlayers: number;
  /** Opaque payload the backend reported in its last heartbeat. Shape isn't fixed by the hub. */
  health: unknown;
  /** Unix epoch ms of the last heartbeat received, or 0 if never. */
  lastHeartbeatAt: number;
}

export interface NetworkHubStatusResponse {
  network: NetworkHubNode[];
}

/** A player as seen directly by the proxy (not reported by a backend). */
export interface NetworkHubPlayer {
  uuid: string;
  name: string;
  /** Backend server ID the player is currently connected to, if known. */
  server?: string;
}

export interface NetworkHubPlayersResponse {
  total: number;
  players: NetworkHubPlayer[];
}

export interface NetworkHubFindPlayerResponse {
  found: boolean;
  player?: NetworkHubPlayer;
}

/** Result of a proxy-wide broadcast: how many connected players received the message. */
export interface NetworkHubBroadcastResponse {
  delivered: number;
}
