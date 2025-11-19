import csv
from pathlib import Path

ROOT = Path(__file__).parent
csv_path = ROOT / "nba_projections.csv"
ts_path = ROOT / "src" / "projections.ts"


def main() -> None:
    rows = []
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            player = row["player"].strip()
            points = float(row["points"])
            rows.append((player, points))

    lines: list[str] = []
    lines.append("// AUTO-GENERATED FILE – do not edit by hand.")
    lines.append("// Run `python generate_projections_ts.py` after updating projections.csv\n")
    lines.append("export type Projection = {")
    lines.append("  player: string;")
    lines.append("  points: number;")
    lines.append("};\n")
    lines.append("export const projections: Projection[] = [")
    for player, points in rows:
        lines.append(f'  {{ player: "{player}", points: {points} }},')
    lines.append("];\n")
    lines.append(
        "export function findProjection(playerName: string): Projection | undefined {"
    )
    lines.append("  const normalized = playerName.trim().toLowerCase();")
    lines.append(
        "  return projections.find(p => p.player.toLowerCase() === normalized);"
    )
    lines.append("}\n")

    ts_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {ts_path} with {len(rows)} projections.")


if __name__ == "__main__":
    main()
