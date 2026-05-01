import { useState, useRef, useEffect } from "react";
import { db, auth } from "./firebase";
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, where, onSnapshot
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";

// ─────────────────────────────────────────────────────────────
const ADMIN_UID = "VE183TvlMgNxmiO9kJjzX6IlzNg1";
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME    = "dw4clwa2b";
const CLOUDINARY_UPLOAD_PRESET = "yo man";
// ─────────────────────────────────────────────────────────────

const categories = [
  { id: "immobilier",   label: "Immobilier",       icon: "🏠" },
  { id: "vehicules",    label: "Véhicules",         icon: "🚗" },
  { id: "electronique", label: "Électronique",      icon: "📱" },
  { id: "agriculture",  label: "Agriculture",       icon: "🌾" },
  { id: "vetements",    label: "Vêtements & Mode",  icon: "👗" },
  { id: "maison",       label: "Maison & Mobilier", icon: "🛋️" },
  { id: "emploi",       label: "Emploi & Services", icon: "💼" },
  { id: "education",    label: "Éducation",         icon: "📚" },
  { id: "alimentation", label: "Alimentation",      icon: "🍎" },
  { id: "sante",        label: "Santé & Beauté",    icon: "⚕️" },
  { id: "animaux",      label: "Animaux",           icon: "🐄" },
];

const catEmojis = {
  immobilier:"🏡", vehicules:"🚗", electronique:"📱",
  agriculture:"🌾", vetements:"👗", maison:"🛋️",
  emploi:"💼", education:"📚", alimentation:"🍎",
  sante:"⚕️", animaux:"🐄"
};
const villes = [
  "Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Ouahigouya", "Banfora",
  "Dédougou", "Fada N'Gourma", "Tenkodogo", "Kaya", "Ziniaré",
  "Kongoussi", "Manga", "Léo", "Diébougou", "Gaoua",
  "Pô", "Réo", "Yako", "Titao", "Tougan",
  "Nouna", "Djibo", "Dori", "Gorom-Gorom", "Sebba",
  "Bogandé", "Gayéri", "Diapaga", "Kantchari", "Pama",
  "Batié", "Kampti", "Dano", "Dissin", "Nako",
  "Solenzo", "Boromo", "Sapone", "Kombissiri", "Saponé",
  "Kokologo", "Pô", "Boulsa", "Koupéla", "Pouytenga",
  "Zorgho", "Zorgo", "Zinigma", "Bassawarga", "Gourcy",
  "Thiou", "Seguenega", "Ouarkoye", "Lanfiéra", "Banh",
  "Kelbo", "Boundore", "Manni", "Bilanga", "Piela"
];
const waLink     = (num, titre) => `https://wa.me/${num}?text=${encodeURIComponent(`Bonjour ! Je suis intéressé(e) par votre annonce "${titre}" sur YoMan!`)}`;

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method:"POST", body:fd });
  const data = await res.json();
  if (data.secure_url) return data.secure_url;
  throw new Error(data.error?.message || "Upload échoué");
}

// ── BOTTOM NAV ────────────────────────────────────────────────
const BottomNav = ({ page, setPage, catActive, setCat, favoris, unread=0 }) => (
  <nav className="bottom-nav">
    <button className={`bnav-item${page==="home" && catActive!=="favoris"?" on":""}`} onClick={()=>{setPage("home"); setCat("tous");}} style={{position:"relative"}}>
      <span className="bnav-icon">🏠</span>
      <span className="bnav-label">Accueil</span>
    </button>
    <button className={`bnav-item${page==="messages"?" on":""}`} onClick={()=>setPage("messages")} style={{position:"relative"}}>
      <span className="bnav-icon">💬</span>
      {unread > 0 && <span className="bnav-badge">{unread}</span>}
      <span className="bnav-label">Messages</span>
    </button>
    <button className="bnav-item bnav-post" onClick={()=>setPage("post")} style={{position:"relative"}}>
      <span className="bnav-icon">+</span>
      <span className="bnav-label">Publier</span>
    </button>
    <button className={`bnav-item${page==="home" && catActive==="favoris"?" on":""}`} onClick={()=>{setPage("home"); setCat("favoris");}} style={{position:"relative"}}>
      <span className="bnav-icon">{catActive==="favoris" ? "❤️" : "🤍"}</span>
      {favoris.length > 0 && <span className="bnav-badge">{favoris.length}</span>}
      <span className="bnav-label">Favoris</span>
    </button>
    <button className={`bnav-item${page==="profile"?" on":""}`} onClick={()=>setPage("profile")} style={{position:"relative"}}>
      <span className="bnav-icon">👤</span>
      <span className="bnav-label">Profil</span>
    </button>
  </nav>
);

