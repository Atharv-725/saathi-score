import { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";

const API = "http://localhost:8000";
const TOTAL_ROUNDS = 25;

const BANK_COLORS = {
  urbanpay: "#e07b39",
  janata: "#2e6e4e",
  grameen: "#7c5cbf",
};

const card = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 16,
  padding: 22,
  boxShadow: "var(--shadow)",
};

export default function NetworkView() {
  const [banks, setBanks] = useState([]);
  const [history, setHistory] = useState([]);
  const [soloAcc, setSoloAcc] = useState(null);
  const [training, setTraining] = useState(false);
  const [done, setDone] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    fetch(`${API}/api/banks`)
      .then((r) => r.json())
      .then(setBanks)
      .catch(() => {});
  }, []);

  async function startTraining() {
    setTraining(true);
    setDone(false);
    setHistory([]);
    stopRef.current = false;

    await fetch(`${API}/api/training/reset`, { method: "POST" });

    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      if (stopRef.current) break;
      const res = await fetch(`${API}/api/training/round`, { method: "POST" });
      const m = await res.json();
      setHistory((h) => [...h, m]);
      setSoloAcc(m.solo_accuracy);
      await new Promise((r) => setTimeout(r, 450)); // demo pacing
    }
    setTraining(false);
    setDone(true);
  }

  useEffect(() => () => { stopRef.current = true; }, []);

  const latest = history[history.length - 1];
  const chartData = history.map((m) => ({
    round: m.round,
    accuracy: +(m.global_accuracy * 100).toFixed(1),
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 34, marginBottom: 8 }}>The lender network</h1>
          <p style={{ color: "var(--ink-soft)", maxWidth: 560 }}>
            Three lenders. Three very different communities. One shared scoring
            model — trained together without a single customer record changing hands.
          </p>
        </div>
        <button
          onClick={startTraining}
          disabled={training}
          style={{
            border: "none",
            background: training ? "var(--ink-soft)" : "var(--ink)",
            color: "var(--paper)",
            padding: "13px 26px",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {training
            ? `Training… round ${history.length}/${TOTAL_ROUNDS}`
            : done ? "Train again" : "Start federated training"}
        </button>
      </div>

      {/* Bank node cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 22 }}>
        {banks.map((b) => {
          const color = BANK_COLORS[b.id];
          const acc = latest?.per_bank_accuracy?.[b.id];
          return (
            <div key={b.id} style={{ ...card, position: "relative", overflow: "hidden" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: color + "22",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            marginBottom: 14, fontSize: 17, fontWeight: 700, color,
                            fontFamily: "'Fraunces', serif" }}>
                {b.name[0]}
              </div>
              <h3 style={{ fontSize: 19, marginBottom: 3 }}>{b.name}</h3>
              <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 14 }}>
                {b.segment} · {b.borrowers} borrowers
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: "var(--ink-soft)" }}>Network model accuracy</span>
                <strong>{acc != null ? (acc * 100).toFixed(1) + "%" : "—"}</strong>
              </div>
              {training && (
                <div style={{
                  position: "absolute", top: 18, right: 18, fontSize: 11.5,
                  fontWeight: 600, color, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span className="pulse-dot" style={{ background: color }} />
                  weights only ↑
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Chart + privacy panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18 }}>
        <div style={card}>
          <h3 style={{ fontSize: 17, marginBottom: 4 }}>Shared model accuracy</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 16 }}>
            Measured on every lender's held-out borrowers, combined.
          </p>
          {chartData.length === 0 ? (
            <div style={{ height: 240, display: "flex", alignItems: "center",
                          justifyContent: "center", color: "var(--ink-soft)", fontSize: 14 }}>
              Press “Start federated training” to watch the network learn.
            </div>
          ) : (
            <LineChart width={620} height={240} data={chartData}
                       margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" />
              <XAxis dataKey="round" tick={{ fontSize: 12, fill: "#57534b" }} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 12, fill: "#57534b" }} unit="%" />
              <Tooltip formatter={(v) => v + "%"} labelFormatter={(l) => "Round " + l} />
              <ReferenceLine y={90} stroke="var(--green)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="accuracy" stroke="var(--ink)"
                    strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          )}
        </div>

        <div style={{ ...card, background: "var(--green-soft)", border: "1px solid #cfe0d6" }}>
          <h3 style={{ fontSize: 17, marginBottom: 10, color: "var(--green)" }}>
            What never leaves each lender
          </h3>
          <ul style={{ listStyle: "none", display: "grid", gap: 10, fontSize: 14 }}>
            <li>✕ &nbsp;Customer names & identities</li>
            <li>✕ &nbsp;Transaction histories</li>
            <li>✕ &nbsp;Incomes, savings, loan records</li>
          </ul>
          <div style={{ height: 1, background: "#cfe0d6", margin: "14px 0" }} />
          <div style={{ fontSize: 14, color: "var(--green)", fontWeight: 600 }}>
            ✓ &nbsp;Only model weights travel — 8 numbers per round.
          </div>
        </div>
      </div>

      {/* Solo vs federated comparison */}
      {done && soloAcc && latest && (
        <div style={{ ...card, marginTop: 22 }}>
          <h3 style={{ fontSize: 17, marginBottom: 16 }}>
            Why join the network? Alone vs. together
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {banks.map((b) => {
              const solo = soloAcc[b.id];
              const fed = latest.per_bank_accuracy[b.id];
              const gain = fed - solo;
              return (
                <div key={b.id}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{b.name}</div>
                  <Bar label="Training alone" value={solo} color="#c9c1b2" />
                  <Bar label="In the network" value={fed} color={BANK_COLORS[b.id]} />
                  <div style={{ fontSize: 13, marginTop: 6,
                                color: gain >= 0 ? "var(--green)" : "var(--ink-soft)",
                                fontWeight: 600 }}>
                    {gain >= 0 ? "+" : ""}{(gain * 100).toFixed(1)} pts
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5,
                    color: "var(--ink-soft)", marginBottom: 3 }}>
        <span>{label}</span>
        <span>{(value * 100).toFixed(1)}%</span>
      </div>
      <div style={{ height: 8, background: "var(--paper-dark)", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${value * 100}%`, background: color,
                    borderRadius: 99, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}