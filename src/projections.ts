// AUTO-GENERATED FILE – do not edit by hand.
// Run the projection scripts to refresh this file.

export type Projection = {
  player: string;
  points: number;
};

export const projections: Projection[] = [
  { player: "LeBron James", points: 21.9 },
  { player: "Anthony Davis", points: 18.4 },
  { player: "Stephen Curry", points: 26.9 },
  { player: "Jayson Tatum", points: 24.2 },
  { player: "James Harden", points: 24.2 },
];

export function findProjection(playerName: string): Projection | undefined {
  const normalized = playerName.trim().toLowerCase();
  return projections.find(p => p.player.toLowerCase() === normalized);
}

export const projectionsGeneratedAt = "2025-11-19T23:18:59.945408+00:00";
