import { useState } from "react";
import {
  findProjection,
  projectionsGeneratedAt,
  defaultSigma,
} from "./projections";
import type { StatType } from "./projections";

type Leg = {
  id: number;
  player: string;
  stat: StatType;
  line: string; // book line, e.g. 26.5
  proj: string; // projection μ
  pick: "over" | "under";
};

type LegResult = {
  player: string;
  stat: StatType;
  line: number;
  proj: number;
  pick: "over" | "under";
  pHit: number;
  sigma?: number;
};

type SlipType = "power" | "flex";

// Same player list you used in the Python script
const PLAYER_OPTIONS: string[] = [
  "Trae Young",
  "Dejounte Murray",
  "Jayson Tatum",
  "Jaylen Brown",
  "Jrue Holiday",
  "Kristaps Porzingis",
  "Mikal Bridges",
  "Cam Thomas",
  "LaMelo Ball",
  "Miles Bridges",
  "DeMar DeRozan",
  "Zach LaVine",
  "Nikola Vucevic",
  "Donovan Mitchell",
  "Darius Garland",
  "Evan Mobley",
  "Luka Doncic",
  "Kyrie Irving",
  "Nikola Jokic",
  "Jamal Murray",
  "Michael Porter Jr.",
  "Cade Cunningham",
  "Jaden Ivey",
  "Stephen Curry",
  "Klay Thompson",
  "Draymond Green",
  "Andrew Wiggins",
  "Jalen Green",
  "Alperen Sengun",
  "Fred VanVleet",
  "Tyrese Haliburton",
  "Myles Turner",
  "Bennedict Mathurin",
  "Kawhi Leonard",
  "Paul George",
  "James Harden",
  "Russell Westbrook",
  "LeBron James",
  "Anthony Davis",
  "D'Angelo Russell",
  "Austin Reaves",
  "Ja Morant",
  "Jaren Jackson Jr.",
  "Desmond Bane",
  "Jimmy Butler",
  "Bam Adebayo",
  "Tyler Herro",
  "Giannis Antetokounmpo",
  "Damian Lillard",
  "Khris Middleton",
  "Brook Lopez",
  "Anthony Edwards",
  "Karl-Anthony Towns",
  "Rudy Gobert",
  "Zion Williamson",
  "Brandon Ingram",
  "CJ McCollum",
  "Jalen Brunson",
  "Julius Randle",
  "RJ Barrett",
  "Shai Gilgeous-Alexander",
  "Chet Holmgren",
  "Jalen Williams",
  "Scottie Barnes",
  "Pascal Siakam",
  "OG Anunoby",
  "Paolo Banchero",
  "Franz Wagner",
  "Jalen Suggs",
  "Joel Embiid",
  "Tyrese Maxey",
  "Kevin Durant",
  "Devin Booker",
  "Bradley Beal",
  "Anfernee Simons",
  "Scoot Henderson",
  "Jerami Grant",
  "De'Aaron Fox",
  "Domantas Sabonis",
  "Keegan Murray",
  "Victor Wembanyama",
  "Devin Vassell",
  "Keldon Johnson",
  "Lauri Markkanen",
  "Jordan Clarkson",
  "Collin Sexton",
  "Kyle Kuzma",
  "Jordan Poole",
];

// Simple Normal CDF approximation
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-0.5 * z * z);
  let prob =
    1 -
    d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z < 0) prob = 1 - prob;
  return prob;
}

// PrizePicks power play multipliers (all must hit)
function getPowerMultiplier(n: number): number | null {
  switch (n) {
    case 2:
      return 3;
    case 3:
      return 6;
    case 4:
      return 10;
    case 5:
      return 20;
    case 6:
      return 37.5;
    default:
      return null;
  }
}

// Flex payouts: list of (hits, multiplier)
type FlexPayout = { hits: number; multiplier: number };

