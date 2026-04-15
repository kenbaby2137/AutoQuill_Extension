"""
AutoQuill FastAPI Server - Stable Edition (V5.0)
Quay lại cơ chế Foreground, gõ từng Profile để đảm bảo ổn định 100%.
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

IS_SERVER_TYPING = False # Khóa bảo vệ phía Server

NEARBY_KEYS = {'q': 'wa', 'w': 'qes', 'e': 'wrsd', 'r': 'etfd', 't': 'rygf', 'y': 'tuhg', 'u': 'yijh', 'i': 'uokj', 'o': 'iplk', 'p': 'ol', 'a': 'qswz', 's': 'awedxz', 'd': 'erfcxs', 'f': 'rtgvcd', 'g': 'tyhbvf', 'h': 'yujnbg', 'j': 'uikmnh', 'k': 'iolmj', 'l': 'opk', 'z': 'asx', 'x': 'zsdc', 'c': 'xdfv', 'v': 'cfgb', 'b': 'vghn', 'n': 'bhjm', 'm': 'njk'}

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("CREATE TABLE IF NOT EXISTS profiles (name TEXT PRIMARY KEY, content TEXT NOT NULL DEFAULT '', updated INTEGER NOT NULL DEFAULT 0)")
        await db.commit()
    threading.Thread(target=lambda: (time.sleep(1), webbrowser.open("http://localhost:8899/admin")), daemon=True).start()
    yield

app = FastAPI(title="AutoQuill Server", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

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

@app.get("/status")
def status(): return {"status": "ok"}

@app.get("/admin", response_class=HTMLResponse)
async def admin_page():
    return HTMLResponse(content=(TEMPLATES_DIR / "admin.html").read_text(encoding="utf-8"))

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

@app.post("/api/os-type")
async def os_type(body: TypeOSBody):
    global IS_SERVER_TYPING
    if IS_SERVER_TYPING: raise HTTPException(status_code=429, detail="Server is busy typing")
    
    profile_name, content, persona = body.profileName.strip(), body.content, body.persona or {"wpm": {"min": 80, "max": 100}}
    
    def perform_typing():
        global IS_SERVER_TYPING
        IS_SERVER_TYPING = True
        try:
            all_windows = gw.getAllWindows()
            target_win = next((w for w in all_windows if profile_name.lower() in w.title.lower() and "GPM-Browser" in w.title), None)
            if not target_win: return
            
            main_hwnd = target_win._hWnd
            render_hwnd = [None]
            def find_r(h, l):
                if win32gui.GetClassName(h) == "Chrome_RenderWidgetHostHWND": render_hwnd[0] = h; return False
                return True
            win32gui.EnumChildWindows(main_hwnd, find_r, None)
            target_hwnd = render_hwnd[0] or main_hwnd

            # 🛠 FOREGROUND RECOVERY (Đảm bảo không mất chữ)
            if target_win.isMinimized: target_win.restore()
            target_win.activate() # Đưa lên trên cùng
            time.sleep(1.0)
            
            # Gửi focus vào Renderer
            win32api.PostMessage(target_hwnd, win32con.WM_SETFOCUS, 0, 0)
            time.sleep(0.2)
            
            print(f"[TYPING] Stable start: {profile_name}")
            min_w, max_w = persona.get("wpm", {}).get("min", 80), persona.get("wpm", {}).get("max", 110)
            def get_d(): return max(0.015, random.gauss(12.0 / random.uniform(min_w, max_w), 0.05))

            char_count = 0
            for char in content:
                # Gõ nhầm giả lập
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
                
            print(f"[TYPING] Success: {profile_name}")
        except: pass
        finally:
            IS_SERVER_TYPING = False

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, perform_typing)
    return {"success": True}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8899, use_colors=False)
