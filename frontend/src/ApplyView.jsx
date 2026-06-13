import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const card = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 16,
  padding: 26,
  boxShadow: "var(--shadow)",
};

const FIELDS = [
  { key: "name", label: "Your name", type: "text", placeholder: "e.g. Lakshmi" },
  { key: "daily_income_avg", label: "Average daily income (₹)", type: "number", placeholder: "700" },
  { key: "income_consistency", label: "How steady is your income?", type: "range", min: 0, max: 1, step: 0.05,
    hints: ["Changes a lot", "Very steady"] },
  { key: "upi_txn_per_week", label: "UPI payments per week", type: "number", placeholder: "25" },
  { key: "utility_payment_ratio", label: "Bills paid on time", type: "range", min: 0, max: 1, step: 0.05,
    hints: ["Rarely", "Always"] },
  { key: "savings_rate", label: "Part of income you save", type: "range", min: 0, max: 1, step: 0.05,
    hints: ["Nothing", "A lot"] },
  { key: "years_in_business", label: "Years in your work / business", type: "number", placeholder: "7" },
  { key: "cash_buffer_days", label: "Days you could manage with no income", type: "number", placeholder: "12" },
  { key: "informal_loan_count", label: "Current loans from moneylenders", type: "number", placeholder: "0" },
];

const DECISION_STYLES = {
  approve: { bg: "var(--green-soft)", fg: "var(--green)", border: "#cfe0d6" },
  review:  { bg: "var(--saffron-soft)", fg: "var(--saffron)", border: "#f0d9c4" },
  decline: { bg: "var(--red-soft)", fg: "var(--red)", border: "#ecd0ca" },
};