function getFlexPayouts(n: number): FlexPayout[] | null {
  switch (n) {
    case 3:
      // 3/3 = 3x, 2/3 = 1x
      return [
        { hits: 3, multiplier: 3 },
        { hits: 2, multiplier: 1 },
      ];
    case 4:
      // 4/4 = 6x, 3/4 = 1.5x
      return [
        { hits: 4, multiplier: 6 },
        { hits: 3, multiplier: 1.5 },
      ];
    case 5:
      // 5/5 = 10x, 4/5 = 2x, 3/5 = 0.4x
      return [
        { hits: 5, multiplier: 10 },
        { hits: 4, multiplier: 2 },
        { hits: 3, multiplier: 0.4 },
      ];
    case 6:
      // 6/6 = 25x, 5/6 = 2x, 4/6 = 0.4x
      return [
        { hits: 6, multiplier: 25 },
        { hits: 5, multiplier: 2 },
        { hits: 4, multiplier: 0.4 },
      ];
    default:
      return null;
  }
}

// Given per-leg hit probs p_i, compute distribution of #hits (0..n)
function hitsDistribution(pHits: number[]): number[] {
  const n = pHits.length;
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;

  for (const p of pHits) {
    const next = new Array(n + 1).fill(0);
    for (let k = 0; k <= n; k++) {
      // miss this leg
      next[k] += dp[k] * (1 - p);
      // hit this leg
      if (k + 1 <= n) {
        next[k + 1] += dp[k] * p;
      }
    }
    for (let k = 0; k <= n; k++) dp[k] = next[k];
  }

  return dp; // dp[k] = P(exactly k hits)
}

// Expected payout factor for a flex slip if all legs have the same hit prob p
function flexExpectedFactorForEqualLegs(
  n: number,
  payouts: FlexPayout[],
  p: number
): number {
  const pHits = Array(n).fill(p);
  const dist = hitsDistribution(pHits); // dist[k] = P(exactly k hits)
  let expectedFactor = 0;
  for (const { hits, multiplier } of payouts) {
    const prob = dist[hits] ?? 0;
    expectedFactor += multiplier * prob;
  }
  return expectedFactor;
}

// Solve for p such that a flex slip has zero EV if all legs had prob p
function computeFlexBreakEvenProb(n: number, payouts: FlexPayout[]): number {
  let low = 0.01;
  let high = 0.99;

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const factor = flexExpectedFactorForEqualLegs(n, payouts, mid);
    if (factor > 1) {
      // Too +EV at this p → p is too high, move down
      high = mid;
    } else {
      // -EV or fair → need higher p to break even
      low = mid;
    }
  }

  return (low + high) / 2;
}

