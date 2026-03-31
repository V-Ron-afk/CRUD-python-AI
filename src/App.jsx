import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://localhost:8000";

const STATUS_COLORS = {
  active: { bg: "#d4f7e0", text: "#0a6636", dot: "#22c55e" },
  archived: { bg: "#f0f0f0", text: "#666", dot: "#999" },
};

function getInitialsAvatar(name) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const colors = [
    ["#e84c1e", "#f5a623"], ["#0a6636", "#22c55e"], ["#1a3a8f", "#60a5fa"],
    ["#7c1fa8", "#e879f9"], ["#b45309", "#fbbf24"], ["#0e7490", "#22d3ee"],
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return { initials, from: colors[idx][0], to: colors[idx][1] };
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #f5f2eb;
    --surface: #fffdf8;
    --ink: #1a1612;
    --ink2: #6b5f52;
    --accent: #e84c1e;
    --accent2: #f5a623;
    --border: #ddd8cf;
    --mono: 'JetBrains Mono', monospace;
    --sans: 'Syne', sans-serif;
    --radius: 2px;
  }

  html { font-size: 16px; }
  body { background: var(--bg); font-family: var(--sans); color: var(--ink); -webkit-text-size-adjust: 100%; }

  /* ── Layout ── */
  .app {
    min-height: 100vh;
    max-width: 900px;
    margin: 0 auto;
    padding: clamp(20px, 5vw, 40px) clamp(16px, 4vw, 24px) 80px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: clamp(28px, 6vw, 48px);
    border-bottom: 3px solid var(--ink);
    padding-bottom: 16px;
  }
  .logo { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: var(--ink2); font-family: var(--mono); margin-bottom: 6px; }
  .title { font-size: clamp(32px, 8vw, 48px); font-weight: 800; line-height: 1; letter-spacing: -2px; }
  .title span { color: var(--accent); }
  .count-pill { font-family: var(--mono); font-size: 12px; background: var(--ink); color: #fff; padding: 6px 14px; border-radius: 999px; white-space: nowrap; margin-top: 4px; }

  /* ── Offline banner ── */
  .offline-banner {
    background: #fff3cd; border: 1.5px solid #f5a623; border-radius: 4px;
    padding: 12px 16px; margin-bottom: 20px; font-size: 12px;
    font-family: var(--mono); color: #7a4f00; line-height: 1.6; word-break: break-word;
  }

  /* ── Form card ── */
  .form-card {
    background: var(--surface);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    padding: clamp(18px, 4vw, 28px) clamp(16px, 4vw, 32px);
    margin-bottom: 28px;
    box-shadow: 6px 6px 0 var(--ink);
    transition: box-shadow .15s;
  }
  .form-card:focus-within { box-shadow: 8px 8px 0 var(--accent); }
  .form-title { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink2); font-family: var(--mono); margin-bottom: 18px; }

  /* ── Avatar drop zone ── */
  .avatar-drop-zone {
    display: flex;
    align-items: center;
    gap: clamp(12px, 3vw, 20px);
    border: 2px dashed var(--border);
    border-radius: 8px;
    padding: clamp(12px, 3vw, 16px) clamp(14px, 3vw, 20px);
    margin-bottom: 18px;
    cursor: pointer;
    transition: border-color .15s, background .15s;
  }
  .avatar-drop-zone:hover, .avatar-drop-zone.dragover { border-color: var(--accent); background: #fff8f6; }

  .avatar-circle {
    width: clamp(54px, 12vw, 72px);
    height: clamp(54px, 12vw, 72px);
    border-radius: 50%;
    border: 2.5px solid var(--ink);
    overflow: hidden;
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 3px 3px 0 var(--ink);
    background: var(--bg);
  }
  .avatar-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .avatar-circle.placeholder { border-style: dashed; border-color: var(--border); box-shadow: none; font-size: 24px; color: var(--border); }
  .avatar-circle.gradient { border-color: var(--ink); }

  .avatar-info { flex: 1; min-width: 0; }
  .avatar-info p { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
  .avatar-info small { font-family: var(--mono); font-size: 11px; color: var(--ink2); display: block; }
  .remove-avatar { margin-top: 6px; display: inline-block; font-size: 11px; color: var(--accent); cursor: pointer; font-family: var(--mono); background: none; border: none; padding: 0; text-decoration: underline; }
  .hidden-input { display: none; }

  /* ── Form rows — stack on mobile ── */
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .form-row.single { grid-template-columns: 1fr; }

  @media (max-width: 520px) {
    .form-row { grid-template-columns: 1fr; }
  }

  label { display: block; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink2); margin-bottom: 6px; font-family: var(--mono); }

  input, textarea, select {
    width: 100%; padding: 10px 14px;
    border: 1.5px solid var(--border); border-radius: var(--radius);
    background: var(--bg); font-family: var(--mono); font-size: 14px;
    color: var(--ink); outline: none; transition: border-color .15s; resize: none;
    /* prevent iOS zoom on focus */
    font-size: max(16px, 14px);
  }
  input:focus, textarea:focus, select:focus { border-color: var(--accent); }
  textarea { min-height: 72px; }

  /* ── Buttons ── */
  .form-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .btn {
    font-family: var(--sans); font-size: 14px; font-weight: 700;
    letter-spacing: .04em; padding: 10px 22px;
    border: 2px solid var(--ink); border-radius: var(--radius);
    cursor: pointer; transition: transform .1s, box-shadow .1s;
    white-space: nowrap; touch-action: manipulation;
  }
  .btn:active { transform: translate(2px,2px); }
  .btn-primary { background: var(--accent); color: #fff; box-shadow: 4px 4px 0 var(--ink); }
  .btn-primary:hover { box-shadow: 6px 6px 0 var(--ink); transform: translate(-1px,-1px); }
  .btn-ghost { background: transparent; color: var(--ink); box-shadow: 4px 4px 0 var(--border); }
  .btn-ghost:hover { box-shadow: 4px 4px 0 var(--ink); }
  .btn-sm { padding: 7px 14px; font-size: 12px; }
  .btn-danger { background: #fff0ee; color: var(--accent); }
  .btn-danger:hover { background: var(--accent); color: #fff; }
  .btn-edit { background: #fffbe6; color: #a06000; border-color: #f5a623; box-shadow: 3px 3px 0 #f5a623; }
  .btn-edit:hover { background: var(--accent2); color: #fff; }

  /* full-width buttons on very small screens */
  @media (max-width: 380px) {
    .form-actions { flex-direction: column; }
    .btn { width: 100%; text-align: center; }
  }

  /* ── Table header ── */
  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
  }
  .section-label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; font-family: var(--mono); color: var(--ink2); }
  .search-wrap { position: relative; flex: 1; max-width: 260px; min-width: 140px; }
  .search-wrap input { padding-left: 32px; width: 100%; font-size: 14px; }
  .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--ink2); pointer-events: none; }

  @media (max-width: 480px) {
    .table-header { flex-direction: column; align-items: stretch; }
    .search-wrap { max-width: 100%; }
  }

  /* ── Item list ── */
  .item-list { display: flex; flex-direction: column; gap: 10px; }

  .item-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: clamp(14px, 3vw, 18px) clamp(14px, 3vw, 22px);
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 14px;
    align-items: start;
    transition: border-color .15s, box-shadow .15s, transform .15s;
    animation: slideIn .25s ease both;
  }

  @keyframes slideIn {
    from { opacity:0; transform:translateY(-8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .item-card:hover { border-color: var(--ink); box-shadow: 4px 4px 0 var(--ink); transform: translate(-2px,-2px); }
  .item-card.editing { border-color: var(--accent2); box-shadow: 4px 4px 0 var(--accent2); }

  /* On small screens: avatar + content on one row, actions below */
  @media (max-width: 500px) {
    .item-card {
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto;
    }
    .item-actions {
      grid-column: 1 / -1;
      justify-content: flex-start;
      border-top: 1px solid var(--border);
      padding-top: 10px;
      margin-top: 4px;
    }
  }

  /* ── Card avatar ── */
  .card-avatar {
    width: 46px; height: 46px;
    border-radius: 50%;
    border: 2px solid var(--ink);
    overflow: hidden; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 2px 2px 0 var(--border);
  }
  .card-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card-avatar.placeholder { border-style: dashed; border-color: var(--border); box-shadow: none; font-size: 18px; color: var(--border); background: var(--bg); }

  .item-name { font-size: clamp(15px, 4vw, 18px); font-weight: 700; letter-spacing: -.3px; margin-bottom: 4px; word-break: break-word; }
  .item-desc { font-size: 12px; color: var(--ink2); font-family: var(--mono); margin-bottom: 8px; line-height: 1.5; word-break: break-word; }

  .item-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .status-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-family: var(--mono); padding: 3px 9px; border-radius: 999px; font-weight: 500; white-space: nowrap; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .item-date { font-family: var(--mono); font-size: 10px; color: #aaa; white-space: nowrap; }
  .item-id { font-family: var(--mono); font-size: 10px; color: #ccc; display: none; }

  @media (min-width: 600px) { .item-id { display: inline; } }

  .item-actions { display: flex; gap: 8px; align-items: flex-start; flex-shrink: 0; flex-wrap: wrap; }

  /* ── Inline edit ── */
  .inline-edit { grid-column: 1/-1; border-top: 1px solid var(--border); margin-top: 10px; padding-top: 14px; }
  .inline-edit .form-row { margin-bottom: 12px; }

  /* ── Empty state ── */
  .empty {
    text-align: center; padding: clamp(40px,10vw,60px) 16px;
    color: var(--ink2); border: 2px dashed var(--border); border-radius: 4px;
  }
  .empty-icon { font-size: 36px; margin-bottom: 10px; }
  .empty p { font-size: 15px; font-weight: 600; }
  .empty small { font-family: var(--mono); font-size: 12px; }

  /* ── Toast ── */
  .toast {
    position: fixed;
    bottom: clamp(12px, 3vw, 24px);
    right: clamp(12px, 3vw, 24px);
    left: clamp(12px, 3vw, auto);
    max-width: calc(100vw - clamp(24px, 6vw, 48px));
    background: var(--ink); color: #fff;
    padding: 12px 18px; border-radius: 4px;
    font-family: var(--mono); font-size: 13px;
    box-shadow: 0 8px 24px rgba(0,0,0,.2);
    z-index: 999; animation: toastIn .25s ease;
    word-break: break-word;
  }
  @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  .toast.error { background: var(--accent); }

  /* ── Loader ── */
  .loader { text-align: center; padding: 40px; color: var(--ink2); font-family: var(--mono); letter-spacing: .1em; }
`;

/* ─────────────────── Sub-components ─────────────────── */

function Toast({ msg, type }) {
  return <div className={`toast ${type === "error" ? "error" : ""}`}>{msg}</div>;
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.active;
  return (
    <span className="status-badge" style={{ background: c.bg, color: c.text }}>
      <span className="status-dot" style={{ background: c.dot }} />
      {status}
    </span>
  );
}

function CardAvatar({ src, name, size = 46 }) {
  if (src) {
    return (
      <div className="card-avatar" style={{ width: size, height: size }}>
        <img src={src} alt={name} />
      </div>
    );
  }
  if (name) {
    const av = getInitialsAvatar(name);
    return (
      <div
        className="card-avatar"
        style={{
          width: size, height: size,
          background: `linear-gradient(135deg, ${av.from}, ${av.to})`,
          fontSize: Math.round(size * 0.3),
          fontWeight: 800, color: "#fff",
          fontFamily: "'Syne', sans-serif",
          letterSpacing: "-1px",
        }}
      >
        {av.initials}
      </div>
    );
  }
  return <div className="card-avatar placeholder" style={{ width: size, height: size }}>👤</div>;
}

function AvatarUploader({ value, name, onChange }) {
  const fileRef = useRef();
  const [drag, setDrag] = useState(false);

  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    processFile(e.dataTransfer.files[0]);
  };

  const avatarSize = typeof window !== "undefined" && window.innerWidth < 400 ? 54 : 64;

  return (
    <div
      className={`avatar-drop-zone ${drag ? "dragover" : ""}`}
      onClick={() => fileRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden-input"
        onChange={(e) => processFile(e.target.files[0])}
      />

      {value ? (
        <div className="avatar-circle" style={{ width: avatarSize, height: avatarSize }}>
          <img src={value} alt="preview" />
        </div>
      ) : name ? (
        (() => {
          const av = getInitialsAvatar(name || "?");
          return (
            <div
              className="avatar-circle gradient"
              style={{
                width: avatarSize, height: avatarSize,
                background: `linear-gradient(135deg, ${av.from}, ${av.to})`,
                fontSize: Math.round(avatarSize * 0.3),
                fontWeight: 800, color: "#fff",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {av.initials}
            </div>
          );
        })()
      ) : (
        <div className="avatar-circle placeholder" style={{ width: avatarSize, height: avatarSize }}>📷</div>
      )}

      <div className="avatar-info">
        <p>{value ? "Profile picture set ✓" : "Upload a profile picture"}</p>
        <small>Tap or drag & drop · JPG, PNG, GIF, WEBP</small>
        {value && (
          <button
            className="remove-avatar"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
          >
            ✕ Remove photo
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Main App ─────────────────── */

const EMPTY_FORM = { name: "", description: "", status: "active", avatar: null };

export default function CrudApp() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchItems = useCallback(async () => {
    try {
      const r = await fetch(`${API}/items`);
      if (!r.ok) throw new Error();
      setItems(await r.json());
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async () => {
    if (!form.name.trim()) return showToast("Name is required", "error");
    try {
      const r = await fetch(`${API}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, description: form.description, status: form.status }),
      });
      if (!r.ok) throw new Error();
      const item = await r.json();
      item._avatar = form.avatar;
      setItems((p) => [item, ...p]);
      setForm(EMPTY_FORM);
      showToast("✓ Record created");
    } catch {
      showToast("Failed to create record", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const r = await fetch(`${API}/items/${id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error();
      setItems((p) => p.filter((x) => x.id !== id));
      showToast("Record deleted");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditData({ name: item.name, description: item.description || "", status: item.status, avatar: item._avatar || null });
  };
  const cancelEdit = () => { setEditId(null); setEditData({}); };

  const handleUpdate = async (id) => {
    if (!editData.name?.trim()) return showToast("Name is required", "error");
    try {
      const r = await fetch(`${API}/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editData.name, description: editData.description, status: editData.status }),
      });
      if (!r.ok) throw new Error();
      const updated = await r.json();
      updated._avatar = editData.avatar;
      setItems((p) => p.map((x) => (x.id === id ? updated : x)));
      cancelEdit();
      showToast("✓ Record updated");
    } catch {
      showToast("Failed to update", "error");
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (iso) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* ── Header ── */}
        <header className="header">
          <div>
            <div className="logo">Record Manager · v1.0</div>
            <h1 className="title">CRUD<span>.</span></h1>
          </div>
          <span className="count-pill">{items.length} record{items.length !== 1 ? "s" : ""}</span>
        </header>

        {/* ── Offline warning ── */}
        {offline && (
          <div className="offline-banner">
            ⚠ Cannot reach API at <strong>{API}</strong> — run:{" "}
            <code>python -m uvicorn main:app --reload</code>
          </div>
        )}

        {/* ── Create form ── */}
        <div className="form-card">
          <div className="form-title">→ New Record</div>

          <AvatarUploader
            value={form.avatar}
            name={form.name}
            onChange={(v) => setForm((p) => ({ ...p, avatar: v }))}
          />

          <div className="form-row">
            <div>
              <label>Name *</label>
              <input
                placeholder="Enter name…"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="form-row single">
            <div>
              <label>Description</label>
              <textarea
                placeholder="Optional description…"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreate}>+ Add Record</button>
            <button className="btn btn-ghost" onClick={() => setForm(EMPTY_FORM)}>Clear</button>
          </div>
        </div>

        {/* ── Records header ── */}
        <div className="table-header">
          <div className="section-label">All Records ({filtered.length})</div>
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Records list ── */}
        {loading ? (
          <div className="loader">loading records…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">◻</div>
            <p>No records found</p>
            <small>{search ? "Try a different search" : "Create your first record above"}</small>
          </div>
        ) : (
          <div className="item-list">
            {filtered.map((item) => (
              <div key={item.id} className={`item-card ${editId === item.id ? "editing" : ""}`}>
                {editId === item.id ? (
                  <div className="inline-edit" style={{ gridColumn: "1/-1" }}>
                    <AvatarUploader
                      value={editData.avatar}
                      name={editData.name}
                      onChange={(v) => setEditData((p) => ({ ...p, avatar: v }))}
                    />
                    <div className="form-row">
                      <div>
                        <label>Name *</label>
                        <input
                          value={editData.name}
                          onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label>Status</label>
                        <select value={editData.status} onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value }))}>
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row single">
                      <div>
                        <label>Description</label>
                        <textarea
                          value={editData.description}
                          onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(item.id)}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardAvatar src={item._avatar} name={item.name} />
                    <div>
                      <div className="item-name">{item.name}</div>
                      {item.description && <div className="item-desc">{item.description}</div>}
                      <div className="item-meta">
                        <StatusBadge status={item.status} />
                        <span className="item-date">{fmt(item.created_at)}</span>
                        <span className="item-id">{item.id.slice(0, 8)}…</span>
                      </div>
                    </div>
                    <div className="item-actions">
                      <button className="btn btn-sm btn-edit" onClick={() => startEdit(item)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  );
}
