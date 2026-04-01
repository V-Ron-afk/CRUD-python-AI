from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
from datetime import datetime

app = FastAPI(title="CRUD API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup Event ───────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    print("\n" + "="*50)
    print("✅ CRUD API is now running!")
    print("🔗 Server: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("="*50 + "\n")

# ── In-memory store ──────────────────────────────────────
db: dict = {}


# ── Schemas ──────────────────────────────────────────────
class ItemCreate(BaseModel):
    name: str
    email: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "active"


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class Item(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    description: Optional[str] = None
    status: str
    created_at: str
    updated_at: str


class PaginatedResponse(BaseModel):
    items: List[Item]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Routes ───────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "CRUD API v2 is running 🚀"}


@app.get("/health")
def health_check():
    """Health check endpoint to verify API status"""
    return {
        "status": "ok",
        "api": "CRUD API v2",
        "message": "API is working correctly ✅"
    }


# CREATE
@app.post("/items", response_model=Item, status_code=201)
def create_item(payload: ItemCreate):
    now = datetime.utcnow().isoformat()
    item = Item(
        id=str(uuid.uuid4()),
        name=payload.name,
        email=payload.email,
        description=payload.description,
        status=payload.status or "active",
        created_at=now,
        updated_at=now,
    )
    db[item.id] = item.dict()
    return item


# READ ALL — with optional server-side search, filter, sort, pagination
@app.get("/items", response_model=PaginatedResponse)
def list_items(
    q: Optional[str] = Query(None, description="Search name, email, description"),
    status: Optional[str] = Query(None, description="Filter by status"),
    date: Optional[str] = Query(None, description="Filter by created date (YYYY-MM-DD)"),
    sort: Optional[str] = Query("newest", description="newest | oldest | az | za"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
):
    items = list(db.values())

    # search
    if q:
        ql = q.lower()
        items = [
            i for i in items
            if ql in i["name"].lower()
            or ql in (i.get("email") or "").lower()
            or ql in (i.get("description") or "").lower()
        ]

    # status filter
    if status and status != "all":
        items = [i for i in items if i["status"] == status]

    # date filter
    if date:
        items = [i for i in items if i["created_at"].startswith(date)]

    # sort
    if sort == "newest":
        items.sort(key=lambda i: i["created_at"], reverse=True)
    elif sort == "oldest":
        items.sort(key=lambda i: i["created_at"])
    elif sort == "az":
        items.sort(key=lambda i: i["name"].lower())
    elif sort == "za":
        items.sort(key=lambda i: i["name"].lower(), reverse=True)

    total = len(items)
    total_pages = max(1, -(-total // page_size))  # ceiling division
    start = (page - 1) * page_size
    paginated = items[start: start + page_size]

    return PaginatedResponse(
        items=paginated,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# READ ONE
@app.get("/items/{item_id}", response_model=Item)
def get_item(item_id: str):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    return db[item_id]


# UPDATE
@app.put("/items/{item_id}", response_model=Item)
def update_item(item_id: str, payload: ItemUpdate):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    stored = db[item_id]
    for field in ("name", "email", "description", "status"):
        val = getattr(payload, field)
        if val is not None:
            stored[field] = val
    stored["updated_at"] = datetime.utcnow().isoformat()
    db[item_id] = stored
    return stored


# DELETE
@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    del db[item_id]


# ── Run ──────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