function App() {
  const [legs, setLegs] = useState<Leg[]>([
    { id: 1, player: "", stat: "PTS", line: "", proj: "", pick: "over" },
  ]);

  const [slipType, setSlipType] = useState<SlipType>("power");
  const [stake, setStake] = useState<string>("10"); // dollars

  const [legResults, setLegResults] = useState<LegResult[] | null>(null);
  const [slipHitProb, setSlipHitProb] = useState<number | null>(null);
  const [evDollars, setEvDollars] = useState<number | null>(null);
  const [evPct, setEvPct] = useState<number | null>(null);
  const [effectiveMultiplier, setEffectiveMultiplier] = useState<number | null>(
    null
  );
  const [payoutInfo, setPayoutInfo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [breakEvenHitProb, setBreakEvenHitProb] = useState<number | null>(null);

  const addLeg = () => {
    setLegs((prev) => [
      ...prev,
      { id: Date.now(), player: "", stat: "PTS", line: "", proj: "", pick: "over" },
    ]);
  };

  const updateLeg = (id: number, field: keyof Leg, value: string) => {
    setLegs((prev) =>
      prev.map((leg) =>
        leg.id === id ? { ...leg, [field]: value as any } : leg
      )
    );
  };

  const removeLeg = (id: number) => {
    setLegs((prev) => prev.filter((leg) => leg.id !== id));
  };

  const autofillProjection = (id: number) => {
    setLegs((prev) =>
      prev.map((leg) => {
        if (leg.id !== id) return leg;
        const projData = findProjection(leg.player, leg.stat);
        if (!projData) {
          alert(
            `No projection found for "${leg.player}" [${leg.stat}]. Check spelling or your projections.`
          );
          return leg;
        }
        return { ...leg, proj: projData.mu.toString() };
      })
    );
  };

  const analyzeSlip = () => {
    setErrorMsg(null);
    setBreakEvenHitProb(null);
    const n = legs.length;

    if (n < 2) {
      setErrorMsg("Need at least 2 legs.");
      return;
    }
    if (slipType === "flex" && n < 3) {
      setErrorMsg("Flex plays require 3–6 legs.");
      return;
    }
    if (n > 6) {
      setErrorMsg("Support is limited to 2–6 legs for now.");
      return;
    }

    const results: LegResult[] = [];
    const pHits: number[] = [];
    let slipProbAll = 1;

    for (const leg of legs) {
      const line = Number(leg.line);
      const projVal = Number(leg.proj);
      if (Number.isNaN(line) || Number.isNaN(projVal)) continue;

      const projInfo = findProjection(leg.player, leg.stat);
      let sigma = defaultSigma;
      if (projInfo && projInfo.sigma && projInfo.sigma > 0) {
        sigma = projInfo.sigma;
      }

      const z = (line - projVal) / sigma;
      const pOver = 1 - normalCdf(z);
      const pHit = leg.pick === "over" ? pOver : 1 - pOver;

      results.push({
        player: leg.player || "Unknown player",
        stat: leg.stat,
        line,
        proj: projVal,
        pick: leg.pick,
        pHit,
        sigma,
      });

      pHits.push(pHit);
      slipProbAll *= pHit;
    }

    if (results.length !== n) {
      setErrorMsg("Please fill player, stat, line, and projection for each leg.");
      return;
    }

    setLegResults(results);
    setSlipHitProb(slipProbAll);

    const s = Number(stake || "0");
    if (Number.isNaN(s) || s <= 0) {
      setErrorMsg("Stake must be a positive number.");
      setEvDollars(null);
      setEvPct(null);
      setEffectiveMultiplier(null);
      return;
    }

    if (slipType === "power") {
      const m = getPowerMultiplier(n);
      if (m === null) {
        setErrorMsg("Unsupported leg count for power play.");
        setEvDollars(null);
        setEvPct(null);
        setEffectiveMultiplier(null);
        return;
      }

      // per-leg breakeven probability if all legs had the same p
      const pBe = Math.pow(1 / m, 1 / n);
      setBreakEvenHitProb(pBe);

      const roi = m * slipProbAll - 1;
      const ev = s * roi;

      setEvPct(roi);
      setEvDollars(ev);
      setEffectiveMultiplier(m);
      setPayoutInfo(`${n}-pick Power: ${m.toFixed(2)}x if all ${n} hit.`);
    } else {
      const payouts = getFlexPayouts(n);
      if (!payouts) {
        setErrorMsg("Unsupported leg count for flex play.");
        setEvDollars(null);
        setEvPct(null);
        setEffectiveMultiplier(null);
        return;
      }

      // breakeven per-leg probability if all legs had the same p
      const pBe = computeFlexBreakEvenProb(n, payouts);
      setBreakEvenHitProb(pBe);

      const dist = hitsDistribution(pHits); // dist[k] = P(exactly k hits)
      let expectedFactor = 0;
      const pieces: string[] = [];

      for (const { hits, multiplier } of payouts) {
        const p = dist[hits] ?? 0;
        expectedFactor += multiplier * p;
        pieces.push(`${hits}/${n}: ${multiplier}x`);
      }

      const roi = expectedFactor - 1;
      const ev = s * roi;

      setEvPct(roi);
      setEvDollars(ev);
      setEffectiveMultiplier(expectedFactor);
      setPayoutInfo(
        `${n}-pick Flex payouts → ${pieces.join(" · ")} (ignoring pushes/DNPs).`
      );
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#020617",
        color: "white",
        padding: "1rem",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      <header
        style={{
          maxWidth: "960px",
          margin: "0 auto 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 600 }}>
          SlipEV <span style={{ color: "#64748b", fontSize: "0.8rem" }}>beta</span>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
          PrizePicks · NBA PTS / REB / AST / PRA
        </div>
      </header>

      <main
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          display: "grid",
          gap: "1rem",
        }}
      >
        {/* Input card */}
        <section
          style={{
            background: "#020617",
            borderRadius: "0.75rem",
            border: "1px solid #1e293b",
            padding: "1rem",
          }}
        >
          <h1 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            NBA PrizePicks EV Calculator
          </h1>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#cbd5f5",
              marginBottom: "0.25rem",
            }}
          >
            Paste in your PrizePicks lines and we&apos;ll estimate hit probabilities and
            expected value using recent NBA stats.
          </p>
          <ol
            style={{
              fontSize: "0.8rem",
              color: "#cbd5f5",
              paddingLeft: "1.25rem",
              marginTop: "0.25rem",
              marginBottom: "0.5rem",
            }}
          >
            <li>
              Choose <strong>Power</strong> or <strong>Flex</strong> and enter your
              stake.
            </li>
            <li>
              Add 2–6 legs and type a player name (or pick from the dropdown).
            </li>
            <li>
              Select the stat and line, then click <strong>Auto μ</strong> to pull our
              projection.
            </li>
            <li>
              Pick Over/Under and hit <strong>Analyze slip</strong>.
            </li>
          </ol>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              marginBottom: "0.25rem",
            }}
          >
            Not affiliated with or endorsed by PrizePicks or the NBA. For informational
            purposes only.
          </p>
          {projectionsGeneratedAt && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginBottom: "0.75rem",
              }}
            >
              Projections last refreshed:{" "}
              {new Date(projectionsGeneratedAt).toLocaleString()}
            </p>
          )}

          {/* type + stake row */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  marginBottom: "0.25rem",
                }}
              >
                Slip type
              </div>
              <select
                value={slipType}
                onChange={(e) => setSlipType(e.target.value as SlipType)}
                style={{
                  width: "140px",
                  background: "#020617",
                  borderRadius: "0.375rem",
                  border: "1px solid #1e293b",
                  padding: "0.3rem 0.5rem",
                  color: "white",
                }}
              >
                <option value="power">Power</option>
                <option value="flex">Flex</option>
              </select>
            </div>

            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  marginBottom: "0.25rem",
                }}
              >
                Stake ($)
              </div>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                style={{
                  width: "120px",
                  background: "#020617",
                  borderRadius: "0.375rem",
                  border: "1px solid #1e293b",
                  padding: "0.3rem 0.5rem",
                  color: "white",
                }}
              />
            </div>
          </div>

          {/* table wrapper for mobile scroll */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: "640px",
                fontSize: "0.85rem",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #1e293b",
                  }}
                >
                  <th style={{ padding: "0.5rem" }}>Player</th>
                  <th style={{ padding: "0.5rem" }}>Stat</th>
                  <th style={{ padding: "0.5rem" }}>Line</th>
                  <th style={{ padding: "0.5rem" }}>Projection μ</th>
                  <th style={{ padding: "0.5rem" }}>Pick</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {legs.map((leg) => (
                  <tr key={leg.id} style={{ borderTop: "1px solid #1e293b" }}>
                    {/* PLAYER */}
                    <td style={{ padding: "0.5rem" }}>
                      <input
                        list="player-options"
                        placeholder="LeBron James"
                        value={leg.player}
                        onChange={(e) =>
                          updateLeg(leg.id, "player", e.target.value)
                        }
                        style={{
                          width: "100%",
                          background: "#020617",
                          borderRadius: "0.375rem",
                          border: "1px solid #1e293b",
                          padding: "0.3rem 0.5rem",
                          color: "white",
                        }}
                      />
                    </td>

                    {/* STAT */}
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={leg.stat}
                        onChange={(e) =>
                          updateLeg(leg.id, "stat", e.target.value as StatType)
                        }
                        style={{
                          width: "100%",
                          background: "#020617",
                          borderRadius: "0.375rem",
                          border: "1px solid #1e293b",
                          padding: "0.3rem 0.5rem",
                          color: "white",
                        }}
                      >
                        <option value="PTS">PTS</option>
                        <option value="REB">REB</option>
                        <option value="AST">AST</option>
                        <option value="PRA">PRA</option>
                      </select>
                    </td>

                    {/* LINE */}
                    <td style={{ padding: "0.5rem" }}>
                      <input
                        type="number"
                        placeholder="e.g. 26.5"
                        value={leg.line}
                        onChange={(e) => updateLeg(leg.id, "line", e.target.value)}
                        style={{
                          width: "100%",
                          background: "#020617",
                          borderRadius: "0.375rem",
                          border: "1px solid #1e293b",
                          padding: "0.3rem 0.5rem",
                          color: "white",
                        }}
                      />
                    </td>

                    {/* PROJECTION */}
                    <td style={{ padding: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <input
                          type="number"
                          placeholder="auto"
                          value={leg.proj}
                          onChange={(e) =>
                            updateLeg(leg.id, "proj", e.target.value)
                          }
                          style={{
                            width: "100%",
                            background: "#020617",
                            borderRadius: "0.375rem",
                            border: "1px solid #1e293b",
                            padding: "0.3rem 0.5rem",
                            color: "white",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => autofillProjection(leg.id)}
                          style={{
                            fontSize: "0.75rem",
                            borderRadius: "0.375rem",
                            border: "1px solid #1e293b",
                            padding: "0.3rem 0.5rem",
                            background: "#020617",
                            color: "#e2e8f0",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Auto μ
                        </button>
                      </div>
                    </td>

                    {/* PICK */}
                    <td style={{ padding: "0.5rem" }}>
                      <select
                        value={leg.pick}
                        onChange={(e) =>
                          updateLeg(
                            leg.id,
                            "pick",
                            e.target.value as "over" | "under"
                          )
                        }
                        style={{
                          width: "100%",
                          background: "#020617",
                          borderRadius: "0.375rem",
                          border: "1px solid #1e293b",
                          padding: "0.3rem 0.5rem",
                          color: "white",
                        }}
                      >
                        <option value="over">Over</option>
                        <option value="under">Under</option>
                      </select>
                    </td>

                    {/* REMOVE */}
                    <td style={{ padding: "0.5rem", textAlign: "right" }}>
                      <button
                        onClick={() => removeLeg(leg.id)}
                        style={{
                          fontSize: "0.8rem",
                          color: "#f87171",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <datalist id="player-options">
            {PLAYER_OPTIONS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "0.75rem",
              gap: "0.75rem",
            }}
          >
            <button
              onClick={addLeg}
              style={{
                fontSize: "0.85rem",
                borderRadius: "0.375rem",
                border: "1px solid #1e293b",
                padding: "0.4rem 0.75rem",
                background: "#020617",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              + Add leg
            </button>
            <button
              onClick={analyzeSlip}
              style={{
                fontSize: "0.9rem",
                borderRadius: "0.375rem",
                border: "none",
                padding: "0.4rem 0.9rem",
                background: "#e2e8f0",
                color: "#020617",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Analyze slip
            </button>
          </div>

          {errorMsg && (
            <div
              style={{
                marginTop: "0.6rem",
                fontSize: "0.8rem",
                color: "#f97373",
              }}
            >
              {errorMsg}
            </div>
          )}
        </section>

        {/* Results card */}
        <section
          style={{
            background: "#020617",
            borderRadius: "0.75rem",
            border: "1px solid #1e293b",
            padding: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            Results
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: "#94a3b8",
              marginBottom: "0.5rem",
            }}
          >
            Each leg shows your line, our projected average (μ), estimated game-to-game
            volatility (σ), and the chance your pick hits under our model. Green text
            means this leg is better than the breakeven win rate for this slip; red means
            worse.
          </p>

          {!legResults || legResults.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Add at least two legs, click &quot;Auto μ&quot;, then &quot;Analyze
              slip&quot;.
            </p>
          ) : (
            <>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {legResults.map((r, idx) => (
                  <li
                    key={idx}
                    style={{
                      padding: "0.5rem 0",
                      borderBottom: "1px solid #1e293b",
                      fontSize: "0.9rem",
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>
                      {r.player} – {r.stat} – {r.pick.toUpperCase()} {r.line}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      μ = {r.proj.toFixed(1)}
                      {typeof r.sigma === "number" && (
                        <> , σ ≈ {r.sigma.toFixed(1)}</>
                      )}
                      , P(hit) ≈ {(r.pHit * 100).toFixed(1)}%
                      {" · fair ≈ "}
                      {(1 / r.pHit).toFixed(2)}x
                    </div>
                    {breakEvenHitProb !== null && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color:
                            (r.pHit - breakEvenHitProb) * 100 >= 0
                              ? "#4ade80"
                              : "#f97373", // green if +EV, red if -EV
                        }}
                      >
                        Breakeven per leg for this slip:{" "}
                        {(breakEvenHitProb * 100).toFixed(1)}%. This leg:{" "}
                        {(r.pHit * 100).toFixed(1)}% → edge ={" "}
                        {((r.pHit - breakEvenHitProb) * 100 >= 0 ? "+" : "")}
                        {((r.pHit - breakEvenHitProb) * 100).toFixed(1)}{" "}
                        percentage points
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {slipHitProb !== null && (
                <div style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                  <div style={{ fontWeight: 500 }}>Slip summary</div>
                  <div style={{ fontSize: "0.85rem", color: "#cbd5f5" }}>
                    Estimated probability all legs hit:{" "}
                    {(slipHitProb * 100).toFixed(1)}%
                  </div>

                  {effectiveMultiplier !== null && (
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#cbd5f5",
                        marginTop: "0.25rem",
                      }}
                    >
                      Expected payout factor (E[return / stake]):{" "}
                      {effectiveMultiplier.toFixed(3)}x
                    </div>
                  )}

                  {evPct !== null && evDollars !== null && (
                    <div
                      style={{
                        marginTop: "0.35rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      EV on ${Number(stake || "0").toFixed(2)} stake:{" "}
                      <span
                        style={{
                          color: evDollars >= 0 ? "#4ade80" : "#f97373",
                          fontWeight: 500,
                        }}
                      >
                        {evDollars >= 0 ? "+" : ""}
                        {evDollars.toFixed(2)} (
                        {(evPct * 100).toFixed(1)}% ROI)
                      </span>
                      <div
                        style={{
                          marginTop: "0.2rem",
                          fontSize: "0.8rem",
                          color: "#94a3b8",
                        }}
                      >
                        In plain terms: if you placed this same slip many times, our
                        model expects you&apos;d get back about $
                        {(Number(stake || "0") + evDollars).toFixed(2)} on average for
                        each ${Number(stake || "0").toFixed(2)} bet.
                      </div>
                    </div>
                  )}

                  {breakEvenHitProb !== null && (
                    <div
                      style={{
                        marginTop: "0.35rem",
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                      }}
                    >
                      If all legs had the same win chance, breakeven would be about{" "}
                      {(breakEvenHitProb * 100).toFixed(1)}% per leg.
                    </div>
                  )}

                  {payoutInfo && (
                    <div
                      style={{
                        marginTop: "0.35rem",
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                      }}
                    >
                      {payoutInfo}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
