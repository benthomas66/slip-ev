import csv
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).parent
csv_path = ROOT / "nba_projections.csv"
ts_path = ROOT / "src" / "projections.ts"


def main() -> None:
    rows: list[tuple[str, float, float]] = []

    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            player = row["player"].strip()
            mu = float(row["mu"])
            sigma = float(row["sigma"])
            rows.append((player, mu, sigma))

    generated_at = datetime.now(timezone.utc).isoformat()

    lines: list[str] = []
    lines.append("// AUTO-GENERATED FILE – do not edit by hand.")
    lines.append("// Run the projection scripts to refresh this file.\n")
    lines.append("export type Projection = {")
    lines.append("  player: string;")
    lines.append("  mu: number;")
    lines.append("  sigma: number;")
    lines.append("};\n")
    lines.append("export const projections: Projection[] = [")
    for player, mu, sigma in rows:
        lines.append(
            f'  {{ player: "{player}", mu: {mu}, sigma: {sigma} }},'
        )
    lines.append("];\n")
    lines.append(
        "export function findProjection(playerName: string): Projection | undefined {"
    )
    lines.append("  const normalized = playerName.trim().toLowerCase();")
    lines.append(
        "  return projections.find(p => p.player.toLowerCase() === normalized);"
    )
    lines.append("}\n")
    lines.append("export const defaultSigma = 6;\n")
    lines.append(
        f'export const projectionsGeneratedAt = "{generated_at}";\n'
    )

    ts_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {ts_path} with {len(rows)} projections.")


if __name__ == "__main__":
    main()
