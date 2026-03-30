import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000";

const STATUS_COLORS = {
  active: { bg: "#d4f7e0", text: "#0a6636", dot: "#22c55e" },
  archived: { bg: "#f0f0f0", text: "#666", dot: "#999" },
};

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

  body { background: var(--bg); font-family: var(--sans); color: var(--ink); }

  .app {
    min-height: 100vh;
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 48px;
    border-bottom: 3px solid var(--ink);
    padding-bottom: 20px;
  }
  .header-left {}
  .logo {
    font-size: 11px;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--ink2);
    font-family: var(--mono);
    margin-bottom: 6px;
  }
  .title {
    font-size: 48px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -2px;
  }
  .title span { color: var(--accent); }
  .count-pill {
    font-family: var(--mono);
    font-size: 13px;
    background: var(--ink);
    color: #fff;
    padding: 6px 14px;
    border-radius: 999px;
    align-self: flex-start;
    margin-top: 6px;
  }

  /* ── Form card ── */
  .form-card {
    background: var(--surface);
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    padding: 28px 32px;
    margin-bottom: 36px;
    box-shadow: 6px 6px 0 var(--ink);
    transition: box-shadow .15s;
  }
  .form-card:focus-within { box-shadow: 8px 8px 0 var(--accent); }
  .form-title {
    font-size: 13px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink2);
    font-family: var(--mono);
    margin-bottom: 20px;
  }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .form-row.single { grid-template-columns: 1fr; }

  label { display: block; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink2); margin-bottom: 6px; font-family: var(--mono); }
  input, textarea, select {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    font-family: var(--mono);
    font-size: 14px;
    color: var(--ink);
    outline: none;
    transition: border-color .15s;
    resize: none;
  }
  input:focus, textarea:focus, select:focus { border-color: var(--accent); }
  textarea { min-height: 72px; }

  .form-actions { display: flex; gap: 12px; margin-top: 20px; }
  .btn {
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: .04em;
    padding: 10px 24px;
    border: 2px solid var(--ink);
    border-radius: var(--radius);
    cursor: pointer;
    transition: transform .1s, box-shadow .1s;
    position: relative;
  }
  .btn:active { transform: translate(2px, 2px); }
  .btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 4px 4px 0 var(--ink);
  }
  .btn-primary:hover { box-shadow: 6px 6px 0 var(--ink); transform: translate(-1px,-1px); }
  .btn-ghost {
    background: transparent;
    color: var(--ink);
    box-shadow: 4px 4px 0 var(--border);
  }
  .btn-ghost:hover { box-shadow: 4px 4px 0 var(--ink); }
  .btn-sm { padding: 6px 14px; font-size: 12px; }
  .btn-danger { background: #fff0ee; color: var(--accent); }
  .btn-danger:hover { background: var(--accent); color: #fff; }
  .btn-edit { background: #fffbe6; color: #a06000; border-color: #f5a623; box-shadow: 3px 3px 0 #f5a623; }
  .btn-edit:hover { background: var(--accent2); color: #fff; }

  /* ── Table area ── */
  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .section-label {
    font-size: 11px;
    letter-spacing: .16em;
    text-transform: uppercase;
    font-family: var(--mono);
    color: var(--ink2);
  }
  .search-wrap { position: relative; }
  .search-wrap input {
    padding-left: 32px;
    width: 220px;
  }
  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    color: var(--ink2);
    pointer-events: none;
  }

  /* ── Item list ── */
  .item-list { display: flex; flex-direction: column; gap: 10px; }

  .item-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 22px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: start;
    transition: border-color .15s, box-shadow .15s, transform .15s;
    animation: slideIn .25s ease both;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .item-card:hover { border-color: var(--ink); box-shadow: 4px 4px 0 var(--ink); transform: translate(-2px,-2px); }
  .item-card.editing { border-color: var(--accent2); box-shadow: 4px 4px 0 var(--accent2); }

  .item-name {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -.4px;
    margin-bottom: 4px;
  }
  .item-desc {
    font-size: 13px;
    color: var(--ink2);
    font-family: var(--mono);
    margin-bottom: 10px;
    line-height: 1.5;
  }
  .item-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-family: var(--mono);
    padding: 3px 10px;
    border-radius: 999px;
    font-weight: 500;
  }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; }
  .item-date { font-family: var(--mono); font-size: 11px; color: #aaa; }
  .item-id { font-family: var(--mono); font-size: 10px; color: #ccc; }

  .item-actions { display: flex; gap: 8px; align-items: flex-start; flex-shrink: 0; }

  /* inline edit */
  .inline-edit { grid-column: 1 / -1; border-top: 1px solid var(--border); margin-top: 12px; padding-top: 16px; }
  .inline-edit .form-row { margin-bottom: 12px; }

  /* empty */
  .empty {
    text-align: center;
    padding: 60px 0;
    color: var(--ink2);
    border: 2px dashed var(--border);
    border-radius: 4px;
  }
  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty p { font-size: 15px; font-weight: 600; }
  .empty small { font-family: var(--mono); font-size: 12px; }

  /* toast */
  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--ink);
    color: #fff;
    padding: 12px 20px;
    border-radius: 4px;
    font-family: var(--mono);
    font-size: 13px;
    box-shadow: 0 8px 24px rgba(0,0,0,.2);
    z-index: 999;
    animation: toastIn .25s ease;
  }
  @keyframes toastIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
  .toast.error { background: var(--accent); }

  /* loader */
  .loader { text-align: center; padding: 40px; color: var(--ink2); font-family: var(--mono); letter-spacing: .1em; }

  /* offline banner */
  .offline-banner {
    background: #fff3cd;
    border: 1.5px solid #f5a623;
    border-radius: 4px;
    padding: 12px 18px;
    margin-bottom: 24px;
    font-size: 13px;
    font-family: var(--mono);
    color: #7a4f00;
  }
`;

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

export default function CrudApp() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  // form state
  const [form, setForm] = useState({ name: "", description: "", status: "active" });

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

  // ── CREATE ──
  const handleCreate = async () => {
    if (!form.name.trim()) return showToast("Name is required", "error");
    try {
      const r = await fetch(`${API}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error();
      const item = await r.json();
      setItems((p) => [item, ...p]);
      setForm({ name: "", description: "", status: "active" });
      showToast("✓ Item created");
    } catch {
      showToast("Failed to create item", "error");
    }
  };

  // ── DELETE ──
  const handleDelete = async (id) => {
    try {
      const r = await fetch(`${API}/items/${id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error();
      setItems((p) => p.filter((x) => x.id !== id));
      showToast("Item deleted");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  // ── UPDATE ──
  const startEdit = (item) => {
    setEditId(item.id);
    setEditData({ name: item.name, description: item.description || "", status: item.status });
  };
  const cancelEdit = () => { setEditId(null); setEditData({}); };
  const handleUpdate = async (id) => {
    if (!editData.name?.trim()) return showToast("Name is required", "error");
    try {
      const r = await fetch(`${API}/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!r.ok) throw new Error();
      const updated = await r.json();
      setItems((p) => p.map((x) => (x.id === id ? updated : x)));
      cancelEdit();
      showToast("✓ Item updated");
    } catch {
      showToast("Failed to update", "error");
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <div className="logo">Record Manager · v1.0</div>
            <h1 className="title">CRUD<span>.</span></h1>
          </div>
          <span className="count-pill">{items.length} records</span>
        </header>

        {offline && (
          <div className="offline-banner">
            ⚠ Cannot reach API at <strong>{API}</strong> — start the Python server with{" "}
            <code>uvicorn main:app --reload</code>
          </div>
        )}

        {/* Create Form */}
        <div className="form-card">
          <div className="form-title">→ New Record</div>
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
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
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
            <button className="btn btn-ghost" onClick={() => setForm({ name: "", description: "", status: "active" })}>Clear</button>
          </div>
        </div>

        {/* Table Header */}
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

        {/* List */}
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
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value }))}
                        >
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
                    <div>
                      <div className="item-name">{item.name}</div>
                      {item.description && <div className="item-desc">{item.description}</div>}
                      <div className="item-meta">
                        <StatusBadge status={item.status} />
                        <span className="item-date">Created {fmt(item.created_at)}</span>
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
