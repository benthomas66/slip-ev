import csv
import time
from typing import Tuple, Dict

import pandas as pd
from nba_api.stats.static import players
from nba_api.stats.endpoints import PlayerGameLog

# -------- CONFIG --------
PLAYERS = [
    # ATL
    "Trae Young",
    "Dejounte Murray",
    # BOS
    "Jayson Tatum",
    "Jaylen Brown",
    "Jrue Holiday",
    "Kristaps Porzingis",
    # BKN
    "Mikal Bridges",
    "Cam Thomas",
    # CHA
    "LaMelo Ball",
    "Miles Bridges",
    # CHI
    "DeMar DeRozan",
    "Zach LaVine",
    "Nikola Vucevic",
    # CLE
    "Donovan Mitchell",
    "Darius Garland",
    "Evan Mobley",
    # DAL
    "Luka Doncic",
    "Kyrie Irving",
    # DEN
    "Nikola Jokic",
    "Jamal Murray",
    "Michael Porter Jr.",
    # DET
    "Cade Cunningham",
    "Jaden Ivey",
    # GSW
    "Stephen Curry",
    "Klay Thompson",
    "Draymond Green",
    "Andrew Wiggins",
    # HOU
    "Jalen Green",
    "Alperen Sengun",
    "Fred VanVleet",
    # IND
    "Tyrese Haliburton",
    "Myles Turner",
    "Bennedict Mathurin",
    # LAC
    "Kawhi Leonard",
    "Paul George",
    "James Harden",
    "Russell Westbrook",
    # LAL
    "LeBron James",
    "Anthony Davis",
    "D'Angelo Russell",
    "Austin Reaves",
    # MEM
    "Ja Morant",
    "Jaren Jackson Jr.",
    "Desmond Bane",
    # MIA
    "Jimmy Butler",
    "Bam Adebayo",
    "Tyler Herro",
    # MIL
    "Giannis Antetokounmpo",
    "Damian Lillard",
    "Khris Middleton",
    "Brook Lopez",
    # MIN
    "Anthony Edwards",
    "Karl-Anthony Towns",
    "Rudy Gobert",
    # NOP
    "Zion Williamson",
    "Brandon Ingram",
    "CJ McCollum",
    # NYK
    "Jalen Brunson",
    "Julius Randle",
    "RJ Barrett",
    # OKC
    "Shai Gilgeous-Alexander",
    "Chet Holmgren",
    "Jalen Williams",
    # ORL
    "Paolo Banchero",
    "Franz Wagner",
    "Jalen Suggs",
    # PHI
    "Joel Embiid",
    "Tyrese Maxey",
    # PHX
    "Kevin Durant",
    "Devin Booker",
    "Bradley Beal",
    # POR
    "Anfernee Simons",
    "Scoot Henderson",
    "Jerami Grant",
    # SAC
    "De'Aaron Fox",
    "Domantas Sabonis",
    "Keegan Murray",
    # SAS
    "Victor Wembanyama",
    "Devin Vassell",
    "Keldon Johnson",
    # TOR
    "Scottie Barnes",
    "Pascal Siakam",
    "OG Anunoby",
    # UTA
    "Lauri Markkanen",
    "Jordan Clarkson",
    "Collin Sexton",
    # WAS
    "Kyle Kuzma",
    "Jordan Poole",
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


def get_stat_lines(player_id: int, n_games: int) -> Dict[str, Tuple[float, float]]:
    """
    Compute mu and sigma for PTS, REB, AST, PRA over the last n_games
    in the configured SEASON.
    Returns a dict like {"PTS": (mu, sigma), "REB": (mu, sigma), ...}
    """
    gl = PlayerGameLog(
        player_id=player_id,
        season=SEASON,
        season_type_all_star="Regular Season",
    )
    df = gl.get_data_frames()[0]

    df_recent = df.head(n_games)
    if df_recent.empty:
        # no data; fallback
        return {
            "PTS": (0.0, 6.0),
            "REB": (0.0, 3.0),
            "AST": (0.0, 3.0),
            "PRA": (0.0, 8.0),
        }

    pts = df_recent["PTS"].astype(float)
    reb = df_recent["REB"].astype(float)
    ast = df_recent["AST"].astype(float)
    pra = (df_recent["PTS"] + df_recent["REB"] + df_recent["AST"]).astype(float)

    stat_series = {
        "PTS": pts,
        "REB": reb,
        "AST": ast,
        "PRA": pra,
    }

    results: Dict[str, Tuple[float, float]] = {}

    for stat_name, series in stat_series.items():
        mu = float(series.mean())
        sigma = float(series.std(ddof=0))
        # basic fallback if too few games / 0 variance
        if not pd.notna(sigma) or sigma <= 0:
            if stat_name == "PTS":
                sigma = 6.0
            elif stat_name in ("REB", "AST"):
                sigma = 3.0
            else:  # PRA
                sigma = 8.0
        results[stat_name] = (mu, sigma)

    return results


def main() -> None:
    rows: list[tuple[str, str, float, float]] = []

    for name in PLAYERS:
        try:
            pid, canonical_name = get_player_id(name)
            stat_lines = get_stat_lines(pid, N_GAMES)
            for stat_name, (mu, sigma) in stat_lines.items():
                print(
                    f"{canonical_name} [{stat_name}]: mu={mu:.2f}, "
                    f"sigma={sigma:.2f} (last {N_GAMES} games)"
                )
                rows.append((canonical_name, stat_name, mu, sigma))
            time.sleep(0.5)
        except Exception as e:
            print(f"Error for {name}: {e}")

    if not rows:
        print("No projections generated; check names / network.")
        return

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["player", "stat", "mu", "sigma"])
        for player, stat_name, mu, sigma in rows:
            w.writerow([player, stat_name, f"{mu:.2f}", f"{sigma:.2f}"])

    print(f"Wrote {OUTPUT_CSV} with {len(rows)} player-stat projections.")


if __name__ == "__main__":
    main()
