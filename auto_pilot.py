#!/usr/bin/env python3
"""
GitHub push + Render env checklist — minimal prompts for non-technical users.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FINAL_CONFIG = ROOT / "FINAL_CONFIG.txt"

PROMPT_KA = (
    "გთხოვთ, შექმენით ცარიელი რეპოზიტორიი GitHub-ზე და ჩამიწერეთ აქ ლინკი:\n"
)


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, **kw)


def ensure_git_commit() -> None:
    if not (ROOT / ".git").is_dir():
        r = run(["git", "init", "-b", "main"])
        if r.returncode != 0:
            r = run(["git", "init"])
            if r.returncode != 0:
                print(r.stderr or r.stdout)
                sys.exit(1)
        print("[auto_pilot] git init ✓")

    run(["git", "add", "-A"])
    st = run(["git", "diff", "--cached", "--quiet"])
    if st.returncode == 0:
        print("[auto_pilot] ცვლილებები არ არის commit-ისთვის.")
    else:
        r = run(["git", "commit", "-m", "auto_pilot: initial project snapshot"])
        if r.returncode != 0:
            print(r.stderr or r.stdout)
            sys.exit(1)
        print("[auto_pilot] პირველი commit ✓")

    run(["git", "branch", "-M", "main"])


def normalize_remote(url: str) -> str:
    u = url.strip().strip('"').strip("'").rstrip("/")
    while "https://github.com/https://" in u:
        u = u.replace("https://github.com/https://", "https://", 1)
    if not u:
        return ""
    if u.startswith("git@"):
        return u if u.endswith(".git") else u + ".git"
    if "github.com" in u and not u.endswith(".git"):
        u += ".git"
    return u


def parse_remote(url: str) -> str | None:
    u = normalize_remote(url)
    if not u:
        return None
    if u.startswith("git@"):
        return u if u.endswith(".git") else u + ".git"
    if not u.startswith("https://github.com/"):
        print(
            "[auto_pilot] ლინკი ვერ გავიგე — გამოიყენეთ "
            "https://github.com/user/repo ან git@github.com:user/repo.git"
        )
        return None
    tail = u.removeprefix("https://github.com/").split("?", 1)[0].strip("/")
    tail = tail[:-4] if tail.endswith(".git") else tail
    parts = [p for p in tail.split("/") if p]
    if len(parts) >= 2:
        return f"https://github.com/{parts[0]}/{parts[1]}.git"
    print(
        "[auto_pilot] ლინკი ვერ გავიგე — გამოიყენეთ "
        "https://github.com/user/repo ან git@github.com:user/repo.git"
    )
    return None


def git_push(remote_url: str) -> None:
    parsed = parse_remote(remote_url)
    if not parsed:
        sys.exit(1)
    run(["git", "remote", "remove", "origin"])
    r = run(["git", "remote", "add", "origin", parsed])
    if r.returncode != 0:
        print(r.stderr or r.stdout)
        sys.exit(1)
    print("[auto_pilot] remote origin დაყენდა ✓")
    p = subprocess.run(
        ["git", "push", "-u", "origin", "main"],
        cwd=ROOT,
        text=True,
    )
    if p.returncode != 0:
        sys.exit(p.returncode)
    print("[auto_pilot] push დასრულდა ✓")


def write_final_config() -> None:
    backend_example = (ROOT / "backend" / ".env.example").read_text(encoding="utf-8").strip()
    text = f"""# FINAL_CONFIG — Render.com → Web Service → Environment
# ჩასვით ეს გასაღებები Render Dashboard-ში (Environment Variables).

# --- Backend (Rust სერვისი, render.yaml: dockerContext = repo root, Dockerfile ფაილი root-ში) ---
TATUM_API_KEY=
# Tatum Dashboard-დან API გასაღები (x-api-key).

# --- Frontend build (Vercel / Netlify / სხვა — Build Environment) ---
NEXT_PUBLIC_API_URL=
# მაგალითი: https://p2p-remittance-backend-xxxx.onrender.com
# (ბოლოში სლეში არ დასვათ)

# --- ლოკალური backend/.env შაბლონი (სურვილისამებრ) ---
# შინაარსი backend/.env.example:
# ---
{backend_example}
# ---

# შენიშვნა: ამ ფაილს არ უნდა მოხდეს git push სენსიტიური მნიშვნელობებით — შეავსეთ მხოლოდ Render-ზე.
"""
    FINAL_CONFIG.write_text(text, encoding="utf-8")
    print(f"[auto_pilot] შექმნილია {FINAL_CONFIG.name} ✓")


def main() -> None:
    os.chdir(ROOT)
    write_final_config()
    ensure_git_commit()

    url = ""
    if len(sys.argv) > 1:
        url = sys.argv[1].strip()
    elif os.environ.get("GITHUB_REPO_URL", "").strip():
        url = os.environ["GITHUB_REPO_URL"].strip()

    if not url:
        sys.stdout.write("\n")
        sys.stdout.flush()
        print(PROMPT_KA)
        sys.stdout.flush()
        try:
            url = input().strip()
        except EOFError:
            print(
                "[auto_pilot] ინტერაქტიული შეყვანა არ ხელმისაწვდომია. "
                "გაუშვით ხელახლა ტერმინალში: python3 auto_pilot.py"
            )
            print("ან მიუთითეთ ლინკი არგუმენტად: python3 auto_pilot.py https://github.com/USER/REPO.git")
            return

    if url:
        git_push(url)


if __name__ == "__main__":
    main()