// ── LOGO ──────────────────────────────────────────────────────
const YoManLogo = ({ variant = "white", height = 48 }) => {
  const isWhite = variant === "white";
  const bgColor = isWhite ? "url(#logoGrad)" : "url(#logoGrad)";
  const bgBorder= isWhite ? "#0A2463"        : "#0A2463";
  const subText = isWhite ? "rgba(255,255,255,0.65)" : "#6B80A8";
  const textMan = isWhite ? "#FFD93D"                : "#1756C8";
  const textExcl= "#FFD93D";
  const w = height * 3.4;
  return (
    <svg width={w} height={height} viewBox="0 0 204 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{maxWidth:"100%"}}>
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0A2463"/>
          <stop offset="100%" stopColor="#1756C8"/>
        </linearGradient>
      </defs>
      {/* Carré arrondi */}
      <rect x="0" y="0" width="58" height="60" rx="14" fill={bgColor} stroke={bgBorder} strokeWidth="1.5"/>
      {/* Yo et ! sur la même ligne */}
      <text x="24" y="37" fontFamily="'Montserrat','Arial Black',sans-serif" fontWeight="900" fontSize="26" fill="white" textAnchor="middle">Yo</text>
      <text x="46" y="37" fontFamily="'Montserrat','Arial Black',sans-serif" fontWeight="900" fontSize="26" fill={textExcl}>!</text>
      {/* Texte YoMan! aligné verticalement au centre */}
      <text x="70" y="25" fontFamily="'Montserrat','Arial Black',sans-serif" fontWeight="900" fontSize="20" fill="white" stroke="#1756C8" strokeWidth="2" paintOrder="stroke" letterSpacing="-0.5">Yo</text>
      <text x="95" y="25" fontFamily="'Montserrat','Arial Black',sans-serif" fontWeight="900" fontSize="20" fill={textMan} letterSpacing="-0.5">Man</text>
      <text x="145" y="25" fontFamily="'Montserrat','Arial Black',sans-serif" fontWeight="900" fontSize="20" fill={textExcl} letterSpacing="-0.5">!</text>
      {/* Tagline */}
      <text x="70" y="42" fontFamily="'Montserrat',sans-serif" fontWeight="500" fontSize="9" fill={subText} letterSpacing="0.8">· entre particuliers ·</text>
    </svg>
  );
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
  :root {
    --blue:#1756C8; --dark:#0A2463; --sky:#38CFFF;
    --gold:#FFD93D; --bg:#182236; --bg2:#1f2d47; --bg3:#243450;
    --text:#e8f0ff; --muted:#7a90b8;
    --border:rgba(255,255,255,0.08); --border2:rgba(255,255,255,0.14);
    --card:rgba(255,255,255,0.04); --card-hover:rgba(255,255,255,0.07);
    --green:#22C55E; --red:#EF4444;
    --radius:16px; --card-radius:20px;
  }
  body { font-family:'Inter','Nunito',sans-serif; background:var(--bg); color:var(--text); overflow-x:hidden; }
  .app { min-height:100vh; padding-bottom:72px; }
  @media(min-width:768px){ .app{ padding-bottom:0; } }

  /* ── LOADING ── */
  .loading { display:flex; align-items:center; justify-content:center; min-height:100vh; font-size:32px; background:var(--bg); }

  /* ── HEADER ── */
  .hdr { background:rgba(8,12,20,0.75); backdrop-filter:blur(20px); border-bottom:1px solid var(--border); padding:0; position:sticky; top:0; z-index:100; transition:background .3s,border-color .3s; }
  .hdr-in { max-width:1200px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; min-height:64px; padding:0 28px; gap:14px; }
  .hdr-r { display:flex; align-items:center; gap:8px; flex-shrink:0; }
  .huser { font-size:13px; color:rgba(232,240,255,.7); white-space:nowrap; display:none; }
  @media(min-width:640px){ .huser{ display:block; } }
  .huser strong { color:var(--gold); font-weight:800; }
  .nav-search { flex:1; max-width:420px; display:flex; background:rgba(255,255,255,.06); border:1.5px solid var(--border); border-radius:12px; overflow:hidden; transition:all .2s; }
  .nav-search:focus-within { background:rgba(255,255,255,.1); border-color:rgba(23,86,200,.5); box-shadow:0 0 0 3px rgba(23,86,200,.12); }
  .nav-search input { flex:1; padding:10px 16px; background:transparent; border:none; outline:none; color:var(--text); font-size:13px; font-family:'Inter',sans-serif; }
  .nav-search input::placeholder { color:var(--muted); }
  .nav-search button { background:var(--gold); color:var(--dark); border:none; padding:10px 18px; font-size:13px; font-weight:800; font-family:'Montserrat',sans-serif; transition:background .2s; flex-shrink:0; cursor:pointer; }
  .nav-search button:hover { background:#FFC800; }
  @media(max-width:768px){ .nav-search{ display:none; } }
  .btn-p { background:var(--gold); color:var(--dark); border:none; border-radius:10px; padding:9px 16px; font-size:13px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; white-space:nowrap; }
  .btn-p:hover { background:#FFC800; box-shadow:0 4px 20px rgba(255,217,61,.3); }
  .btn-o { background:var(--card); color:var(--text); border:1.5px solid var(--border2); border-radius:10px; padding:8px 13px; font-size:13px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; transition:all .2s; white-space:nowrap; position:relative; }
  .btn-o:hover { background:var(--card-hover); border-color:rgba(255,255,255,.25); }

  /* ── BOTTOM NAV ── */
  .bottom-nav { display:none; }
  @media(max-width:767px){
    .bottom-nav { display:flex; position:fixed; bottom:0; left:0; right:0; background:rgba(13,21,38,.97); backdrop-filter:blur(16px); border-top:1px solid var(--border2); z-index:99; }
  }
  .bnav-item { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px 4px 8px; cursor:pointer; border:none; background:transparent; font-family:'Montserrat',sans-serif; color:var(--muted); gap:3px; transition:color .2s; }
  .bnav-item.on { color:#4d90ff; }
  .bnav-icon { font-size:20px; line-height:1; transition:transform .2s; }
  .bnav-item.on .bnav-icon { transform:translateY(-2px); }
  .bnav-label { font-size:9px; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; }
  .bnav-badge { position:absolute; top:6px; right:calc(50% - 20px); background:var(--red); color:white; font-size:9px; font-weight:800; min-width:16px; height:16px; padding:0 4px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
  .bnav-post .bnav-icon { background:linear-gradient(135deg,var(--blue),var(--dark)); border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; font-size:24px; color:white; margin-top:-14px; box-shadow:0 4px 20px rgba(23,86,200,.5); }

  /* ── HERO ── */
  .hero { min-height:86vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:80px 28px 60px; position:relative; overflow:hidden; }
  .hero-glow1 { position:absolute; top:-200px; left:50%; transform:translateX(-50%); width:900px; height:900px; background:radial-gradient(ellipse,rgba(23,86,200,.22) 0%,transparent 65%); pointer-events:none; }
  .hero-glow2 { position:absolute; bottom:-100px; left:15%; width:500px; height:500px; background:radial-gradient(ellipse,rgba(255,217,61,.07) 0%,transparent 65%); pointer-events:none; }
  .hero-glow3 { position:absolute; top:20%; right:5%; width:300px; height:300px; background:radial-gradient(ellipse,rgba(56,207,255,.08) 0%,transparent 65%); pointer-events:none; }
  .hero::before { content:''; position:absolute; inset:0; background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E"); pointer-events:none; }
  .hero-badge { display:inline-flex; align-items:center; gap:7px; background:rgba(23,86,200,.15); border:1px solid rgba(23,86,200,.35); color:#7ab3ff; font-size:.72rem; font-weight:700; padding:6px 16px; border-radius:50px; letter-spacing:.5px; margin-bottom:26px; text-transform:uppercase; position:relative; z-index:1; opacity:0; animation:fadeUp .8s ease .1s forwards; }
  .hero-badge::before { content:''; display:inline-block; width:7px; height:7px; border-radius:50%; background:#4d90ff; box-shadow:0 0 8px #4d90ff; animation:blink 2s infinite; flex-shrink:0; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  .hero h1 { font-family:'Montserrat',sans-serif; font-size:clamp(2rem,6vw,4.5rem); font-weight:900; color:var(--text); line-height:1.05; letter-spacing:-2px; margin-bottom:18px; position:relative; z-index:1; opacity:0; animation:fadeUp .9s ease .3s forwards; }
  .hero h1 em { color:var(--gold); font-style:normal; }
  .hero p { color:var(--muted); font-size:clamp(1rem,2.2vw,1.15rem); margin-bottom:38px; max-width:520px; margin-left:auto; margin-right:auto; line-height:1.7; position:relative; z-index:1; opacity:0; animation:fadeUp .9s ease .5s forwards; }
  .sbar { display:flex; max-width:620px; width:100%; margin:0 auto 32px; background:rgba(255,255,255,.06); border:1.5px solid var(--border2); border-radius:18px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.04); position:relative; z-index:1; opacity:0; animation:fadeUp .9s ease .7s forwards; transition:border-color .2s; }
  .sbar:focus-within { border-color:rgba(23,86,200,.5); box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 0 3px rgba(23,86,200,.15); }
  .sbar input { flex:1; padding:18px 22px; background:transparent; border:none; outline:none; color:var(--text); font-size:15px; font-family:'Inter',sans-serif; }
  .sbar input::placeholder { color:var(--muted); }
  .sbar button { background:var(--gold); color:var(--dark); border:none; padding:16px 28px; font-size:14px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; transition:background .2s; flex-shrink:0; }
  .sbar button:hover { background:#FFC800; }
  .hero-cats { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; position:relative; z-index:1; margin-bottom:40px; opacity:0; animation:fadeUp .9s ease .85s forwards; }
  .hero-cat { display:flex; align-items:center; gap:6px; background:var(--card); border:1.5px solid var(--border2); color:var(--muted); font-size:12px; font-weight:600; padding:8px 15px; border-radius:50px; font-family:'Montserrat',sans-serif; cursor:pointer; transition:all .2s; }
  .hero-cat:hover { background:rgba(23,86,200,.15); border-color:rgba(23,86,200,.4); color:#7ab3ff; transform:translateY(-2px); }
  .hero-stats { display:flex; justify-content:center; flex-wrap:wrap; position:relative; z-index:1; opacity:0; animation:fadeUp .9s ease 1s forwards; }
  .hero-stat { padding:8px 28px; text-align:center; }
  .hero-stat + .hero-stat { border-left:1px solid var(--border2); }
  .stn { font-size:26px; font-weight:900; color:var(--gold); font-family:'Montserrat',sans-serif; line-height:1; }
  .stl { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:2px; margin-top:4px; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }

  /* ── SECTION ── */
  .sec { max-width:1200px; margin:0 auto; padding:36px 28px 80px; }
  @media(max-width:480px){ .sec{ padding:24px 16px 80px; } }
  .sec-title { font-family:'Montserrat',sans-serif; font-size:17px; font-weight:800; color:var(--text); margin:28px 0 12px; display:flex; align-items:center; gap:8px; }
  .sec-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#4d90ff; margin-bottom:6px; }

  /* ── VEDETTES (urgent scroll) ── */
  .vedettes-scroll { display:flex; gap:12px; overflow-x:auto; padding:4px 0 16px; scrollbar-width:none; -ms-overflow-style:none; }
  .vedettes-scroll::-webkit-scrollbar { display:none; }
  .vedette-card { min-width:180px; background:var(--bg2); border-radius:14px; overflow:hidden; border:1.5px solid rgba(255,217,61,.2); flex-shrink:0; cursor:pointer; transition:all .25s; }
  .vedette-card:hover { transform:translateY(-4px); border-color:rgba(255,217,61,.5); box-shadow:0 12px 32px rgba(255,217,61,.12); }
  .vedette-img { height:90px; background:linear-gradient(135deg,#0e1e3a,#1a3a8f); display:flex; align-items:center; justify-content:center; font-size:36px; position:relative; overflow:hidden; }
  .vedette-img img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
  .vedette-badge { position:absolute; top:7px; left:7px; background:var(--gold); color:var(--dark); font-size:9px; font-weight:900; padding:3px 8px; border-radius:8px; font-family:'Montserrat',sans-serif; z-index:1; }
  .vedette-body { padding:10px 12px; }
  .vedette-title { font-family:'Montserrat',sans-serif; font-size:12px; font-weight:700; color:var(--text); margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .vedette-prix { font-size:13px; font-weight:800; color:var(--gold); font-family:'Montserrat',sans-serif; }

  /* ── CATÉGORIE TABS (scrollable) ── */
  .cat-tabs-wrap { overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none; margin:0 -28px; padding:0 28px; }
  .cat-tabs-wrap::-webkit-scrollbar { display:none; }
  .cat-tabs { display:flex; gap:8px; padding:4px 0 14px; width:max-content; min-width:100%; }
  .cat-tab-item { display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:50px; border:1.5px solid var(--border2); background:var(--card); font-family:'Montserrat',sans-serif; font-size:12px; font-weight:700; color:var(--muted); cursor:pointer; transition:all .2s; white-space:nowrap; flex-shrink:0; }
  .cat-tab-item:hover { border-color:rgba(77,144,255,.4); color:#7ab3ff; background:rgba(23,86,200,.1); }
  .cat-tab-item.on { border-color:rgba(23,86,200,.6); background:rgba(23,86,200,.18); color:#7ab3ff; box-shadow:0 0 0 1px rgba(23,86,200,.3); }
  .cat-tab-item.fav.on { border-color:rgba(239,68,68,.5); background:rgba(239,68,68,.1); color:#f87171; }
  .cat-tab-icon { font-size:16px; line-height:1; }
  .cat-tab-count { background:rgba(255,255,255,.08); border-radius:10px; padding:1px 6px; font-size:10px; }
  .cat-tab-item.on .cat-tab-count { background:rgba(255,255,255,.15); }

  /* ── FILTRES ── */
  .filter-row { display:flex; align-items:center; gap:8px; margin:14px 0 8px; flex-wrap:wrap; }
  .filter-chip { display:flex; align-items:center; gap:5px; padding:7px 14px; border-radius:50px; border:1.5px solid var(--border2); background:var(--card); font-size:12px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; }
  .filter-chip.on, .filter-chip:hover { border-color:rgba(23,86,200,.5); background:rgba(23,86,200,.15); color:#7ab3ff; }
  .filter-panel { background:var(--bg2); border-radius:16px; border:1.5px solid var(--border2); padding:20px 22px; margin-bottom:14px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; box-shadow:0 8px 32px rgba(0,0,0,.3); animation:fadeUp .2s ease; }
  @media(max-width:600px){ .filter-panel{ grid-template-columns:1fr 1fr; } }
  .filter-label { font-size:11px; font-weight:800; color:var(--text); margin-bottom:6px; display:block; text-transform:uppercase; letter-spacing:0.5px; }
  .filter-reset { background:rgba(255,255,255,.04); color:var(--muted); border:1.5px solid var(--border); border-radius:10px; padding:10px; font-size:12px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; grid-column:1/-1; transition:all .2s; }
  .filter-reset:hover { border-color:rgba(23,86,200,.4); color:#7ab3ff; }
  .results-bar { display:flex; align-items:center; justify-content:space-between; margin:16px 0 12px; }
  .results-count { font-family:'Montserrat',sans-serif; font-size:15px; font-weight:800; color:var(--text); }
  .results-sub { font-size:12px; color:rgba(232,240,255,.6); margin-top:2px; }

  /* ── GRID CARDS ── */
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:18px; margin-bottom:36px; }
  @media(max-width:640px){ .grid{ grid-template-columns:repeat(2,1fr); gap:12px; } }
  @media(max-width:360px){ .grid{ grid-template-columns:1fr; } }

  .card { background:var(--bg2); border-radius:var(--card-radius); overflow:hidden; border:1.5px solid var(--border); transition:all .28s cubic-bezier(.2,.8,.2,1); cursor:pointer; display:flex; flex-direction:column; }
  .card:hover { transform:translateY(-5px); box-shadow:0 20px 56px rgba(0,0,0,.5),0 0 0 1px rgba(23,86,200,.3); border-color:rgba(23,86,200,.35); }

  .cimg { height:190px; position:relative; overflow:hidden; flex-shrink:0; }
  .cimg-real { width:100%; height:100%; object-fit:cover; display:block; transition:transform .4s ease; }
  .card:hover .cimg-real { transform:scale(1.04); }
  .cimg-emoji { height:190px; background:linear-gradient(135deg,#0e1e3a 0%,#1a3a8f 100%); display:flex; align-items:center; justify-content:center; font-size:64px; position:relative; flex-shrink:0; }
  .photo-count { position:absolute; bottom:10px; right:10px; background:rgba(8,12,20,.75); color:var(--text); font-size:10px; font-weight:700; padding:3px 9px; border-radius:10px; font-family:'Montserrat',sans-serif; backdrop-filter:blur(4px); }
  .bcat { position:absolute; top:10px; left:10px; background:rgba(10,36,99,.85); color:#7ab3ff; font-size:9px; font-weight:800; letter-spacing:0.8px; padding:4px 10px; border-radius:20px; text-transform:uppercase; font-family:'Montserrat',sans-serif; z-index:1; backdrop-filter:blur(6px); border:1px solid rgba(77,144,255,.25); }
  .burg { position:absolute; top:10px; right:42px; background:linear-gradient(135deg,#FF6B35,#FF3D00); color:white; font-size:9px; font-weight:800; padding:4px 10px; border-radius:20px; font-family:'Montserrat',sans-serif; z-index:1; animation:puls 2.5s infinite; }
  @keyframes puls { 0%,100%{box-shadow:0 0 0 0 rgba(255,61,0,.4)} 50%{box-shadow:0 0 0 6px rgba(255,61,0,0)} }
  .bmine { position:absolute; bottom:10px; left:10px; background:var(--gold); color:var(--dark); font-size:9px; font-weight:800; padding:3px 9px; border-radius:20px; font-family:'Montserrat',sans-serif; z-index:1; }
  .fav-btn { position:absolute; top:10px; right:10px; width:30px; height:30px; border-radius:50%; background:rgba(8,12,20,.75); border:1px solid var(--border2); font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); transition:all .2s; z-index:2; }
  .fav-btn:hover { transform:scale(1.2); }

  .cbody { padding:14px 16px 16px; display:flex; flex-direction:column; flex:1; }
  .ctitle { font-family:'Montserrat',sans-serif; font-size:14px; font-weight:700; color:var(--text); margin-bottom:6px; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .cprix { font-size:18px; font-weight:900; color:var(--gold); margin-bottom:6px; font-family:'Montserrat',sans-serif; letter-spacing:-0.3px; }
  .clieu { font-size:11px; color:rgba(232,240,255,.6); margin-bottom:8px; }
  .cdesc { font-size:12px; color:rgba(232,240,255,.75); line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:12px; flex:1; }
  .cfoot { display:flex; align-items:center; justify-content:space-between; border-top:1px solid var(--border); padding-top:11px; margin-top:auto; }
  .cvend { font-size:11px; color:rgba(232,240,255,.6); min-width:0; }
  .cvend strong { color:var(--text); font-size:12px; display:block; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px; }
  .cbtn { display:flex; align-items:center; gap:4px; background:rgba(23,86,200,.2); color:#7ab3ff; border:1px solid rgba(23,86,200,.35); border-radius:9px; padding:7px 13px; font-size:12px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; flex-shrink:0; }
  .cbtn:hover { background:rgba(23,86,200,.35); border-color:rgba(77,144,255,.5); }

  /* ── EMPTY STATE ── */
  .empty { text-align:center; padding:60px 20px; color:var(--muted); }
  .eico { font-size:52px; margin-bottom:14px; line-height:1; }
  .emsg { font-size:16px; font-weight:700; color:var(--text); margin-bottom:6px; }
  .esub { font-size:13px; color:var(--muted); }

  /* ── PAGINATION ── */
  .pagination { display:flex; align-items:center; justify-content:center; gap:6px; margin:8px 0 44px; flex-wrap:wrap; }
  .page-btn { width:40px; height:40px; border-radius:12px; border:1.5px solid var(--border2); background:var(--bg2); font-size:14px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; display:flex; align-items:center; justify-content:center; }
  .page-btn:hover:not(:disabled){ border-color:rgba(23,86,200,.5); color:#7ab3ff; background:rgba(23,86,200,.1); }
  .page-btn.on { background:rgba(23,86,200,.2); color:#7ab3ff; border-color:rgba(23,86,200,.5); }
  .page-btn:disabled { opacity:0.35; cursor:not-allowed; }

  /* ── AUTH ── */
  .auth-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:var(--bg); position:relative; overflow:hidden; }
  .auth-wrap::before { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:600px; height:600px; background:radial-gradient(ellipse,rgba(23,86,200,.18) 0%,transparent 65%); pointer-events:none; }
  .auth-box { background:var(--bg2); border:1px solid var(--border2); border-radius:28px; padding:36px 32px; max-width:400px; width:100%; box-shadow:0 40px 100px rgba(0,0,0,.6); animation:fadeUp .5s ease; position:relative; z-index:1; }
  .auth-logo-wrap { display:flex; justify-content:center; margin-bottom:24px; }
  .tabs { display:flex; background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:12px; padding:4px; margin-bottom:24px; gap:4px; }
  .tab { flex:1; padding:10px; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; border:none; background:transparent; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; }
  .tab.on { background:rgba(23,86,200,.25); color:#7ab3ff; border:1px solid rgba(23,86,200,.4); }
  .fg { margin-bottom:14px; }
  .fl { display:block; font-size:12px; font-weight:700; color:var(--text); margin-bottom:5px; text-transform:uppercase; letter-spacing:0.4px; }
  .fi { width:100%; padding:11px 14px; border:1.5px solid var(--border2); border-radius:12px; font-size:14px; font-family:'Inter',sans-serif; outline:none; background:rgba(255,255,255,.04); color:var(--text); transition:all .2s; }
  .fi:focus { border-color:rgba(23,86,200,.5); background:rgba(23,86,200,.06); box-shadow:0 0 0 3px rgba(23,86,200,.1); }
  .fs { width:100%; padding:11px 14px; border:1.5px solid var(--border2); border-radius:12px; font-size:14px; font-family:'Inter',sans-serif; outline:none; background:rgba(255,255,255,.04); color:var(--text); cursor:pointer; }
  .fs:focus { border-color:rgba(23,86,200,.5); outline:none; }
  option { background:#1a2540; color:var(--text); }
  .fta { width:100%; padding:12px 14px; border:1.5px solid var(--border2); border-radius:12px; font-size:14px; font-family:'Inter',sans-serif; outline:none; resize:vertical; min-height:96px; background:rgba(255,255,255,.04); color:var(--text); transition:all .2s; }
  .fta:focus { border-color:rgba(23,86,200,.5); background:rgba(23,86,200,.05); box-shadow:0 0 0 3px rgba(23,86,200,.1); }
  .fb { width:100%; background:linear-gradient(135deg,var(--blue),var(--dark)); color:white; border:none; border-radius:12px; padding:14px; font-size:15px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; margin-top:8px; transition:all .2s; }
  .fb:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(23,86,200,.4); }
  .fb:disabled { opacity:0.55; cursor:not-allowed; transform:none; box-shadow:none; }
  .ferr { background:rgba(239,68,68,.1); border:1.5px solid rgba(239,68,68,.3); border-radius:12px; padding:11px 14px; font-size:13px; color:#f87171; margin-bottom:14px; font-weight:600; display:flex; align-items:center; gap:8px; }
  .fhint { font-size:11px; color:var(--muted); margin-top:4px; }
  .frow { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .google-btn { width:100%; background:rgba(255,255,255,.05); color:var(--text); border:1.5px solid var(--border2); border-radius:12px; padding:13px; font-size:14px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:10px; }
  .google-btn:hover { background:rgba(255,255,255,.1); border-color:rgba(66,133,244,.4); }
  .divider { display:flex; align-items:center; gap:12px; margin:16px 0; color:var(--muted); font-size:12px; font-weight:600; }
  .divider::before, .divider::after { content:''; flex:1; height:1px; background:var(--border); }
  .utog { display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; }
  .tog { width:44px; height:24px; border-radius:12px; background:var(--border2); position:relative; transition:background .25s; flex-shrink:0; }
  .tog.on { background:var(--blue); }
  .tog::after { content:''; position:absolute; width:18px; height:18px; background:white; border-radius:50%; top:3px; left:3px; transition:left .25s; box-shadow:0 2px 6px rgba(0,0,0,.3); }
  .tog.on::after { left:23px; }

  /* ── PHOTO UPLOADER ── */
  .photo-section { margin-bottom:18px; }
  .photo-grid { display:flex; gap:10px; flex-wrap:wrap; margin-top:8px; }
  .photo-slot { width:96px; height:96px; border-radius:14px; border:2px dashed var(--border2); background:rgba(255,255,255,.03); display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; position:relative; overflow:hidden; font-size:11px; color:var(--muted); font-weight:600; gap:5px; }
  .photo-slot:hover { border-color:rgba(23,86,200,.5); background:rgba(23,86,200,.08); color:#7ab3ff; }
  .photo-slot img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
  .photo-del { position:absolute; top:5px; right:5px; background:rgba(220,38,38,.9); color:white; border:none; border-radius:50%; width:22px; height:22px; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700; z-index:2; }
  .photo-uploading { position:absolute; inset:0; background:rgba(23,86,200,.7); display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:700; border-radius:12px; }
  .photo-main-badge { position:absolute; bottom:5px; left:5px; background:var(--gold); color:var(--dark); font-size:9px; font-weight:800; padding:2px 7px; border-radius:6px; font-family:'Montserrat',sans-serif; }
  .photo-limit { font-size:11px; color:var(--muted); margin-top:6px; }

  /* ── POST PAGE ── */
  .pscreen { max-width:580px; margin:32px auto; padding:0 20px 60px; }
  .pback { display:flex; align-items:center; gap:7px; color:var(--muted); font-size:13px; font-weight:700; cursor:pointer; margin-bottom:22px; background:none; border:none; font-family:'Montserrat',sans-serif; padding:0; transition:color .2s; }
  .pback:hover { color:#7ab3ff; }
  .pcard { background:var(--bg2); border-radius:24px; padding:32px; border:1px solid var(--border2); box-shadow:0 8px 40px rgba(0,0,0,.3); }
  .ptitle { font-family:'Montserrat',sans-serif; font-size:22px; font-weight:900; color:var(--text); margin-bottom:26px; }
  .succ { background:rgba(34,197,94,.1); border:1.5px solid rgba(34,197,94,.3); border-radius:12px; padding:14px 18px; color:#4ade80; font-size:14px; font-weight:700; margin-bottom:18px; display:flex; align-items:center; gap:10px; }

  /* ── MODAL ── */
  .moverlay { position:fixed; inset:0; background:rgba(0,5,18,.85); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(8px); }
  .modal { background:var(--bg2); border:1px solid var(--border2); border-radius:24px; max-width:540px; width:100%; overflow:hidden; box-shadow:0 40px 100px rgba(0,0,0,.7); animation:fadeUp .3s cubic-bezier(.2,.8,.2,1); max-height:90vh; overflow-y:auto; position:relative; z-index:201; }
  .mimg-wrap { height:300px; position:relative; overflow:hidden; background:linear-gradient(135deg,#0e1e3a,#1a3a8f); cursor:zoom-in; }
  .mimg-real { width:100%; height:100%; object-fit:cover; display:block; transition:transform .3s; }
  .mimg-real:hover { transform:scale(1.03); }
  .mnav-btn { background:rgba(8,12,20,.65); color:white; border:1px solid var(--border2); border-radius:50%; width:36px; height:36px; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:background .2s; }
  .mnav-btn:hover { background:rgba(8,12,20,.9); }
  .mnav-left { position:absolute; left:10px; top:50%; transform:translateY(-50%); z-index:4; }
  .mnav-right { position:absolute; right:10px; top:50%; transform:translateY(-50%); z-index:4; }
  .mimg-dots { position:absolute; bottom:12px; left:50%; transform:translateX(-50%); display:flex; gap:6px; }
  .mdot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,.35); transition:all .2s; }
  .mdot.on { background:white; width:20px; border-radius:4px; }
  .mbadges { position:absolute; top:12px; left:12px; display:flex; gap:6px; z-index:1; }
  .mimg-emoji { height:220px; display:flex; align-items:center; justify-content:center; font-size:80px; background:linear-gradient(135deg,#0e1e3a,#1a3a8f); }
  .mbody { padding:24px; }
  .mtitle { font-family:'Montserrat',sans-serif; font-size:20px; font-weight:900; color:var(--text); margin-bottom:6px; line-height:1.25; }
  .mprix { font-size:26px; font-weight:900; color:var(--gold); margin-bottom:14px; font-family:'Montserrat',sans-serif; letter-spacing:-0.5px; }
  .mmeta { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
  .mmeta span { font-size:12px; color:rgba(232,240,255,.7); background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:8px; padding:5px 11px; font-weight:600; }
  .mdesc { font-size:14px; color:rgba(232,240,255,.82); line-height:1.75; margin-bottom:20px; }
  .macts { display:flex; gap:10px; flex-wrap:wrap; }
  .mclose { flex:1; min-width:80px; background:rgba(255,255,255,.05); color:var(--muted); border:1.5px solid var(--border2); border-radius:12px; padding:13px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; }
  .mclose:hover { color:var(--text); background:rgba(255,255,255,.08); }
  .mwa { flex:2; min-width:140px; display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(23,86,200,.2); color:#7ab3ff; border:1.5px solid rgba(23,86,200,.4); border-radius:12px; padding:13px; font-size:14px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; text-decoration:none; transition:all .2s; }
  .mwa:hover { background:rgba(23,86,200,.35); transform:translateY(-1px); }

  /* SELLER BOX */
  .seller-box { background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:14px; padding:14px 16px; margin-bottom:18px; display:flex; align-items:center; gap:14px; }
  .seller-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,var(--dark),var(--blue)); display:flex; align-items:center; justify-content:center; font-family:'Montserrat',sans-serif; font-weight:900; font-size:16px; color:white; flex-shrink:0; border:1.5px solid rgba(255,255,255,.12); }
  .seller-name { font-family:'Montserrat',sans-serif; font-size:14px; font-weight:700; color:var(--text); }
  .seller-sub { font-size:12px; color:rgba(232,240,255,.6); margin-top:2px; }

  /* PLEIN ÉCRAN */
  .fullscreen-overlay { position:fixed; inset:0; background:rgba(0,0,0,.97); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
  .fullscreen-img { max-width:100vw; max-height:100vh; object-fit:contain; }
  .fullscreen-close { position:fixed; top:18px; right:22px; color:white; font-size:32px; cursor:pointer; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; z-index:10000; transition:background .2s; }
  .fullscreen-close:hover { background:rgba(255,255,255,.2); }

  /* ── PROFILE ── */
  .profscreen { max-width:740px; margin:32px auto; padding:0 20px 60px; }
  .profhead { background:linear-gradient(135deg,var(--bg2),var(--bg3)); border:1px solid var(--border2); border-radius:24px; padding:28px 32px; margin-bottom:20px; display:flex; align-items:center; gap:22px; position:relative; overflow:hidden; }
  .profhead::before { content:''; position:absolute; top:-60px; right:-60px; width:200px; height:200px; background:radial-gradient(ellipse,rgba(23,86,200,.2) 0%,transparent 65%); pointer-events:none; }
  .avatar { width:68px; height:68px; border-radius:50%; background:linear-gradient(135deg,var(--dark),var(--blue)); display:flex; align-items:center; justify-content:center; font-size:28px; color:white; font-weight:900; font-family:'Montserrat',sans-serif; flex-shrink:0; border:2px solid rgba(255,255,255,.15); box-shadow:0 4px 20px rgba(0,0,0,.4); }
  .pinfo h2 { font-family:'Montserrat',sans-serif; font-size:20px; font-weight:900; color:var(--text); margin:0 0 4px; }
  .pinfo p { font-size:13px; color:var(--muted); }
  .pstats { display:flex; gap:28px; margin-top:14px; }
  .psn { font-size:24px; font-weight:900; color:var(--gold); font-family:'Montserrat',sans-serif; }
  .psl { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:1.2px; }
  .del-btn { background:rgba(239,68,68,.1); color:#f87171; border:1px solid rgba(239,68,68,.3); border-radius:10px; padding:7px 14px; font-size:12px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; flex:1; }
  .del-btn:hover { background:rgba(239,68,68,.25); }

  /* ── STATS GRID ── */
  .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
  @media(max-width:480px){ .stats-grid{ grid-template-columns:repeat(2,1fr); } }
  .stat-card { background:var(--bg2); border-radius:var(--radius); border:1px solid var(--border2); padding:18px 16px; text-align:center; transition:border-color .2s; }
  .stat-card:hover { border-color:rgba(23,86,200,.3); }
  .stat-card-n { font-size:26px; font-weight:900; font-family:'Montserrat',sans-serif; color:#4d90ff; }
  .stat-card-l { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-top:5px; font-weight:700; }

  /* ── MESSAGERIE ── */
  .chat-list-wrap { max-width:720px; margin:28px auto; padding:0 20px 60px; }
  .conv-item { display:flex; align-items:center; gap:14px; padding:16px 20px; border-bottom:1px solid var(--border); cursor:pointer; transition:background .2s; }
  .conv-item:last-child { border-bottom:none; }
  .conv-item:hover { background:rgba(255,255,255,.03); }
  .conv-avatar { width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg,var(--blue),var(--dark)); display:flex; align-items:center; justify-content:center; font-size:20px; color:white; font-weight:800; font-family:'Montserrat',sans-serif; flex-shrink:0; }
  .conv-info { flex:1; min-width:0; }
  .conv-name { font-weight:800; font-size:14px; color:var(--text); margin-bottom:3px; }
  .conv-annonce { font-size:11px; color:#4d90ff; font-weight:700; margin-bottom:2px; }
  .conv-last { font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .conv-unread { background:var(--blue); color:white; font-size:10px; font-weight:800; min-width:20px; height:20px; padding:0 5px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .chatroom { display:flex; flex-direction:column; height:calc(100dvh - 68px); max-width:720px; margin:0 auto; }
  .chatroom-header { display:flex; align-items:center; gap:12px; padding:14px 20px; border-bottom:1px solid var(--border); background:var(--bg2); flex-shrink:0; }
  .chatroom-back { background:none; border:none; font-size:22px; cursor:pointer; color:#4d90ff; padding:0; line-height:1; }
  .chatroom-info h3 { font-family:'Montserrat',sans-serif; font-size:15px; font-weight:800; color:var(--text); margin:0; }
  .chatroom-info p { font-size:12px; color:var(--muted); margin:2px 0 0; }
  .chatroom-messages { flex:1; overflow-y:auto; padding:16px 20px; display:flex; flex-direction:column; gap:10px; background:var(--bg); }
  .msg { display:flex; flex-direction:column; max-width:75%; }
  .msg.mine { align-self:flex-end; align-items:flex-end; }
  .msg.theirs { align-self:flex-start; align-items:flex-start; }
  .msg-bubble { padding:11px 15px; border-radius:18px; font-size:14px; line-height:1.55; }
  .msg.mine .msg-bubble { background:linear-gradient(135deg,var(--blue),#1a4fd8); color:white; border-bottom-right-radius:5px; }
  .msg.theirs .msg-bubble { background:var(--bg2); color:var(--text); border:1px solid var(--border); border-bottom-left-radius:5px; }
  .msg-time { font-size:10px; color:var(--muted); margin-top:4px; }
  .chatroom-input { display:flex; gap:10px; padding:12px 16px; background:var(--bg2); border-top:1px solid var(--border); flex-shrink:0; }
  .chatroom-input input { flex:1; padding:12px 16px; border:1.5px solid var(--border2); border-radius:26px; font-size:14px; outline:none; background:rgba(255,255,255,.04); color:var(--text); transition:border-color .2s; }
  .chatroom-input input:focus { border-color:rgba(23,86,200,.5); background:rgba(23,86,200,.05); }
  .send-btn { background:var(--blue); color:white; border:none; border-radius:50%; width:44px; height:44px; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .2s; }
  .send-btn:hover { background:var(--dark); transform:scale(1.08); }

  /* ── ADMIN ── */
  .admin-screen { max-width:940px; margin:32px auto; padding:0 20px 60px; }
  .admin-header { background:linear-gradient(135deg,#6d28d9,#4F46E5); border-radius:20px; padding:24px 28px; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; }
  .admin-title { font-family:'Montserrat',sans-serif; font-size:22px; font-weight:900; color:white; }
  .admin-subtitle { font-size:13px; color:rgba(255,255,255,0.65); margin-top:4px; }
  .admin-stats { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:24px; }
  .admin-stat { background:var(--bg2); border-radius:16px; padding:18px 22px; border:1px solid var(--border2); flex:1; min-width:110px; text-align:center; }
  .admin-stat-n { font-size:30px; font-weight:900; font-family:'Montserrat',sans-serif; color:#4d90ff; }
  .admin-stat-l { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:1.2px; margin-top:5px; font-weight:700; }
  .admin-section { background:var(--bg2); border-radius:18px; border:1px solid var(--border2); overflow:hidden; margin-bottom:20px; }
  .admin-section-title { padding:16px 20px; font-family:'Montserrat',sans-serif; font-weight:800; font-size:15px; color:var(--text); border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; }
  .admin-row { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--border); gap:12px; }
  .admin-row:last-child { border-bottom:none; }
  .admin-row-info { flex:1; min-width:0; }
  .admin-row-title { font-weight:700; font-size:14px; color:var(--text); margin-bottom:3px; }
  .admin-row-sub { font-size:12px; color:var(--muted); }
  .admin-row-actions { display:flex; gap:8px; flex-shrink:0; }
  .btn-danger { background:rgba(239,68,68,.1); color:#f87171; border:1px solid rgba(239,68,68,.3); border-radius:8px; padding:7px 13px; font-size:12px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; }
  .btn-danger:hover { background:rgba(239,68,68,.25); }
  .btn-warn { background:rgba(217,119,6,.1); color:#fbbf24; border:1px solid rgba(217,119,6,.3); border-radius:8px; padding:7px 13px; font-size:12px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; }
  .btn-warn:hover { background:rgba(217,119,6,.25); }
  .admin-tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
  .admin-tab { padding:9px 18px; border-radius:10px; border:1.5px solid var(--border2); background:var(--card); font-size:13px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; }
  .admin-tab.on { background:#6d28d9; color:white; border-color:#6d28d9; }

  /* ── NOTATION ── */
  .stars { display:flex; gap:4px; }
  .star { font-size:24px; cursor:pointer; transition:transform .15s; line-height:1; }
  .star:hover { transform:scale(1.25); }
  .rating-box { background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:14px; padding:18px; margin-bottom:18px; }
  .rating-title { font-family:'Montserrat',sans-serif; font-size:14px; font-weight:800; color:var(--text); margin-bottom:12px; }
  .rating-avg { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .rating-avg-n { font-size:30px; font-weight:900; color:var(--gold); font-family:'Montserrat',sans-serif; }
  .rating-count { font-size:12px; color:var(--muted); }
  .rating-comment { width:100%; padding:11px 14px; border:1.5px solid var(--border2); border-radius:12px; font-size:13px; outline:none; resize:none; min-height:72px; background:rgba(255,255,255,.04); color:var(--text); margin-top:8px; transition:border-color .2s; }
  .rating-comment:focus { border-color:rgba(23,86,200,.5); }
  .review-item { padding:12px 0; border-bottom:1px solid var(--border); }
  .review-item:last-child { border-bottom:none; }
  .review-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
  .review-name { font-size:13px; font-weight:700; color:var(--text); }
  .review-date { font-size:11px; color:var(--muted); }
  .review-text { font-size:13px; color:rgba(232,240,255,.75); line-height:1.55; }

  /* ── FOOTER ── */
  .footer { background:var(--bg2); color:var(--muted); text-align:center; padding:20px; font-size:12px; margin-top:auto; border-top:1px solid var(--border); }
  .footer strong { color:var(--gold); font-weight:800; }

  /* ── stitle alias ── */
  .stitle { font-family:'Montserrat',sans-serif; font-size:17px; font-weight:800; color:var(--text); margin:28px 0 12px; }
`;

function PhotoUploader({ photos, setPhotos }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const handleFiles = async (e) => {
    const toUpload = Array.from(e.target.files).slice(0, 3 - photos.length);
    if (!toUpload.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(toUpload.map(f => uploadToCloudinary(f)));
      setPhotos(p => [...p, ...urls]);
    } catch (err) { alert("Erreur upload : " + err.message); }
    setUploading(false);
    e.target.value = "";
  };
  return (
    <div className="photo-section">
      <label className="fl">Photos (3 max)</label>
      <div className="photo-grid">
        {photos.map((url, i) => (
          <div key={i} className="photo-slot">
            <img src={url} alt=""/>
            {i === 0 && <span className="photo-main-badge">Principale</span>}
            <button className="photo-del" onClick={() => setPhotos(p => p.filter((_,j) => j !== i))} type="button">×</button>
          </div>
        ))}
        {photos.length < 3 && (
          <div className="photo-slot" onClick={() => !uploading && inputRef.current.click()}>
            {uploading ? <div className="photo-uploading">⏳…</div> : <>📷<span>Ajouter</span></>}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFiles}/>
      </div>
      <div className="photo-limit">{photos.length}/3 — La 1ère photo sera la principale</div>
    </div>
  );
}

function CardImage({ annonce }) {
  const photos = annonce.photos || [];
  if (photos.length > 0) return (
    <div className="cimg">
      <img src={photos[0]} alt={annonce.titre} className="cimg-real"/>
      <span className="bcat">{categories.find(c=>c.id===annonce.categorie)?.label}</span>
      {annonce.urgent && <span className="burg">⚡ Urgent</span>}
      {photos.length > 1 && <span className="photo-count">📷 {photos.length}</span>}
    </div>
  );
  return (
    <div className="cimg-emoji">
      <span className="bcat">{categories.find(c=>c.id===annonce.categorie)?.label}</span>
      {annonce.urgent && <span className="burg">⚡ Urgent</span>}
      {annonce.emoji}
    </div>
  );
}

function ModalImage({ annonce, onFullscreen }) {
  const [idx, setIdx] = useState(0);
  const photos = annonce.photos || [];
  if (!photos.length) return <div className="mimg-emoji">{annonce.emoji}</div>;
  return (
    <div className="mimg-wrap">
      {/* Image cliquable pour agrandir */}
      <img src={photos[idx]} alt="" className="mimg-real" onClick={() => onFullscreen(photos, idx)}/>
      <div className="mbadges">
        <span className="bcat">{categories.find(c=>c.id===annonce.categorie)?.label}</span>
        {annonce.urgent && <span className="burg">⚡ Urgent</span>}
      </div>
      {/* Badge agrandir */}
      <div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,0.55)",color:"white",fontSize:11,padding:"4px 9px",borderRadius:6,pointerEvents:"none",zIndex:3}}>🔍 Agrandir</div>
      {/* Boutons navigation — positionnés séparément */}
      {photos.length > 1 && <>
        <button className="mnav-btn mnav-left" onClick={e=>{e.stopPropagation();setIdx(i=>(i-1+photos.length)%photos.length)}}>‹</button>
        <button className="mnav-btn mnav-right" onClick={e=>{e.stopPropagation();setIdx(i=>(i+1)%photos.length)}}>›</button>
        <div className="mimg-dots">{photos.map((_,i)=><div key={i} className={`mdot${i===idx?" on":""}`}/>)}</div>
      </>}
    </div>
  );
}

export default function YoMan() {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [annonces, setAnnonces]   = useState([]);
  const [authTab, setAuthTab]     = useState("login");
  const [page, setPage]           = useState("home");
  const [catActive, setCat]       = useState("tous");
  const [searchInput, setSI]      = useState("");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);
  const [fullscreen, setFullscreen] = useState(null); // {photos, idx}
  const [authErr, setAuthErr]     = useState("");
  const [postOk, setPostOk]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auth fields
  const [lEmail,setLEmail]=useState(""); const [lPwd,setLPwd]=useState("");
  const [rNom,setRNom]=useState("");     const [rEmail,setREmail]=useState("");
  const [rTel,setRTel]=useState("");     const [rWa,setRWa]=useState("");
  const [rPwd,setRPwd]=useState("");

  // Post fields
  const [pTitre,setPTitre]=useState(""); const [pCat,setPCat]=useState("immobilier");
  const [pPrix,setPPrix]=useState("");   const [pVille,setPVille]=useState("Ouagadougou");
  const [pQ,setPQ]=useState("");         const [pDesc,setPDesc]=useState("");
  const [pUrg,setPUrg]=useState(false);  const [pPhotos,setPPhotos]=useState([]);
  const [editAd, setEditAd] = useState(null);
  const [adminTab, setAdminTab] = useState("annonces");
  const [signalements, setSignalements] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [ratingTarget, setRatingTarget] = useState(null);

  // Messagerie
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null); // userId du vendeur
  const isAdmin = user?.uid === ADMIN_UID; // annonce en cours d'édition

  // Filtres
  const [filtreVille, setFiltreVille] = useState("toutes");
  const [filtrePrixMin, setFiltrePrixMin] = useState("");
  const [filtrePrixMax, setFiltrePrixMax] = useState("");
  const [showFiltres, setShowFiltres] = useState(false);
  const [showCats, setShowCats] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ADS_PER_PAGE = 9;

  // Favoris
  const [favoris, setFavoris] = useState([]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load annonces
  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, "annonces"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setAnnonces(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch(e) { console.error(e); }
    };
    load();
  }, []);

  // Load favoris
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const ref = doc(db, "favoris", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setFavoris(snap.data().ids || []);
      } catch(e) { console.error(e); }
    };
    load();
  }, [user]);

  // Load admin data
  useEffect(() => {
    if (!isAdmin) return;
    const loadAdmin = async () => {
      try {
        const sigSnap = await getDocs(query(collection(db, "signalements"), orderBy("createdAt", "desc")));
        setSignalements(sigSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const usersSnap = await getDocs(collection(db, "users"));
        setAllUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch(e) { console.error(e); }
    };
    loadAdmin();
  }, [isAdmin]);

  const loginGoogle = async () => {
    setAuthErr(""); setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      // Save user info to Firestore if new
      const ref = doc(db, "users", cred.user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: cred.user.uid,
          nom: cred.user.displayName,
          email: cred.user.email,
          tel: "", whatsapp: "",
          createdAt: serverTimestamp()
        });
      }
    } catch(e) {
      setAuthErr("Erreur de connexion Google.");
    }
    setSubmitting(false);
  };

  const forgotPassword = async () => {
    if (!lEmail) { setAuthErr("Entre ton email pour réinitialiser ton mot de passe."); return; }
    try {
      await sendPasswordResetEmail(auth, lEmail);
      setAuthErr("");
      alert(`✅ Un email de réinitialisation a été envoyé à ${lEmail}`);
    } catch(e) {
      setAuthErr("Email introuvable. Vérifie l'adresse saisie.");
    }
  };

  const login = async () => {
    setAuthErr(""); setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, lEmail, lPwd);
    } catch(e) {
      setAuthErr("Email ou mot de passe incorrect.");
    }
    setSubmitting(false);
  };

  const register = async () => {
    setAuthErr(""); setSubmitting(true);
    if (!rNom||!rEmail||!rTel||!rPwd) { setAuthErr("Veuillez remplir tous les champs obligatoires."); setSubmitting(false); return; }
    try {
      const cred = await createUserWithEmailAndPassword(auth, rEmail, rPwd);
      await updateProfile(cred.user, { displayName: rNom });
      // Save extra info to Firestore
      await addDoc(collection(db, "users"), {
        uid: cred.user.uid, nom: rNom, email: rEmail,
        tel: rTel, whatsapp: rWa || rTel, createdAt: serverTimestamp()
      });
    } catch(e) {
      setAuthErr(e.code === "auth/email-already-in-use" ? "Cet email est déjà utilisé." : "Erreur lors de l'inscription.");
    }
    setSubmitting(false);
  };

  const startEdit = (a) => {
    setEditAd(a);
    setPTitre(a.titre); setPCat(a.categorie); setPPrix(a.prix.replace(" FCFA",""));
    setPVille(a.ville); setPQ(a.quartier); setPDesc(a.description);
    setPUrg(a.urgent); setPPhotos(a.photos||[]);
    setPage("post");
  };

  const postAd = async () => {
    if (!pTitre||!pPrix||!pQ||!pDesc) return;

    // Vérification limite urgent : 1 par semaine
    if (pUrg) {
      const uneSemaine = new Date();
      uneSemaine.setDate(uneSemaine.getDate() - 7);
      const annoncesUrgentes = annonces.filter(a =>
        a.userId === user.uid &&
        a.urgent === true &&
        a.createdAt?.toDate &&
        a.createdAt.toDate() > uneSemaine
      );
      if (annoncesUrgentes.length >= 1 && !editAd) {
        alert("⚠️ Vous avez déjà utilisé votre annonce urgente gratuite cette semaine. Revenez dans 7 jours !");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (editAd) {
        // MODE ÉDITION
        const updates = {
          categorie:pCat, titre:pTitre, prix:pPrix+" FCFA",
          ville:pVille, quartier:pQ, description:pDesc,
          urgent:pUrg, emoji:catEmojis[pCat], photos:pPhotos,
        };
        await updateDoc(doc(db,"annonces",editAd.id), updates);
        setAnnonces(p => p.map(a => a.id===editAd.id ? {...a,...updates} : a));
        setEditAd(null);
        setPTitre(""); setPPrix(""); setPQ(""); setPDesc(""); setPUrg(false); setPPhotos([]);
        setPostOk(true);
        setTimeout(() => { setPostOk(false); setPage("profile"); }, 2000);
      } else {
        // MODE CRÉATION
        const na = {
          categorie: pCat, titre: pTitre, prix: pPrix + " FCFA",
          ville: pVille, quartier: pQ, description: pDesc,
          whatsapp: rWa || rTel || user.email,
          vendeur: user.displayName || user.email,
          urgent: pUrg, emoji: catEmojis[pCat],
          userId: user.uid, photos: pPhotos,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, "annonces"), na);
        setAnnonces(p => [{ id: docRef.id, ...na, date: "À l'instant" }, ...p]);
        setPTitre(""); setPPrix(""); setPQ(""); setPDesc(""); setPUrg(false); setPPhotos([]);
        setPostOk(true);
        setTimeout(() => { setPostOk(false); setPage("home"); }, 2000);
      }
    } catch(e) { alert("Erreur : " + e.message); }
    setSubmitting(false);
  };

  // Charger les conversations
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid), orderBy("lastMessageAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      const convs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConversations(convs);
      setUnreadCount(convs.filter(c => c.lastSenderId !== user.uid && !c[`read_${user.uid}`]).length);
    });
    return unsub;
  }, [user]);

  // Charger les messages d'une conversation
  useEffect(() => {
    if (!activeConv) return;
    const q = query(collection(db, "conversations", activeConv.id, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    // Marquer comme lu
    updateDoc(doc(db, "conversations", activeConv.id), { [`read_${user.uid}`]: true });
    return unsub;
  }, [activeConv]);

  const startConversation = async (annonce) => {
    // Cherche une conversation existante
    const convId = [user.uid, annonce.userId].sort().join("_") + "_" + annonce.id;
    const convRef = doc(db, "conversations", convId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        participants: [user.uid, annonce.userId],
        buyerId: user.uid, buyerName: user.displayName,
        sellerId: annonce.userId, sellerName: annonce.vendeur,
        annonceId: annonce.id, annonceTitre: annonce.titre,
        lastMessage: "", lastMessageAt: serverTimestamp(),
        lastSenderId: "", [`read_${user.uid}`]: true, [`read_${annonce.userId}`]: false,
      });
    }
    setActiveConv({ id: convId, annonceTitre: annonce.titre, buyerName: user.displayName, sellerName: annonce.vendeur, sellerId: annonce.userId, buyerId: user.uid });
    setSelected(null);
    setPage("messages");
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv) return;
    const txt = newMsg.trim();
    setNewMsg("");
    try {
      await addDoc(collection(db, "conversations", activeConv.id, "messages"), {
        text: txt, senderId: user.uid, senderName: user.displayName, createdAt: serverTimestamp()
      });
      const otherUid = activeConv.sellerId === user.uid ? activeConv.buyerId : activeConv.sellerId;
      await updateDoc(doc(db, "conversations", activeConv.id), {
        lastMessage: txt, lastMessageAt: serverTimestamp(),
        lastSenderId: user.uid, [`read_${user.uid}`]: true, [`read_${otherUid}`]: false,
      });
    } catch(e) { console.error(e); }
  };

  const getOtherName = (conv) => conv.sellerId === user.uid ? conv.buyerName : conv.sellerName;
  const loadRatings = async (sellerId) => {
    try {
      const q = query(collection(db, "ratings"), where("sellerId", "==", sellerId), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setRatings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRatingTarget(sellerId);
      setMyRating(0);
      setMyComment("");
    } catch(e) { console.error(e); }
  };

  const submitRating = async (sellerId) => {
    if (!myRating) { alert("Veuillez choisir une note !"); return; }
    if (sellerId === user.uid) { alert("Vous ne pouvez pas vous noter vous-même !"); return; }
    try {
      const existing = ratings.find(r => r.buyerId === user.uid);
      if (existing) {
        await updateDoc(doc(db, "ratings", existing.id), { note: myRating, commentaire: myComment, createdAt: serverTimestamp() });
        setRatings(p => p.map(r => r.id === existing.id ? { ...r, note: myRating, commentaire: myComment } : r));
      } else {
        const newR = { sellerId, buyerId: user.uid, buyerName: user.displayName, note: myRating, commentaire: myComment, createdAt: serverTimestamp() };
        const ref = await addDoc(collection(db, "ratings"), newR);
        setRatings(p => [{ id: ref.id, ...newR }, ...p]);
      }
      setMyRating(0); setMyComment("");
      alert("✅ Merci pour votre avis !");
    } catch(e) { alert("Erreur : " + e.message); }
  };

  const avgRating = (rList) => {
    if (!rList.length) return 0;
    return (rList.reduce((s, r) => s + r.note, 0) / rList.length).toFixed(1);
  };

  const adminDeleteAd = async (id) => {
    if (!window.confirm("Supprimer cette annonce ?")) return;
    try {
      await deleteDoc(doc(db, "annonces", id));
      setAnnonces(p => p.filter(a => a.id !== id));
    } catch(e) { alert("Erreur : " + e.message); }
  };

  const adminDeleteSignalement = async (id) => {
    try {
      await deleteDoc(doc(db, "signalements", id));
      setSignalements(p => p.filter(s => s.id !== id));
    } catch(e) { alert("Erreur : " + e.message); }
  };

  const logout = () => { signOut(auth); setPage("home"); setFavoris([]); };

  const reportAd = async (a) => {
    const raison = window.prompt("Pourquoi signalez-vous cette annonce ?\n\n1. Fausse annonce\n2. Prix abusif\n3. Contenu inapproprié\n4. Arnaque\n\nEcrivez votre raison :");
    if (!raison) return;
    try {
      await addDoc(collection(db, "signalements"), {
        annonceId: a.id, titre: a.titre,
        signalePar: user.uid, raison,
        createdAt: serverTimestamp()
      });
      alert("✅ Annonce signalée ! Notre équipe va examiner ça.");
    } catch(e) { alert("Erreur : " + e.message); }
  };

  const openAd = async (a) => {
    setSelected(a);
    loadRatings(a.userId);
    try {
      const ref = doc(db, "annonces", a.id);
      await updateDoc(ref, { vues: (a.vues || 0) + 1 });
      setAnnonces(p => p.map(x => x.id === a.id ? {...x, vues: (x.vues||0)+1} : x));
    } catch(e) { console.error(e); }
  };

  const toggleFavori = async (id) => {
    const ref = doc(db, "favoris", user.uid);
    const isFav = favoris.includes(id);
    try {
      await setDoc(ref, { ids: isFav ? favoris.filter(f=>f!==id) : [...favoris, id] }, { merge: true });
      setFavoris(p => isFav ? p.filter(f=>f!==id) : [...p, id]);
    } catch(e) { console.error(e); }
  };

  const deleteAd = async (id) => {
    if (!window.confirm("Supprimer cette annonce ?")) return;
    try {
      await deleteDoc(doc(db, "annonces", id));
      setAnnonces(p => p.filter(a => a.id !== id));
    } catch(e) { alert("Erreur : " + e.message); }
  };

  const myAds = annonces.filter(a => a.userId === user?.uid);
  const filtered = annonces.filter(a => {
    const mc = catActive === "tous" || (catActive === "favoris" ? favoris.includes(a.id) : a.categorie === catActive);
    const ms = search === "" || [a.titre, a.description, a.ville].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const mv = filtreVille === "toutes" || a.ville === filtreVille;
    const prix = parseInt(a.prix?.replace(/\D/g,"")) || 0;
    const mp = (!filtrePrixMin || prix >= parseInt(filtrePrixMin.replace(/\D/g,"")||0)) &&
               (!filtrePrixMax || prix <= parseInt(filtrePrixMax.replace(/\D/g,"")||99999999999));
    return mc && ms && mv && mp;
  });

  const totalPages = Math.ceil(filtered.length / ADS_PER_PAGE);
  const paginatedAds = filtered.slice((currentPage-1)*ADS_PER_PAGE, currentPage*ADS_PER_PAGE);

  const formatDate = (ts) => {
    if (!ts) return "À l'instant";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d) / 60000);
    if (diff < 60) return `Il y a ${diff} min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff/60)} h`;
    return `Il y a ${Math.floor(diff/1440)} j`;
  };

  const Header = ({ showPost = true }) => (
    <header className="hdr"><div className="hdr-in">
      <div style={{cursor:"pointer",flexShrink:0}} onClick={() => setPage("home")}><YoManLogo variant="white" height={38}/></div>
      {/* Barre de recherche dans le nav — masquée sur mobile */}
      <div className="nav-search">
        <input
          placeholder="🔍  Rechercher une annonce…"
          value={searchInput}
          onChange={e=>setSI(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"){setSearch(searchInput);setCurrentPage(1);setPage("home");}}}
        />
        <button onClick={()=>{setSearch(searchInput);setCurrentPage(1);setPage("home");}}>Chercher</button>
      </div>
      <div className="hdr-r">
        {user && <span className="huser">Salut, <strong>{user.displayName?.split(" ")[0]}</strong> 👋</span>}
        {isAdmin && <button className="btn-o" style={{borderColor:"#7C3AED",color:"#a78bfa"}} onClick={()=>setPage("admin")}>🛡️ Admin</button>}
        <button className="btn-o" style={{position:"relative"}} onClick={() => setPage("messages")}>
          💬{unreadCount>0&&<span style={{position:"absolute",top:-4,right:-4,background:"var(--red)",color:"white",fontSize:9,fontWeight:800,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadCount}</span>}
        </button>
        <button className="btn-o" onClick={() => setPage("profile")}>👤</button>
        {showPost && <button className="btn-p" onClick={() => setPage("post")}>+ Annonce</button>}
        <button className="btn-o" onClick={logout} title="Déconnexion">⏻</button>
      </div>
    </div></header>
  );

  const Footer = () => (
    <footer className="footer"><strong>YoMan!</strong> &nbsp;·&nbsp; Vente entre particuliers · Burkina Faso · 2026</footer>
  );

  if (loading) return <div className="loading">⏳</div>;

  // AUTH
  if (!user) return (<><style>{styles}</style>
    <div className="auth-wrap"><div className="auth-box">
      <div className="auth-logo-wrap"><YoManLogo variant="color" height={56}/></div>
      <div className="tabs">
        <button className={`tab${authTab==="login"?" on":""}`} onClick={() => { setAuthTab("login"); setAuthErr(""); }}>Se connecter</button>
        <button className={`tab${authTab==="register"?" on":""}`} onClick={() => { setAuthTab("register"); setAuthErr(""); }}>S'inscrire</button>
      </div>
      {authErr && <div className="ferr">⚠️ {authErr}</div>}

      {/* Bouton Google */}
      <button className="google-btn" onClick={loginGoogle} disabled={submitting}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continuer avec Google
      </button>

      <div className="divider">ou</div>
      {authTab === "login" ? <>
        <div className="fg"><label className="fl">Email</label><input className="fi" type="email" placeholder="votre@email.com" value={lEmail} onChange={e=>setLEmail(e.target.value)}/></div>
        <div className="fg"><label className="fl">Mot de passe</label><input className="fi" type="password" placeholder="••••••••" value={lPwd} onChange={e=>setLPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/></div>
        <div style={{textAlign:"right",marginBottom:8}}>
          <span onClick={forgotPassword} style={{fontSize:12,color:"var(--blue)",cursor:"pointer",fontWeight:700}}>Mot de passe oublié ?</span>
        </div>
        <button className="fb" onClick={login} disabled={submitting}>{submitting ? "Connexion…" : "Se connecter →"}</button>
      </> : <>
        <div className="fg"><label className="fl">Nom complet *</label><input className="fi" placeholder="Ex : Moussa Kaboré" value={rNom} onChange={e=>setRNom(e.target.value)}/></div>
        <div className="fg"><label className="fl">Email *</label><input className="fi" type="email" placeholder="votre@email.com" value={rEmail} onChange={e=>setREmail(e.target.value)}/></div>
        <div className="fg"><label className="fl">Numéro de téléphone *</label><input className="fi" placeholder="Ex : 70123456" value={rTel} onChange={e=>setRTel(e.target.value)}/></div>
        <div className="fg"><label className="fl">Numéro WhatsApp (avec indicatif)</label><input className="fi" placeholder="Ex : 22670123456" value={rWa} onChange={e=>setRWa(e.target.value)}/><div className="fhint">Laisser vide = même que téléphone</div></div>
        <div className="fg"><label className="fl">Mot de passe *</label><input className="fi" type="password" placeholder="Minimum 6 caractères" value={rPwd} onChange={e=>setRPwd(e.target.value)}/></div>
        <button className="fb" onClick={register} disabled={submitting}>{submitting ? "Création…" : "Créer mon compte →"}</button>
      </>}
    </div></div>
  </>);

  // POST
  if (page === "post") return (<><style>{styles}</style>
    <div className="app"><Header showPost={false}/>
      <div className="pscreen">
        <button className="pback" onClick={() => setPage("home")}>← Retour</button>
        {postOk && <div className="succ">✅ Annonce publiée !</div>}
        <div className="pcard">
          <div className="ptitle">{editAd ? "✏️ Modifier l'annonce" : "📝 Déposer une annonce"}</div>
          <div className="fg"><label className="fl">Catégorie *</label><select className="fs" value={pCat} onChange={e=>setPCat(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
          <div className="fg"><label className="fl">Titre *</label><input className="fi" placeholder="Ex : Toyota Corolla 2020" value={pTitre} onChange={e=>setPTitre(e.target.value)}/></div>
          <div className="fg"><label className="fl">Prix (FCFA) *</label><input className="fi" placeholder="Ex : 2 500 000" value={pPrix} onChange={e=>setPPrix(e.target.value)}/></div>
          <div className="frow">
            <div className="fg"><label className="fl">Ville *</label><select className="fs" value={pVille} onChange={e=>setPVille(e.target.value)}>{villes.map(v=><option key={v}>{v}</option>)}</select></div>
            <div className="fg"><label className="fl">Quartier *</label><input className="fi" placeholder="Ex : Ouaga 2000" value={pQ} onChange={e=>setPQ(e.target.value)}/></div>
          </div>
          <div className="fg"><label className="fl">Description *</label><textarea className="fta" placeholder="Décrivez votre article…" value={pDesc} onChange={e=>setPDesc(e.target.value)}/></div>
          <PhotoUploader photos={pPhotos} setPhotos={setPPhotos}/>
          <div className="fg">
            <label className="utog">
              <div className={`tog${pUrg?" on":""}`} onClick={()=>setPUrg(p=>!p)}/>
              <span style={{fontSize:13,color:"var(--dark)",fontWeight:700}}>⚡ Marquer comme urgent</span>
            </label>
            <div className="fhint">1 annonce urgente gratuite par semaine</div>
          </div>
          <button className="fb" onClick={postAd} disabled={submitting}>{submitting ? "Enregistrement…" : editAd ? "Enregistrer les modifications →" : "Publier l'annonce →"}</button>
        </div>
      </div><Footer/>
    </div>
  </>);

  // PROFILE
  if (page === "profile") return (<><style>{styles}</style>
    <div className="app"><Header/>
      <div className="profscreen">
        <button className="pback" onClick={() => setPage("home")}>← Retour</button>
        <div className="profhead">
          <div className="avatar">{user.displayName?.[0] || "?"}</div>
          <div className="pinfo">
            <h2>{user.displayName}</h2>
            <p>📧 {user.email}</p>
            <div className="pstats">
              <div><div className="psn">{myAds.length}</div><div className="psl">Annonces</div></div>
              <div><div className="psn">{myAds.reduce((s,a)=>s+(a.vues||0),0)}</div><div className="psl">Vues totales</div></div>
              <div><div className="psn">{myAds.filter(a=>a.urgent).length}</div><div className="psl">Urgentes</div></div>
            </div>
          </div>
        </div>

        {/* Stats détaillées */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-card-n">{myAds.length}</div><div className="stat-card-l">📋 Annonces</div></div>
          <div className="stat-card"><div className="stat-card-n">{myAds.reduce((s,a)=>s+(a.vues||0),0)}</div><div className="stat-card-l">👁️ Vues</div></div>
          <div className="stat-card"><div className="stat-card-n">{myAds.filter(a=>a.categorie==="immobilier").length}</div><div className="stat-card-l">🏠 Immo</div></div>
          <div className="stat-card"><div className="stat-card-n">{myAds.filter(a=>a.categorie==="vehicules").length}</div><div className="stat-card-l">🚗 Véhicules</div></div>
          <div className="stat-card"><div className="stat-card-n">{myAds.filter(a=>a.categorie==="electronique").length}</div><div className="stat-card-l">📱 Électro</div></div>
          <div className="stat-card"><div className="stat-card-n">{myAds.filter(a=>a.urgent).length}</div><div className="stat-card-l">⚡ Urgentes</div></div>
        </div>
        <div className="stitle">Mes annonces</div>
        {myAds.length === 0
          ? <div className="empty">
              <div className="eico">📭</div>
              <div className="emsg">Aucune annonce publiée</div>
              <div className="esub">Publiez votre première annonce !</div>
            </div>
          : <div className="grid">{myAds.map(a => (
              <div key={a.id} className="card" onClick={() => setSelected(a)}>
                <div style={{position:"relative"}}>
                  <CardImage annonce={a}/>
                </div>
                <div className="cbody">
                  <div className="ctitle">{a.titre}</div>
                  <div className="cprix">{a.prix}</div>
                  <div className="clieu">📍 {a.quartier}, {a.ville}</div>
                  <div className="cdesc">{a.description}</div>
                  <div style={{display:"flex",gap:8,marginTop:"auto",paddingTop:10,borderTop:"1px solid var(--border)"}}>
                    <button className="del-btn" style={{background:"rgba(23,86,200,.1)",color:"#7ab3ff",border:"1px solid rgba(23,86,200,.3)"}} onClick={e=>{e.stopPropagation();startEdit(a);}}>✏️ Modifier</button>
                    <button className="del-btn" onClick={e=>{e.stopPropagation();deleteAd(a.id);}}>🗑️ Suppr.</button>
                  </div>
                </div>
              </div>
            ))}</div>
        }
      </div><Footer/>
    </div>
  </>);

  // ADMIN
  if (page === "admin" && isAdmin) return (<><style>{styles}</style>
    <div className="app"><Header/>
      <div className="admin-screen">
        <div className="admin-header">
          <div>
            <div className="admin-title">🛡️ Panel Admin — YoMan!</div>
            <div className="admin-subtitle">Gestion de la marketplace</div>
          </div>
          <button className="btn-o" onClick={()=>setPage("home")}>← Retour</button>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat"><div className="admin-stat-n">{annonces.length}</div><div className="admin-stat-l">Annonces</div></div>
          <div className="admin-stat"><div className="admin-stat-n">{allUsers.length}</div><div className="admin-stat-l">Membres</div></div>
          <div className="admin-stat"><div className="admin-stat-n">{signalements.length}</div><div className="admin-stat-l" style={{color:"#DC2626"}}>Signalements</div></div>
          <div className="admin-stat"><div className="admin-stat-n">{annonces.filter(a=>a.urgent).length}</div><div className="admin-stat-l">Urgentes</div></div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button className={`admin-tab${adminTab==="annonces"?" on":""}`} onClick={()=>setAdminTab("annonces")}>📋 Annonces ({annonces.length})</button>
          <button className={`admin-tab${adminTab==="signalements"?" on":""}`} onClick={()=>setAdminTab("signalements")}>🚩 Signalements ({signalements.length})</button>
          <button className={`admin-tab${adminTab==="users"?" on":""}`} onClick={()=>setAdminTab("users")}>👥 Membres ({allUsers.length})</button>
        </div>

        {/* Annonces */}
        {adminTab==="annonces" && (
          <div className="admin-section">
            <div className="admin-section-title">📋 Toutes les annonces</div>
            {annonces.length===0
              ? <div className="empty"><div className="eico">📭</div><div className="emsg">Aucune annonce</div></div>
              : annonces.map(a=>(
                <div key={a.id} className="admin-row">
                  <div className="admin-row-info">
                    <div className="admin-row-title">{a.urgent && "⚡ "}{a.titre}</div>
                    <div className="admin-row-sub">{categories.find(c=>c.id===a.categorie)?.icon} {categories.find(c=>c.id===a.categorie)?.label} · 📍 {a.ville} · 👤 {a.vendeur} · 👁️ {a.vues||0} vues</div>
                    <div className="admin-row-sub" style={{color:"var(--blue)",fontWeight:700}}>{a.prix}</div>
                  </div>
                  <div className="admin-row-actions">
                    <button className="btn-danger" onClick={()=>adminDeleteAd(a.id)}>🗑️ Supprimer</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Signalements */}
        {adminTab==="signalements" && (
          <div className="admin-section">
            <div className="admin-section-title">🚩 Signalements à traiter</div>
            {signalements.length===0
              ? <div className="empty"><div className="eico">✅</div><div className="emsg">Aucun signalement !</div></div>
              : signalements.map(s=>(
                <div key={s.id} className="admin-row">
                  <div className="admin-row-info">
                    <div className="admin-row-title">🚩 {s.titre}</div>
                    <div className="admin-row-sub">Raison : {s.raison}</div>
                    <div className="admin-row-sub">ID annonce : {s.annonceId}</div>
                  </div>
                  <div className="admin-row-actions">
                    <button className="btn-danger" onClick={()=>adminDeleteAd(s.annonceId)}>🗑️ Supprimer l'annonce</button>
                    <button className="btn-warn" onClick={()=>adminDeleteSignalement(s.id)}>✓ Ignorer</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Membres */}
        {adminTab==="users" && (
          <div className="admin-section">
            <div className="admin-section-title">👥 Membres inscrits</div>
            {allUsers.length===0
              ? <div className="empty"><div className="eico">👥</div><div className="emsg">Aucun membre</div></div>
              : allUsers.map(u=>(
                <div key={u.id} className="admin-row">
                  <div className="admin-row-info">
                    <div className="admin-row-title">{u.nom || "Sans nom"}</div>
                    <div className="admin-row-sub">📧 {u.email} · 📞 {u.tel||"—"} · 💬 {u.whatsapp||"—"}</div>
                    <div className="admin-row-sub">Annonces : {annonces.filter(a=>a.userId===u.uid).length}</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
      <Footer/>
    </div>
  </>);

  // MESSAGES
  if (page === "messages") return (<><style>{styles}</style>
    <div className="app"><Header/>
      {!activeConv ? (
        // Liste des conversations
        <div className="chat-list-wrap">
          <div className="stitle" style={{marginTop:0}}>💬 Mes messages</div>
          {conversations.length === 0
            ? <div className="empty">
                <div className="eico">💬</div>
                <div className="emsg">Aucune conversation</div>
                <div className="esub">Contactez un vendeur pour démarrer</div>
              </div>
            : <div style={{background:"var(--bg2)",borderRadius:20,border:"1px solid var(--border2)",overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,.3)"}}>
                {conversations.map(conv => {
                  const hasUnread = conv.lastSenderId !== user.uid && !conv[`read_${user.uid}`];
                  return (
                    <div key={conv.id} className="conv-item" onClick={()=>setActiveConv(conv)}>
                      <div className="conv-avatar">{getOtherName(conv)?.[0]?.toUpperCase()||"?"}</div>
                      <div className="conv-info">
                        <div className="conv-name" style={hasUnread?{fontWeight:900}:{}}>{getOtherName(conv)}</div>
                        <div className="conv-annonce">📦 {conv.annonceTitre}</div>
                        <div className="conv-last" style={hasUnread?{color:"var(--dark)",fontWeight:700}:{}}>{conv.lastMessage || "Démarrer la conversation"}</div>
                      </div>
                      {hasUnread && <div className="conv-unread">!</div>}
                    </div>
                  );
                })}
              </div>
          }
        </div>
      ) : (
        // Chat room
        <div className="chatroom">
          <div className="chatroom-header">
            <button className="chatroom-back" onClick={()=>setActiveConv(null)}>←</button>
            <div className="conv-avatar" style={{width:38,height:38,fontSize:16}}>{getOtherName(activeConv)?.[0]||"?"}</div>
            <div className="chatroom-info">
              <h3>{getOtherName(activeConv)}</h3>
              <p>📦 {activeConv.annonceTitre}</p>
            </div>
          </div>
          <div className="chatroom-messages">
            {messages.length === 0 && <div className="empty"><div className="emsg">Démarrez la conversation !</div></div>}
            {messages.map(m => (
              <div key={m.id} className={`msg ${m.senderId===user.uid?"mine":"theirs"}`}>
                <div className="msg-bubble">{m.text}</div>
                <div className="msg-time">{m.createdAt?.toDate ? new Date(m.createdAt.toDate()).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : ""}</div>
              </div>
            ))}
            <div ref={messagesEndRef}/>
          </div>
          <div className="chatroom-input">
            <input placeholder="Votre message..." value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()}/>
            <button className="send-btn" onClick={sendMessage}>➤</button>
          </div>
        </div>
      )}
      <BottomNav page={page} setPage={setPage} catActive={catActive} setCat={setCat} favoris={favoris} unread={unreadCount}/>
      <Footer/>
    </div>
  </>);

  // HOME
  return (<><style>{styles}</style>
    <div className="app"><Header/>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-glow1"/><div className="hero-glow2"/><div className="hero-glow3"/>
        <div className="hero-badge">🇧🇫 Burkina Faso · Vente entre particuliers</div>
        <h1>Achète. Vends.<br/><em>Entre particuliers.</em></h1>
        <p>La marketplace gratuite entre particuliers — simple, rapide, locale. Publie en 2 minutes.</p>
        <div className="sbar">
          <input
            placeholder="téléphone, moto, maison, vêtements…"
            value={searchInput}
            onChange={e=>setSI(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){setSearch(searchInput);setCurrentPage(1);}}}
          />
          <button onClick={()=>{setSearch(searchInput);setCurrentPage(1);}}>Chercher</button>
        </div>
        {/* Raccourcis catégories */}
        <div className="hero-cats">
          {categories.slice(0,6).map(c=>(
            <button key={c.id} className="hero-cat" onClick={()=>{setCat(c.id);setCurrentPage(1);document.querySelector(".sec")?.scrollIntoView({behavior:"smooth"});}}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="stn">{annonces.length || "0"}</div>
            <div className="stl">Annonces</div>
          </div>
          <div className="hero-stat">
            <div className="stn">{[...new Set(annonces.map(a=>a.ville))].length || villes.length}</div>
            <div className="stl">Villes</div>
          </div>
          <div className="hero-stat">
            <div className="stn">{categories.length}</div>
            <div className="stl">Catégories</div>
          </div>
          <div className="hero-stat">
            <div className="stn">0%</div>
            <div className="stl">Commission</div>
          </div>
        </div>
      </section>

      <div className="sec">
        {/* ── URGENTES ── */}
        {annonces.filter(a=>a.urgent).length > 0 && <>
          <div className="sec-title">⚡ Urgentes</div>
          <div className="vedettes-scroll">
            {annonces.filter(a=>a.urgent).slice(0,12).map(a=>(
              <div key={a.id} className="vedette-card" onClick={()=>openAd(a)}>
                <div className="vedette-img">
                  {a.photos?.[0] && <img src={a.photos[0]} alt={a.titre}/>}
                  {!a.photos?.[0] && <span style={{fontSize:42}}>{a.emoji}</span>}
                  <span className="vedette-badge">⚡ Urgent</span>
                </div>
                <div className="vedette-body">
                  <div className="vedette-title">{a.titre}</div>
                  <div className="vedette-prix">{a.prix}</div>
                </div>
              </div>
            ))}
          </div>
        </>}

        {/* ── CATÉGORIE TABS ── */}
        <div className="sec-title" style={{marginBottom:4}}>Catégories</div>
        <div className="cat-tabs-wrap">
          <div className="cat-tabs">
            <div className={`cat-tab-item${catActive==="tous"?" on":""}`}
              onClick={()=>{setCat("tous");setCurrentPage(1);}}>
              <span className="cat-tab-icon">🗂️</span>
              Toutes
              <span className="cat-tab-count">{annonces.length}</span>
            </div>
            {categories.map(c=>(
              <div key={c.id} className={`cat-tab-item${catActive===c.id?" on":""}`}
                onClick={()=>{setCat(c.id);setCurrentPage(1);}}>
                <span className="cat-tab-icon">{c.icon}</span>
                {c.label}
                <span className="cat-tab-count">{annonces.filter(a=>a.categorie===c.id).length}</span>
              </div>
            ))}
            <div className={`cat-tab-item fav${catActive==="favoris"?" on":""}`}
              onClick={()=>{setCat("favoris");setCurrentPage(1);}}>
              <span className="cat-tab-icon">❤️</span>
              Favoris
              <span className="cat-tab-count">{favoris.length}</span>
            </div>
          </div>
        </div>

        {/* ── FILTRES ── */}
        <div className="filter-row">
          <button className={`filter-chip${showFiltres?" on":""}`} onClick={()=>setShowFiltres(f=>!f)}>
            ⚙️ Filtres {(filtreVille!=="toutes"||filtrePrixMin||filtrePrixMax) ? "·" : ""}
          </button>
          {search && (
            <button className="filter-chip" onClick={()=>{setSI("");setSearch("");setCurrentPage(1);}}>
              ✕ "{search}"
            </button>
          )}
          {(filtreVille!=="toutes"||filtrePrixMin||filtrePrixMax) && (
            <button className="filter-chip" onClick={()=>{setFiltreVille("toutes");setFiltrePrixMin("");setFiltrePrixMax("");}}>
              ✕ Effacer filtres
            </button>
          )}
        </div>
        {showFiltres && (
          <div className="filter-panel">
            <div>
              <label className="filter-label">Ville</label>
              <select className="fs" value={filtreVille} onChange={e=>setFiltreVille(e.target.value)}>
                <option value="toutes">Toutes les villes</option>
                {villes.map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="filter-label">Prix min (FCFA)</label>
              <input className="fi" placeholder="Ex : 50 000" value={filtrePrixMin} onChange={e=>setFiltrePrixMin(e.target.value)}/>
            </div>
            <div>
              <label className="filter-label">Prix max (FCFA)</label>
              <input className="fi" placeholder="Ex : 5 000 000" value={filtrePrixMax} onChange={e=>setFiltrePrixMax(e.target.value)}/>
            </div>
            <button className="filter-reset" onClick={()=>{setFiltreVille("toutes");setFiltrePrixMin("");setFiltrePrixMax("");}}>
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {/* ── RÉSULTATS ── */}
        <div className="results-bar">
          <div>
            <div className="results-count">
              {filtered.length} annonce{filtered.length!==1?"s":""}
            </div>
            {(search||catActive!=="tous"||filtreVille!=="toutes") && (
              <div className="results-sub">
                {catActive!=="tous" && catActive!=="favoris" && `${categories.find(c=>c.id===catActive)?.icon} ${categories.find(c=>c.id===catActive)?.label}`}
                {catActive==="favoris" && "❤️ Mes favoris"}
                {search && ` · "${search}"`}
                {filtreVille!=="toutes" && ` · ${filtreVille}`}
              </div>
            )}
          </div>
        </div>

        {filtered.length === 0
          ? <div className="empty">
              <div className="eico">🔍</div>
              <div className="emsg">Aucune annonce trouvée</div>
              <div className="esub">Essayez d'autres critères de recherche</div>
            </div>
          : <>
            <div className="grid">{paginatedAds.map(a => (
              <div key={a.id} className="card" onClick={() => openAd(a)}>
                <div style={{position:"relative"}}>
                  <CardImage annonce={a}/>
                  {a.userId === user.uid && <span className="bmine">Ma annonce</span>}
                  <button className="fav-btn" onClick={e=>{e.stopPropagation();toggleFavori(a.id);}}>
                    {favoris.includes(a.id) ? "❤️" : "🤍"}
                  </button>
                </div>
                <div className="cbody">
                  <div className="ctitle">{a.titre}</div>
                  <div className="cprix">{a.prix}</div>
                  <div className="clieu">📍 {a.quartier}, {a.ville}</div>
                  <div className="cdesc">{a.description}</div>
                  <div className="cfoot">
                    <div className="cvend">
                      <strong>{a.vendeur}</strong>
                      <span style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
                        <span style={{fontSize:10}}>👁️ {a.vues||0}</span>
                        <span style={{color:"var(--border)"}}>·</span>
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                    <button className="cbtn" onClick={e=>{e.stopPropagation();openAd(a);}}>Voir →</button>
                  </div>
                </div>
              </div>
            ))}</div>
            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>‹</button>
                {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                  <button key={n} className={`page-btn${n===currentPage?" on":""}`} onClick={()=>{setCurrentPage(n);window.scrollTo({top:0,behavior:"smooth"});}}>{n}</button>
                ))}
                <button className="page-btn" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>›</button>
              </div>
            )}
          </>
        }
      </div>

      {/* PLEIN ÉCRAN */}
      {fullscreen && (
        <div className="fullscreen-overlay" onClick={() => setFullscreen(null)}>
          <button className="fullscreen-close" onClick={() => setFullscreen(null)}>✕</button>
          <img src={fullscreen.photos[fullscreen.idx]} alt="" className="fullscreen-img" onClick={e=>e.stopPropagation()}/>
          {fullscreen.photos.length > 1 && <>
            <button onClick={e=>{e.stopPropagation();setFullscreen(f=>({...f,idx:(f.idx-1+f.photos.length)%f.photos.length}))}} style={{position:"fixed",left:16,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.2)",color:"white",border:"none",borderRadius:"50%",width:48,height:48,fontSize:26,cursor:"pointer",zIndex:10000}}>‹</button>
            <button onClick={e=>{e.stopPropagation();setFullscreen(f=>({...f,idx:(f.idx+1)%f.photos.length}))}} style={{position:"fixed",right:16,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,0.2)",color:"white",border:"none",borderRadius:"50%",width:48,height:48,fontSize:26,cursor:"pointer",zIndex:10000}}>›</button>
            <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",display:"flex",gap:8,zIndex:10000}}>
              {fullscreen.photos.map((_,i)=><div key={i} onClick={e=>{e.stopPropagation();setFullscreen(f=>({...f,idx:i}));}} style={{width:9,height:9,borderRadius:"50%",background:i===fullscreen.idx?"white":"rgba(255,255,255,0.4)",cursor:"pointer"}}/>)}
            </div>
          </>}
        </div>
      )}

      {selected && (
        <div className="moverlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <ModalImage annonce={selected} onFullscreen={(photos, idx) => setFullscreen({photos, idx})}/>
            <div className="mbody">
              <div className="mtitle">{selected.titre}</div>
              <div className="mprix">{selected.prix}</div>
              <div className="mmeta">
                <span>📍 {selected.quartier}, {selected.ville}</span>
                <span>👤 {selected.vendeur}</span>
                <span>🕐 {formatDate(selected.createdAt)}</span>
                <span>👁️ {selected.vues||0} vue{(selected.vues||0)!==1?"s":""}</span>
              </div>
              <div className="mdesc">{selected.description}</div>

              {/* NOTATION VENDEUR */}
              <div className="rating-box">
                <div className="rating-title">⭐ Notation du vendeur</div>
                <div className="rating-avg">
                  <span className="rating-avg-n">{avgRating(ratings)}</span>
                  <div>
                    <div className="stars">{[1,2,3,4,5].map(i=><span key={i}>{i<=Math.round(avgRating(ratings))?"⭐":"☆"}</span>)}</div>
                    <div className="rating-count">{ratings.length} avis</div>
                  </div>
                </div>

                {/* Donner un avis */}
                {selected.userId !== user.uid && <>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--text)",marginBottom:6}}>Votre avis :</div>
                  <div className="stars" style={{marginBottom:8}}>
                    {[1,2,3,4,5].map(i=>(
                      <span key={i} className="star" onClick={()=>setMyRating(i)}>{i<=myRating?"⭐":"☆"}</span>
                    ))}
                  </div>
                  <textarea className="rating-comment" placeholder="Laissez un commentaire (optionnel)..." value={myComment} onChange={e=>setMyComment(e.target.value)}/>
                  <button className="fb" style={{marginTop:8,padding:"10px"}} onClick={()=>submitRating(selected.userId)}>Envoyer mon avis</button>
                </>}

                {/* Avis existants */}
                {ratings.length > 0 && <div style={{marginTop:12}}>
                  {ratings.slice(0,3).map(r=>(
                    <div key={r.id} className="review-item">
                      <div className="review-header">
                        <span className="review-name">👤 {r.buyerName}</span>
                        <span className="review-date">{[1,2,3,4,5].map(i=>i<=r.note?"⭐":"☆").join("")}</span>
                      </div>
                      {r.commentaire && <div className="review-text">{r.commentaire}</div>}
                    </div>
                  ))}
                </div>}
              </div>
              <div className="macts">
                <button className="mclose" onClick={() => setSelected(null)}>Fermer</button>
                <button className="mclose" style={{color:"#f87171",borderColor:"rgba(239,68,68,.4)"}} onClick={()=>reportAd(selected)}>🚩 Signaler</button>
                <button className="mwa" onClick={()=>startConversation(selected)}>
                  💬 Contacter le vendeur
                </button>
                <button className="mwa" style={{background:"rgba(18,140,126,.2)",color:"#34d399",borderColor:"rgba(18,140,126,.4)",flex:1}} onClick={()=>{
                  const txt = `🛍️ *${selected.titre}*\n💰 ${selected.prix}\n📍 ${selected.quartier}, ${selected.ville}\n\n${selected.description}\n\n👉 YoMan! : https://yomanbf.com`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`,"_blank");
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                  Partager
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <BottomNav page={page} setPage={setPage} catActive={catActive} setCat={setCat} favoris={favoris} unread={unreadCount}/>
      <Footer/>
    </div>
  </>);
}
