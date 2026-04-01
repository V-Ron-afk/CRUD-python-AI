import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const API = "http://localhost:8000";
const PAGE_SIZE_OPTIONS = [5, 10, 20];

const STATUS_COLORS = {
  active:   { bg: "#d4f7e0", text: "#0a6636", dot: "#22c55e" },
  archived: { bg: "#f0f0f0", text: "#666",    dot: "#999"    },
};

function getInitialsAvatar(name) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const palette = [
    ["#e84c1e","#f5a623"],["#0a6636","#22c55e"],["#1a3a8f","#60a5fa"],
    ["#7c1fa8","#e879f9"],["#b45309","#fbbf24"],["#0e7490","#22d3ee"],
  ];
  const idx = name.charCodeAt(0) % palette.length;
  return { initials, from: palette[idx][0], to: palette[idx][1] };
}

/* ─────────── CSS ─────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#f5f2eb; --surface:#fffdf8; --ink:#1a1612; --ink2:#6b5f52;
    --accent:#e84c1e; --accent2:#f5a623; --border:#ddd8cf;
    --mono:'JetBrains Mono',monospace; --sans:'Syne',sans-serif; --r:2px;
  }
  html { font-size:16px; }
  body { background:var(--bg); font-family:var(--sans); color:var(--ink); -webkit-text-size-adjust:100%; }

  /* layout */
  .app { min-height:100vh; max-width:960px; margin:0 auto; padding:clamp(20px,5vw,40px) clamp(16px,4vw,24px) 80px; }

  /* header */
  .header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:clamp(24px,5vw,40px); border-bottom:3px solid var(--ink); padding-bottom:16px; }
  .logo { font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--ink2); font-family:var(--mono); margin-bottom:6px; }
  .title { font-size:clamp(30px,8vw,48px); font-weight:800; line-height:1; letter-spacing:-2px; }
  .title span { color:var(--accent); }
  .header-right { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
  .count-pill { font-family:var(--mono); font-size:12px; background:var(--ink); color:#fff; padding:5px 13px; border-radius:999px; white-space:nowrap; }

  /* offline */
  .offline-banner { background:#fff3cd; border:1.5px solid #f5a623; border-radius:4px; padding:12px 16px; margin-bottom:20px; font-size:12px; font-family:var(--mono); color:#7a4f00; line-height:1.6; word-break:break-word; }

  /* form card */
  .form-card { background:var(--surface); border:2px solid var(--ink); border-radius:var(--r); padding:clamp(16px,4vw,28px) clamp(14px,4vw,32px); margin-bottom:24px; box-shadow:6px 6px 0 var(--ink); transition:box-shadow .15s; }
  .form-card:focus-within { box-shadow:8px 8px 0 var(--accent); }
  .form-title { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink2); font-family:var(--mono); margin-bottom:16px; }

  /* avatar */
  .avatar-drop-zone { display:flex; align-items:center; gap:clamp(12px,3vw,20px); border:2px dashed var(--border); border-radius:8px; padding:clamp(10px,2vw,14px) clamp(12px,3vw,18px); margin-bottom:16px; cursor:pointer; transition:border-color .15s,background .15s; }
  .avatar-drop-zone:hover,.avatar-drop-zone.dragover { border-color:var(--accent); background:#fff8f6; }
  .avatar-circle { border-radius:50%; border:2.5px solid var(--ink); overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:3px 3px 0 var(--ink); background:var(--bg); }
  .avatar-circle img { width:100%; height:100%; object-fit:cover; display:block; }
  .avatar-circle.placeholder { border-style:dashed; border-color:var(--border); box-shadow:none; color:var(--border); }
  .avatar-info { flex:1; min-width:0; }
  .avatar-info p { font-size:13px; font-weight:700; margin-bottom:3px; }
  .avatar-info small { font-family:var(--mono); font-size:11px; color:var(--ink2); display:block; }
  .remove-avatar { margin-top:6px; display:inline-block; font-size:11px; color:var(--accent); cursor:pointer; font-family:var(--mono); background:none; border:none; padding:0; text-decoration:underline; }
  .hidden-input { display:none; }

  /* form grid */
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:13px; margin-bottom:13px; }
  .form-row.single { grid-template-columns:1fr; }
  .form-row.triple { grid-template-columns:1fr 1fr 1fr; }
  @media(max-width:520px){ .form-row,.form-row.triple { grid-template-columns:1fr; } }

  label { display:block; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink2); margin-bottom:5px; font-family:var(--mono); }
  input,textarea,select { width:100%; padding:9px 13px; border:1.5px solid var(--border); border-radius:var(--r); background:var(--bg); font-family:var(--mono); font-size:max(16px,14px); color:var(--ink); outline:none; transition:border-color .15s; resize:none; }
  input:focus,textarea:focus,select:focus { border-color:var(--accent); }
  textarea { min-height:68px; }

  /* buttons */
  .form-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:16px; }
  .btn { font-family:var(--sans); font-size:14px; font-weight:700; letter-spacing:.04em; padding:9px 20px; border:2px solid var(--ink); border-radius:var(--r); cursor:pointer; transition:transform .1s,box-shadow .1s; white-space:nowrap; touch-action:manipulation; }
  .btn:active { transform:translate(2px,2px); }
  .btn-primary { background:var(--accent); color:#fff; box-shadow:4px 4px 0 var(--ink); }
  .btn-primary:hover { box-shadow:6px 6px 0 var(--ink); transform:translate(-1px,-1px); }
  .btn-ghost { background:transparent; color:var(--ink); box-shadow:4px 4px 0 var(--border); }
  .btn-ghost:hover { box-shadow:4px 4px 0 var(--ink); }
  .btn-sm { padding:6px 13px; font-size:12px; }
  .btn-danger { background:#fff0ee; color:var(--accent); }
  .btn-danger:hover { background:var(--accent); color:#fff; }
  .btn-edit { background:#fffbe6; color:#a06000; border-color:#f5a623; box-shadow:3px 3px 0 #f5a623; }
  .btn-edit:hover { background:var(--accent2); color:#fff; }
  .btn-active { background:var(--ink)!important; color:#fff!important; box-shadow:none!important; transform:none!important; }
  @media(max-width:380px){ .form-actions{flex-direction:column;} .btn{width:100%;text-align:center;} }

  /* ── Filter / Search bar ── */
  .filter-bar {
    background:var(--surface); border:2px solid var(--ink); border-radius:var(--r);
    padding:16px 20px; margin-bottom:16px;
    box-shadow:4px 4px 0 var(--border);
  }
  .filter-bar-title { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink2); font-family:var(--mono); margin-bottom:12px; }

  .filter-grid { display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; align-items:end; }
  @media(max-width:600px){ .filter-grid { grid-template-columns:1fr 1fr; } }
  @media(max-width:400px){ .filter-grid { grid-template-columns:1fr; } }

  /* search input with icon */
  .search-field { position:relative; }
  .search-field input { padding-left:34px; }
  .search-ico { position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:14px; color:var(--ink2); pointer-events:none; }

  /* sort buttons row */
  .sort-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; align-items:center; }
  .sort-label { font-size:11px; font-family:var(--mono); color:var(--ink2); letter-spacing:.08em; text-transform:uppercase; margin-right:4px; }
  .sort-btn { font-family:var(--mono); font-size:11px; font-weight:500; padding:5px 12px; border:1.5px solid var(--border); border-radius:999px; cursor:pointer; background:transparent; color:var(--ink2); transition:all .12s; white-space:nowrap; }
  .sort-btn:hover { border-color:var(--ink); color:var(--ink); }
  .sort-btn.active { background:var(--ink); color:#fff; border-color:var(--ink); }

  /* filter chips */
  .chip-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
  .chip { font-family:var(--mono); font-size:11px; padding:4px 12px; border-radius:999px; border:1.5px solid var(--border); cursor:pointer; background:transparent; color:var(--ink2); transition:all .12s; white-space:nowrap; }
  .chip:hover { border-color:var(--ink); color:var(--ink); }
  .chip.active { border-color:var(--accent); background:var(--accent); color:#fff; }
  .chip.chip-all.active { border-color:var(--ink); background:var(--ink); color:#fff; }

  /* results bar */
  .results-bar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
  .results-info { font-family:var(--mono); font-size:11px; color:var(--ink2); letter-spacing:.06em; }
  .results-info strong { color:var(--ink); }
  .per-page-wrap { display:flex; align-items:center; gap:8px; font-family:var(--mono); font-size:11px; color:var(--ink2); }
  .per-page-wrap select { width:auto; padding:4px 8px; font-size:12px; }

  /* item list */
  .item-list { display:flex; flex-direction:column; gap:10px; }
  .item-card { background:var(--surface); border:1.5px solid var(--border); border-radius:var(--r); padding:clamp(12px,3vw,18px) clamp(13px,3vw,22px); display:grid; grid-template-columns:auto 1fr auto; gap:14px; align-items:start; transition:border-color .15s,box-shadow .15s,transform .15s; animation:slideIn .22s ease both; }
  @keyframes slideIn { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }
  .item-card:hover { border-color:var(--ink); box-shadow:4px 4px 0 var(--ink); transform:translate(-2px,-2px); }
  .item-card.editing { border-color:var(--accent2); box-shadow:4px 4px 0 var(--accent2); }
  @media(max-width:500px){
    .item-card { grid-template-columns:auto 1fr; }
    .item-actions { grid-column:1/-1; border-top:1px solid var(--border); padding-top:10px; justify-content:flex-start; }
  }

  /* card avatar */
  .card-avatar { border-radius:50%; border:2px solid var(--ink); overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:2px 2px 0 var(--border); }
  .card-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
  .card-avatar.placeholder { border-style:dashed; border-color:var(--border); box-shadow:none; color:var(--border); background:var(--bg); }

  .item-name { font-size:clamp(14px,4vw,17px); font-weight:700; letter-spacing:-.3px; margin-bottom:3px; word-break:break-word; }
  .item-email { font-size:12px; font-family:var(--mono); color:var(--ink2); margin-bottom:6px; word-break:break-all; }
  .item-desc { font-size:12px; color:var(--ink2); font-family:var(--mono); margin-bottom:8px; line-height:1.5; word-break:break-word; }
  .item-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .status-badge { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-family:var(--mono); padding:3px 9px; border-radius:999px; font-weight:500; white-space:nowrap; }
  .status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .item-date { font-family:var(--mono); font-size:10px; color:#aaa; white-space:nowrap; }
  .item-id { font-family:var(--mono); font-size:10px; color:#ccc; }
  @media(max-width:600px){ .item-id { display:none; } }
  .item-actions { display:flex; gap:8px; align-items:flex-start; flex-shrink:0; flex-wrap:wrap; }

  /* inline edit */
  .inline-edit { grid-column:1/-1; border-top:1px solid var(--border); margin-top:8px; padding-top:14px; }
  .inline-edit .form-row { margin-bottom:12px; }

  /* ── Pagination ── */
  .pagination { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:6px; margin-top:24px; }
  .page-btn { font-family:var(--mono); font-size:12px; font-weight:600; min-width:34px; height:34px; padding:0 10px; border:1.5px solid var(--border); border-radius:var(--r); cursor:pointer; background:var(--surface); color:var(--ink2); transition:all .12s; display:flex; align-items:center; justify-content:center; }
  .page-btn:hover:not(:disabled) { border-color:var(--ink); color:var(--ink); box-shadow:2px 2px 0 var(--ink); transform:translate(-1px,-1px); }
  .page-btn.current { background:var(--ink); color:#fff; border-color:var(--ink); transform:none; box-shadow:none; cursor:default; }
  .page-btn:disabled { opacity:.35; cursor:not-allowed; }
  .page-ellipsis { font-family:var(--mono); font-size:12px; color:var(--ink2); padding:0 4px; line-height:34px; }

  /* empty */
  .empty { text-align:center; padding:clamp(36px,8vw,60px) 16px; color:var(--ink2); border:2px dashed var(--border); border-radius:4px; }
  .empty-icon { font-size:34px; margin-bottom:10px; }
  .empty p { font-size:15px; font-weight:600; }
  .empty small { font-family:var(--mono); font-size:12px; }

  /* toast */
  .toast { position:fixed; bottom:clamp(12px,3vw,24px); right:clamp(12px,3vw,24px); max-width:calc(100vw - clamp(24px,6vw,48px)); background:var(--ink); color:#fff; padding:11px 18px; border-radius:4px; font-family:var(--mono); font-size:13px; box-shadow:0 8px 24px rgba(0,0,0,.2); z-index:999; animation:toastIn .22s ease; word-break:break-word; }
  @keyframes toastIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
  .toast.error { background:var(--accent); }
  .loader { text-align:center; padding:40px; color:var(--ink2); font-family:var(--mono); letter-spacing:.1em; }
`;

/* ─────────── Helpers ─────────── */
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
  if (src)
    return (
      <div className="card-avatar" style={{ width: size, height: size }}>
        <img src={src} alt={name} />
      </div>
    );
  if (name) {
    const av = getInitialsAvatar(name);
    return (
      <div
        className="card-avatar"
        style={{
          width: size, height: size,
          background: `linear-gradient(135deg,${av.from},${av.to})`,
          fontSize: Math.round(size * 0.3), fontWeight: 800,
          color: "#fff", fontFamily: "'Syne',sans-serif", letterSpacing: "-1px",
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
  const sz = 60;

  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  const renderPreview = () => {
    if (value)
      return (
        <div className="avatar-circle" style={{ width: sz, height: sz }}>
          <img src={value} alt="preview" />
        </div>
      );
    if (name) {
      const av = getInitialsAvatar(name || "?");
      return (
        <div
          className="avatar-circle"
          style={{
            width: sz, height: sz,
            background: `linear-gradient(135deg,${av.from},${av.to})`,
            fontSize: Math.round(sz * 0.3), fontWeight: 800,
            color: "#fff", fontFamily: "'Syne',sans-serif",
          }}
        >
          {av.initials}
        </div>
      );
    }
    return (
      <div className="avatar-circle placeholder" style={{ width: sz, height: sz, fontSize: 22 }}>📷</div>
    );
  };

  return (
    <div
      className={`avatar-drop-zone ${drag ? "dragover" : ""}`}
      onClick={() => fileRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); processFile(e.dataTransfer.files[0]); }}
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden-input"
        onChange={(e) => processFile(e.target.files[0])} />
      {renderPreview()}
      <div className="avatar-info">
        <p>{value ? "Profile picture set ✓" : "Upload profile picture"}</p>
        <small>Tap or drag & drop · JPG PNG GIF WEBP</small>
        {value && (
          <button className="remove-avatar"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}>
            ✕ Remove
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────── Pagination component ─────────── */
function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;

  const pages = [];
  const delta = 1;
  const left = current - delta;
  const right = current + delta;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= left && i <= right)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="pagination">
      <button className="page-btn" disabled={current === 1} onClick={() => onChange(current - 1)}>
        ‹ Prev
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="page-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`page-btn ${p === current ? "current" : ""}`}
            onClick={() => p !== current && onChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button className="page-btn" disabled={current === total} onClick={() => onChange(current + 1)}>
        Next ›
      </button>
    </div>
  );
}

/* ─────────── Main App ─────────── */
const EMPTY_FORM = { name: "", email: "", description: "", status: "active", avatar: null };
const SORTS = [
  { key: "newest",  label: "Newest first" },
  { key: "oldest",  label: "Oldest first" },
  { key: "az",      label: "A → Z" },
  { key: "za",      label: "Z → A" },
];

export default function CrudApp() {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [offline,  setOffline]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({});

  // ── filter/search/sort/page state ──
  const [query,      setQuery]      = useState("");        // text search
  const [filterDate, setFilterDate] = useState("");        // date filter yyyy-mm-dd
  const [statusF,    setStatusF]    = useState("all");     // all | active | archived
  const [sortKey,    setSortKey]    = useState("newest");
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(10);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchItems = useCallback(async () => {
    try {
      const r = await fetch(`${API}/items?page=1&page_size=1000`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      // Handle paginated response from backend
      setItems(data.items || data);
      setOffline(false);
    } catch { setOffline(true); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // reset to page 1 whenever filters/search/sort change
  useEffect(() => { setPage(1); }, [query, filterDate, statusF, sortKey, pageSize]);

  /* ── derived data ── */
  const filtered = useMemo(() => {
    let list = [...items];

    // text search: name + email + description
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.email || "").toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q)
      );
    }

    // status filter
    if (statusF !== "all") list = list.filter((i) => i.status === statusF);

    // date filter (created on a specific day)
    if (filterDate) {
      list = list.filter((i) => i.created_at && i.created_at.startsWith(filterDate));
    }

    // sort
    list.sort((a, b) => {
      if (sortKey === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortKey === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortKey === "az")     return a.name.localeCompare(b.name);
      if (sortKey === "za")     return b.name.localeCompare(a.name);
      return 0;
    });

    return list;
  }, [items, query, filterDate, statusF, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  /* ── CRUD ── */
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
      item.email   = form.email;
      setItems((p) => [item, ...p]);
      setForm(EMPTY_FORM);
      showToast("✓ Record created");
    } catch { showToast("Failed to create record", "error"); }
  };

  const handleDelete = async (id) => {
    try {
      const r = await fetch(`${API}/items/${id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error();
      setItems((p) => p.filter((x) => x.id !== id));
      showToast("Record deleted");
    } catch { showToast("Failed to delete", "error"); }
  };

  const startEdit = (item) =>
    (setEditId(item.id),
     setEditData({ name: item.name, email: item.email || "", description: item.description || "", status: item.status, avatar: item._avatar || null }));
  const cancelEdit = () => (setEditId(null), setEditData({}));

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
      updated.email   = editData.email;
      setItems((p) => p.map((x) => (x.id === id ? updated : x)));
      cancelEdit();
      showToast("✓ Record updated");
    } catch { showToast("Failed to update", "error"); }
  };

  const fmt = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const clearFilters = () => { setQuery(""); setFilterDate(""); setStatusF("all"); setSortKey("newest"); };
  const hasActiveFilters = query || filterDate || statusF !== "all" || sortKey !== "newest";

  /* ─────────── Render ─────────── */
  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* Header */}
        <header className="header">
          <div>
            <div className="logo">Record Manager · v2.0</div>
            <h1 className="title">CRUD<span>.</span></h1>
          </div>
          <div className="header-right">
            <span className="count-pill">{items.length} total record{items.length !== 1 ? "s" : ""}</span>
          </div>
        </header>

        {offline && (
          <div className="offline-banner">
            ⚠ Cannot reach API at <strong>{API}</strong> — run:{" "}
            <code>python -m uvicorn main:app --reload</code>
          </div>
        )}

        {/* ── Create Form ── */}
        <div className="form-card">
          <div className="form-title">→ New Record</div>
          <AvatarUploader value={form.avatar} name={form.name} onChange={(v) => setForm((p) => ({ ...p, avatar: v }))} />

          <div className="form-row triple">
            <div>
              <label>Name *</label>
              <input placeholder="Full name…" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            </div>
            <div>
              <label>Email</label>
              <input placeholder="email@example.com" type="email" value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
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
              <textarea placeholder="Optional description…" value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreate}>+ Add Record</button>
            <button className="btn btn-ghost" onClick={() => setForm(EMPTY_FORM)}>Clear</button>
          </div>
        </div>

        {/* ── Filter / Search Bar ── */}
        <div className="filter-bar">
          <div className="filter-bar-title">🔍 Search & Filter</div>

          <div className="filter-grid">
            {/* text search */}
            <div className="search-field">
              <label>Search</label>
              <span className="search-ico">⌕</span>
              <input
                placeholder="Name, email, or description…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* status filter */}
            <div>
              <label>Status</label>
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="archived">Archived only</option>
              </select>
            </div>

            {/* date filter */}
            <div>
              <label>Created on</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
          </div>

          {/* sort row */}
          <div className="sort-row">
            <span className="sort-label">Sort:</span>
            {SORTS.map((s) => (
              <button
                key={s.key}
                className={`sort-btn ${sortKey === s.key ? "active" : ""}`}
                onClick={() => setSortKey(s.key)}
              >
                {s.label}
              </button>
            ))}
            {hasActiveFilters && (
              <button className="sort-btn" style={{ marginLeft: "auto", color: "var(--accent)", borderColor: "var(--accent)" }} onClick={clearFilters}>
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Results bar ── */}
        <div className="results-bar">
          <div className="results-info">
            Showing <strong>{paginated.length}</strong> of <strong>{filtered.length}</strong>
            {filtered.length !== items.length && ` (filtered from ${items.length})`} records
            {totalPages > 1 && ` · Page ${safePage} of ${totalPages}`}
          </div>
          <div className="per-page-wrap">
            <span>Per page:</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Records ── */}
        {loading ? (
          <div className="loader">loading records…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">◻</div>
            <p>No records found</p>
            <small>{hasActiveFilters ? "Try adjusting your filters" : "Create your first record above"}</small>
          </div>
        ) : (
          <>
            <div className="item-list">
              {paginated.map((item) => (
                <div key={item.id} className={`item-card ${editId === item.id ? "editing" : ""}`}>
                  {editId === item.id ? (
                    <div className="inline-edit" style={{ gridColumn: "1/-1" }}>
                      <AvatarUploader value={editData.avatar} name={editData.name}
                        onChange={(v) => setEditData((p) => ({ ...p, avatar: v }))} />
                      <div className="form-row triple">
                        <div>
                          <label>Name *</label>
                          <input value={editData.name} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div>
                          <label>Email</label>
                          <input type="email" value={editData.email} onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))} />
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
                          <textarea value={editData.description} onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))} />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(item.id)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CardAvatar src={item._avatar} name={item.name} size={46} />
                      <div>
                        <div className="item-name">{item.name}</div>
                        {item.email && <div className="item-email">✉ {item.email}</div>}
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

            {/* ── Pagination ── */}
            <Pagination current={safePage} total={totalPages} onChange={setPage} />
          </>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  );
}
