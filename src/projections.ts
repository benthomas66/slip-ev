// src/projections.ts

// Stat types supported by the UI
export type StatType = "PTS" | "REB" | "AST" | "PRA";

export interface ProjectionRow {
  player: string;
  stat: StatType;
  mu: number;      // average for this stat
  sigma?: number;  // optional per-player volatility
}

// Fallback sigma if a row does not specify one
// (tune this later if you want tighter/wider distributions)
export const defaultSigma = 6;

// For display in the header – update whenever you refresh data
export const projectionsGeneratedAt = "2025-11-19T03:00:00Z";

// ---------------------------------------------------------------------------
// PROJECTIONS TABLE
//
// This is a small starter set so the app compiles and works end-to-end.
// You can expand or regenerate this with your Python script later.
//
// μ (mu) values here are just illustrative; you should replace them with
// your real averages from the NBA API / game logs when you’re ready.
// ---------------------------------------------------------------------------

const PROJECTIONS: ProjectionRow[] = [
  // Lakers
  { player: "LeBron James",        stat: "PTS", mu: 21.9, sigma: 6.6 },
  { player: "LeBron James",        stat: "REB", mu: 7.5,  sigma: 3.0 },
  { player: "LeBron James",        stat: "AST", mu: 7.1,  sigma: 3.0 },
  { player: "LeBron James",        stat: "PRA", mu: 36.5, sigma: 7.5 },

  { player: "Anthony Davis",       stat: "PTS", mu: 18.4, sigma: 8.5 },
  { player: "Anthony Davis",       stat: "REB", mu: 11.0, sigma: 3.5 },
  { player: "Anthony Davis",       stat: "AST", mu: 2.9,  sigma: 1.8 },
  { player: "Anthony Davis",       stat: "PRA", mu: 32.3, sigma: 7.0 },

  // OKC
  { player: "Shai Gilgeous-Alexander", stat: "PTS", mu: 30.8, sigma: 5.6 },
  { player: "Shai Gilgeous-Alexander", stat: "REB", mu: 5.5,  sigma: 2.3 },
  { player: "Shai Gilgeous-Alexander", stat: "AST", mu: 6.4,  sigma: 2.5 },
  { player: "Shai Gilgeous-Alexander", stat: "PRA", mu: 42.7, sigma: 7.5 },

  { player: "Chet Holmgren",       stat: "PTS", mu: 14.8, sigma: 6.3 },
  { player: "Chet Holmgren",       stat: "REB", mu: 7.9,  sigma: 3.0 },
  { player: "Chet Holmgren",       stat: "AST", mu: 2.4,  sigma: 1.6 },
  { player: "Chet Holmgren",       stat: "PRA", mu: 25.1, sigma: 6.5 },

  // Wolves
  { player: "Anthony Edwards",     stat: "PTS", mu: 28.2, sigma: 10.8 },
  { player: "Anthony Edwards",     stat: "REB", mu: 5.5,  sigma: 2.8 },
  { player: "Anthony Edwards",     stat: "AST", mu: 5.3,  sigma: 2.4 },
  { player: "Anthony Edwards",     stat: "PRA", mu: 39.0, sigma: 8.5 },

  { player: "Karl-Anthony Towns",  stat: "PTS", mu: 21.1, sigma: 7.5 },
  { player: "Karl-Anthony Towns",  stat: "REB", mu: 8.5,  sigma: 3.4 },
  { player: "Karl-Anthony Towns",  stat: "AST", mu: 2.8,  sigma: 1.7 },
  { player: "Karl-Anthony Towns",  stat: "PRA", mu: 32.4, sigma: 7.0 },

  // Mavs
  { player: "Luka Doncic",         stat: "PTS", mu: 31.2, sigma: 7.5 },
  { player: "Luka Doncic",         stat: "REB", mu: 8.6,  sigma: 3.2 },
  { player: "Luka Doncic",         stat: "AST", mu: 8.2,  sigma: 3.0 },
  { player: "Luka Doncic",         stat: "PRA", mu: 48.0, sigma: 8.8 },

  // Warriors
  { player: "Stephen Curry",       stat: "PTS", mu: 29.3, sigma: 6.8 },
  { player: "Stephen Curry",       stat: "REB", mu: 4.5,  sigma: 2.4 },
  { player: "Stephen Curry",       stat: "AST", mu: 5.9,  sigma: 2.5 },
  { player: "Stephen Curry",       stat: "PRA", mu: 39.7, sigma: 7.7 },

  // Celtics
  { player: "Jayson Tatum",        stat: "PTS", mu: 27.0, sigma: 7.2 },
  { player: "Jayson Tatum",        stat: "REB", mu: 8.5,  sigma: 3.1 },
  { player: "Jayson Tatum",        stat: "AST", mu: 4.5,  sigma: 2.2 },
  { player: "Jayson Tatum",        stat: "PRA", mu: 40.0, sigma: 7.5 },

  { player: "Jaylen Brown",        stat: "PTS", mu: 22.8, sigma: 6.5 },
  { player: "Jaylen Brown",        stat: "REB", mu: 5.5,  sigma: 2.5 },
  { player: "Jaylen Brown",        stat: "AST", mu: 3.4,  sigma: 1.8 },
  { player: "Jaylen Brown",        stat: "PRA", mu: 31.7, sigma: 6.5 },

  // Sixers
  { player: "Joel Embiid",         stat: "PTS", mu: 32.5, sigma: 7.5 },
  { player: "Joel Embiid",         stat: "REB", mu: 11.0, sigma: 3.5 },
  { player: "Joel Embiid",         stat: "AST", mu: 4.8,  sigma: 2.0 },
  { player: "Joel Embiid",         stat: "PRA", mu: 48.3, sigma: 8.5 },

  { player: "Tyrese Maxey",        stat: "PTS", mu: 24.5, sigma: 6.8 },
  { player: "Tyrese Maxey",        stat: "REB", mu: 3.7,  sigma: 1.8 },
  { player: "Tyrese Maxey",        stat: "AST", mu: 6.4,  sigma: 2.7 },
  { player: "Tyrese Maxey",        stat: "PRA", mu: 34.6, sigma: 7.0 },

  // Suns
  { player: "Kevin Durant",        stat: "PTS", mu: 28.6, sigma: 7.0 },
  { player: "Kevin Durant",        stat: "REB", mu: 7.0,  sigma: 2.9 },
  { player: "Kevin Durant",        stat: "AST", mu: 5.3,  sigma: 2.4 },
  { player: "Kevin Durant",        stat: "PRA", mu: 40.9, sigma: 7.6 },

  { player: "Devin Booker",        stat: "PTS", mu: 26.8, sigma: 6.7 },
  { player: "Devin Booker",        stat: "REB", mu: 4.6,  sigma: 2.1 },
  { player: "Devin Booker",        stat: "AST", mu: 6.0,  sigma: 2.5 },
  { player: "Devin Booker",        stat: "PRA", mu: 37.4, sigma: 7.0 },
];

// ---------------------------------------------------------------------------
// LOOKUP FUNCTION
// ---------------------------------------------------------------------------

export function findProjection(
  player: string,
  stat: StatType
): ProjectionRow | undefined {
  const normalized = player.trim().toLowerCase();

  // First try exact (player, stat) match
  const exact = PROJECTIONS.find(
    (row) =>
      row.stat === stat && row.player.trim().toLowerCase() === normalized
  );
  if (exact) return exact;

  // Fallback: any stat for this player (e.g. if only PTS exists).
  // This keeps Auto μ from failing completely if you haven't
  // added REB/AST/PRA rows yet.
  return PROJECTIONS.find(
    (row) => row.player.trim().toLowerCase() === normalized
  );
}