export default function ApplyView() {
  const [form, setForm] = useState({
    name: "", daily_income_avg: "", income_consistency: 0.5,
    upi_txn_per_week: "", utility_payment_ratio: 0.5, savings_rate: 0.3,
    years_in_business: "", cash_buffer_days: "", informal_loan_count: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const payload = { ...form };
      for (const k of Object.keys(payload)) {
        if (k !== "name") payload[k] = parseFloat(payload[k]) || 0;
      }
      if (!payload.name) payload.name = "Applicant";
      const res = await fetch(`${API}/api/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("bad response");
      setResult(await res.json());
    } catch {
      setError("Could not reach the scoring service. Is the backend running?");
    }
    setLoading(false);
  }

  if (result) {
    return <ScoreReveal result={result} onBack={() => setResult(null)} />;
  }

  return (
    <div>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>Apply for credit</h1>
      <p style={{ color: "var(--ink-soft)", maxWidth: 560, marginBottom: 30 }}>
        No CIBIL score needed. Your daily work, your bill payments, your savings
        habit — that is your credit history.
      </p>

      <div style={{ ...card, maxWidth: 640 }}>
        <div style={{ display: "grid", gap: 22 }}>
          {FIELDS.map((f) => (
            <Field key={f.key} field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 18, color: "var(--red)", fontSize: 14 }}>{error}</div>
        )}

<button
          onClick={() => setForm({
            name: "Lakshmi", daily_income_avg: "700", income_consistency: 0.8,
            upi_txn_per_week: "25", utility_payment_ratio: 0.9, savings_rate: 0.3,
            years_in_business: "7", cash_buffer_days: "12", informal_loan_count: "0",
          })}
          style={{
            marginTop: 26, width: "100%", border: "1px dashed var(--line)",
            background: "transparent", color: "var(--ink-soft)",
            padding: "11px 0", borderRadius: 12, fontSize: 14, fontWeight: 600,
          }}
        >
          Fill: Lakshmi (vegetable vendor)
        </button>
        
        <button
          onClick={submit}
          disabled={loading}
          style={{
            marginTop: 26, width: "100%", border: "none",
            background: "var(--ink)", color: "var(--paper)",
            padding: "15px 0", borderRadius: 12, fontSize: 15.5, fontWeight: 600,
          }}
        >
          {loading ? "Checking…" : "Get my Saathi Score"}
        </button>

        <button
          onClick={() => setForm({
            name: "Ravi", daily_income_avg: "550", income_consistency: 0.4,
            upi_txn_per_week: "12", utility_payment_ratio: 0.55, savings_rate: 0.1,
            years_in_business: "2", cash_buffer_days: "4", informal_loan_count: "2",
          })}
          style={{
            marginTop: 10, width: "100%", border: "1px dashed var(--line)",
            background: "transparent", color: "var(--ink-soft)",
            padding: "11px 0", borderRadius: 12, fontSize: 14, fontWeight: 600,
          }}
        >
        Fill: Ravi (new auto driver)
        </button>
      </div>
    </div>
  );
}

function Field({ field, value, onChange }) {
  if (field.type === "range") {
    return (
      <label style={{ display: "block" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{field.label}</div>
        <input
          type="range" min={field.min} max={field.max} step={field.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "var(--saffron)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between",
                      fontSize: 12, color: "var(--ink-soft)" }}>
          <span>{field.hints[0]}</span>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{Math.round(value * 100)}%</span>
          <span>{field.hints[1]}</span>
        </div>
      </label>
    );
  }
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{field.label}</div>
      <input
        type={field.type}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10,
          border: "1px solid var(--line)", background: "var(--paper)",
          fontSize: 15, fontFamily: "inherit", color: "var(--ink)", outline: "none",
        }}
      />
    </label>
  );
}

function ScoreReveal({ result, onBack }) {
  const d = DECISION_STYLES[result.decision];
  const pct = (result.score - 300) / 600; // 0..1 along the arc
  const topReasons = result.explanation.slice(0, 4);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ ...card, textAlign: "center", padding: "40px 32px" }}>
        {result.rounds_trained === 0 && (
          <div style={{
            background: "var(--saffron-soft)", border: "1px solid #f0d9c4",
            color: "var(--saffron)", borderRadius: 10, padding: "10px 16px",
            fontSize: 13.5, fontWeight: 600, marginBottom: 18,
          }}>
            ⚠ The lender network hasn't trained yet — this score is a guess.
            Run training on the Lender Network tab, then score again.
          </div>
        )}

        <ScoreArc score={result.score} pct={pct} color={d.fg} />

        <div style={{
          display: "inline-block", padding: "8px 22px", borderRadius: 99,
          background: d.bg, color: d.fg, border: `1px solid ${d.border}`,
          fontWeight: 700, fontSize: 15, marginTop: 4,
        }}>
          {result.decision_label}
        </div>

        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 14 }}>
          Scored by a model trained across {result.rounds_trained} federated rounds —
          your data never left this device.
        </div>
      </div>

      <div style={{ ...card, marginTop: 18 }}>
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Why this score?</h3>
        <div style={{ display: "grid", gap: 14 }}>
          {topReasons.map((e) => (
            <div key={e.feature} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: e.direction === "positive" ? "var(--green-soft)" : "var(--red-soft)",
                color: e.direction === "positive" ? "var(--green)" : "var(--red)",
                fontWeight: 700, fontSize: 15,
              }}>
                {e.direction === "positive" ? "↑" : "↓"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                  {e.feature === "informal_loan_count" && e.value === 0
                    ? "No moneylender debts"
                    : e.label}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                  {e.direction === "positive" ? "Helping your score" : "Holding your score back"}
                </div>
              </div>
              <ContribBar contribution={e.contribution} />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onBack}
        style={{
          marginTop: 18, border: "1px solid var(--line)", background: "var(--card)",
          color: "var(--ink)", padding: "12px 24px", borderRadius: 10,
          fontSize: 14, fontWeight: 600,
        }}
      >
        ← Check another application
      </button>
    </div>
  );
}

function ScoreArc({ score, pct, color }) {
  const r = 80;
  const circ = Math.PI * r; // half circle
  const filled = circ * Math.min(Math.max(pct, 0), 1);
  return (
    <div style={{ position: "relative", width: 220, margin: "10px auto 6px" }}>
      <svg width="220" height="125" viewBox="0 0 220 125">
        <path d="M 30 115 A 80 80 0 0 1 190 115" fill="none"
              stroke="var(--paper-dark)" strokeWidth="14" strokeLinecap="round" />
        <path d="M 30 115 A 80 80 0 0 1 190 115" fill="none"
              stroke={color} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${filled} ${circ}`}
              style={{ transition: "stroke-dasharray 1.2s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, top: 38, textAlign: "center",
        fontFamily: "'Fraunces', serif", fontSize: 52, fontWeight: 700,
      }}>
        {score}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 12, color: "var(--ink-soft)", padding: "0 14px" }}>
        <span>300</span><span>900</span>
      </div>
    </div>
  );
}

function ContribBar({ contribution }) {
  const mag = Math.min(Math.abs(contribution) / 2, 1);
  const pos = contribution >= 0;
  return (
    <div style={{ width: 110, height: 8, background: "var(--paper-dark)",
                  borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
      <div style={{
        height: "100%", width: `${mag * 100}%`,
        background: pos ? "var(--green)" : "var(--red)",
        borderRadius: 99, transition: "width .6s ease",
      }} />
    </div>
  );
}