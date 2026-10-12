"""
Unit tests for SportsEngine and Database
"""

import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from sports_engine import SportsEngine
from database import Database


class TestSportsEngine(unittest.TestCase):
    def test_basketball_standings_rule(self):
        """Test basketball points rule: Win = 2 pts, Loss = 1 pt."""
        teams = [
            {"id": 1, "name": "Bulls", "short_name": "BUL"},
            {"id": 2, "name": "Lakers", "short_name": "LAL"},
            {"id": 3, "name": "Warriors", "short_name": "GSW"}
        ]
        matches = [
            # Match 1: Bulls 80 - 70 Lakers -> Bulls Win (2 pts), Lakers Loss (1 pt)
            {"team_home_id": 1, "team_away_id": 2, "score_home": 80, "score_away": 70, "status": "finished"},
            # Match 2: Warriors 65 - 75 Bulls -> Bulls Win (2 pts), Warriors Loss (1 pt)
            {"team_home_id": 3, "team_away_id": 1, "score_home": 65, "score_away": 75, "status": "finished"},
            # Match 3: Lakers 82 - 78 Warriors -> Lakers Win (2 pts), Warriors Loss (1 pt)
            {"team_home_id": 2, "team_away_id": 3, "score_home": 82, "score_away": 78, "status": "finished"}
        ]

        standings = SportsEngine.calculate_standings("basketball", teams, matches)

        # Bulls: 2 played, 2 won, 0 lost -> 4 pts (Rank 1)
        self.assertEqual(standings[0]["name"], "Bulls")
        self.assertEqual(standings[0]["points"], 4)
        self.assertEqual(standings[0]["won"], 2)
        self.assertEqual(standings[0]["lost"], 0)

        # Lakers: 2 played, 1 won, 1 lost -> 3 pts (Rank 2)
        self.assertEqual(standings[1]["name"], "Lakers")
        self.assertEqual(standings[1]["points"], 3)
        self.assertEqual(standings[1]["won"], 1)
        self.assertEqual(standings[1]["lost"], 1)

        # Warriors: 2 played, 0 won, 2 lost -> 2 pts (Rank 3)
        self.assertEqual(standings[2]["name"], "Warriors")
        self.assertEqual(standings[2]["points"], 2)
        self.assertEqual(standings[2]["won"], 0)
        self.assertEqual(standings[2]["lost"], 2)

    def test_football_standings_rule(self):
        """Test football points rule: Win = 3 pts, Draw = 1 pt, Loss = 0 pt."""
        teams = [
            {"id": 1, "name": "FC Meca"},
            {"id": 2, "name": "AS Info"}
        ]
        matches = [
            {"team_home_id": 1, "team_away_id": 2, "score_home": 1, "score_away": 1, "status": "finished"}
        ]
        standings = SportsEngine.calculate_standings("football", teams, matches)
        self.assertEqual(standings[0]["points"], 1)
        self.assertEqual(standings[1]["points"], 1)

    def test_basketball_leaderboards(self):
        """Test aggregation of basketball stats: points, 3pts, assists, rebounds."""
        events = [
            {"player_id": 10, "player_name": "Jean", "team_name": "Bulls", "player_number": 23, "event_type": "point", "count": 25},
            {"player_id": 10, "player_name": "Jean", "team_name": "Bulls", "player_number": 23, "event_type": "three_pointer", "count": 3},
            {"player_id": 10, "player_name": "Jean", "team_name": "Bulls", "player_number": 23, "event_type": "assist", "count": 7},
            {"player_id": 20, "player_name": "Paul", "team_name": "Lakers", "player_number": 15, "event_type": "rebound", "count": 12},
        ]
        matches = [
            {"status": "finished", "mvp_player_id": 10, "mvp_name": "Jean", "mvp_photo": ""}
        ]

        leaders = SportsEngine.calculate_leaderboards("basketball", events, matches)

        self.assertEqual(leaders["scorers"][0]["player_name"], "Jean")
        self.assertEqual(leaders["scorers"][0]["total"], 25)

        self.assertEqual(leaders["three_pointers"][0]["total"], 3)
        self.assertEqual(leaders["assists"][0]["total"], 7)
        self.assertEqual(leaders["rebounds"][0]["total"], 12)
        self.assertEqual(leaders["mvps"][0]["total"], 1)


class TestDatabaseLayer(unittest.TestCase):
    def setUp(self):
        import uuid
        import gc
        gc.collect()
        self.test_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", f"test_{uuid.uuid4().hex}.db"))
        self.db = Database(self.test_db_path)

    def tearDown(self):
        import gc
        gc.collect()
        if os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except Exception:
                pass

    def test_crud_tournament_and_teams(self):
        t_id = self.db.create_tournament("Tournoi Test", "basketball", "2025-2026")
        self.assertGreater(t_id, 0)

        team_id = self.db.create_team(t_id, "Team Alpha", "Meca", "ALP", "#123456")
        self.assertGreater(team_id, 0)

        # Player with NO photo (choice optional)
        p_id = self.db.create_player(team_id, "John Doe", 10, "Guard", photo_url="")
        self.assertGreater(p_id, 0)

        player = self.db.get_player(p_id)
        self.assertEqual(player["name"], "John Doe")
        self.assertEqual(player["photo_url"], "")

    def test_highlights_and_comments(self):
        t_id = self.db.create_tournament("Tournoi Highlights", "basketball", "2025-2026")
        team_id = self.db.create_team(t_id, "Bulls", "Meca", "BUL", "#ff0000")
        p_id = self.db.create_player(team_id, "Kamga", 23, "Arrière", "")

        # Create highlight
        h_id = self.db.create_highlight(
            tournament_id=t_id,
            title="Dunk explosif",
            description="Contre-attaque éclair",
            action_type="dunk",
            media_type="photo",
            media_url="/uploads/media_test.jpg",
            player_id=p_id
        )
        self.assertGreater(h_id, 0)

        # Retrieve highlight
        hl = self.db.get_highlight(h_id)
        self.assertIsNotNone(hl)
        self.assertEqual(hl["title"], "Dunk explosif")
        self.assertEqual(hl["likes_count"], 0)
        self.assertEqual(hl["player_name"], "Kamga")

        # Like highlight
        likes = self.db.like_highlight(h_id)
        self.assertEqual(likes, 1)
        likes2 = self.db.like_highlight(h_id)
        self.assertEqual(likes2, 2)

        # Add comments
        c1 = self.db.add_highlight_comment(h_id, "Arthur", "Génie Info", "Incroyable dunk !")
        c2 = self.db.add_highlight_comment(h_id, "Diane", "Génie Civil", "Trop fort !")
        self.assertGreater(c1, 0)
        self.assertGreater(c2, 0)

        comments = self.db.list_highlight_comments(h_id)
        self.assertEqual(len(comments), 2)
        self.assertEqual(comments[0]["author_name"], "Arthur")
        self.assertEqual(comments[1]["comment_text"], "Trop fort !")

        # Delete highlight (should cascade delete comments)
        self.assertTrue(self.db.delete_highlight(h_id))
        self.assertIsNone(self.db.get_highlight(h_id))
        self.assertEqual(len(self.db.list_highlight_comments(h_id)), 0)


if __name__ == "__main__":
    unittest.main()
