"""
Saathi Score - Federated training engine (pure NumPy, FedAvg).
Each bank trains locally; only model weights are shared and averaged.
"""

import numpy as np
from data_generator import generate_all_banks, normalize, FEATURE_NAMES


def sigmoid(z):
    return 1 / (1 + np.exp(-np.clip(z, -30, 30)))


class LogisticModel:
    def __init__(self, n_features: int, seed: int = 0):
        rng = np.random.default_rng(seed)
        self.w = rng.normal(0, 1.2, n_features)
        self.b = 0.0

    def predict_proba(self, X):
        return sigmoid(X @ self.w + self.b)

    def accuracy(self, X, y):
        return float(((self.predict_proba(X) >= 0.5) == y).mean())

    def get_params(self):
        return self.w.copy(), self.b

    def set_params(self, w, b):
        self.w, self.b = w.copy(), float(b)

def local_train(model: LogisticModel, X, y, epochs=1, lr=0.12, batch_size=64, seed=0):
    """Train a copy of the model locally; return updated params."""
    rng = np.random.default_rng(seed)
    w, b = model.get_params()
    n = len(y)
    for _ in range(epochs):
        idx = rng.permutation(n)
        for start in range(0, n, batch_size):
            batch = idx[start:start + batch_size]
            Xb, yb = X[batch], y[batch]
            p = sigmoid(Xb @ w + b)
            err = p - yb
            w -= lr * (Xb.T @ err / len(batch) + 0.001 * w)  # small L2
            b -= lr * err.mean()
    return w, b


class FederatedTrainer:
    """Runs FedAvg across bank nodes, recording per-round history."""

    def __init__(self, seed: int = 42):
        self.banks = generate_all_banks(seed)
        self.n_features = len(FEATURE_NAMES)
        # Pre-normalize and split train/test per bank (80/20)
        rng = np.random.default_rng(seed)
        for b in self.banks.values():
            Xn = normalize(b["X"])
            idx = rng.permutation(len(b["y"]))
            cut = int(0.8 * len(idx))
            b["X_train"], b["y_train"] = Xn[idx[:cut]], b["y"][idx[:cut]]
            b["X_test"],  b["y_test"]  = Xn[idx[cut:]], b["y"][idx[cut:]]

        self.global_model = LogisticModel(self.n_features, seed=1)
        self.round = 0
        self.history = []
        # Baseline: each bank trains ALONE (the comparison stat)
        self.solo_acc = self._solo_baselines()

    # ---------- baselines ----------
    def _solo_baselines(self):
        solo = {}
        for bank_id, b in self.banks.items():
            m = LogisticModel(self.n_features, seed=2)
            for _ in range(15):  # same total work as ~15 fed rounds
                w, bias = local_train(m, b["X_train"], b["y_train"], seed=3)
                m.set_params(w, bias)
            solo[bank_id] = m.accuracy(b["X_test"], b["y_test"])
        return solo

    # ---------- federated ----------
    def _global_test_accuracy(self):
        X = np.vstack([b["X_test"] for b in self.banks.values()])
        y = np.concatenate([b["y_test"] for b in self.banks.values()])
        return self.global_model.accuracy(X, y)

    def run_round(self):
        """One FedAvg round. Returns a metrics dict for the dashboard."""
        self.round += 1
        new_ws, new_bs, sizes = [], [], []
        for bank_id, b in self.banks.items():
            w, bias = local_train(self.global_model, b["X_train"], b["y_train"],
                                  seed=self.round * 10)
            new_ws.append(w)
            new_bs.append(bias)
            sizes.append(len(b["y_train"]))

        # Weighted average (FedAvg)
        sizes = np.array(sizes, dtype=float)
        weights = sizes / sizes.sum()
        avg_w = np.average(np.stack(new_ws), axis=0, weights=weights)
        avg_b = float(np.average(new_bs, weights=weights))
        self.global_model.set_params(avg_w, avg_b)

        metrics = {
            "round": self.round,
            "global_accuracy": self._global_test_accuracy(),
            "per_bank_accuracy": {
                bank_id: self.global_model.accuracy(b["X_test"], b["y_test"])
                for bank_id, b in self.banks.items()
            },
            "solo_accuracy": self.solo_acc,
            "weights": self.global_model.w.tolist(),
            "bias": self.global_model.b,
        }
        self.history.append(metrics)
        return metrics

    def reset(self):
        self.global_model = LogisticModel(self.n_features, seed=1)
        self.round = 0
        self.history = []


if __name__ == "__main__":
    trainer = FederatedTrainer()

    print("Solo baselines (each bank training alone):")
    for bank_id, acc in trainer.solo_acc.items():
        print(f"  {trainer.banks[bank_id]['name']:<22} {acc:.1%}")

    print("\nFederated training:")
    print(f"{'Round':>5} {'Global acc':>11}", *[f"{bid:>10}" for bid in trainer.banks])
    for _ in range(15):
        m = trainer.run_round()
        per_bank = [f"{m['per_bank_accuracy'][bid]:>9.1%}" for bid in trainer.banks]
        print(f"{m['round']:>5} {m['global_accuracy']:>10.1%}", *per_bank)

    print("\nFederated vs solo (final):")
    final = trainer.history[-1]["per_bank_accuracy"]
    for bank_id in trainer.banks:
        gain = final[bank_id] - trainer.solo_acc[bank_id]
        print(f"  {trainer.banks[bank_id]['name']:<22} solo {trainer.solo_acc[bank_id]:.1%} "
        f"-> fed {final[bank_id]:.1%}  ({gain:+.1%})")