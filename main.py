"""
CRUD API v3  –  FastAPI + JWT Authentication + Role-Based Access Control
────────────────────────────────────────────────────────────────────────
Install deps:
    pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart

Run:
    uvicorn main:app --reload

Default seed accounts
  admin / admin123  (role: admin)
  user  / user123   (role: user)

Role permissions
  admin → full CRUD on records + can manage users
  user  → read-only on records (cannot create / edit / delete)
"""

from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import uuid

# ── JWT config ───────────────────────────────────────────
SECRET_KEY  = "change-this-in-production-please"
ALGORITHM   = "HS256"
TOKEN_EXPIRY_MINUTES = 60 * 8   # 8 hours

pwd_ctx     = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2      = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── App ──────────────────────────────────────────────────
app = FastAPI(title="CRUD API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory stores ─────────────────────────────────────
users_db: dict = {}
records_db: dict = {}


# ── Seed default accounts ────────────────────────────────
def _seed():
    for username, password, role in [
        ("admin", "admin123", "admin"),
        ("user",  "user123",  "user"),
    ]:
        uid = str(uuid.uuid4())
        users_db[username] = {
            "id": uid,
            "username": username,
            "hashed_password": pwd_ctx.hash(password),
            "role": role,
            "created_at": datetime.utcnow().isoformat(),
        }

_seed()


# ── Schemas ──────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class RegisterPayload(BaseModel):
    username: str
    password: str
    role: Optional[str] = "user"   # default role is user

class UserOut(BaseModel):
    id: str
    username: str
    role: str
    created_at: str

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
    created_by: str
    created_at: str
    updated_at: str

class PaginatedResponse(BaseModel):
    items: List[Item]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── JWT helpers ──────────────────────────────────────────

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2)) -> dict:
    creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise creds_exc
    except JWTError:
        raise creds_exc
    user = users_db.get(username)
    if not user:
        raise creds_exc
    return user

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Auth routes ──────────────────────────────────────────

@app.post("/auth/register", response_model=UserOut, status_code=201)
def register(payload: RegisterPayload):
    if payload.username in users_db:
        raise HTTPException(status_code=400, detail="Username already taken")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    # only admins can create admin accounts; default to 'user'
    role = payload.role if payload.role in ("admin", "user") else "user"
    uid = str(uuid.uuid4())
    users_db[payload.username] = {
        "id": uid,
        "username": payload.username,
        "hashed_password": pwd_ctx.hash(payload.password),
        "role": role,
        "created_at": datetime.utcnow().isoformat(),
    }
    return UserOut(**{k: v for k, v in users_db[payload.username].items() if k != "hashed_password"})

@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = users_db.get(form.username)
    if not user or not pwd_ctx.verify(form.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token({"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "username": user["username"], "role": user["role"]},
    }

@app.get("/auth/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)):
    return UserOut(**{k: v for k, v in user.items() if k != "hashed_password"})


# ── User management (admin only) ─────────────────────────

@app.get("/users", response_model=List[UserOut])
def list_users(_: dict = Depends(require_admin)):
    return [
        UserOut(**{k: v for k, v in u.items() if k != "hashed_password"})
        for u in users_db.values()
    ]

@app.delete("/users/{username}", status_code=204)
def delete_user(username: str, admin: dict = Depends(require_admin)):
    if username not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    if username == admin["username"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    del users_db[username]

@app.put("/users/{username}/role")
def change_role(username: str, body: dict, _: dict = Depends(require_admin)):
    if username not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    new_role = body.get("role")
    if new_role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'")
    users_db[username]["role"] = new_role
    return {"username": username, "role": new_role}


# ── Records routes ────────────────────────────────────────

@app.post("/items", response_model=Item, status_code=201)
def create_item(payload: ItemCreate, user: dict = Depends(require_admin)):
    """Admin only — create a record."""
    now = datetime.utcnow().isoformat()
    item = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "email": payload.email,
        "description": payload.description,
        "status": payload.status or "active",
        "created_by": user["username"],
        "created_at": now,
        "updated_at": now,
    }
    records_db[item["id"]] = item
    return item

@app.get("/items", response_model=PaginatedResponse)
def list_items(
    q: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    sort: Optional[str] = Query("newest"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    _: dict = Depends(get_current_user),   # any authenticated user
):
    items = list(records_db.values())
    if q:
        ql = q.lower()
        items = [i for i in items if
                 ql in i["name"].lower() or
                 ql in (i.get("email") or "").lower() or
                 ql in (i.get("description") or "").lower()]
    if status and status != "all":
        items = [i for i in items if i["status"] == status]
    if date:
        items = [i for i in items if i["created_at"].startswith(date)]

    if sort == "newest": items.sort(key=lambda i: i["created_at"], reverse=True)
    elif sort == "oldest": items.sort(key=lambda i: i["created_at"])
    elif sort == "az": items.sort(key=lambda i: i["name"].lower())
    elif sort == "za": items.sort(key=lambda i: i["name"].lower(), reverse=True)

    total = len(items)
    total_pages = max(1, -(-total // page_size))
    start = (page - 1) * page_size
    return PaginatedResponse(items=items[start:start+page_size],
                             total=total, page=page,
                             page_size=page_size, total_pages=total_pages)

@app.get("/items/{item_id}", response_model=Item)
def get_item(item_id: str, _: dict = Depends(get_current_user)):
    if item_id not in records_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return records_db[item_id]

@app.put("/items/{item_id}", response_model=Item)
def update_item(item_id: str, payload: ItemUpdate, _: dict = Depends(require_admin)):
    if item_id not in records_db:
        raise HTTPException(status_code=404, detail="Item not found")
    item = records_db[item_id]
    for field in ("name", "email", "description", "status"):
        val = getattr(payload, field)
        if val is not None:
            item[field] = val
    item["updated_at"] = datetime.utcnow().isoformat()
    records_db[item_id] = item
    return item

@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str, _: dict = Depends(require_admin)):
    if item_id not in records_db:
        raise HTTPException(status_code=404, detail="Item not found")
    del records_db[item_id]


# ── Run ──────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
