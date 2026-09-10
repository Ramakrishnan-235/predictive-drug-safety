import sys
from pathlib import Path

# Forwarding entrypoint to app/gnn_app.py
APP_FILE = Path(__file__).resolve().parents[2] / "app" / "gnn_app.py"

with open(APP_FILE, "r", encoding="utf-8") as f:
    code = f.read()

exec(code)
