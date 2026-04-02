import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const API = "http://localhost:8000";
const PAGE_SIZE_OPTIONS = [5, 10, 20];

const STATUS_COLORS = {
  active:   { bg: "#d4f7e0", text: "#0a6636", dot: "#22c55e" },
  archived: { bg: "#f0f0f0", text: "#666",    dot: "#999"    },
};
const ROLE_COLORS = {
  admin: { bg: "#fde8e0", text: "#b22200", border: "#e84c1e" },
  user:  { bg: "#e8f0fe", text: "#1a3a8f", border: "#60a5fa" },
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

/* ──────────────── STYLES ──────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --bg:#f5f2eb; --surface:#fffdf8; --ink:#1a1612; --ink2:#6b5f52;
    --accent:#e84c1e; --accent2:#f5a623; --border:#ddd8cf;
    --mono:'JetBrains Mono',monospace; --sans:'Syne',sans-serif; --r:2px;
    --admin:#e84c1e; --user:#1a3a8f;
  }
  html { font-size:16px; }
  body { background:var(--bg); font-family:var(--sans); color:var(--ink); -webkit-text-size-adjust:100%; }

  /* ── Auth screen ── */
  .auth-screen {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    padding:24px 16px;
    background: radial-gradient(ellipse at 20% 80%, #fde8e0 0%, transparent 50%),
                radial-gradient(ellipse at 80% 10%, #e8f0fe 0%, transparent 50%),
                var(--bg);
  }
  .auth-card {
    width:100%; max-width:420px;
    background:var(--surface); border:2px solid var(--ink);
    border-radius:var(--r); padding:clamp(28px,6vw,44px) clamp(24px,6vw,40px);
    box-shadow:8px 8px 0 var(--ink);
  }
  .auth-logo { font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--ink2); font-family:var(--mono); margin-bottom:8px; }
  .auth-title { font-size:clamp(28px,7vw,40px); font-weight:800; letter-spacing:-2px; margin-bottom:4px; }
  .auth-title span { color:var(--accent); }
  .auth-subtitle { font-family:var(--mono); font-size:12px; color:var(--ink2); margin-bottom:28px; }
  .auth-tabs { display:flex; gap:0; margin-bottom:24px; border:2px solid var(--ink); border-radius:var(--r); overflow:hidden; }
  .auth-tab { flex:1; padding:9px; font-family:var(--sans); font-weight:700; font-size:13px; letter-spacing:.04em; cursor:pointer; border:none; background:transparent; color:var(--ink2); transition:background .15s,color .15s; }
  .auth-tab.active { background:var(--ink); color:#fff; }
  .auth-field { margin-bottom:14px; }
  .auth-field label { display:block; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink2); margin-bottom:5px; font-family:var(--mono); }
  .auth-field input, .auth-field select { width:100%; padding:10px 14px; border:1.5px solid var(--border); border-radius:var(--r); background:var(--bg); font-family:var(--mono); font-size:max(16px,14px); color:var(--ink); outline:none; transition:border-color .15s; }
  .auth-field input:focus, .auth-field select:focus { border-color:var(--accent); }
  .auth-err { background:#fff0ee; border:1.5px solid var(--accent); border-radius:4px; padding:10px 14px; font-family:var(--mono); font-size:12px; color:var(--accent); margin-bottom:14px; }
  .auth-btn { width:100%; padding:12px; font-family:var(--sans); font-size:15px; font-weight:800; letter-spacing:.04em; border:2px solid var(--ink); border-radius:var(--r); cursor:pointer; background:var(--accent); color:#fff; box-shadow:4px 4px 0 var(--ink); transition:transform .1s,box-shadow .1s; margin-top:4px; }
  .auth-btn:hover { box-shadow:6px 6px 0 var(--ink); transform:translate(-1px,-1px); }
  .auth-btn:active { transform:translate(2px,2px); box-shadow:2px 2px 0 var(--ink); }
  .auth-btn:disabled { opacity:.6; cursor:not-allowed; transform:none; }
  .auth-demo { margin-top:20px; padding:14px; background:var(--bg); border:1px dashed var(--border); border-radius:4px; }
  .auth-demo p { font-family:var(--mono); font-size:11px; color:var(--ink2); margin-bottom:6px; letter-spacing:.06em; text-transform:uppercase; }
  .demo-accounts { display:flex; gap:8px; flex-wrap:wrap; }
  .demo-btn { font-family:var(--mono); font-size:11px; padding:5px 12px; border:1.5px solid var(--border); border-radius:999px; cursor:pointer; background:var(--surface); color:var(--ink2); transition:all .12s; }
  .demo-btn:hover { border-color:var(--ink); color:var(--ink); }

  /* ── App layout ── */
  .app { min-height:100vh; max-width:960px; margin:0 auto; padding:clamp(20px,5vw,40px) clamp(16px,4vw,24px) 80px; }

  /* ── Top nav ── */
  .topnav {
    display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;
    margin-bottom:clamp(24px,5vw,36px); border-bottom:3px solid var(--ink); padding-bottom:16px;
  }
  .nav-brand { display:flex; align-items:baseline; gap:10px; }
  .nav-title { font-size:clamp(26px,7vw,40px); font-weight:800; letter-spacing:-2px; line-height:1; }
  .nav-title span { color:var(--accent); }
  .nav-version { font-family:var(--mono); font-size:10px; color:var(--ink2); letter-spacing:.1em; }
  .nav-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .user-chip {
    display:flex; align-items:center; gap:8px;
    padding:5px 12px 5px 6px; border-radius:999px;
    border:1.5px solid var(--border); background:var(--surface);
    font-family:var(--mono); font-size:12px;
  }
  .user-chip-avatar {
    width:26px; height:26px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:10px; font-weight:800; color:#fff; font-family:var(--sans);
  }
  .role-badge {
    display:inline-flex; align-items:center; gap:4px;
    font-size:10px; font-family:var(--mono); font-weight:600;
    padding:2px 8px; border-radius:999px; letter-spacing:.04em; text-transform:uppercase;
  }
  .logout-btn { font-family:var(--mono); font-size:11px; padding:6px 12px; border:1.5px solid var(--border); border-radius:4px; cursor:pointer; background:transparent; color:var(--ink2); transition:all .12s; white-space:nowrap; }
  .logout-btn:hover { border-color:var(--accent); color:var(--accent); }

  /* ── Permission banner ── */
  .role-banner {
    display:flex; align-items:center; gap:10px;
    padding:12px 16px; border-radius:4px; margin-bottom:20px;
    font-family:var(--mono); font-size:12px; line-height:1.5;
    border:1.5px solid;
  }
  .role-banner.admin { background:#fde8e0; border-color:#e84c1e; color:#7a1200; }
  .role-banner.user  { background:#e8f0fe; border-color:#60a5fa; color:#0f2a6b; }
  .role-banner-icon { font-size:18px; flex-shrink:0; }

  /* offline */
  .offline-banner { background:#fff3cd; border:1.5px solid #f5a623; border-radius:4px; padding:12px 16px; margin-bottom:20px; font-size:12px; font-family:var(--mono); color:#7a4f00; line-height:1.6; word-break:break-word; }

  /* ── Admin panels ── */
  .panel-tabs { display:flex; gap:0; margin-bottom:24px; border:2px solid var(--ink); border-radius:var(--r); overflow:hidden; width:fit-content; }
  .panel-tab { padding:8px 20px; font-family:var(--sans); font-weight:700; font-size:13px; letter-spacing:.04em; cursor:pointer; border:none; background:transparent; color:var(--ink2); transition:background .15s,color .15s; white-space:nowrap; }
  .panel-tab.active { background:var(--ink); color:#fff; }

  /* ── Users table ── */
  .users-table { background:var(--surface); border:2px solid var(--ink); border-radius:var(--r); overflow:hidden; box-shadow:4px 4px 0 var(--border); margin-bottom:20px; }
  .users-table-head { display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:0; background:var(--ink); color:#fff; font-family:var(--mono); font-size:11px; letter-spacing:.1em; text-transform:uppercase; }
  .users-table-head div,.users-table-row div { padding:10px 14px; }
  .users-table-row { display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:0; border-top:1px solid var(--border); align-items:center; font-family:var(--mono); font-size:13px; transition:background .1s; }
  .users-table-row:hover { background:var(--bg); }
  @media(max-width:540px){
    .users-table-head,.users-table-row { grid-template-columns:1fr 1fr; }
    .users-table-head div:nth-child(3),.users-table-head div:nth-child(4),
    .users-table-row div:nth-child(3),.users-table-row div:nth-child(4) { display:none; }
  }
  .role-select { padding:4px 8px; font-size:12px; font-family:var(--mono); border:1px solid var(--border); border-radius:999px; background:transparent; }
  .del-user-btn { font-family:var(--mono); font-size:11px; padding:4px 10px; border:1.5px solid #fca5a5; border-radius:4px; cursor:pointer; background:#fff0ee; color:var(--accent); transition:all .12s; white-space:nowrap; }
  .del-user-btn:hover { background:var(--accent); color:#fff; }

  /* ── form card ── */
  .form-card { background:var(--surface); border:2px solid var(--ink); border-radius:var(--r); padding:clamp(16px,4vw,28px) clamp(14px,4vw,32px); margin-bottom:24px; box-shadow:6px 6px 0 var(--ink); transition:box-shadow .15s; }
  .form-card:focus-within { box-shadow:8px 8px 0 var(--accent); }
  .form-card.locked { opacity:.6; pointer-events:none; box-shadow:4px 4px 0 var(--border); border-color:var(--border); }
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
  @media(max-width:380px){ .form-actions{flex-direction:column;} .btn{width:100%;text-align:center;} }

  /* ── Filter bar ── */
  .filter-bar { background:var(--surface); border:2px solid var(--ink); border-radius:var(--r); padding:16px 20px; margin-bottom:16px; box-shadow:4px 4px 0 var(--border); }
  .filter-bar-title { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink2); font-family:var(--mono); margin-bottom:12px; }
  .filter-grid { display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; align-items:end; }
  @media(max-width:600px){ .filter-grid { grid-template-columns:1fr 1fr; } }
  @media(max-width:400px){ .filter-grid { grid-template-columns:1fr; } }
  .search-field { position:relative; }
  .search-field input { padding-left:34px; }
  .search-ico { position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:14px; color:var(--ink2); pointer-events:none; }
  .sort-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; align-items:center; }
  .sort-label { font-size:11px; font-family:var(--mono); color:var(--ink2); letter-spacing:.08em; text-transform:uppercase; margin-right:4px; }
  .sort-btn { font-family:var(--mono); font-size:11px; font-weight:500; padding:5px 12px; border:1.5px solid var(--border); border-radius:999px; cursor:pointer; background:transparent; color:var(--ink2); transition:all .12s; white-space:nowrap; }
  .sort-btn:hover { border-color:var(--ink); color:var(--ink); }
  .sort-btn.active { background:var(--ink); color:#fff; border-color:var(--ink); }

  /* ── Results bar ── */
  .results-bar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
  .results-info { font-family:var(--mono); font-size:11px; color:var(--ink2); }
  .results-info strong { color:var(--ink); }
  .per-page-wrap { display:flex; align-items:center; gap:8px; font-family:var(--mono); font-size:11px; color:var(--ink2); }
  .per-page-wrap select { width:auto; padding:4px 8px; font-size:12px; }

  /* ── Item list ── */
  .item-list { display:flex; flex-direction:column; gap:10px; }
  .item-card { background:var(--surface); border:1.5px solid var(--border); border-radius:var(--r); padding:clamp(12px,3vw,18px) clamp(13px,3vw,22px); display:grid; grid-template-columns:auto 1fr auto; gap:14px; align-items:start; transition:border-color .15s,box-shadow .15s,transform .15s; animation:slideIn .22s ease both; }
  @keyframes slideIn { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }
  .item-card:hover { border-color:var(--ink); box-shadow:4px 4px 0 var(--ink); transform:translate(-2px,-2px); }
  .item-card.editing { border-color:var(--accent2); box-shadow:4px 4px 0 var(--accent2); }
  @media(max-width:500px){
    .item-card { grid-template-columns:auto 1fr; }
    .item-actions { grid-column:1/-1; border-top:1px solid var(--border); padding-top:10px; justify-content:flex-start; }
  }

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
  .item-by { font-family:var(--mono); font-size:10px; color:#bbb; }
  .item-actions { display:flex; gap:8px; align-items:flex-start; flex-shrink:0; flex-wrap:wrap; }

  .inline-edit { grid-column:1/-1; border-top:1px solid var(--border); margin-top:8px; padding-top:14px; }
  .inline-edit .form-row { margin-bottom:12px; }

  /* ── Pagination ── */
  .pagination { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:6px; margin-top:24px; }
  .page-btn { font-family:var(--mono); font-size:12px; font-weight:600; min-width:34px; height:34px; padding:0 10px; border:1.5px solid var(--border); border-radius:var(--r); cursor:pointer; background:var(--surface); color:var(--ink2); transition:all .12s; display:flex; align-items:center; justify-content:center; }
  .page-btn:hover:not(:disabled) { border-color:var(--ink); color:var(--ink); box-shadow:2px 2px 0 var(--ink); transform:translate(-1px,-1px); }
  .page-btn.current { background:var(--ink); color:#fff; border-color:var(--ink); transform:none; box-shadow:none; cursor:default; }
  .page-btn:disabled { opacity:.35; cursor:not-allowed; }
  .page-ellipsis { font-family:var(--mono); font-size:12px; color:var(--ink2); padding:0 4px; }

  /* empty */
  .empty { text-align:center; padding:clamp(36px,8vw,60px) 16px; color:var(--ink2); border:2px dashed var(--border); border-radius:4px; }
  .empty-icon { font-size:34px; margin-bottom:10px; }
  .empty p { font-size:15px; font-weight:600; }
  .empty small { font-family:var(--mono); font-size:12px; }

  /* toast */
  .toast { position:fixed; bottom:clamp(12px,3vw,24px); right:clamp(12px,3vw,24px); max-width:calc(100vw - 40px); background:var(--ink); color:#fff; padding:11px 18px; border-radius:4px; font-family:var(--mono); font-size:13px; box-shadow:0 8px 24px rgba(0,0,0,.2); z-index:999; animation:toastIn .22s ease; word-break:break-word; }
  @keyframes toastIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
  .toast.error { background:var(--accent); }
  .loader { text-align:center; padding:40px; color:var(--ink2); font-family:var(--mono); letter-spacing:.1em; }
`;

/* ──────────────── SMALL HELPERS ──────────────── */
function Toast({ msg, type }) {
  return <div className={`toast ${type === "error" ? "error" : ""}`}>{msg}</div>;
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.active;
  return (
    <span className="status-badge" style={{ background: c.bg, color: c.text }}>
      <span className="status-dot" style={{ background: c.dot }} /> {status}
    </span>
  );
}

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.user;
  return (
    <span className="role-badge" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {role === "admin" ? "⚡" : "👤"} {role}
    </span>
  );
}

function CardAvatar({ src, name, size = 46 }) {
  if (src)
    return <div className="card-avatar" style={{ width: size, height: size }}><img src={src} alt={name} /></div>;
  if (name) {
    const av = getInitialsAvatar(name);
    return (
      <div className="card-avatar" style={{
        width: size, height: size,
        background: `linear-gradient(135deg,${av.from},${av.to})`,
        fontSize: Math.round(size * 0.3), fontWeight: 800, color: "#fff",
        fontFamily: "'Syne',sans-serif", letterSpacing: "-1px",
      }}>{av.initials}</div>
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

  const renderPrev = () => {
    if (value) return <div className="avatar-circle" style={{ width: sz, height: sz }}><img src={value} alt="preview" /></div>;
    if (name) {
      const av = getInitialsAvatar(name || "?");
      return <div className="avatar-circle" style={{ width: sz, height: sz, background: `linear-gradient(135deg,${av.from},${av.to})`, fontSize: Math.round(sz * 0.3), fontWeight: 800, color: "#fff", fontFamily: "'Syne',sans-serif" }}>{av.initials}</div>;
    }
    return <div className="avatar-circle placeholder" style={{ width: sz, height: sz, fontSize: 22 }}>📷</div>;
  };

  return (
    <div className={`avatar-drop-zone ${drag ? "dragover" : ""}`}
      onClick={() => fileRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); processFile(e.dataTransfer.files[0]); }}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden-input"
        onChange={(e) => processFile(e.target.files[0])} />
      {renderPrev()}
      <div className="avatar-info">
        <p>{value ? "Profile picture set ✓" : "Upload profile picture"}</p>
        <small>Tap or drag & drop · JPG PNG GIF WEBP</small>
        {value && <button className="remove-avatar" onClick={(e) => { e.stopPropagation(); onChange(null); }}>✕ Remove</button>}
      </div>
    </div>
  );
}

function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div className="pagination">
      <button className="page-btn" disabled={current === 1} onClick={() => onChange(current - 1)}>‹ Prev</button>
      {pages.map((p, i) =>
        p === "…" ? <span key={`e${i}`} className="page-ellipsis">…</span> :
        <button key={p} className={`page-btn ${p === current ? "current" : ""}`} onClick={() => p !== current && onChange(p)}>{p}</button>
      )}
      <button className="page-btn" disabled={current === total} onClick={() => onChange(current + 1)}>Next ›</button>
    </div>
  );
}

/* ──────────────── AUTH SCREEN ──────────────── */
function AuthScreen({ onLogin, showToast }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", role: "user" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleLogin = async () => {
    setErr(""); setLoading(true);
    try {
      const body = new URLSearchParams({ username: form.username, password: form.password });
      const r = await fetch(`${API}/auth/login`, { method: "POST", body });
      const data = await r.json();
      if (!r.ok) { setErr(data.detail || "Login failed"); return; }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      onLogin(data.user, data.access_token);
    } catch { setErr("Cannot reach server. Is the API running?"); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setErr(""); setLoading(true);
    try {
      const r = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, password: form.password, role: form.role }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.detail || "Registration failed"); return; }
      showToast("✓ Account created — please log in");
      setTab("login");
      setForm((p) => ({ ...p, password: "" }));
    } catch { setErr("Cannot reach server. Is the API running?"); }
    finally { setLoading(false); }
  };

  const demoLogin = (username, password) => setForm({ username, password, role: "user" });

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">Record Manager · v3.0</div>
        <div className="auth-title">CRUD<span>.</span></div>
        <div className="auth-subtitle">Authentication + Role-Based Access</div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => { setTab("login"); setErr(""); }}>Login</button>
          <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => { setTab("register"); setErr(""); }}>Register</button>
        </div>

        {err && <div className="auth-err">⚠ {err}</div>}

        <div className="auth-field">
          <label>Username</label>
          <input placeholder="Enter username…" value={form.username} onChange={set("username")}
            onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
        </div>
        <div className="auth-field">
          <label>Password</label>
          <input type="password" placeholder="Enter password…" value={form.password} onChange={set("password")}
            onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? handleLogin() : handleRegister())} />
        </div>

        {tab === "register" && (
          <div className="auth-field">
            <label>Role</label>
            <select value={form.role} onChange={set("role")}>
              <option value="user">User — read only</option>
              <option value="admin">Admin — full access</option>
            </select>
          </div>
        )}

        <button className="auth-btn" disabled={loading}
          onClick={tab === "login" ? handleLogin : handleRegister}>
          {loading ? "Please wait…" : tab === "login" ? "Sign In →" : "Create Account →"}
        </button>

        <div className="auth-demo">
          <p>Quick demo accounts</p>
          <div className="demo-accounts">
            <button className="demo-btn" onClick={() => demoLogin("admin", "admin123")}>⚡ admin / admin123</button>
            <button className="demo-btn" onClick={() => demoLogin("user", "user123")}>👤 user / user123</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── USERS PANEL (admin only) ──────────────── */
function UsersPanel({ token, showToast, currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch(`${API}/users`, { headers });
      if (!r.ok) throw new Error();
      setUsers(await r.json());
    } catch { showToast("Failed to load users", "error"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const deleteUser = async (username) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      const r = await fetch(`${API}/users/${username}`, { method: "DELETE", headers });
      if (!r.ok && r.status !== 204) throw new Error();
      setUsers((p) => p.filter((u) => u.username !== username));
      showToast("User deleted");
    } catch { showToast("Failed to delete user", "error"); }
  };

  const changeRole = async (username, role) => {
    try {
      const r = await fetch(`${API}/users/${username}/role`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw new Error();
      setUsers((p) => p.map((u) => u.username === username ? { ...u, role } : u));
      showToast(`✓ Role updated to "${role}"`);
    } catch { showToast("Failed to update role", "error"); }
  };

  if (loading) return <div className="loader">loading users…</div>;

  return (
    <div>
      <div className="users-table">
        <div className="users-table-head">
          <div>Username</div>
          <div>Role</div>
          <div>Joined</div>
          <div>Actions</div>
        </div>
        {users.map((u) => (
          <div className="users-table-row" key={u.username}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CardAvatar name={u.username} size={28} />
              <span style={{ fontWeight: u.username === currentUser.username ? 700 : 400 }}>
                {u.username}
                {u.username === currentUser.username && <span style={{ color: "var(--ink2)", fontSize: 10, marginLeft: 6 }}>(you)</span>}
              </span>
            </div>
            <div>
              {u.username === currentUser.username
                ? <RoleBadge role={u.role} />
                : <select className="role-select" value={u.role} onChange={(e) => changeRole(u.username, e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
              }
            </div>
            <div style={{ fontSize: 11, color: "var(--ink2)" }}>
              {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div>
              {u.username !== currentUser.username &&
                <button className="del-user-btn" onClick={() => deleteUser(u.username)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────── MAIN APP ──────────────── */
const EMPTY_FORM = { name: "", email: "", description: "", status: "active", avatar: null };
const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "az",     label: "A → Z" },
  { key: "za",     label: "Z → A" },
];

export default function App() {
  // ── auth state ──
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("auth_user")); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");

  // ── app state ──
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [offline,  setOffline]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState("records"); // records | users

  // ── filters ──
  const [query,      setQuery]      = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [statusF,    setStatusF]    = useState("all");
  const [sortKey,    setSortKey]    = useState("newest");
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(10);

  const isAdmin = authUser?.role === "admin";

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const handleLogin = (user, tok) => {
    setAuthUser(user);
    setToken(tok);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setAuthUser(null);
    setToken("");
    setItems([]);
  };

  // fetch records
  const fetchItems = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API}/items`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 401) { handleLogout(); return; }
      if (!r.ok) throw new Error();
      const data = await r.json();
      setItems(data.items || data);
      setOffline(false);
    } catch { setOffline(true); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (authUser) fetchItems();
    else setLoading(false);
  }, [authUser, fetchItems]);

  useEffect(() => { setPage(1); }, [query, filterDate, statusF, sortKey, pageSize]);

  // filtered + sorted + paginated (client-side)
  const filtered = useMemo(() => {
    let list = [...items];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.email || "").toLowerCase().includes(q) ||
      (i.description || "").toLowerCase().includes(q));
    if (statusF !== "all") list = list.filter((i) => i.status === statusF);
    if (filterDate) list = list.filter((i) => i.created_at?.startsWith(filterDate));
    if (sortKey === "newest") list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortKey === "oldest") list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortKey === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortKey === "za") list.sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [items, query, filterDate, statusF, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // CRUD
  const handleCreate = async () => {
    if (!form.name.trim()) return showToast("Name is required", "error");
    try {
      const r = await fetch(`${API}/items`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ name: form.name, email: form.email, description: form.description, status: form.status }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || "Error");
      const item = await r.json();
      item._avatar = form.avatar;
      setItems((p) => [item, ...p]);
      setForm(EMPTY_FORM);
      showToast("✓ Record created");
    } catch (e) { showToast(e.message || "Failed to create", "error"); }
  };

  const handleDelete = async (id) => {
    try {
      const r = await fetch(`${API}/items/${id}`, { method: "DELETE", headers: authHeaders });
      if (!r.ok && r.status !== 204) throw new Error();
      setItems((p) => p.filter((x) => x.id !== id));
      showToast("Record deleted");
    } catch { showToast("Failed to delete", "error"); }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditData({ name: item.name, email: item.email || "", description: item.description || "", status: item.status, avatar: item._avatar || null });
  };
  const cancelEdit = () => { setEditId(null); setEditData({}); };

  const handleUpdate = async (id) => {
    if (!editData.name?.trim()) return showToast("Name is required", "error");
    try {
      const r = await fetch(`${API}/items/${id}`, {
        method: "PUT", headers: authHeaders,
        body: JSON.stringify({ name: editData.name, email: editData.email, description: editData.description, status: editData.status }),
      });
      if (!r.ok) throw new Error();
      const updated = await r.json();
      updated._avatar = editData.avatar;
      setItems((p) => p.map((x) => (x.id === id ? updated : x)));
      cancelEdit();
      showToast("✓ Record updated");
    } catch { showToast("Failed to update", "error"); }
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const hasActiveFilters = query || filterDate || statusF !== "all" || sortKey !== "newest";
  const clearFilters = () => { setQuery(""); setFilterDate(""); setStatusF("all"); setSortKey("newest"); };

  // ── Not logged in → show auth screen ──
  if (!authUser) return (
    <>
      <style>{styles}</style>
      <AuthScreen onLogin={handleLogin} showToast={showToast} />
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  );

  const av = getInitialsAvatar(authUser.username);

  /* ─── Main authenticated view ─── */
  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* Top nav */}
        <nav className="topnav">
          <div className="nav-brand">
            <div className="nav-title">CRUD<span>.</span></div>
            <span className="nav-version">v3.0</span>
          </div>
          <div className="nav-right">
            <div className="user-chip">
              <div className="user-chip-avatar"
                style={{ background: `linear-gradient(135deg,${av.from},${av.to})` }}>
                {av.initials}
              </div>
              <span>{authUser.username}</span>
              <RoleBadge role={authUser.role} />
            </div>
            <button className="logout-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </nav>

        {/* Role banner */}
        <div className={`role-banner ${isAdmin ? "admin" : "user"}`}>
          <span className="role-banner-icon">{isAdmin ? "⚡" : "👀"}</span>
          {isAdmin
            ? <span>You are logged in as <strong>Admin</strong> — you have full CRUD access and can manage users.</span>
            : <span>You are logged in as a <strong>User</strong> — you can view records but cannot create, edit, or delete.</span>}
        </div>

        {offline && (
          <div className="offline-banner">
            ⚠ Cannot reach API at <strong>{API}</strong> — run:{" "}
            <code>python -m uvicorn main:app --reload</code>
          </div>
        )}

        {/* Admin panel tabs */}
        {isAdmin && (
          <div className="panel-tabs">
            <button className={`panel-tab ${activeTab === "records" ? "active" : ""}`} onClick={() => setActiveTab("records")}>📋 Records</button>
            <button className={`panel-tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>👥 Users</button>
          </div>
        )}

        {/* Users management panel (admin only) */}
        {activeTab === "users" && isAdmin && (
          <UsersPanel token={token} showToast={showToast} currentUser={authUser} />
        )}

        {activeTab === "records" && (
          <>
            {/* Create form — locked for non-admins */}
            <div className={`form-card ${!isAdmin ? "locked" : ""}`}>
              <div className="form-title">
                {isAdmin ? "→ New Record" : "🔒 New Record — Admin Only"}
              </div>
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
                  <textarea placeholder="Optional…" value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleCreate}>+ Add Record</button>
                <button className="btn btn-ghost" onClick={() => setForm(EMPTY_FORM)}>Clear</button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="filter-bar">
              <div className="filter-bar-title">🔍 Search & Filter</div>
              <div className="filter-grid">
                <div className="search-field">
                  <label>Search</label>
                  <span className="search-ico">⌕</span>
                  <input placeholder="Name, email, or description…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div>
                  <label>Status</label>
                  <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
                    <option value="all">All statuses</option>
                    <option value="active">Active only</option>
                    <option value="archived">Archived only</option>
                  </select>
                </div>
                <div>
                  <label>Created on</label>
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                </div>
              </div>
              <div className="sort-row">
                <span className="sort-label">Sort:</span>
                {SORTS.map((s) => (
                  <button key={s.key} className={`sort-btn ${sortKey === s.key ? "active" : ""}`} onClick={() => setSortKey(s.key)}>{s.label}</button>
                ))}
                {hasActiveFilters && (
                  <button className="sort-btn" style={{ marginLeft: "auto", color: "var(--accent)", borderColor: "var(--accent)" }} onClick={clearFilters}>✕ Clear</button>
                )}
              </div>
            </div>

            {/* Results bar */}
            <div className="results-bar">
              <div className="results-info">
                Showing <strong>{paginated.length}</strong> of <strong>{filtered.length}</strong>
                {filtered.length !== items.length && ` (filtered from ${items.length})`} records
                {totalPages > 1 && ` · Page ${safePage} of ${totalPages}`}
              </div>
              <div className="per-page-wrap">
                <span>Per page:</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Records */}
            {loading ? (
              <div className="loader">loading records…</div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">◻</div>
                <p>No records found</p>
                <small>{hasActiveFilters ? "Try adjusting your filters" : isAdmin ? "Create your first record above" : "No records yet — ask an admin to add some"}</small>
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
                              {item.created_by && <span className="item-by">by {item.created_by}</span>}
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="item-actions">
                              <button className="btn btn-sm btn-edit" onClick={() => startEdit(item)}>Edit</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <Pagination current={safePage} total={totalPages} onChange={setPage} />
              </>
            )}
          </>
        )}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  );
}
