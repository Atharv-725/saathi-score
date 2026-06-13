import NetworkView from "./NetworkView";
import { useState } from "react";
import ApplyView from "./ApplyView";
const API = "http://localhost:8000";

const styles = {
  shell: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "0 28px 80px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "26px 0 22px",
    borderBottom: "1px solid var(--line)",
    marginBottom: 36,
  },
  brand: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
  },
  brandMark: {
    fontFamily: "'Fraunces', serif",
    fontSize: 26,
    fontWeight: 700,
    color: "var(--ink)",
  },
  brandTag: {
    fontSize: 13,
    color: "var(--ink-soft)",
  },
  nav: {
    display: "flex",
    gap: 6,
    background: "var(--paper-dark)",
    padding: 5,
    borderRadius: 12,
  },
  navBtn: (active) => ({
    border: "none",
    background: active ? "var(--card)" : "transparent",
    color: active ? "var(--ink)" : "var(--ink-soft)",
    padding: "9px 18px",
    borderRadius: 9,
    fontSize: 14,
    fontWeight: 600,
    boxShadow: active ? "var(--shadow)" : "none",
    transition: "all .18s ease",
  }),
};

export default function App() {
  const [view, setView] = useState("network");

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.brandMark}>Saathi</span>
          <span style={styles.brandTag}>credit that sees everyone</span>
        </div>
        <nav style={styles.nav}>
          <button
            style={styles.navBtn(view === "network")}
            onClick={() => setView("network")}
          >
            Lender Network
          </button>
          <button
            style={styles.navBtn(view === "apply")}
            onClick={() => setView("apply")}
          >
            Apply for Credit
          </button>
        </nav>
      </header>

      {view === "network" ? <NetworkView /> : <ApplyView />}
    </div>
  );
}
