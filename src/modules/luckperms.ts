import type { HttpEngine } from "../http-engine.js";
import type {
  GroupInfo,
  LuckPermsCheckPermissionResult,
  LuckPermsContextOptions,
  LuckPermsCreateGroupResult,
  LuckPermsPrimaryGroupResult,
  LuckPermsTrackActionResult,
  MetaInfo,
  PermissionNode,
  TrackInfo,
} from "../types/models.js";

/** Extra fields accepted by the node-adding endpoints, on top of the context options. */
export interface AddPermissionOptions extends LuckPermsContextOptions {
  /**
   * Node value. Defaults to `true` server-side when omitted — pass `false`
   * to add a negating node rather than a positive grant.
   */
  value?: boolean;
  /**
   * When the node should expire. Parsed server-side by
   * `ValidationUtils.parseExpiry` — pass an ISO-8601 instant string (e.g.
   * `"2026-12-31T00:00:00Z"`) or an epoch-seconds string. Omit for a node
   * that never expires.
   */
  expiry?: string;
}

export type SetGroupOptions = LuckPermsContextOptions & Pick<AddPermissionOptions, "expiry">;

export interface SetMetaValueOptions extends LuckPermsContextOptions {
  /**
   * Sort priority — higher wins when multiple prefix/suffix nodes are
   * active at once. Defaults to `100` server-side when omitted, matching
   * LuckPerms' own `/lp meta setprefix|setsuffix` default.
   */
  priority?: number;
}

/**
 * Wraps the `/v1/luckperms/*` routes. These only exist on the server when
 * the LuckPerms plugin is loaded — calling any method here against a
 * server without it throws `NoxAeApiServerError` with a 503 status.
 * There's no separate "is this available" flag from the SDK's side;
 * check `client.plugins.list()` for LuckPerms if you need to branch on
 * it ahead of time.
 *
 * Unlike most other modules, every request body here is sent as real
 * JSON (the server reads it with `ctx.bodyAsClass(...)`, not
 * `ctx.formParam(...)`) — do not add `form: true` to these calls.
 *
 * "Context" throughout this module means LuckPerms' `server`/`world`
 * context keys, not the Bukkit/network server this SDK talks to — pass
 * them when a node should only apply on a specific sub-server or world,
 * and omit them for a global node.
 */
export class LuckPermsModule {
  constructor(private readonly http: HttpEngine) {}

  // ---------------------------------------------------------------
  // Player permissions & groups
  // ---------------------------------------------------------------

  /** Get the names of every group a player belongs to (via inheritance nodes). */
  getPlayerGroups(uuid: string): Promise<string[]> {
    return this.http.request("GET", `luckperms/player/${encodeURIComponent(uuid)}/groups`);
  }

  /** Get every node (permissions, inheritance, prefix/suffix, meta, ...) held directly by a player. */
  getPlayerPermissions(uuid: string): Promise<PermissionNode[]> {
    return this.http.request(
      "GET",
      `luckperms/player/${encodeURIComponent(uuid)}/permissions`,
    );
  }

