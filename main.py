from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Database Setup ---
def get_db():
    """Opens a connection to the SQLite database file."""
    conn = sqlite3.connect("swim.db")
    conn.row_factory = sqlite3.Row  # lets us access columns by name
    return conn


def init_db():
    """
    
    """

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            heat INTEGER NOT NULL,
            gender TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS event_swimmers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            gender TEXT NOT NULL,
            lane INTEGER NOT NULL,
            team TEXT,
            seed_time TEXT,
            actual_time TEXT,
            relay_order INTEGER DEFAULT NULL,
            FOREIGN KEY (event_id) REFERENCES events(id)
        )
    """)

    conn.commit()
    conn.close()

init_db()  # run this when the server starts


# --- Data Model ---
class Event(BaseModel):
    name: str
    heat: int
    gender: str


class Swimmer(BaseModel):
    event_id: int
    name: str
    gender: str
    lane: int
    team: Optional[str] = None
    seed_time: Optional[str] = None
    actual_time: Optional[str] = None
    relay_order: Optional[int] = None


# --- Serve the Frontend ---
@app.get("/")
def serve_frontend():
    return FileResponse("index.html")


# --- API Routes ---

@app.get("/events")
def get_tasks():
    """
    
    """

    conn = get_db()

    events = conn.execute("SELECT * FROM events ORDER BY heat").fetchall()

    conn.close()
    return [dict(event) for event in events]


@app.post("/events")
def create_event(event: Event):
    """
    
    """

    conn = get_db()

    cursor = conn.execute(
        "INSERT INTO events (name, heat, gender) VALUES (?, ?, ?)",
        (event.name, event.heat, event.gender)
    )

    conn.commit()
    new_id = cursor.lastrowid

    conn.close()
    return {"id": new_id, **event.dict()}


@app.put("/events/{event_id}")
def update_event(event_id: int, event: Event):
    """
    
    """

    conn = get_db()

    result = conn.execute(
        "UPDATE events SET name = ?, heat = ?, gender = ? WHERE id = ?",
        (event.name, event.heat, event.gender, event_id)
    )

    conn.commit()
    conn.close()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"id": event_id, **event.dict()}


@app.delete("/events/{event_id}")
def delete_event(event_id: int):
    """
    
    """

    conn = get_db()

    conn.execute("DELETE FROM event_swimmers WHERE event_id = ?", (event_id,))
    result = conn.execute("DELETE FROM events WHERE id = ?", (event_id,))

    conn.commit()
    conn.close()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}


# --- Swimmer Routes ---
@app.get("/events/{event_id}/swimmers")
def get_swimmers(event_id: int):
    """
    
    """
    
    conn = get_db()
    
    swimmers = conn.execute(
        "SELECT * FROM event_swimmers WHERE event_id = ? ORDER BY lane",
        (event_id,)
    ).fetchall()

    conn.close()
    return [dict(s) for s in swimmers]


@app.post("/swimmers")
def create_swimmer(swimmer: Swimmer):
    """
    
    """
    conn = get_db()
    
    cursor = conn.execute(
        "INSERT INTO event_swimmers (event_id, name, gender, lane, team, seed_time, actual_time, relay_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (swimmer.event_id, swimmer.name, swimmer.gender, swimmer.lane, swimmer.team, swimmer.seed_time, swimmer.actual_time, swimmer.relay_order)
    )

    conn.commit()
    new_id = cursor.lastrowid

    conn.close()
    return {"id": new_id, **swimmer.dict()}


@app.put("/swimmers/{swimmer_id}")
def update_swimmer(swimmer_id: int, swimmer: Swimmer):
    """
    
    """

    conn = get_db()

    result = conn.execute(
        "UPDATE event_swimmers SET name = ?, gender = ?, lane = ?, team = ?, seed_time = ?, actual_time = ?, relay_order = ? WHERE id = ?",
        (swimmer.name, swimmer.gender, swimmer.lane, swimmer.team, swimmer.seed_time, swimmer.actual_time, swimmer.relay_order, swimmer_id)
    )

    conn.commit()
    conn.close()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Swimmer not found")
    return {"id": swimmer_id, **swimmer.dict()}


@app.delete("/swimmers/{swimmer_id}")
def delete_swimmer(swimmer_id: int):
    """
    
    """
    
    conn = get_db()
    
    result = conn.execute("DELETE FROM event_swimmers WHERE id = ?", (swimmer_id,))
    
    conn.commit()
    conn.close()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Swimmer not found")
    return {"message": "Swimmer deleted"}