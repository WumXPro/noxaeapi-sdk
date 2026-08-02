import type { HttpEngine } from "../http-engine.js";
import type { SkillInfo } from "../types/models.js";

/**
 * Wraps the `/v1/skills/*` routes (mcMMO / AuraSkills).
 */
export class SkillsModule {
  constructor(private readonly http: HttpEngine) {}

  /**
   * Get mcMMO skill levels and power level for a player.
   * Only works for **online** players — mcMMO's public ExperienceAPI has
   * no offline lookup, so this throws `NoxAeApiNotFoundError` if the
   * player isn't currently connected, and `NoxAeApiServerError` (503)
   * if mcMMO isn't loaded on the target server.
   */
  getMcmmoSkills(uuid: string): Promise<SkillInfo> {
    return this.http.request("GET", `skills/mcmmo/player/${encodeURIComponent(uuid)}`);
  }

  /**
   * Get AuraSkills skill levels and power level for a player.
   * Works for offline players. Throws `NoxAeApiServerError` (503) if
   * AuraSkills isn't loaded on the target server.
   */
  getAuraSkills(uuid: string): Promise<SkillInfo> {
    return this.http.request("GET", `skills/auraskills/player/${encodeURIComponent(uuid)}`);
  }
}
