"""
AutoQuill FastAPI Server - Sequential Queue Edition (V6.0)
Global typing lock ensures profiles type one-by-one.
Watchdog auto-releases lock after 120s to prevent deadlocks.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiosqlite, pathlib, time, webbrowser, threading, asyncio, win32gui, win32api, win32con, random, logging
import pygetwindow as gw

logging.getLogger("uvicorn.access").addFilter(lambda record: "/status" not in record.getMessage())

DB_PATH = pathlib.Path(__file__).parent / "autoquill.db"
TEMPLATES_DIR = pathlib.Path(__file__).parent / "templates"

# ── Global Typing Lock ─────────────────────────────────────────────────
# Ensures only one profile types at a time across all connected extensions.
# Flow: acquire-typing-lock → os-type → release-typing-lock

typing_lock = asyncio.Lock()
lock_acquired_at: float | None = None  # timestamp of lock acquisition
lock_owner: str | None = None          # profile name that holds the lock

NEARBY_KEYS = {'q': 'wa', 'w': 'qes', 'e': 'wrsd', 'r': 'etfd', 't': 'rygf', 'y': 'tuhg', 'u': 'yijh', 'i': 'uokj', 'o': 'iplk', 'p': 'ol', 'a': 'qswz', 's': 'awedxz', 'd': 'erfcxs', 'f': 'rtgvcd', 'g': 'tyhbvf', 'h': 'yujnbg', 'j': 'uikmnh', 'k': 'iolmj', 'l': 'opk', 'z': 'asx', 'x': 'zsdc', 'c': 'xdfv', 'v': 'cfgb', 'b': 'vghn', 'n': 'bhjm', 'm': 'njk'}

# ── Watchdog: auto-release lock after 120s ─────────────────────────────

async def lock_watchdog():
    """Background task that force-releases the typing lock if held > 120s."""
    while True:
        await asyncio.sleep(10)
        global lock_acquired_at, lock_owner
        if lock_acquired_at and (time.time() - lock_acquired_at > 120):
            try:
                typing_lock.release()
                print(f"[WATCHDOG] Force-released typing lock held by '{lock_owner}' after 120s timeout")
            except RuntimeError:
                pass
            lock_acquired_at = None
            lock_owner = None

# ── Lifespan ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("CREATE TABLE IF NOT EXISTS profiles (name TEXT PRIMARY KEY, content TEXT NOT NULL DEFAULT '', updated INTEGER NOT NULL DEFAULT 0)")
        await db.commit()
    asyncio.create_task(lock_watchdog())
    threading.Thread(target=lambda: (time.sleep(1), webbrowser.open("http://localhost:8899/admin")), daemon=True).start()
    yield

app = FastAPI(title="AutoQuill Server", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Models ──────────────────────────────────────────────────────────────

class TypeOSBody(BaseModel):
    profileName: str
    content: str
    persona: dict = None

class CreateProfile(BaseModel):
    name: str

class PatchProfile(BaseModel):
    content: str

class BulkUpsertBody(BaseModel):
    text: str

class AcquireLockBody(BaseModel):
    profileName: str

# ── Basic Endpoints ─────────────────────────────────────────────────────

@app.get("/status")
def status():
    return {
        "status": "ok",
        "lock_held": typing_lock.locked(),
        "lock_owner": lock_owner,
        "lock_duration": round(time.time() - lock_acquired_at, 1) if lock_acquired_at else 0
    }

@app.get("/admin", response_class=HTMLResponse)
async def admin_page():
    return HTMLResponse(content=(TEMPLATES_DIR / "admin.html").read_text(encoding="utf-8"))

# ── Profile CRUD ────────────────────────────────────────────────────────

@app.get("/api/profiles")
async def list_profiles():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT name, content, updated FROM profiles ORDER BY name") as cursor:
            rows = await cursor.fetchall()
    return [{"name": r["name"], "content": r["content"], "updated": r["updated"]} for r in rows]

@app.get("/content")
async def get_content(profile: str):
    p_name = profile.strip()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT content FROM profiles WHERE name = ? COLLATE NOCASE", (p_name,)) as cursor:
            row = await cursor.fetchone()
    if not row: raise HTTPException(status_code=404)
    return {"content": row["content"]}

@app.post("/api/profile")
async def create_profile(body: CreateProfile):
    name = body.name.strip()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT OR IGNORE INTO profiles (name, content, updated) VALUES (?, ?, ?)", (name, "", int(time.time())))
        await db.commit()
    return {"success": True}

@app.patch("/api/profile/{name}")
async def update_profile(name: str, body: PatchProfile):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE profiles SET content=?, updated=? WHERE name=?", (body.content, int(time.time()), name))
        await db.commit()
    return {"success": True}

@app.delete("/api/profile/{name}")
async def delete_profile(name: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM profiles WHERE name=?", (name,))
        await db.commit()
    return {"success": True}

@app.post("/api/bulk-upsert")
async def bulk_upsert(body: BulkUpsertBody):
    lines = [l.strip() for l in body.text.splitlines() if l.strip()]
    now = int(time.time()); count = 0
    async with aiosqlite.connect(DB_PATH) as db:
        for l in lines:
            if "|" not in l: continue
            parts = [p.strip() for p in l.split("|") if p.strip()]
            if len(parts) < 2: continue
            name, content = parts[0], "[N]".join(parts[1:])
            await db.execute("INSERT INTO profiles (name, content, updated) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET content=excluded.content, updated=excluded.updated", (name, content, now))
            count += 1
        await db.commit()
    return {"inserted": count}

# ── Typing Lock Endpoints ──────────────────────────────────────────────

@app.post("/api/acquire-typing-lock")
async def acquire_typing_lock(body: AcquireLockBody):
    """
    Acquire the global typing lock. Blocks (long-polls) if another profile is typing.
    Returns profile content once lock is acquired.
    """
    global lock_acquired_at, lock_owner
    profile_name = body.profileName.strip()

    print(f"[LOCK] '{profile_name}' waiting for typing lock...")
    await typing_lock.acquire()
    lock_acquired_at = time.time()
    lock_owner = profile_name
    print(f"[LOCK] '{profile_name}' acquired typing lock")

    # Fetch content for the profile
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT content FROM profiles WHERE name = ? COLLATE NOCASE", (profile_name,)) as cursor:
            row = await cursor.fetchone()

    if not row:
        # Profile not found — release lock immediately
        lock_acquired_at = None
        lock_owner = None
        typing_lock.release()
        print(f"[LOCK] '{profile_name}' released lock (profile not found)")
        raise HTTPException(status_code=404, detail=f"Profile '{profile_name}' not found")

    return {"success": True, "content": row["content"]}

@app.post("/api/release-typing-lock")
async def release_typing_lock():
    """Release the global typing lock so the next profile can proceed."""
    global lock_acquired_at, lock_owner
    owner = lock_owner
    lock_acquired_at = None
    lock_owner = None
    try:
        typing_lock.release()
        print(f"[LOCK] '{owner}' released typing lock")
    except RuntimeError:
        pass  # Already released by watchdog
    return {"success": True}

# ── OS-Level Typing ────────────────────────────────────────────────────

@app.post("/api/os-type")
async def os_type(body: TypeOSBody):
    """
    Perform OS-level typing via win32api.
    Requires typing lock to be held (call acquire-typing-lock first).
    """
    # Safety check: lock must be held
    if not typing_lock.locked():
        raise HTTPException(status_code=409, detail="No typing lock held. Use /api/acquire-typing-lock first.")

    profile_name = body.profileName.strip()
    content = body.content
    persona = body.persona or {"wpm": {"min": 80, "max": 100}}

    def perform_typing():
        try:
            all_windows = gw.getAllWindows()
            target_win = next((w for w in all_windows if profile_name.lower() in w.title.lower() and "GPM-Browser" in w.title), None)
            if not target_win:
                print(f"[TYPING] No GPM window found for '{profile_name}'")
                return

            main_hwnd = target_win._hWnd
            render_hwnd = [None]
            def find_r(h, l):
                if win32gui.GetClassName(h) == "Chrome_RenderWidgetHostHWND": render_hwnd[0] = h; return False
                return True
            win32gui.EnumChildWindows(main_hwnd, find_r, None)
            target_hwnd = render_hwnd[0] or main_hwnd

            # Foreground recovery
            if target_win.isMinimized: target_win.restore()
            target_win.activate()
            time.sleep(1.0)

            win32api.PostMessage(target_hwnd, win32con.WM_SETFOCUS, 0, 0)
            time.sleep(0.2)

            print(f"[TYPING] Start: {profile_name} ({len(content)} chars)")
            min_w, max_w = persona.get("wpm", {}).get("min", 80), persona.get("wpm", {}).get("max", 110)
            def get_d(): return max(0.015, random.gauss(12.0 / random.uniform(min_w, max_w), 0.05))

            char_count = 0
            for char in content:
                # Simulate typo
                if random.random() < 0.012 and char.lower() in NEARBY_KEYS:
                    w_c = random.choice(NEARBY_KEYS[char.lower()])
                    win32api.PostMessage(target_hwnd, win32con.WM_CHAR, ord(w_c), 0); time.sleep(0.2)
                    win32api.PostMessage(target_hwnd, win32con.WM_CHAR, 8, 0); time.sleep(0.3)

                win32api.PostMessage(target_hwnd, win32con.WM_CHAR, ord(char), 0)
                char_count += 1
                d = get_d()
                if char in ".!?\n": d += 0.8
                elif char in ",;:": d += 0.3
                if char_count % 60 == 0: time.sleep(random.uniform(1, 3))
                time.sleep(d)

            print(f"[TYPING] Done: {profile_name}")
        except Exception as e:
            print(f"[TYPING] Error: {e}")

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, perform_typing)
    return {"success": True}

# ── Main ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8899, use_colors=False)
