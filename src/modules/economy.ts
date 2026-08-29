import type { HttpEngine } from "../http-engine.js";
import type {
  CurrencyBalance,
  CurrencyTopEntry,
  EconomyInfo,
  PlayerBalance,
  TopBalanceEntry,
} from "../types/models.js";

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
    return this.http.request("POST", "economy/pay", { body: { uuid, amount }, form: true });
  }

  /** Debit an amount from a player (subtracts from their balance). */
  debit(uuid: string, amount: number): Promise<void> {
    return this.http.request("POST", "economy/debit", { body: { uuid, amount }, form: true });
  }

  // ─── ExcellentEconomy multi-currency (native API, not Vault) ────────────
  //
  // These endpoints talk directly to ExcellentEconomy's Developer API rather
  // than Vault, so they work with any currency configured on the server
  // (coins, gems, tokens, ...) instead of only the single Vault-linked
  // "primary" currency exposed above. They throw `NoxAeApiError` with a 424
  // status if ExcellentEconomy isn't installed on the target server, and a
  // 404 if the given currency ID doesn't exist.

  /** List all currency IDs configured on ExcellentEconomy. */
  listCurrencies(): Promise<string[]> {
    return this.http.request("GET", "economy/currencies");
  }

  /** Get a player's balance for a specific ExcellentEconomy currency. */
  getCurrencyBalance(currency: string, uuid: string): Promise<CurrencyBalance> {
    return this.http.request(
      "GET",
      `economy/currency/${encodeURIComponent(currency)}/balance/${encodeURIComponent(uuid)}`,
    );
  }

  /**
   * Pay a player in a specific currency (adds `amount` to their balance).
   * `amount` must be greater than zero.
   */
  payCurrency(currency: string, uuid: string, amount: number): Promise<"success" | "failure"> {
    return this.http.request("POST", `economy/currency/${encodeURIComponent(currency)}/pay`, {
      body: { uuid, amount },
      form: true,
    });
  }

  /**
   * Debit a player in a specific currency (subtracts `amount` from their
   * balance). `amount` must be greater than zero.
   */
  debitCurrency(currency: string, uuid: string, amount: number): Promise<"success" | "failure"> {
    return this.http.request("POST", `economy/currency/${encodeURIComponent(currency)}/debit`, {
      body: { uuid, amount },
      form: true,
    });
  }

  /**
   * Set a player's balance for a specific currency to an exact amount
   * (`amount` must be >= 0), rather than adding/subtracting.
   */
  setCurrencyBalance(
    currency: string,
    uuid: string,
    amount: number,
  ): Promise<"success" | "failure"> {
    return this.http.request("POST", `economy/currency/${encodeURIComponent(currency)}/set`, {
      body: { uuid, amount },
      form: true,
    });
  }

  /** Get the top balances leaderboard for a specific currency. */
  getCurrencyTop(currency: string, limit?: number): Promise<CurrencyTopEntry[]> {
    return this.http.request("GET", `economy/currency/${encodeURIComponent(currency)}/top`, {
      query: { limit },
    });
  }
}
