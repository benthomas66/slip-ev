// AUTO-GENERATED FILE – do not edit by hand.
// Run the projection scripts to refresh this file.

export type Projection = {
  player: string;
  mu: number;
  sigma: number;
};

export const projections: Projection[] = [
  { player: "LeBron James", mu: 21.9, sigma: 6.56 },
  { player: "Anthony Davis", mu: 18.4, sigma: 8.52 },
  { player: "Stephen Curry", mu: 26.9, sigma: 13.63 },
  { player: "Jayson Tatum", mu: 24.2, sigma: 5.25 },
  { player: "James Harden", mu: 24.2, sigma: 7.59 },
];

export function findProjection(playerName: string): Projection | undefined {
  const normalized = playerName.trim().toLowerCase();
  return projections.find(p => p.player.toLowerCase() === normalized);
}

export const defaultSigma = 6;

export const projectionsGeneratedAt = "2025-11-19T23:36:49.205794+00:00";
