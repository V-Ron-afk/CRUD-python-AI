from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

app = FastAPI(title="CRUD API", version="1.0.0")

# Allow all origins for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# In-memory "database"
# ──────────────────────────────────────────────
db: dict = {}


# ──────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────
class ItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "active"  # active | archived


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class Item(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: str
    created_at: str
    updated_at: str


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "CRUD API is running 🚀"}


# CREATE
@app.post("/items", response_model=Item, status_code=201)
def create_item(payload: ItemCreate):
    now = datetime.utcnow().isoformat()
    item = Item(
        id=str(uuid.uuid4()),
        name=payload.name,
        description=payload.description,
        status=payload.status or "active",
        created_at=now,
        updated_at=now,
    )
    db[item.id] = item.dict()
    return item


# READ ALL
@app.get("/items", response_model=List[Item])
def list_items():
    return list(db.values())


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
    if payload.name is not None:
        stored["name"] = payload.name
    if payload.description is not None:
        stored["description"] = payload.description
    if payload.status is not None:
        stored["status"] = payload.status
    stored["updated_at"] = datetime.utcnow().isoformat()
    db[item_id] = stored
    return stored


# DELETE
@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    del db[item_id]


# ──────────────────────────────────────────────
# Run with:  uvicorn main:app --reload
# ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
