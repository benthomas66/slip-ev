import csv
import time
from typing import Tuple

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


def get_recent_mu_sigma(player_id: int, n_games: int) -> Tuple[float, float]:
    """
    Get average points (mu) and standard deviation (sigma)
    over the last n_games in the configured SEASON.
    """
    gl = PlayerGameLog(
        player_id=player_id,
        season=SEASON,
        season_type_all_star="Regular Season",
    )
    df = gl.get_data_frames()[0]

    # Most recent games first; just take top n_games
    df_recent = df.head(n_games)
    if df_recent.empty:
        return 0.0, 6.0  # fall back if no data

    pts = df_recent["PTS"].astype(float)
    mu = float(pts.mean())

    # If only 1 game, std will be NaN; fall back to 6 then.
    sigma = float(pts.std(ddof=0))
    if not pd.notna(sigma) or sigma <= 0:
        sigma = 6.0

    return mu, sigma


def main() -> None:
    rows: list[tuple[str, float, float]] = []

    for name in PLAYERS:
        try:
            pid, canonical_name = get_player_id(name)
            mu, sigma = get_recent_mu_sigma(pid, N_GAMES)
            print(
                f"{canonical_name}: mu={mu:.2f} pts, sigma={sigma:.2f} "
                f"(last {N_GAMES} games)"
            )
            rows.append((canonical_name, mu, sigma))
            time.sleep(0.5)  # be gentle with API
        except Exception as e:
            print(f"Error for {name}: {e}")

    if not rows:
        print("No projections generated; check names / network.")
        return

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["player", "mu", "sigma"])
        for name, mu, sigma in rows:
            w.writerow([name, f"{mu:.2f}", f"{sigma:.2f}"])

    print(f"Wrote {OUTPUT_CSV} with {len(rows)} players.")


if __name__ == "__main__":
    main()
