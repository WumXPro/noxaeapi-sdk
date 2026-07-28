import type { HttpEngine } from "../http-engine.js";
import type { NoxAuthPlayerInfo, PasswordCheckResult } from "../types/models.js";

/**
 * Wraps the `/v1/noxauth/*` routes. These only work when `noxauth.enabled`
 * is set to true in the server's noxaeapi-config.yml and the NoxAuth plugin
 * is installed.
 */
export class NoxAuthModule {
  constructor(private readonly http: HttpEngine) {}

  /** Get NoxAuth registration/auth info for a player by name. */
  getPlayerAuth(name: string): Promise<NoxAuthPlayerInfo> {
    return this.http.request("GET", `noxauth/player/${encodeURIComponent(name)}`);
  }

  /** Check whether a password matches a player's stored NoxAuth password. */
  checkPassword(name: string, password: string): Promise<PasswordCheckResult> {
    return this.http.request(
      "POST",
      `noxauth/player/${encodeURIComponent(name)}/check-password`,
      { body: { password } },
    );
  }
}
