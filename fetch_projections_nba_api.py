import csv
import time
from typing import Tuple

import pandas as pd
from nba_api.stats.static import players
from nba_api.stats.endpoints import PlayerGameLog
OUTPUT_CSV = "nba_projections.csv"

# -------- CONFIG --------
PLAYERS = [
    "LeBron James",
    "Anthony Davis",
    "Luka Doncic",
    "Stephen Curry",
    "Jayson Tatum",
    "James Harden",
]

SEASON = "2024-25"          # NBA season format "YYYY-YY"
N_GAMES = 10                # how many recent games to average
OUTPUT_CSV = "nba_projections.csv"
# ------------------------


def get_player_id(full_name: str) -> Tuple[int, str]:
    """
    Find a player's NBA ID from their full name.
    Returns (player_id, canonical_full_name).
    """
    player_list = players.get_players()
    match = next(
        (p for p in player_list if p["full_name"].lower() == full_name.lower()),
        None,
    )
    if match is None:
        raise ValueError(f"No player found for '{full_name}'")
    return match["id"], match["full_name"]


def get_recent_points(player_id: int, n_games: int) -> float:
    """
    Get average points over the last n_games in the configured SEASON.
    """
    gl = PlayerGameLog(
        player_id=player_id,
        season=SEASON,
        season_type_all_star="Regular Season",
    )
    df = gl.get_data_frames()[0]

    # NBA API usually returns most recent games first; just take top N rows
    df_recent = df.head(n_games)
    if df_recent.empty:
        return 0.0

    return float(df_recent["PTS"].mean())


def main() -> None:
    rows: list[tuple[str, float]] = []

    for name in PLAYERS:
        try:
            pid, canonical_name = get_player_id(name)
            avg_pts = get_recent_points(pid, N_GAMES)
            print(f"{canonical_name}: {avg_pts:.2f} pts (last {N_GAMES} games)")
            rows.append((canonical_name, avg_pts))
            # small delay so we don't hammer the API
            time.sleep(0.5)
        except Exception as e:
            print(f"Error for {name}: {e}")

    if not rows:
        print("No projections generated; check names / network.")
        return

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["player", "points"])
        for name, mu in rows:
            w.writerow([name, f"{mu:.2f}"])

    print(f"Wrote {OUTPUT_CSV} with {len(rows)} players.")


if __name__ == "__main__":
    main()
