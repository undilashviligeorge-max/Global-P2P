"use client";

import { FormEvent, useMemo, useState } from "react";

type CalculateResponse = {
  success: boolean;
  receive_amount: number;
  fee_eur: number;
  cross_rate_eur_to_target: number;
  usdc_per_eur: number;
  usdc_per_target: number;
  target_currency: string;
  message: string;
};

function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://127.0.0.1:8080";
}

export default function HomePage() {
  const [amount, setAmount] = useState("250");
  const [recipientCountry, setRecipientCountry] = useState<"GE" | "US">("GE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculateResponse | null>(null);

  const parsedAmount = useMemo(
    () => parseFloat(amount.replace(",", ".")),
    [amount],
  );

  const receiveDisplay = useMemo(() => {
    if (!result?.success) return "—";
    const cur = result.target_currency || (recipientCountry === "GE" ? "GEL" : "USD");
    return `${result.receive_amount.toFixed(2)} ${cur}`;
  }, [result, recipientCountry]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const url = `${apiBase()}/api/v1/calculate`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          recipient_country: recipientCountry,
        }),
      });

      const data = (await res.json()) as CalculateResponse;
      setResult(data);

      if (!res.ok || !data.success) {
        setError(data.message || `HTTP ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "უცნობი შეცდომა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto flex max-w-md flex-col gap-8 px-4 py-14 pb-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-12 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      <header className="relative space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
          Live rates · Tatum
        </p>
        <h1 className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          P2P რემიტანი
        </h1>
        <p className="text-sm text-slate-400">
          EUR → GEL / USD · საკომისიო <span className="text-emerald-400">1.00 EUR</span>
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="relative space-y-6 rounded-3xl border border-white/15 bg-white/[0.06] p-7 shadow-glass backdrop-blur-xl"
      >
        <div className="space-y-2">
          <label htmlFor="amount" className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            გასაგზავნი (EUR)
          </label>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
            required
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-lg font-semibold text-white outline-none ring-cyan-400/30 placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-4"
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="country" className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            მიმღები ქვეყანა
          </label>
          <select
            id="country"
            name="recipient_country"
            value={recipientCountry}
            onChange={(ev) => setRecipientCountry(ev.target.value as "GE" | "US")}
            className="w-full cursor-pointer rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base font-medium text-white outline-none ring-violet-400/25 focus:border-violet-400/40 focus:ring-4"
          >
            <option value="GE">საქართველო (GEL)</option>
            <option value="US">აშშ (USD)</option>
          </select>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            მისაღები თანხა
          </span>
          <div className="flex min-h-[3.25rem] items-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 backdrop-blur-md">
            <span className="text-xl font-bold text-emerald-300">{receiveDisplay}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || Number.isNaN(parsedAmount)}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "იტვირთება…" : "გამოთვლა"}
        </button>
      </form>

      {error ? (
        <p className="relative rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-center text-sm text-red-200 backdrop-blur-md">
          {error}
        </p>
      ) : null}

      {result?.success ? (
        <section className="relative space-y-3 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            დეტალები
          </p>
          <dl className="grid gap-2">
            <div className="flex justify-between gap-4">
              <dt>კურსი (EUR → {result.target_currency})</dt>
              <dd className="font-mono text-slate-100">
                {result.cross_rate_eur_to_target.toFixed(6)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>USDC / EUR</dt>
              <dd className="font-mono text-slate-100">{result.usdc_per_eur.toFixed(6)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>USDC / {result.target_currency}</dt>
              <dd className="font-mono text-slate-100">{result.usdc_per_target.toFixed(6)}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </main>
  );
}
