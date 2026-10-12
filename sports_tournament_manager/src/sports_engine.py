"""
Sports Calculation Engine
Computes standings, leaderboards (scorers, 3-pts, assists, rebounds), and MVP awards
for Football, Basketball, Handball, and Volleyball.
"""

from typing import List, Dict, Any


class SportsEngine:
    @classmethod
    def calculate_standings(cls, sport: str, teams: List[Dict[str, Any]], matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Calculates standings table for a tournament according to official rules of the sport.
        """
        sport = sport.lower().strip()

        # Initialize table dict for all teams
        table: Dict[int, Dict[str, Any]] = {}
        for t in teams:
            table[t["id"]] = {
                "team_id": t["id"],
                "name": t["name"],
                "short_name": t.get("short_name", t["name"][:3].upper()),
                "filiere": t.get("filiere", ""),
                "color": t.get("color", "#1e3a8a"),
                "logo_url": t.get("logo_url", ""),
                "played": 0,
                "won": 0,
                "drawn": 0,
                "lost": 0,
                "scored": 0,    # Goals / Points / Sets For
                "conceded": 0,  # Goals / Points / Sets Against
                "diff": 0,
                "points": 0
            }

        finished_matches = [m for m in matches if m.get("status") == "finished" and m.get("score_home") is not None and m.get("score_away") is not None]

        for m in finished_matches:
            th_id = m["team_home_id"]
            ta_id = m["team_away_id"]
            sh = int(m["score_home"])
            sa = int(m["score_away"])

            if th_id not in table or ta_id not in table:
                continue

            th = table[th_id]
            ta = table[ta_id]

            th["played"] += 1
            ta["played"] += 1
            th["scored"] += sh
            th["conceded"] += sa
            ta["scored"] += sa
            ta["conceded"] += sh

            if sport == "basketball":
                # BASKETBALL RULES (Officiel FIBA / Exigence utilisateur):
                # Victoire = 2 pts, Défaite = 1 pt.
                if sh > sa:
                    th["won"] += 1
                    th["points"] += 2
                    ta["lost"] += 1
                    ta["points"] += 1
                else:
                    ta["won"] += 1
                    ta["points"] += 2
                    th["lost"] += 1
                    th["points"] += 1

            elif sport == "volleyball":
                # VOLLEYBALL RULES (Score en sets gagnés, ex: 3-1, 3-2):
                if sh > sa:
                    th["won"] += 1
                    ta["lost"] += 1
                    if sa == 2:  # Victoire 3-2
                        th["points"] += 2
                        ta["points"] += 1
                    else:        # Victoire 3-0 ou 3-1
                        th["points"] += 3
                        ta["points"] += 0
                else:
                    ta["won"] += 1
                    th["lost"] += 1
                    if sh == 2:  # Victoire 3-2
                        ta["points"] += 2
                        th["points"] += 1
                    else:        # Victoire 3-0 ou 3-1
                        ta["points"] += 3
                        th["points"] += 0

            elif sport == "handball":
                # HANDBALL RULES:
                # Victoire = 2 pts, Nul = 1 pt, Défaite = 0 pt
                if sh > sa:
                    th["won"] += 1
                    th["points"] += 2
                    ta["lost"] += 1
                elif sa > sh:
                    ta["won"] += 1
                    ta["points"] += 2
                    th["lost"] += 1
                else:
                    th["drawn"] += 1
                    ta["drawn"] += 1
                    th["points"] += 1
                    ta["points"] += 1

            else:
                # FOOTBALL (DEFAULT):
                # Victoire = 3 pts, Nul = 1 pt, Défaite = 0 pt
                if sh > sa:
                    th["won"] += 1
                    th["points"] += 3
                    ta["lost"] += 1
                elif sa > sh:
                    ta["won"] += 1
                    ta["points"] += 3
                    th["lost"] += 1
                else:
                    th["drawn"] += 1
                    ta["drawn"] += 1
                    th["points"] += 1
                    ta["points"] += 1

        # Calculate diff
        for entry in table.values():
            entry["diff"] = entry["scored"] - entry["conceded"]

        # Sort standings: Points DESC, Diff DESC, Scored DESC, Name ASC
        standings_list = list(table.values())
        standings_list.sort(key=lambda x: (
            -x["points"],
            -x["diff"],
            -x["scored"],
            x["name"]
        ))

        # Assign rank position
        for i, entry in enumerate(standings_list, start=1):
            entry["rank"] = i

        return standings_list

    @classmethod
    def calculate_leaderboards(cls, sport: str, events: List[Dict[str, Any]], matches: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates individual leaders:
        - Basketball: Points, 3-points, Assists, Rebounds, MVPs
        - Football: Goals, Assists, Cards, MVPs
        - Handball: Goals, 7m, 2min, MVPs
        - Volleyball: MVPs
        """
        sport = sport.lower().strip()

        # Aggregation maps
        scorers: Dict[int, Dict[str, Any]] = {}
        three_pointers: Dict[int, Dict[str, Any]] = {}
        assists: Dict[int, Dict[str, Any]] = {}
        rebounds: Dict[int, Dict[str, Any]] = {}
        mvp_counts: Dict[int, Dict[str, Any]] = {}

        # 1. Process Events
        for ev in events:
            pid = ev["player_id"]
            pname = ev.get("player_name", "Joueur")
            tname = ev.get("team_name", "Équipe")
            pnum = ev.get("player_number", 0)
            etype = ev.get("event_type", "")
            count = ev.get("count", 1)

            base_info = {
                "player_id": pid,
                "player_name": pname,
                "team_name": tname,
                "player_number": pnum,
                "total": 0
            }

            if etype in ("point", "goal"):
                scorers.setdefault(pid, dict(base_info))["total"] += count
            elif etype == "three_pointer":
                three_pointers.setdefault(pid, dict(base_info))["total"] += count
            elif etype == "assist":
                assists.setdefault(pid, dict(base_info))["total"] += count
            elif etype == "rebound":
                rebounds.setdefault(pid, dict(base_info))["total"] += count

        # 2. Process MVPs from matches
        for m in matches:
            if m.get("status") == "finished" and m.get("mvp_player_id"):
                pid = m["mvp_player_id"]
                pname = m.get("mvp_name", "Joueur")
                photo = m.get("mvp_photo", "")

                if pid not in mvp_counts:
                    mvp_counts[pid] = {
                        "player_id": pid,
                        "player_name": pname,
                        "photo_url": photo,
                        "total": 0
                    }
                mvp_counts[pid]["total"] += 1

        def sort_and_rank(d: Dict[int, Dict[str, Any]]) -> List[Dict[str, Any]]:
            res = sorted(d.values(), key=lambda x: -x["total"])
            for idx, item in enumerate(res, start=1):
                item["rank"] = idx
            return res

        return {
            "scorers": sort_and_rank(scorers),
            "three_pointers": sort_and_rank(three_pointers) if sport == "basketball" else [],
            "assists": sort_and_rank(assists),
            "rebounds": sort_and_rank(rebounds) if sport == "basketball" else [],
            "mvps": sort_and_rank(mvp_counts)
        }
