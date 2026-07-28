import type { HttpEngine } from "../http-engine.js";
import type { EconomyInfo, PlayerBalance, TopBalanceEntry } from "../types/models.js";

export class EconomyModule {
  constructor(private readonly http: HttpEngine) {}

  /** Get info about the connected economy provider (Impactor on Fabric, Vault on Bukkit/Spigot/Paper). */
  info(): Promise<EconomyInfo> {
    return this.http.request("GET", "economy");
  }

  /** Get a player's balance. */
  getBalance(uuid: string): Promise<PlayerBalance> {
    return this.http.request("GET", `economy/balance/${encodeURIComponent(uuid)}`);
  }

  /** Get the top balances leaderboard. */
  getTopBalance(limit?: number): Promise<TopBalanceEntry[]> {
    return this.http.request("GET", "economy/top", {
      query: { limit },
    });
  }

  /** Pay an amount to a player (adds to their balance). */
  pay(uuid: string, amount: number): Promise<void> {
    return this.http.request("POST", "economy/pay", { body: { uuid, amount } });
  }

  /** Debit an amount from a player (subtracts from their balance). */
  debit(uuid: string, amount: number): Promise<void> {
    return this.http.request("POST", "economy/debit", { body: { uuid, amount } });
  }
}
