"""
Backend HTTP Server and REST API for Sports Tournament Manager.
Built using standard library http.server for 100% reliable, zero-dependency offline execution.
"""

import os
import sys
import json
import base64
import socket
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from typing import Dict, Any, List, Optional

from database import Database
from sports_engine import SportsEngine

def get_local_ip() -> str:
    """Detect local Wi-Fi / Hotspot / LAN IP of this PC."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("172.20.10.1", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    try:
        ip = socket.gethostbyname(socket.gethostname())
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    return "127.0.0.1"

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Initialize database and seed demo data if empty
db = Database()
db.seed_initial_demo_if_empty()


class SportsAppRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, data: Any, status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _send_bytes(self, data: bytes, content_type: str):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # ---------------- API ROUTES ----------------
        if path == "/api/tournaments":
            tournaments = db.list_tournaments()
            self._send_json(tournaments)
            return

        elif path == "/api/network-info":
            ip = get_local_ip()
            curr_port = self.server.server_port
            self._send_json({
                "local_ip": ip,
                "port": curr_port,
                "local_url": f"http://127.0.0.1:{curr_port}",
                "network_url": f"http://{ip}:{curr_port}/public"
            })
            return

        elif path.startswith("/api/tournament/") and path.endswith("/full"):
            t_id = int(path.split("/")[3])
            t = db.get_tournament(t_id)
            if not t:
                self._send_json({"error": "Tournament not found"}, 404)
                return

            teams = db.list_teams(t_id)
            players = db.list_tournament_players(t_id)
            matches = db.list_matches(t_id)
            awards = db.list_weekly_awards(t_id)

            # Collect match events for all matches in tournament
            all_events = []
            for m in matches:
                evs = db.list_match_events(m["id"])
                all_events.extend(evs)

            standings = SportsEngine.calculate_standings(t["sport"], teams, matches)
            leaders = SportsEngine.calculate_leaderboards(t["sport"], all_events, matches)
            highlights = db.list_highlights(t_id)
            for h in highlights:
                h["comments"] = db.list_highlight_comments(h["id"])

            self._send_json({
                "tournament": t,
                "teams": teams,
                "players": players,
                "matches": matches,
                "standings": standings,
                "leaders": leaders,
                "awards": awards,
                "highlights": highlights
            })
            return

        elif path.startswith("/api/tournament/") and path.endswith("/standings"):
            t_id = int(path.split("/")[3])
            t = db.get_tournament(t_id)
            if not t:
                self._send_json({"error": "Tournament not found"}, 404)
                return
            teams = db.list_teams(t_id)
            matches = db.list_matches(t_id)
            standings = SportsEngine.calculate_standings(t["sport"], teams, matches)
            self._send_json(standings)
            return

        elif path.startswith("/api/match/") and path.endswith("/events"):
            m_id = int(path.split("/")[3])
            events = db.list_match_events(m_id)
            self._send_json(events)
            return

        elif path == "/api/highlights":
            query = urllib.parse.parse_qs(parsed.query)
            t_id = int(query.get("tournament_id", [0])[0])
            highlights = db.list_highlights(t_id)
            for h in highlights:
                h["comments"] = db.list_highlight_comments(h["id"])
            self._send_json(highlights)
            return

        elif path.startswith("/api/highlights/") and path.endswith("/comments"):
            h_id = int(path.split("/")[3])
            comments = db.list_highlight_comments(h_id)
            self._send_json(comments)
            return

        elif path.startswith("/uploads/"):
            filename = os.path.basename(path)
            file_path = os.path.join(UPLOADS_DIR, filename)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                ext = os.path.splitext(filename)[1].lower()
                mime = {
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".webp": "image/webp",
                    ".gif": "image/gif",
                    ".svg": "image/svg+xml",
                    ".mp4": "video/mp4",
                    ".webm": "video/webm",
                    ".mov": "video/quicktime",
                    ".m4v": "video/x-m4v"
                }.get(ext, "application/octet-stream")
                with open(file_path, "rb") as f:
                    self._send_bytes(f.read(), mime)
                return
            else:
                self.send_error(404, "File not found")
                return

        # ---------------- HTML VIEWS ----------------
        if path == "/":
            self.path = "/index.html"
        elif path == "/public":
            self.path = "/public.html"

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            data = {}

        if path == "/api/tournaments":
            t_id = db.create_tournament(
                name=data.get("name", "Nouveau Tournoi"),
                sport=data.get("sport", "football"),
                year=data.get("year", "2025-2026"),
                tournament_format=data.get("format", "league")
            )
            self._send_json({"status": "ok", "id": t_id})
            return

        elif path == "/api/teams":
            team_id = db.create_team(
                tournament_id=int(data.get("tournament_id")),
                name=data.get("name", ""),
                filiere=data.get("filiere", ""),
                short_name=data.get("short_name", ""),
                color=data.get("color", "#1e3a8a"),
                logo_url=data.get("logo_url", "")
            )
            self._send_json({"status": "ok", "id": team_id})
            return

        elif path == "/api/players":
            p_id = db.create_player(
                team_id=int(data.get("team_id")),
                name=data.get("name", ""),
                number=int(data.get("number", 0)),
                position=data.get("position", ""),
                photo_url=data.get("photo_url", "")
            )
            self._send_json({"status": "ok", "id": p_id})
            return

        elif path == "/api/matches":
            m_id = db.create_match(
                tournament_id=int(data.get("tournament_id")),
                team_home_id=int(data.get("team_home_id")),
                team_away_id=int(data.get("team_away_id")),
                round_name=data.get("round_name", "Journée 1"),
                match_date=data.get("match_date", ""),
                match_time=data.get("match_time", ""),
                venue=data.get("venue", "")
            )
            self._send_json({"status": "ok", "id": m_id})
            return

        elif path == "/api/match-events":
            ev_id = db.add_match_event(
                match_id=int(data.get("match_id")),
                team_id=int(data.get("team_id")),
                player_id=int(data.get("player_id")),
                event_type=data.get("event_type", "point"),
                minute_or_period=data.get("minute_or_period", ""),
                count=int(data.get("count", 1))
            )
            self._send_json({"status": "ok", "id": ev_id})
            return

        elif path == "/api/awards":
            aw_id = db.create_weekly_award(
                tournament_id=int(data.get("tournament_id")),
                week_label=data.get("week_label", "Semaine 1"),
                player_id=int(data.get("player_id")),
                title=data.get("title", "Joueur de la Semaine"),
                description=data.get("description", "")
            )
            self._send_json({"status": "ok", "id": aw_id})
            return

        elif path == "/api/highlights":
            h_id = db.create_highlight(
                tournament_id=int(data.get("tournament_id")),
                title=data.get("title", ""),
                description=data.get("description", ""),
                action_type=data.get("action_type", "action"),
                media_type=data.get("media_type", "photo"),
                media_url=data.get("media_url", ""),
                match_id=int(data.get("match_id")) if data.get("match_id") else None,
                player_id=int(data.get("player_id")) if data.get("player_id") else None
            )
            self._send_json({"status": "ok", "id": h_id})
            return

        elif path.startswith("/api/highlights/") and path.endswith("/like"):
            h_id = int(path.split("/")[3])
            likes = db.like_highlight(h_id)
            self._send_json({"status": "ok", "likes_count": likes})
            return

        elif path.startswith("/api/highlights/") and path.endswith("/comments"):
            h_id = int(path.split("/")[3])
            c_id = db.add_highlight_comment(
                highlight_id=h_id,
                author_name=data.get("author_name", "Étudiant"),
                author_filiere=data.get("author_filiere", ""),
                comment_text=data.get("comment_text", "")
            )
            self._send_json({"status": "ok", "comment_id": c_id})
            return

        elif path in ("/api/upload-image", "/api/upload-media"):
            filename = data.get("filename", "upload.jpg")
            b64_data = data.get("data", "")
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]
            file_bytes = base64.b64decode(b64_data)

            ext = os.path.splitext(filename)[1].lower() or ".jpg"
            clean_name = f"media_{abs(hash(filename + str(len(file_bytes))))}{ext}"
            file_path = os.path.join(UPLOADS_DIR, clean_name)
            with open(file_path, "wb") as f:
                f.write(file_bytes)

            self._send_json({"status": "ok", "url": f"/uploads/{clean_name}"})
            return

        self.send_error(404, "Endpoint not found")

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            data = {}

        if path.startswith("/api/matches/") and path.endswith("/score"):
            m_id = int(path.split("/")[3])
            db.update_match_score(
                match_id=m_id,
                score_home=int(data.get("score_home", 0)),
                score_away=int(data.get("score_away", 0)),
                sets_detail=data.get("sets_detail", ""),
                status=data.get("status", "finished"),
                mvp_player_id=int(data.get("mvp_player_id")) if data.get("mvp_player_id") else None
            )
            self._send_json({"status": "ok"})
            return

        elif path.startswith("/api/teams/"):
            team_id = int(path.split("/")[3])
            db.update_team(
                team_id=team_id,
                name=data.get("name", ""),
                filiere=data.get("filiere", ""),
                short_name=data.get("short_name", ""),
                color=data.get("color", "#1e3a8a"),
                logo_url=data.get("logo_url", "")
            )
            self._send_json({"status": "ok"})
            return

        elif path.startswith("/api/players/"):
            p_id = int(path.split("/")[3])
            db.update_player(
                player_id=p_id,
                name=data.get("name", ""),
                number=int(data.get("number", 0)),
                position=data.get("position", ""),
                photo_url=data.get("photo_url", "")
            )
            self._send_json({"status": "ok"})
            return

        self.send_error(404, "Endpoint not found")

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/tournaments/"):
            t_id = int(path.split("/")[3])
            db.delete_tournament(t_id)
            self._send_json({"status": "ok"})
            return

        elif path.startswith("/api/teams/"):
            team_id = int(path.split("/")[3])
            db.delete_team(team_id)
            self._send_json({"status": "ok"})
            return

        elif path.startswith("/api/players/"):
            p_id = int(path.split("/")[3])
            db.delete_player(p_id)
            self._send_json({"status": "ok"})
            return

        elif path.startswith("/api/matches/"):
            m_id = int(path.split("/")[3])
            db.delete_match(m_id)
            self._send_json({"status": "ok"})
            return

        elif path.startswith("/api/match-events/"):
            ev_id = int(path.split("/")[3])
            db.delete_match_event(ev_id)
            self._send_json({"status": "ok"})
            return

        elif path.startswith("/api/awards/"):
            aw_id = int(path.split("/")[3])
            db.delete_weekly_award(aw_id)
            self._send_json({"status": "ok"})
            return

        elif path.startswith("/api/highlights/"):
            h_id = int(path.split("/")[3])
            db.delete_highlight(h_id)
            self._send_json({"status": "ok"})
            return

        self.send_error(404, "Endpoint not found")


def release_port_if_busy(port: int) -> None:
    """Libère le port sous Windows si un ancien processus orphelin écoute dessus."""
    if sys.platform == "win32":
        try:
            import subprocess
            out = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True, text=True, stderr=subprocess.DEVNULL)
            curr_pid = os.getpid()
            for line in out.strip().splitlines():
                parts = line.strip().split()
                if len(parts) >= 5 and "LISTENING" in parts:
                    pid = int(parts[-1])
                    if pid != curr_pid and pid > 4:
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
                        import time
                        time.sleep(0.3)
        except Exception:
            pass


class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def run(port: int = 8080):
    release_port_if_busy(port)
    ip = get_local_ip()
    server_address = ("0.0.0.0", port)
    ReusableHTTPServer.allow_reuse_address = True

    try:
        httpd = ReusableHTTPServer(server_address, SportsAppRequestHandler)
    except OSError as e:
        print(f"\n[ERREUR] Impossible d'ouvrir le port {port} : {e}")
        print("Veuillez vérifier qu'aucune autre application n'utilise ce port.")
        sys.exit(1)

    print("=" * 68)
    print("   INSTITUT UNIVERSITAIRE SAINT JEROME DE DOUALA")
    print("   GESTIONNAIRE DE TOURNOIS SPORTIFS EN LIGNE (Foot, Basket, Hand, Volley)")
    print("=" * 68)
    print(f" -> Sur ce PC (Edge / Chrome) :            http://127.0.0.1:{port}")
    print(f" -> Sur votre iPhone/smartphone (Safari) : http://{ip}:{port}/public")
    print("=" * 68)
    print(" ACCES DEPUIS VOTRE IPHONE / TELEPHONE :")
    print(" 1. Votre telephone et votre PC doivent etre sur le meme reseau")
    print("    (ex: partage de connexion iPhone ou meme Wi-Fi).")
    print(" 2. Sur Safari, ouvrez l'adresse réseau :")
    print(f"    http://{ip}:{port}/public")
    print("=" * 68)
    print(" Pour arreter le serveur, fermez simplement cette fenetre ou faites Ctrl+C.")
    print("=" * 68)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt du serveur Tournois...")
    finally:
        httpd.server_close()
        print("Serveur arrêté et port libéré proprement.")


if __name__ == "__main__":
    env_port = os.environ.get("PORT")
    if env_port:
        port = int(env_port)
    else:
        port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run(port)

