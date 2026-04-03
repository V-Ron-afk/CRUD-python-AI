"""
CRUD API v4  –  FastAPI + JWT Auth + Roles + Analytics
────────────────────────────────────────────────────────────────────────
Install:
    pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart

Run:
    uvicorn main:app --reload

Default accounts
  admin / admin123  (role: admin)
  user  / user123   (role: user)
"""

from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from collections import defaultdict
import uuid

# ── JWT config ────────────────────────────────────────────
SECRET_KEY            = "change-this-in-production-please"
ALGORITHM             = "HS256"
TOKEN_EXPIRY_MINUTES  = 60 * 8

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2  = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ── App ───────────────────────────────────────────────────
app = FastAPI(title="CRUD API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory stores ──────────────────────────────────────
users_db:    dict = {}
records_db:  dict = {}
activity_log: list = []   # list of activity events


# ── Seed accounts ─────────────────────────────────────────
def _seed():
    for username, password, role in [
        ("admin", "admin123", "admin"),
        ("user",  "user123",  "user"),
    ]:
        now = datetime.utcnow().isoformat()
        users_db[username] = {
            "id": str(uuid.uuid4()),
            "username": username,
            "hashed_password": pwd_ctx.hash(password),
            "role": role,
            "created_at": now,
            "last_login": None,
        }

_seed()


# ── Activity logger ───────────────────────────────────────
def log_activity(actor: str, action: str, target: str = "", detail: str = ""):
    activity_log.append({
        "id": str(uuid.uuid4()),
        "actor": actor,
        "action": action,         # e.g. "created_record", "deleted_user"
        "target": target,
        "detail": detail,
        "timestamp": datetime.utcnow().isoformat(),
    })
    # keep last 200 events
    if len(activity_log) > 200:
        activity_log.pop(0)


# ── Schemas ───────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class RegisterPayload(BaseModel):
    username: str
    password: str
    role: Optional[str] = "user"

class UserOut(BaseModel):
    id: str
    username: str
    role: str
    created_at: str
    last_login: Optional[str] = None

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


# ── JWT helpers ───────────────────────────────────────────
def create_token(data: dict) -> str:
    p = data.copy()
    p["exp"] = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)
    return jwt.encode(p, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2)) -> dict:
    exc = HTTPException(status_code=401, detail="Invalid or expired token",
                        headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise exc
    except JWTError:
        raise exc
    user = users_db.get(username)
    if not user:
        raise exc
    return user

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Auth routes ───────────────────────────────────────────
@app.post("/auth/register", response_model=UserOut, status_code=201)
def register(payload: RegisterPayload):
    if payload.username in users_db:
        raise HTTPException(status_code=400, detail="Username already taken")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be ≥ 6 characters")
    role = payload.role if payload.role in ("admin", "user") else "user"
    now  = datetime.utcnow().isoformat()
    users_db[payload.username] = {
        "id": str(uuid.uuid4()),
        "username": payload.username,
        "hashed_password": pwd_ctx.hash(payload.password),
        "role": role,
        "created_at": now,
        "last_login": None,
    }
    log_activity("system", "registered", payload.username, f"role={role}")
    u = users_db[payload.username]
    return UserOut(**{k: v for k, v in u.items() if k != "hashed_password"})

@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = users_db.get(form.username)
    if not user or not pwd_ctx.verify(form.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    user["last_login"] = datetime.utcnow().isoformat()
    token = create_token({"sub": user["username"], "role": user["role"]})
    log_activity(user["username"], "login", user["username"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "username": user["username"], "role": user["role"]},
    }

@app.get("/auth/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)):
    return UserOut(**{k: v for k, v in user.items() if k != "hashed_password"})


# ── User management ───────────────────────────────────────
@app.get("/users", response_model=List[UserOut])
def list_users(_: dict = Depends(require_admin)):
    return [UserOut(**{k: v for k, v in u.items() if k != "hashed_password"})
            for u in users_db.values()]

@app.delete("/users/{username}", status_code=204)
def delete_user(username: str, admin: dict = Depends(require_admin)):
    if username not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    if username == admin["username"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    del users_db[username]
    log_activity(admin["username"], "deleted_user", username)

@app.put("/users/{username}/role")
def change_role(username: str, body: dict, admin: dict = Depends(require_admin)):
    if username not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    new_role = body.get("role")
    if new_role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'")
    old_role = users_db[username]["role"]
    users_db[username]["role"] = new_role
    log_activity(admin["username"], "changed_role", username, f"{old_role}→{new_role}")
    return {"username": username, "role": new_role}


# ── Records routes ────────────────────────────────────────
@app.post("/items", response_model=Item, status_code=201)
def create_item(payload: ItemCreate, user: dict = Depends(require_admin)):
    now = datetime.utcnow().isoformat()
    item = {
        "id": str(uuid.uuid4()), "name": payload.name,
        "email": payload.email, "description": payload.description,
        "status": payload.status or "active",
        "created_by": user["username"], "created_at": now, "updated_at": now,
    }
    records_db[item["id"]] = item
    log_activity(user["username"], "created_record", item["id"], payload.name)
    return item

@app.get("/items", response_model=PaginatedResponse)
def list_items(
    q: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    sort: Optional[str] = Query("newest"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    _: dict = Depends(get_current_user),
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
    if sort == "newest":  items.sort(key=lambda i: i["created_at"], reverse=True)
    elif sort == "oldest": items.sort(key=lambda i: i["created_at"])
    elif sort == "az":    items.sort(key=lambda i: i["name"].lower())
    elif sort == "za":    items.sort(key=lambda i: i["name"].lower(), reverse=True)
    total      = len(items)
    total_pages = max(1, -(-total // page_size))
    start       = (page - 1) * page_size
    return PaginatedResponse(items=items[start:start+page_size],
                             total=total, page=page,
                             page_size=page_size, total_pages=total_pages)

@app.get("/items/{item_id}", response_model=Item)
def get_item(item_id: str, _: dict = Depends(get_current_user)):
    if item_id not in records_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return records_db[item_id]

@app.put("/items/{item_id}", response_model=Item)
def update_item(item_id: str, payload: ItemUpdate, user: dict = Depends(require_admin)):
    if item_id not in records_db:
        raise HTTPException(status_code=404, detail="Item not found")
    item = records_db[item_id]
    for f in ("name", "email", "description", "status"):
        v = getattr(payload, f)
        if v is not None:
            item[f] = v
    item["updated_at"] = datetime.utcnow().isoformat()
    records_db[item_id] = item
    log_activity(user["username"], "updated_record", item_id, item["name"])
    return item

@app.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str, user: dict = Depends(require_admin)):
    if item_id not in records_db:
        raise HTTPException(status_code=404, detail="Item not found")
    name = records_db[item_id].get("name", "")
    del records_db[item_id]
    log_activity(user["username"], "deleted_record", item_id, name)


# ── Analytics route ───────────────────────────────────────
@app.get("/analytics")
def get_analytics(_: dict = Depends(require_admin)) -> Dict[str, Any]:
    users  = list(users_db.values())
    items  = list(records_db.values())
    now    = datetime.utcnow()

    # users
    total_users  = len(users)
    admin_count  = sum(1 for u in users if u["role"] == "admin")
    user_count   = sum(1 for u in users if u["role"] == "user")

    # records
    total_records  = len(items)
    active_records = sum(1 for i in items if i.get("status") == "active")
    arch_records   = sum(1 for i in items if i.get("status") == "archived")

    # records created per day (last 7 days)
    days_map: Dict[str, int] = {}
    for d in range(6, -1, -1):
        key = (now - timedelta(days=d)).strftime("%Y-%m-%d")
        days_map[key] = 0
    for item in items:
        day = item["created_at"][:10]
        if day in days_map:
            days_map[day] += 1
    records_per_day = [{"date": k, "count": v} for k, v in days_map.items()]

    # status breakdown
    status_breakdown = [
        {"label": "Active",   "count": active_records, "color": "#22c55e"},
        {"label": "Archived", "count": arch_records,   "color": "#999"},
    ]

    # role breakdown
    role_breakdown = [
        {"label": "Admin", "count": admin_count, "color": "#e84c1e"},
        {"label": "User",  "count": user_count,  "color": "#60a5fa"},
    ]

    # recent activity (last 20)
    recent = list(reversed(activity_log[-20:]))

    # top creators (records created per user)
    creator_counts: Dict[str, int] = defaultdict(int)
    for item in items:
        creator_counts[item.get("created_by", "unknown")] += 1
    top_creators = sorted(
        [{"username": k, "count": v} for k, v in creator_counts.items()],
        key=lambda x: x["count"], reverse=True
    )[:5]

    return {
        "users": {
            "total": total_users,
            "admins": admin_count,
            "regular_users": user_count,
            "role_breakdown": role_breakdown,
        },
        "records": {
            "total": total_records,
            "active": active_records,
            "archived": arch_records,
            "status_breakdown": status_breakdown,
            "per_day": records_per_day,
            "top_creators": top_creators,
        },
        "activity": {
            "total_events": len(activity_log),
            "recent": recent,
        },
    }


# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
