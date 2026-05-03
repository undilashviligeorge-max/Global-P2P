"use client";

import { FormEvent, useMemo, useState } from "react";

type QuoteResponse = {
  success: boolean;
  receive_amount: number;
  exchange_rate: number;
  fee: number;
  message: string;
};

function quoteUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:8080";
  return `${base}/api/v1/quote`;
}

export default function HomePage() {
  const [amount, setAmount] = useState<string>("100");
  const [fiat, setFiat] = useState<"GEL" | "USD">("GEL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResponse | null>(null);

  const parsedAmount = useMemo(() => parseFloat(amount.replace(",", ".")), [amount]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(quoteUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: "EUR",
          fiat,
          amount: parsedAmount,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as QuoteResponse;
      setResult(data);
      if (!data.success) {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "უცნობი შეცდომა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium text-slate-500">Web2.5 P2P რემიტანი</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          სწრაფი კურსის კალკულატორი
        </h1>
        <p className="text-sm text-slate-600">
          შეიყვანეთ თანხა ევროში და აირჩიეთ მიმღები ვალუტა. სერვისის საკომისიო ფიქსირებულია{" "}
          <span className="font-medium text-slate-800">1 EUR</span>.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="amount" className="block text-sm font-medium text-slate-800">
            გასაგზავნი თანხა (EUR)
          </label>
          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none ring-emerald-500/30 transition focus:border-emerald-500 focus:ring-4"
            placeholder="მაგ: 250"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="fiat" className="block text-sm font-medium text-slate-800">
            მიმღები ქვეყანა (GEL/USD)
          </label>
          <select
            id="fiat"
            name="fiat"
            value={fiat}
            onChange={(ev) => setFiat(ev.target.value as "GEL" | "USD")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none ring-emerald-500/30 transition focus:border-emerald-500 focus:ring-4"
          >
            <option value="GEL">საქართველო — GEL</option>
            <option value="USD">აშშ — USD</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || Number.isNaN(parsedAmount)}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "იტვირთება…" : "საუკეთესო კურსის პოვნა"}
        </button>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {result?.success ? (
        <section className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
            შედეგი
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">საკომისიო</dt>
              <dd className="font-medium text-slate-900">
                {result.fee.toFixed(2)} EUR
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">კურსი (EUR → {fiat})</dt>
              <dd className="font-medium text-slate-900">{result.exchange_rate}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-emerald-200 pt-3">
              <dt className="text-slate-700 font-medium">მისაღები თანხა</dt>
              <dd className="text-lg font-bold text-green-600">
                {result.receive_amount.toFixed(2)} {fiat}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-emerald-900/80">{result.message}</p>
        </section>
      ) : null}
    </main>
  );
}
