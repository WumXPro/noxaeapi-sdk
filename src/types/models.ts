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
