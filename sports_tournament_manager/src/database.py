"""
SQLite Database Layer for Sports Tournament Manager.
Handles tournaments, teams, players, fixtures, match events, and awards.
"""

import sqlite3
import os
import json
from contextlib import contextmanager
from typing import List, Dict, Any, Optional

DEFAULT_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "tournament.db"))


class Database:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_schema()

    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_schema(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.executescript("""
            CREATE TABLE IF NOT EXISTS tournaments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                sport TEXT NOT NULL, -- 'football', 'basketball', 'handball', 'volleyball'
                year TEXT DEFAULT '2025-2026',
                format TEXT DEFAULT 'league', -- 'league', 'playoffs'
                status TEXT DEFAULT 'active', -- 'active', 'finished'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                filiere TEXT DEFAULT '',
                short_name TEXT DEFAULT '',
                color TEXT DEFAULT '#1e3a8a',
                logo_url TEXT DEFAULT '',
                FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                number INTEGER DEFAULT 0,
                position TEXT DEFAULT '',
                photo_url TEXT DEFAULT '',
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                round_name TEXT DEFAULT 'Journée 1',
                team_home_id INTEGER NOT NULL,
                team_away_id INTEGER NOT NULL,
                score_home INTEGER DEFAULT NULL,
                score_away INTEGER DEFAULT NULL,
                sets_detail TEXT DEFAULT NULL,
                match_date TEXT DEFAULT '',
                match_time TEXT DEFAULT '',
                venue TEXT DEFAULT '',
                status TEXT DEFAULT 'scheduled', -- 'scheduled', 'finished'
                mvp_player_id INTEGER DEFAULT NULL,
                FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
                FOREIGN KEY (team_home_id) REFERENCES teams(id) ON DELETE CASCADE,
                FOREIGN KEY (team_away_id) REFERENCES teams(id) ON DELETE CASCADE,
                FOREIGN KEY (mvp_player_id) REFERENCES players(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS match_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                match_id INTEGER NOT NULL,
                team_id INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                event_type TEXT NOT NULL, -- 'goal', 'point', 'three_pointer', 'assist', 'rebound', 'yellow_card', 'red_card', 'suspension_2min'
                minute_or_period TEXT DEFAULT '',
                count INTEGER DEFAULT 1,
                FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
                FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS weekly_awards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                week_label TEXT NOT NULL,
                player_id INTEGER NOT NULL,
                title TEXT DEFAULT 'Joueur de la Semaine',
                description TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS highlights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                match_id INTEGER DEFAULT NULL,
                player_id INTEGER DEFAULT NULL,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                action_type TEXT DEFAULT 'action', -- 'goal', 'dunk', 'three_pointer', 'save', 'assist', 'skill', 'celebration'
                media_type TEXT NOT NULL, -- 'photo', 'video', 'embed'
                media_url TEXT NOT NULL,
                likes_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
                FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS highlight_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                highlight_id INTEGER NOT NULL,
                author_name TEXT NOT NULL,
                author_filiere TEXT DEFAULT '',
                comment_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (highlight_id) REFERENCES highlights(id) ON DELETE CASCADE
            );
            """)
            conn.commit()

    # ---------------- TOURNAMENTS ----------------
    def list_tournaments(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM tournaments ORDER BY id DESC").fetchall()
            return [dict(r) for r in rows]

    def get_tournament(self, t_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM tournaments WHERE id = ?", (t_id,)).fetchone()
            return dict(row) if row else None

    def create_tournament(self, name: str, sport: str, year: str = "2025-2026", tournament_format: str = "league") -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO tournaments (name, sport, year, format) VALUES (?, ?, ?, ?)",
                (name.strip(), sport.lower().strip(), year.strip(), tournament_format.strip())
            )
            conn.commit()
            return cursor.lastrowid

    def update_tournament(self, t_id: int, name: str, year: str, status: str = "active") -> bool:
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE tournaments SET name = ?, year = ?, status = ? WHERE id = ?",
                (name.strip(), year.strip(), status, t_id)
            )
            conn.commit()
            return True

    def delete_tournament(self, t_id: int) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM tournaments WHERE id = ?", (t_id,))
            conn.commit()
            return True

    # ---------------- TEAMS ----------------
    def list_teams(self, tournament_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM teams WHERE tournament_id = ? ORDER BY name ASC",
                (tournament_id,)
            ).fetchall()
            return [dict(r) for r in rows]

    def get_team(self, team_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM teams WHERE id = ?", (team_id,)).fetchone()
            return dict(row) if row else None

    def create_team(self, tournament_id: int, name: str, filiere: str = "", short_name: str = "", color: str = "#1e3a8a", logo_url: str = "") -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if not short_name and name:
                short_name = name[:3].upper()
            cursor.execute(
                "INSERT INTO teams (tournament_id, name, filiere, short_name, color, logo_url) VALUES (?, ?, ?, ?, ?, ?)",
                (tournament_id, name.strip(), filiere.strip(), short_name.strip(), color.strip(), logo_url.strip())
            )
            conn.commit()
            return cursor.lastrowid

    def update_team(self, team_id: int, name: str, filiere: str, short_name: str, color: str, logo_url: str) -> bool:
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE teams SET name = ?, filiere = ?, short_name = ?, color = ?, logo_url = ? WHERE id = ?",
                (name.strip(), filiere.strip(), short_name.strip(), color.strip(), logo_url.strip(), team_id)
            )
            conn.commit()
            return True

    def delete_team(self, team_id: int) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM teams WHERE id = ?", (team_id,))
            conn.commit()
            return True

    # ---------------- PLAYERS ----------------
    def list_players(self, team_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM players WHERE team_id = ? ORDER BY number ASC, name ASC",
                (team_id,)
            ).fetchall()
            return [dict(r) for r in rows]

    def list_tournament_players(self, tournament_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT p.*, t.name as team_name, t.short_name as team_short, t.color as team_color
                FROM players p
                JOIN teams t ON p.team_id = t.id
                WHERE t.tournament_id = ?
                ORDER BY t.name ASC, p.number ASC
            """, (tournament_id,)).fetchall()
            return [dict(r) for r in rows]

    def get_player(self, player_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
            return dict(row) if row else None

    def create_player(self, team_id: int, name: str, number: int = 0, position: str = "", photo_url: str = "") -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO players (team_id, name, number, position, photo_url) VALUES (?, ?, ?, ?, ?)",
                (team_id, name.strip(), number, position.strip(), photo_url.strip())
            )
            conn.commit()
            return cursor.lastrowid

    def update_player(self, player_id: int, name: str, number: int, position: str, photo_url: str) -> bool:
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE players SET name = ?, number = ?, position = ?, photo_url = ? WHERE id = ?",
                (name.strip(), number, position.strip(), photo_url.strip(), player_id)
            )
            conn.commit()
            return True

    def delete_player(self, player_id: int) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM players WHERE id = ?", (player_id,))
            conn.commit()
            return True

    # ---------------- MATCHES ----------------
    def list_matches(self, tournament_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT m.*,
                       th.name as team_home_name, th.short_name as team_home_short, th.color as team_home_color, th.logo_url as team_home_logo,
                       ta.name as team_away_name, ta.short_name as team_away_short, ta.color as team_away_color, ta.logo_url as team_away_logo,
                       p.name as mvp_name, p.photo_url as mvp_photo
                FROM matches m
                JOIN teams th ON m.team_home_id = th.id
                JOIN teams ta ON m.team_away_id = ta.id
                LEFT JOIN players p ON m.mvp_player_id = p.id
                WHERE m.tournament_id = ?
                ORDER BY m.id ASC
            """, (tournament_id,)).fetchall()
            return [dict(r) for r in rows]

    def get_match(self, match_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT m.*,
                       th.name as team_home_name, th.short_name as team_home_short, th.color as team_home_color, th.logo_url as team_home_logo,
                       ta.name as team_away_name, ta.short_name as team_away_short, ta.color as team_away_color, ta.logo_url as team_away_logo,
                       p.name as mvp_name, p.photo_url as mvp_photo
                FROM matches m
                JOIN teams th ON m.team_home_id = th.id
                JOIN teams ta ON m.team_away_id = ta.id
                LEFT JOIN players p ON m.mvp_player_id = p.id
                WHERE m.id = ?
            """, (match_id,)).fetchone()
            return dict(row) if row else None

    def create_match(self, tournament_id: int, team_home_id: int, team_away_id: int, round_name: str = "Journée 1",
                     match_date: str = "", match_time: str = "", venue: str = "") -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO matches (tournament_id, team_home_id, team_away_id, round_name, match_date, match_time, venue, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
            """, (tournament_id, team_home_id, team_away_id, round_name.strip(), match_date.strip(), match_time.strip(), venue.strip()))
            conn.commit()
            return cursor.lastrowid

    def update_match_score(self, match_id: int, score_home: int, score_away: int, sets_detail: str = "",
                           status: str = "finished", mvp_player_id: Optional[int] = None) -> bool:
        with self.get_connection() as conn:
            conn.execute("""
                UPDATE matches
                SET score_home = ?, score_away = ?, sets_detail = ?, status = ?, mvp_player_id = ?
                WHERE id = ?
            """, (score_home, score_away, sets_detail.strip() if sets_detail else None, status, mvp_player_id, match_id))
            conn.commit()
            return True

    def delete_match(self, match_id: int) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM matches WHERE id = ?", (match_id,))
            conn.commit()
            return True

    # ---------------- MATCH EVENTS ----------------
    def list_match_events(self, match_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT me.*, p.name as player_name, p.number as player_number, t.name as team_name
                FROM match_events me
                JOIN players p ON me.player_id = p.id
                JOIN teams t ON me.team_id = t.id
                WHERE me.match_id = ?
                ORDER BY me.id ASC
            """, (match_id,)).fetchall()
            return [dict(r) for r in rows]

    def add_match_event(self, match_id: int, team_id: int, player_id: int, event_type: str,
                        minute_or_period: str = "", count: int = 1) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO match_events (match_id, team_id, player_id, event_type, minute_or_period, count)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (match_id, team_id, player_id, event_type.strip(), minute_or_period.strip(), count))
            conn.commit()
            return cursor.lastrowid

    def delete_match_event(self, event_id: int) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM match_events WHERE id = ?", (event_id,))
            conn.commit()
            return True

    # ---------------- WEEKLY AWARDS (JOUEURS DE LA SEMAINE) ----------------
    def list_weekly_awards(self, tournament_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT wa.*, p.name as player_name, p.number as player_number, p.photo_url as player_photo,
                       t.name as team_name, t.short_name as team_short, t.color as team_color, t.logo_url as team_logo
                FROM weekly_awards wa
                JOIN players p ON wa.player_id = p.id
                JOIN teams t ON p.team_id = t.id
                WHERE wa.tournament_id = ?
                ORDER BY wa.id DESC
            """, (tournament_id,)).fetchall()
            return [dict(r) for r in rows]

    def create_weekly_award(self, tournament_id: int, week_label: str, player_id: int, title: str, description: str = "") -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO weekly_awards (tournament_id, week_label, player_id, title, description)
                VALUES (?, ?, ?, ?, ?)
            """, (tournament_id, week_label.strip(), player_id, title.strip(), description.strip()))
            conn.commit()
            return cursor.lastrowid

    def delete_weekly_award(self, award_id: int) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM weekly_awards WHERE id = ?", (award_id,))
            conn.commit()
            return True

    # ---------------- HIGHLIGHTS & MEDIA ACTIONS ----------------
    def create_highlight(
        self,
        tournament_id: int,
        title: str,
        description: str,
        action_type: str,
        media_type: str,
        media_url: str,
        match_id: Optional[int] = None,
        player_id: Optional[int] = None
    ) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO highlights (tournament_id, match_id, player_id, title, description, action_type, media_type, media_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (tournament_id, match_id, player_id, title.strip(), description.strip(), action_type.strip(), media_type.strip(), media_url.strip()))
            conn.commit()
            return cursor.lastrowid

    def list_highlights(self, tournament_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT 
                    h.*,
                    p.name as player_name,
                    p.number as player_number,
                    p.position as player_position,
                    p.photo_url as player_photo_url,
                    tm.name as team_name,
                    tm.color as team_color,
                    tm.short_name as team_short_name,
                    (SELECT COUNT(*) FROM highlight_comments c WHERE c.highlight_id = h.id) as comments_count
                FROM highlights h
                LEFT JOIN players p ON h.player_id = p.id
                LEFT JOIN teams tm ON p.team_id = tm.id
                WHERE h.tournament_id = ?
                ORDER BY h.id DESC
            """, (tournament_id,)).fetchall()
            return [dict(r) for r in rows]

    def get_highlight(self, highlight_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT 
                    h.*,
                    p.name as player_name,
                    p.number as player_number,
                    p.photo_url as player_photo_url,
                    tm.name as team_name,
                    tm.color as team_color
                FROM highlights h
                LEFT JOIN players p ON h.player_id = p.id
                LEFT JOIN teams tm ON p.team_id = tm.id
                WHERE h.id = ?
            """, (highlight_id,)).fetchone()
            return dict(row) if row else None

    def like_highlight(self, highlight_id: int) -> int:
        with self.get_connection() as conn:
            conn.execute("UPDATE highlights SET likes_count = likes_count + 1 WHERE id = ?", (highlight_id,))
            conn.commit()
            res = conn.execute("SELECT likes_count FROM highlights WHERE id = ?", (highlight_id,)).fetchone()
            return res[0] if res else 0

    def delete_highlight(self, highlight_id: int) -> bool:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM highlights WHERE id = ?", (highlight_id,))
            conn.commit()
            return True

    # ---------------- HIGHLIGHT COMMENTS ----------------
    def add_highlight_comment(self, highlight_id: int, author_name: str, author_filiere: str, comment_text: str) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO highlight_comments (highlight_id, author_name, author_filiere, comment_text)
                VALUES (?, ?, ?, ?)
            """, (highlight_id, author_name.strip(), author_filiere.strip(), comment_text.strip()))
            conn.commit()
            return cursor.lastrowid

    def list_highlight_comments(self, highlight_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM highlight_comments
                WHERE highlight_id = ?
                ORDER BY id ASC
            """, (highlight_id,)).fetchall()
            return [dict(r) for r in rows]

    # ---------------- SEED INITIAL SAMPLE DATA ----------------
    def seed_initial_demo_if_empty(self):
        """Pre-populate a realistic basketball tournament and football tournament if DB is new."""
        with self.get_connection() as conn:
            count = conn.execute("SELECT COUNT(*) FROM tournaments").fetchone()[0]
            if count > 0:
                hl_count = conn.execute("SELECT COUNT(*) FROM highlights").fetchone()[0]
                if hl_count == 0:
                    self._seed_demo_highlights_for_existing()
                return

    def _seed_demo_highlights_for_existing(self):
        with self.get_connection() as conn:
            ts = conn.execute("SELECT id, sport FROM tournaments").fetchall()
            if not ts:
                return
            t_bb = None
            for t in ts:
                if t["sport"] == "basketball":
                    t_bb = t
                    break
            if not t_bb:
                t_bb = ts[0]
            
            t_id = t_bb["id"]
            players = conn.execute("SELECT id FROM players WHERE team_id IN (SELECT id FROM teams WHERE tournament_id = ?)", (t_id,)).fetchall()
            p1 = players[0]["id"] if players else None
            p2 = players[1]["id"] if len(players) > 1 else None

            matches = conn.execute("SELECT id FROM matches WHERE tournament_id = ?", (t_id,)).fetchall()
            m1 = matches[0]["id"] if matches else None

        h1 = self.create_highlight(
            tournament_id=t_id,
            title="Dunk spectaculaire en transition rapide !",
            description="Interception éclair qui s'envole vers le panier pour écraser un dunk magistral.",
            action_type="dunk",
            media_type="photo",
            media_url="",
            match_id=m1,
            player_id=p1
        )
        self.like_highlight(h1)
        self.like_highlight(h1)
        self.like_highlight(h1)
        self.add_highlight_comment(h1, "Arthur K.", "Génie Informatique", "L'action du match sans hésiter ! Pure puissance 🔥")
        self.add_highlight_comment(h1, "Christian F.", "Mécatronique", "Le travail d'équipe des Bulls paye enfin 💪")

        h2 = self.create_highlight(
            tournament_id=t_id,
            title="Tir clutch à 3-points au buzzer !",
            description="À 5 secondes de la fin, tir longue distance primé sous pression qui enflamme la tribune.",
            action_type="three_pointer",
            media_type="photo",
            media_url="",
            match_id=m1,
            player_id=p2
        )
        self.like_highlight(h2)
        self.like_highlight(h2)
        self.add_highlight_comment(h2, "Diane M.", "Génie Civil", "Le sang-froid incroyable de la meneuse !")

        # 1. Basketball Tournament (Inter-Filières)
        t_bb_id = self.create_tournament("Tournoi Inter-Filières de Basketball", "basketball", "2025-2026")
        
        # Teams
        tm_id = self.create_team(t_bb_id, "Mécatronique Bulls", "Génie Mécatronique", "MEC", "#dc2626")
        ti_id = self.create_team(t_bb_id, "Génie Info Lakers", "Génie Informatique", "INF", "#7c3aed")
        te_id = self.create_team(t_bb_id, "Électrotechnique Warriors", "Génie Électrique", "ELE", "#2563eb")
        tc_id = self.create_team(t_bb_id, "Génie Civil Celtics", "Génie Civil", "CIV", "#16a34a")

        # Players
        p_m1 = self.create_player(tm_id, "KAMGA Jean-Paul", 23, "Arrière", "")
        p_m2 = self.create_player(tm_id, "FOTSO Christian", 7, "Ailier", "")
        p_m3 = self.create_player(tm_id, "TCHOUA Kevin", 11, "Meneur", "")

        p_i1 = self.create_player(ti_id, "NGOUE Nathalie", 10, "Meneuse", "")
        p_i2 = self.create_player(ti_id, "BEKOLO Steve", 30, "Ailier Fort", "")
        p_i3 = self.create_player(ti_id, "YONGA Vanessa", 8, "Pivot", "")

        p_e1 = self.create_player(te_id, "ONANA Joseph", 15, "Pivot", "")
        p_c1 = self.create_player(tc_id, "MOUKOKO Diane", 5, "Meneuse", "")

        # Matches & Results
        m1 = self.create_match(t_bb_id, tm_id, ti_id, "Journée 1", "2026-10-05", "15:30", "Gymnase Central")
        self.update_match_score(m1, 74, 68, status="finished", mvp_player_id=p_m1)
        self.add_match_event(m1, tm_id, p_m1, "point", "Match", 28)
        self.add_match_event(m1, tm_id, p_m1, "three_pointer", "Match", 4)
        self.add_match_event(m1, tm_id, p_m1, "assist", "Match", 6)
        self.add_match_event(m1, tm_id, p_m2, "rebound", "Match", 9)
        self.add_match_event(m1, ti_id, p_i1, "point", "Match", 22)
        self.add_match_event(m1, ti_id, p_i1, "assist", "Match", 8)
        self.add_match_event(m1, ti_id, p_i2, "rebound", "Match", 12)

        m2 = self.create_match(t_bb_id, te_id, tc_id, "Journée 1", "2026-10-05", "17:00", "Gymnase Central")
        self.update_match_score(m2, 65, 62, status="finished", mvp_player_id=p_e1)

        m3 = self.create_match(t_bb_id, tm_id, te_id, "Journée 2", "2026-10-12", "16:00", "Gymnase Central")

        # Award
        self.create_weekly_award(
            t_bb_id,
            "Semaine 1",
            p_m1,
            "MVP de la Semaine 1",
            "Performance magistrale face aux Lakers : 28 pts, 4 tirs primés à 3-pts et 6 passes décisives."
        )

        # 2. Football Tournament
        t_fb_id = self.create_tournament("Coupe du Doyen — Football", "football", "2025-2026")
        fb_m = self.create_team(t_fb_id, "FC Mécatronique", "Mécatronique", "MEC", "#dc2626")
        fb_i = self.create_team(t_fb_id, "AS Informatique", "Informatique", "INF", "#2563eb")
        fb_p1 = self.create_player(fb_m, "ZANGA Patrick", 9, "Attaquant", "")
        fb_p2 = self.create_player(fb_i, "KENMOE Arthur", 10, "Milieu", "")
        m_fb = self.create_match(t_fb_id, fb_m, fb_i, "Poule A - J1", "2026-10-06", "16:00", "Stade Campus")
        self.update_match_score(m_fb, 2, 1, status="finished", mvp_player_id=fb_p1)
        self.add_match_event(m_fb, fb_m, fb_p1, "goal", "24'", 1)
        self.add_match_event(m_fb, fb_m, fb_p1, "goal", "68'", 1)
        self.add_match_event(m_fb, fb_i, fb_p2, "goal", "41'", 1)

        # 3. Highlights & Belles Actions Demo
        h1 = self.create_highlight(
            tournament_id=t_bb_id,
            title="Dunk spectaculaire en transition rapide !",
            description="Interception éclair de KAMGA Jean-Paul qui s'envole vers le panier pour écraser un dunk magistral.",
            action_type="dunk",
            media_type="photo",
            media_url="",
            match_id=m1,
            player_id=p_m1
        )
        self.like_highlight(h1)
        self.like_highlight(h1)
        self.like_highlight(h1)
        self.add_highlight_comment(h1, "Arthur K.", "Génie Informatique", "L'action du match sans hésiter ! Pure puissance 🔥")
        self.add_highlight_comment(h1, "Christian F.", "Mécatronique", "Le travail d'équipe des Bulls paye enfin 💪")

        h2 = self.create_highlight(
            tournament_id=t_bb_id,
            title="Tir clutch à 3-points au buzzer !",
            description="À 5 secondes de la fin, tir longue distance primé de Nathalie NGOUE sous pression.",
            action_type="three_pointer",
            media_type="photo",
            media_url="",
            match_id=m1,
            player_id=p_i1
        )
        self.like_highlight(h2)
        self.like_highlight(h2)
        self.add_highlight_comment(h2, "Diane M.", "Génie Civil", "Le sang-froid incroyable de la meneuse !")

        h3 = self.create_highlight(
            tournament_id=t_fb_id,
            title="Lucarne magistrale sur coup franc direct",
            description="Frappe enroulée imparable de Patrick ZANGA à 25 mètres du but.",
            action_type="goal",
            media_type="photo",
            media_url="",
            match_id=m_fb,
            player_id=fb_p1
        )
        self.like_highlight(h3)
        self.add_highlight_comment(h3, "Steve B.", "Génie Mécatronique", "Frappe de grande classe internationale ⚽🚀")