  /** Add a permission node to a player. Defaults to a permanent, global, `true`-valued node. */
  addPlayerPermission(
    uuid: string,
    permission: string,
    options: AddPermissionOptions = {},
  ): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/permission`,
      { body: { permission, ...options } },
    );
  }

  /**
   * Remove a permission node from a player by key. Note this matches on
   * the permission string only — it does not target a specific
   * value/expiry/context combination.
   */
  removePlayerPermission(uuid: string, permission: string): Promise<void> {
    return this.http.request(
      "DELETE",
      `luckperms/player/${encodeURIComponent(uuid)}/permission`,
      { body: { permission } },
    );
  }

  /**
   * Check whether a player has a given permission, using LuckPerms'
   * native resolution (inheritance, wildcards, contexts all apply).
   */
  checkPlayerPermission(
    uuid: string,
    permission: string,
  ): Promise<LuckPermsCheckPermissionResult> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/check-permission`,
      { body: { permission } },
    );
  }

  /** Get a player's primary group name. */
  getPlayerPrimaryGroup(uuid: string): Promise<LuckPermsPrimaryGroupResult> {
    return this.http.request(
      "GET",
      `luckperms/player/${encodeURIComponent(uuid)}/primary-group`,
    );
  }

  /**
   * Set a player's primary group. This both adds the corresponding
   * inheritance node (so permissions actually resolve from the group) and
   * updates the primary-group label — mirrors `/lp user <target> parent
   * add <group>` plus `/lp user <target> setprimarygroup <group>`.
   */
  setPlayerGroup(uuid: string, group: string, options: SetGroupOptions = {}): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/group`,
      { body: { group, ...options } },
    );
  }

  /**
   * Remove a group's inheritance node from a player. Does **not** change
   * their primary group — call `setPlayerGroup()` with the new group
   * afterward if you're reassigning rank rather than just removing one
   * of several parents.
   */
  removePlayerGroup(uuid: string, groupName: string): Promise<void> {
    return this.http.request(
      "DELETE",
      `luckperms/player/${encodeURIComponent(uuid)}/group/${encodeURIComponent(groupName)}`,
    );
  }

  /**
   * Promote a player one step up a track. If the result isn't successful
   * (e.g. `END_OF_TRACK`, `AMBIGUOUS_CALL`), the player's data is left
   * untouched — check `.success`/`.status` on the result rather than
   * assuming the call always moves them.
   */
  promotePlayer(
    uuid: string,
    track: string,
    options: LuckPermsContextOptions = {},
  ): Promise<LuckPermsTrackActionResult> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/promote`,
      { body: { track, ...options } },
    );
  }

  /** Demote a player one step down a track. See `promotePlayer()` for the result semantics. */
  demotePlayer(
    uuid: string,
    track: string,
    options: LuckPermsContextOptions = {},
  ): Promise<LuckPermsTrackActionResult> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/demote`,
      { body: { track, ...options } },
    );
  }

  // ---------------------------------------------------------------
  // Player meta (prefix / suffix / custom meta)
  // ---------------------------------------------------------------

  /** Get a player's resolved prefix, suffix, and custom meta key-values. */
  getPlayerMeta(uuid: string): Promise<MetaInfo> {
    return this.http.request("GET", `luckperms/player/${encodeURIComponent(uuid)}/meta`);
  }

  /**
   * Set a player's prefix. Behaves like a "set", not an "add" — any
   * existing prefix node (in any context) is cleared first, so a player
   * only ever has one active prefix from this call.
   */
  setPlayerPrefix(
    uuid: string,
    prefix: string,
    options: SetMetaValueOptions = {},
  ): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/meta/prefix`,
      { body: { prefix, ...options } },
    );
  }

  /** Set a player's suffix. Same "set, not add" semantics as `setPlayerPrefix()`. */
  setPlayerSuffix(
    uuid: string,
    suffix: string,
    options: SetMetaValueOptions = {},
  ): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/meta/suffix`,
      { body: { suffix, ...options } },
    );
  }

  /** Set a custom meta key-value pair on a player, replacing any existing value(s) for that key. */
  setPlayerMeta(
    uuid: string,
    key: string,
    value: string,
    options: LuckPermsContextOptions = {},
  ): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/meta`,
      { body: { key, value, ...options } },
    );
  }

  /** Remove a custom meta key from a player (all values/contexts for that key). */
  removePlayerMeta(uuid: string, key: string): Promise<void> {
    return this.http.request(
      "DELETE",
      `luckperms/player/${encodeURIComponent(uuid)}/meta/${encodeURIComponent(key)}`,
    );
  }

  // ---------------------------------------------------------------
  // Groups
  // ---------------------------------------------------------------

  /** List the names of every group registered in LuckPerms. */
  getGroups(): Promise<string[]> {
    return this.http.request("GET", "luckperms/groups");
  }

  /**
   * Create a new LuckPerms group. The name is lowercased server-side.
   * Throws `NoxAeApiError` with a 409 status if the group already exists.
   */
  createGroup(name: string): Promise<LuckPermsCreateGroupResult> {
    return this.http.request("POST", "luckperms/groups", { body: { name } });
  }

  /**
   * Delete a LuckPerms group by name.
   * The `default` group can't be deleted (400 — every user without an
   * explicit group inherits from it) and a 404 is thrown if it doesn't exist.
   */
  deleteGroup(name: string): Promise<void> {
    return this.http.request("DELETE", `luckperms/group/${encodeURIComponent(name)}`);
  }

  /** Get every node held directly by a group. */
  getGroupPermissions(name: string): Promise<PermissionNode[]> {
    return this.http.request("GET", `luckperms/group/${encodeURIComponent(name)}/permissions`);
  }

  /** Add a permission node to a group. Same options/defaults as `addPlayerPermission()`. */
  addGroupPermission(
    name: string,
    permission: string,
    options: AddPermissionOptions = {},
  ): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/group/${encodeURIComponent(name)}/permission`,
      { body: { permission, ...options } },
    );
  }

  /** Remove a permission node from a group by key (matches on permission string only). */
  removeGroupPermission(name: string, permission: string): Promise<void> {
    return this.http.request(
      "DELETE",
      `luckperms/group/${encodeURIComponent(name)}/permission`,
      { body: { permission } },
    );
  }

  /** Get full info for a group: name, display name, weight, and all its nodes. */
  getGroupInfo(name: string): Promise<GroupInfo> {
    return this.http.request("GET", `luckperms/group/${encodeURIComponent(name)}`);
  }

  /**
   * Update a group's weight and/or display name. Provide at least one of
   * the two fields — the server 400s otherwise. Passing an empty/blank
   * `displayName` resets it to the default rather than setting a blank one.
   * Returns the group's full updated info.
   */
  updateGroup(
    name: string,
    updates: { weight?: number; displayName?: string | null },
  ): Promise<GroupInfo> {
    return this.http.request("PUT", `luckperms/group/${encodeURIComponent(name)}`, {
      body: updates,
    });
  }

  // ---------------------------------------------------------------
  // Group meta (prefix / suffix / custom meta)
  // ---------------------------------------------------------------

  /** Get a group's resolved prefix, suffix, and custom meta key-values. */
  getGroupMeta(name: string): Promise<MetaInfo> {
    return this.http.request("GET", `luckperms/group/${encodeURIComponent(name)}/meta`);
  }

  /** Set a group's prefix. Same "set, not add" semantics as `setPlayerPrefix()`. */
  setGroupPrefix(
    name: string,
    prefix: string,
    options: SetMetaValueOptions = {},
  ): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/group/${encodeURIComponent(name)}/meta/prefix`,
      { body: { prefix, ...options } },
    );
  }

  /** Set a group's suffix. Same "set, not add" semantics as `setPlayerPrefix()`. */
  setGroupSuffix(
    name: string,
    suffix: string,
    options: SetMetaValueOptions = {},
  ): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/group/${encodeURIComponent(name)}/meta/suffix`,
      { body: { suffix, ...options } },
    );
  }

  /** Set a custom meta key-value pair on a group, replacing any existing value(s) for that key. */
  setGroupMeta(
    name: string,
    key: string,
    value: string,
    options: LuckPermsContextOptions = {},
  ): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/group/${encodeURIComponent(name)}/meta`,
      { body: { key, value, ...options } },
    );
  }

  /** Remove a custom meta key from a group (all values/contexts for that key). */
  removeGroupMeta(name: string, key: string): Promise<void> {
    return this.http.request(
      "DELETE",
      `luckperms/group/${encodeURIComponent(name)}/meta/${encodeURIComponent(key)}`,
    );
  }

  // ---------------------------------------------------------------
  // Tracks (rank ladders — promote/demote)
  // ---------------------------------------------------------------

  /** List the names of every track registered in LuckPerms. */
  getTracks(): Promise<string[]> {
    return this.http.request("GET", "luckperms/tracks");
  }

  /** Get a track's name and its ordered list of groups (lowest to highest rank). */
  getTrack(name: string): Promise<TrackInfo> {
    return this.http.request("GET", `luckperms/track/${encodeURIComponent(name)}`);
  }
}
