import type { HttpEngine } from "../http-engine.js";
import type { GroupInfo, PermissionNode } from "../types/models.js";

/**
 * Wraps the `/v1/luckperms/*` routes. These only exist on the server when
 * the LuckPerms mod is loaded — calling any method here against a server
 * without it will fail (typically a 404). There's no separate "is this
 * available" flag from the SDK's side; check `client.plugins.list()` for
 * LuckPerms if you need to branch on it ahead of time.
 *
 * Unlike most other modules, these POST/DELETE bodies are sent as real
 * JSON (the server reads them with `ctx.bodyAsClass(...)`, not
 * `ctx.formParam(...)`) — do not add `form: true` to these calls.
 */
export class LuckPermsModule {
  constructor(private readonly http: HttpEngine) {}

  /** Get the groups a player belongs to. */
  getPlayerGroups(uuid: string): Promise<string[]> {
    return this.http.request("GET", `luckperms/player/${encodeURIComponent(uuid)}/groups`);
  }

  /** Get a player's effective permission nodes. */
  getPlayerPermissions(uuid: string): Promise<PermissionNode[]> {
    return this.http.request(
      "GET",
      `luckperms/player/${encodeURIComponent(uuid)}/permissions`,
    );
  }

  /** Add a permission node to a player. */
  addPlayerPermission(uuid: string, permission: string, value = true): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/permission`,
      { body: { permission, value } },
    );
  }

  /** Check whether a player has a given permission. */
  checkPlayerPermission(
    uuid: string,
    permission: string,
  ): Promise<{ permission: string; value: boolean }> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/check-permission`,
      { body: { permission } },
    );
  }

  /** Remove a permission node from a player. */
  removePlayerPermission(uuid: string, permission: string): Promise<void> {
    return this.http.request(
      "DELETE",
      `luckperms/player/${encodeURIComponent(uuid)}/permission`,
      { body: { permission } },
    );
  }

  /** Set a player's primary group. */
  setPlayerGroup(uuid: string, group: string): Promise<void> {
    return this.http.request(
      "POST",
      `luckperms/player/${encodeURIComponent(uuid)}/group`,
      { body: { group } },
    );
  }

  /** Remove a group from a player. */
  removePlayerGroup(uuid: string, groupName: string): Promise<void> {
    return this.http.request(
      "DELETE",
      `luckperms/player/${encodeURIComponent(uuid)}/group/${encodeURIComponent(groupName)}`,
    );
  }

  /** List all known groups. */
  getGroups(): Promise<string[]> {
    return this.http.request("GET", "luckperms/groups");
  }

  /** Get the permissions attached to a specific group. */
  getGroupPermissions(name: string): Promise<GroupInfo> {
    return this.http.request("GET", `luckperms/group/${encodeURIComponent(name)}/permissions`);
  }
}
