import { useState, useRef, useEffect } from "react";
import { db, auth } from "./firebase";
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc
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

// ── LOGO — Yo! dans un carré arrondi ──────────────────────────
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
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Nunito:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --blue:#1756C8; --dark:#0A2463; --sky:#38CFFF;
    --gold:#FFD93D; --bg:#F0F5FF; --text:#0D1B3E;
    --muted:#6B80A8; --border:#D6E4FF;
  }
  body { font-family:'Nunito',sans-serif; background:var(--bg); color:var(--text); }
  .app { min-height:100vh; }

  .hdr { background:linear-gradient(135deg,var(--dark),var(--blue)); padding:0 16px; position:sticky; top:0; z-index:100; box-shadow:0 4px 24px rgba(10,36,99,.28); }
  .hdr-in { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; min-height:62px; padding:8px 0; flex-wrap:wrap; gap:6px; }
  .hdr-r { display:flex; align-items:center; gap:6px; flex-wrap:nowrap; }
  .huser { font-size:12px; color:rgba(255,255,255,.75); white-space:nowrap; display:none; }
  @media(min-width:480px) { .huser { display:block; } }
  .huser strong { color:var(--gold); }
  .btn-p { background:var(--gold); color:var(--dark); border:none; border-radius:10px; padding:8px 14px; font-size:12px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; white-space:nowrap; }
  .btn-p:hover { background:#FFC800; transform:translateY(-1px); }
  .btn-o { background:rgba(255,255,255,.12); color:white; border:1.5px solid rgba(255,255,255,.25); border-radius:10px; padding:7px 12px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Nunito',sans-serif; transition:all .2s; white-space:nowrap; }
  .btn-o:hover { background:rgba(255,255,255,.22); }

  /* AUTH */
  .auth-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:linear-gradient(145deg,var(--dark) 0%,var(--blue) 60%,#38CFFF 100%); }
  .auth-box { background:white; border-radius:28px; padding:36px 32px; max-width:400px; width:100%; box-shadow:0 32px 80px rgba(10,36,99,.38); animation:fadeUp .5s ease; }
  @keyframes fadeUp { from{transform:translateY(28px);opacity:0} to{transform:translateY(0);opacity:1} }
  .auth-logo-wrap { display:flex; justify-content:center; margin-bottom:20px; overflow:hidden; width:100%; }
  .tabs { display:flex; background:var(--bg); border-radius:12px; padding:4px; margin-bottom:22px; gap:4px; }
  .tab { flex:1; padding:9px; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; border:none; background:transparent; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; }
  .tab.on { background:var(--blue); color:white; box-shadow:0 4px 12px rgba(23,86,200,.3); }
  .fg { margin-bottom:14px; }
  .fl { display:block; font-size:12px; font-weight:700; color:var(--dark); margin-bottom:5px; }
  .fi { width:100%; padding:12px 14px; border:2px solid var(--border); border-radius:10px; font-size:14px; font-family:'Nunito',sans-serif; outline:none; background:var(--bg); color:var(--text); transition:border-color .2s; }
  .fi:focus { border-color:var(--blue); background:white; }
  .fs { width:100%; padding:12px 14px; border:2px solid var(--border); border-radius:10px; font-size:14px; font-family:'Nunito',sans-serif; outline:none; background:var(--bg); color:var(--text); }
  .fta { width:100%; padding:12px 14px; border:2px solid var(--border); border-radius:10px; font-size:14px; font-family:'Nunito',sans-serif; outline:none; resize:vertical; min-height:88px; background:var(--bg); color:var(--text); }
  .fta:focus { border-color:var(--blue); background:white; }
  .fb { width:100%; background:linear-gradient(135deg,var(--blue),var(--dark)); color:white; border:none; border-radius:12px; padding:14px; font-size:15px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; margin-top:6px; transition:all .2s; }
  .fb:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(23,86,200,.35); }
  .fb:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
  .ferr { background:#FEF2F2; border:1.5px solid #FCA5A5; border-radius:10px; padding:10px 14px; font-size:13px; color:#DC2626; margin-bottom:14px; font-weight:600; }
  .fhint { font-size:11px; color:var(--muted); margin-top:3px; }
  .frow { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .google-btn { width:100%; background:white; color:#3c4043; border:2px solid #dadce0; border-radius:12px; padding:13px; font-size:14px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; margin-top:10px; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:10px; }
  .google-btn:hover { border-color:#4285F4; box-shadow:0 2px 12px rgba(66,133,244,.2); }
  .divider { display:flex; align-items:center; gap:10px; margin:14px 0; color:var(--muted); font-size:12px; }
  .divider::before, .divider::after { content:''; flex:1; height:1px; background:var(--border); }
  .utog { display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; }
  .tog { width:44px; height:24px; border-radius:12px; background:var(--border); position:relative; transition:background .25s; flex-shrink:0; }
  .tog.on { background:var(--blue); }
  .tog::after { content:''; position:absolute; width:18px; height:18px; background:white; border-radius:50%; top:3px; left:3px; transition:left .25s; box-shadow:0 2px 6px rgba(0,0,0,.15); }
  .tog.on::after { left:23px; }

  /* PHOTOS */
  .photo-section { margin-bottom:16px; }
  .photo-grid { display:flex; gap:10px; flex-wrap:wrap; margin-top:8px; }
  .photo-slot { width:92px; height:92px; border-radius:12px; border:2px dashed var(--border); background:var(--bg); display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; position:relative; overflow:hidden; font-size:11px; color:var(--muted); font-weight:600; gap:4px; }
  .photo-slot:hover { border-color:var(--blue); background:#EBF2FF; }
  .photo-slot img { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; border-radius:10px; }
  .photo-del { position:absolute; top:4px; right:4px; background:rgba(220,38,38,.85); color:white; border:none; border-radius:50%; width:22px; height:22px; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700; z-index:2; }
  .photo-uploading { position:absolute; inset:0; background:rgba(23,86,200,.72); display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:700; border-radius:10px; }
  .photo-main-badge { position:absolute; bottom:4px; left:4px; background:var(--gold); color:var(--dark); font-size:9px; font-weight:800; padding:2px 6px; border-radius:6px; font-family:'Montserrat',sans-serif; }
  .photo-limit { font-size:11px; color:var(--muted); margin-top:6px; }

  /* HERO */
  .hero { background:linear-gradient(135deg,var(--dark) 0%,var(--blue) 100%); padding:52px 24px 44px; text-align:center; position:relative; overflow:hidden; }
  .hero-blur1 { position:absolute; width:380px; height:380px; background:radial-gradient(circle,rgba(56,207,255,.2) 0%,transparent 70%); top:-110px; right:-90px; pointer-events:none; }
  .hero-blur2 { position:absolute; width:260px; height:260px; background:radial-gradient(circle,rgba(255,217,61,.15) 0%,transparent 70%); bottom:-90px; left:-70px; pointer-events:none; }
  .hero-logo { margin-bottom:20px; display:flex; justify-content:center; }
  .hero h1 { font-family:'Montserrat',sans-serif; font-size:clamp(22px,4vw,42px); font-weight:900; color:white; margin-bottom:10px; line-height:1.15; }
  .hero h1 em { color:var(--gold); font-style:normal; }
  .hero p { color:rgba(255,255,255,.72); font-size:15px; margin-bottom:28px; max-width:460px; margin-left:auto; margin-right:auto; }
  .sbar { display:flex; max-width:540px; margin:0 auto 28px; background:white; border-radius:14px; overflow:hidden; box-shadow:0 12px 40px rgba(10,36,99,.25); }
  .sbar input { flex:1; padding:15px 18px; border:none; outline:none; font-size:14px; font-family:'Nunito',sans-serif; color:var(--text); }
  .sbar button { background:var(--gold); color:var(--dark); border:none; padding:13px 22px; font-size:14px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; }
  .stats { display:flex; justify-content:center; gap:40px; flex-wrap:wrap; }
  .stn { font-size:24px; font-weight:900; color:var(--gold); font-family:'Montserrat',sans-serif; }
  .stl { font-size:11px; color:rgba(255,255,255,.55); text-transform:uppercase; letter-spacing:1.5px; margin-top:2px; }

  /* CONTENT */
  .sec { max-width:1100px; margin:0 auto; padding:0 20px; }
  .stitle { font-family:'Montserrat',sans-serif; font-size:18px; font-weight:800; color:var(--dark); margin:30px 0 14px; }

  /* MENU CATÉGORIES */
  .cat-toggle { display:flex; align-items:center; justify-content:space-between; background:white; border:2px solid var(--border); border-radius:14px; padding:12px 18px; cursor:pointer; margin-bottom:8px; transition:all .2s; }
  .cat-toggle:hover { border-color:var(--blue); }
  .cat-toggle-left { display:flex; align-items:center; gap:10px; font-family:'Montserrat',sans-serif; font-weight:700; font-size:14px; color:var(--dark); }
  .cat-toggle-right { display:flex; align-items:center; gap:8px; }
  .cat-active-badge { background:var(--blue); color:white; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; font-family:'Montserrat',sans-serif; }
  .cat-arrow { font-size:12px; color:var(--muted); transition:transform .25s; }
  .cat-arrow.open { transform:rotate(180deg); }
  .cat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:8px; background:white; border:2px solid var(--border); border-radius:14px; padding:14px; margin-bottom:8px; animation:fadeUp .2s ease; }
  @media(max-width:480px) { .cat-grid { grid-template-columns:repeat(3,1fr); } }
  .cat-item { display:flex; flex-direction:column; align-items:center; gap:5px; padding:10px 8px; border-radius:10px; border:2px solid transparent; background:var(--bg); cursor:pointer; transition:all .2s; font-family:'Montserrat',sans-serif; font-size:11px; font-weight:700; color:var(--muted); text-align:center; }
  .cat-item:hover { border-color:var(--blue); color:var(--blue); background:white; }
  .cat-item.on { border-color:var(--blue); background:var(--blue); color:white; }
  .cat-item-icon { font-size:24px; }
  .cat-item-all { display:flex; flex-direction:column; align-items:center; gap:5px; padding:10px 8px; border-radius:10px; border:2px solid var(--border); background:white; cursor:pointer; transition:all .2s; font-family:'Montserrat',sans-serif; font-size:11px; font-weight:700; color:var(--muted); text-align:center; }
  .cat-item-all.on { border-color:var(--blue); background:var(--blue); color:white; }
  .cat-item-all:hover { border-color:var(--blue); color:var(--blue); }
  .fav-tab { display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:50px; border:2px solid var(--border); background:white; font-size:13px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; }
  .fav-tab.on { border-color:#FF6B6B; background:#FF6B6B; color:white; }

  /* GRID */
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(285px,1fr)); gap:18px; margin:16px 0 44px; }
  .card { background:white; border-radius:18px; overflow:hidden; border:2px solid var(--border); transition:all .25s; cursor:pointer; }
  .card:hover { transform:translateY(-5px); box-shadow:0 16px 48px rgba(23,86,200,.14); border-color:var(--sky); }
  .cimg { height:172px; position:relative; overflow:hidden; }
  .cimg-real { width:100%; height:100%; object-fit:cover; display:block; }
  .cimg-emoji { height:172px; background:linear-gradient(135deg,#EBF2FF,#D6E4FF); display:flex; align-items:center; justify-content:center; font-size:62px; position:relative; }
  .photo-count { position:absolute; bottom:8px; right:8px; background:rgba(10,36,99,.75); color:white; font-size:10px; font-weight:700; padding:3px 8px; border-radius:10px; font-family:'Montserrat',sans-serif; }
  .bcat { position:absolute; top:10px; left:10px; background:var(--dark); color:var(--sky); font-size:10px; font-weight:800; letter-spacing:1px; padding:4px 10px; border-radius:20px; text-transform:uppercase; font-family:'Montserrat',sans-serif; z-index:1; }
  .burg { position:absolute; top:10px; right:10px; background:linear-gradient(135deg,#FF6B35,#FF3D00); color:white; font-size:10px; font-weight:800; padding:4px 10px; border-radius:20px; font-family:'Montserrat',sans-serif; animation:pulse 2s infinite; z-index:1; }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,61,0,.4)} 50%{box-shadow:0 0 0 5px rgba(255,61,0,0)} }
  .bmine { position:absolute; bottom:8px; left:8px; background:var(--gold); color:var(--dark); font-size:10px; font-weight:800; padding:3px 9px; border-radius:20px; font-family:'Montserrat',sans-serif; z-index:1; }
  .cbody { padding:14px; }
  .ctitle { font-family:'Montserrat',sans-serif; font-size:15px; font-weight:800; color:var(--dark); margin-bottom:5px; line-height:1.3; }
  .cprix { font-size:18px; font-weight:900; color:var(--blue); margin-bottom:5px; font-family:'Montserrat',sans-serif; }
  .clieu { font-size:12px; color:var(--muted); margin-bottom:6px; }
  .cdesc { font-size:12px; color:#4A5568; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:11px; }
  .cfoot { display:flex; align-items:center; justify-content:space-between; border-top:2px solid var(--bg); padding-top:10px; }
  .cvend { font-size:11px; color:var(--muted); }
  .cvend strong { color:var(--dark); font-size:12px; display:block; font-weight:700; }
  .wabtn { display:flex; align-items:center; gap:5px; background:#22C55E; color:white; border:none; border-radius:8px; padding:7px 12px; font-size:12px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; text-decoration:none; transition:all .2s; }
  .wabtn:hover { background:#16A34A; transform:scale(1.05); }

  /* POST */
  .pscreen { max-width:560px; margin:36px auto; padding:0 20px 56px; }
  .pback { display:flex; align-items:center; gap:7px; color:var(--muted); font-size:13px; font-weight:700; cursor:pointer; margin-bottom:20px; background:none; border:none; font-family:'Montserrat',sans-serif; }
  .pback:hover { color:var(--blue); }
  .pcard { background:white; border-radius:22px; padding:30px; border:2px solid var(--border); box-shadow:0 8px 32px rgba(23,86,200,.08); }
  .ptitle { font-family:'Montserrat',sans-serif; font-size:22px; font-weight:900; color:var(--dark); margin-bottom:24px; }
  .succ { background:#F0FDF4; border:2px solid #86EFAC; border-radius:12px; padding:13px 16px; color:#15803D; font-size:14px; font-weight:700; margin-bottom:18px; display:flex; align-items:center; gap:8px; }

  /* MODAL */
  .moverlay { position:fixed; inset:0; background:rgba(10,36,99,.78); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
  .modal { background:white; border-radius:24px; max-width:520px; width:100%; overflow:hidden; box-shadow:0 32px 80px rgba(10,36,99,.35); animation:fadeUp .3s ease; max-height:90vh; overflow-y:auto; position:relative; z-index:201; }
  .mimg-wrap { height:320px; position:relative; overflow:hidden; background:linear-gradient(135deg,#EBF2FF,#D6E4FF); cursor:zoom-in; }
  .mimg-real { width:100%; height:100%; object-fit:cover; display:block; transition:transform .3s; }
  .mimg-real:hover { transform:scale(1.03); }
  .mnav-left { position:absolute; left:8px; top:50%; transform:translateY(-50%); z-index:4; }
  .mnav-right { position:absolute; right:8px; top:50%; transform:translateY(-50%); z-index:4; }

  /* PLEIN ÉCRAN IMAGE */
  .fullscreen-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
  .fullscreen-img { max-width:100vw; max-height:100vh; object-fit:contain; }
  .fullscreen-close { position:fixed; top:16px; right:20px; color:white; font-size:36px; cursor:pointer; background:none; border:none; font-weight:300; z-index:10000; }
  .mimg-emoji { height:230px; display:flex; align-items:center; justify-content:center; font-size:80px; }
  .mimg-nav { position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding:0 10px; }
  .mnav-btn { background:rgba(10,36,99,.5); color:white; border:none; border-radius:50%; width:34px; height:34px; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .mimg-dots { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); display:flex; gap:5px; }
  .mdot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,.5); }
  .mdot.on { background:white; }
  .mbadges { position:absolute; top:10px; left:10px; display:flex; gap:6px; z-index:1; }
  .mbody { padding:22px; }
  .mtitle { font-family:'Montserrat',sans-serif; font-size:20px; font-weight:900; color:var(--dark); margin-bottom:5px; }
  .mprix { font-size:24px; font-weight:900; color:var(--blue); margin-bottom:10px; font-family:'Montserrat',sans-serif; }
  .mmeta { display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
  .mmeta span { font-size:12px; color:var(--muted); background:var(--bg); border-radius:6px; padding:3px 8px; }
  .mdesc { font-size:13px; color:#4A5568; line-height:1.7; margin-bottom:18px; }
  .macts { display:flex; gap:10px; }
  .mclose { flex:1; background:var(--bg); color:var(--dark); border:2px solid var(--border); border-radius:12px; padding:13px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; }
  .mclose:hover { border-color:var(--blue); color:var(--blue); }
  .mwa { flex:2; display:flex; align-items:center; justify-content:center; gap:8px; background:#22C55E; color:white; border:none; border-radius:12px; padding:13px; font-size:14px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; text-decoration:none; }
  .mwa:hover { background:#16A34A; }

  /* PROFILE */
  .profscreen { max-width:700px; margin:36px auto; padding:0 20px 56px; }
  .profhead { background:linear-gradient(135deg,var(--dark),var(--blue)); border-radius:22px; padding:28px; margin-bottom:20px; display:flex; align-items:center; gap:20px; }
  .avatar { width:64px; height:64px; border-radius:50%; background:var(--gold); display:flex; align-items:center; justify-content:center; font-size:28px; color:var(--dark); font-weight:900; font-family:'Montserrat',sans-serif; flex-shrink:0; }
  .pinfo h2 { font-family:'Montserrat',sans-serif; font-size:20px; font-weight:900; color:white; }
  .pinfo p { font-size:13px; color:rgba(255,255,255,.65); margin-top:4px; }
  .pstats { display:flex; gap:24px; margin-top:10px; }
  .psn { font-size:22px; font-weight:900; color:var(--gold); font-family:'Montserrat',sans-serif; }
  .psl { font-size:11px; color:rgba(255,255,255,.5); text-transform:uppercase; letter-spacing:1px; }
  .loading { display:flex; align-items:center; justify-content:center; min-height:100vh; font-size:24px; }
  .del-btn { background:#FEF2F2; color:#DC2626; border:2px solid #FCA5A5; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; flex:1; }
  .del-btn:hover { background:#DC2626; color:white; }

  /* FILTRES */
  .filter-bar { display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap; }
  .filter-btn { display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:50px; border:2px solid var(--border); background:white; font-size:13px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; }
  .filter-btn.on { border-color:var(--blue); background:var(--blue); color:white; }
  .filter-panel { background:white; border-radius:16px; border:2px solid var(--border); padding:18px; margin-bottom:16px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  @media(max-width:600px) { .filter-panel { grid-template-columns:1fr 1fr; } }
  .filter-label { font-size:11px; font-weight:700; color:var(--dark); margin-bottom:5px; display:block; }
  .filter-reset { background:var(--bg); color:var(--muted); border:2px solid var(--border); border-radius:8px; padding:8px 14px; font-size:12px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; grid-column:1/-1; }

  /* PAGINATION */
  .pagination { display:flex; align-items:center; justify-content:center; gap:8px; margin:24px 0 44px; flex-wrap:wrap; }
  .page-btn { width:38px; height:38px; border-radius:10px; border:2px solid var(--border); background:white; font-size:14px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; display:flex; align-items:center; justify-content:center; }
  .page-btn:hover { border-color:var(--blue); color:var(--blue); }
  .page-btn.on { background:var(--blue); color:white; border-color:var(--blue); }
  .page-btn:disabled { opacity:0.4; cursor:not-allowed; }

  /* FAVORIS */
  .fav-btn { position:absolute; top:10px; right:10px; width:32px; height:32px; border-radius:50%; background:white; border:none; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,.15); transition:all .2s; z-index:2; }
  .fav-btn:hover { transform:scale(1.2); }
  .fav-tab { display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:50px; border:2px solid var(--border); background:white; font-size:13px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; }
  .fav-tab.on { border-color:#FF6B6B; background:#FF6B6B; color:white; }
  .empty { text-align:center; padding:52px 20px; color:var(--muted); }
  .eico { font-size:44px; margin-bottom:12px; }
  .emsg { font-size:15px; font-weight:600; }
  .footer { background:var(--dark); color:rgba(255,255,255,.4); text-align:center; padding:20px; font-size:12px; }
  .footer strong { color:var(--gold); }
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
  const [editAd, setEditAd] = useState(null); // annonce en cours d'édition

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
    // Incrémenter les vues
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
      <div style={{cursor:"pointer"}} onClick={() => setPage("home")}><YoManLogo variant="white" height={40}/></div>
      <div className="hdr-r">
        {user && <span className="huser">Salut, <strong>{user.displayName?.split(" ")[0]}</strong> 👋</span>}
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
            <div className="pstats"><div><div className="psn">{myAds.length}</div><div className="psl">Annonces</div></div></div>
          </div>
        </div>
        <div className="stitle">Mes annonces</div>
        {myAds.length === 0
          ? <div className="empty"><div className="eico">📭</div><div className="emsg">Aucune annonce publiée</div></div>
          : <div className="grid">{myAds.map(a => (
              <div key={a.id} className="card" onClick={() => setSelected(a)}>
                <CardImage annonce={a}/>
                <div className="cbody">
                  <div className="ctitle">{a.titre}</div>
                  <div className="cprix">{a.prix}</div>
                  <div className="clieu">📍 {a.quartier}, {a.ville}</div>
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <button className="del-btn" style={{background:"#EBF2FF",color:"var(--blue)",border:"2px solid var(--border)"}} onClick={e => { e.stopPropagation(); startEdit(a); }}>✏️ Modifier</button>
                    <button className="del-btn" onClick={e => { e.stopPropagation(); deleteAd(a.id); }}>🗑️ Supprimer</button>
                  </div>
                </div>
              </div>
            ))}</div>
        }
      </div><Footer/>
    </div>
  </>);

  // HOME
  return (<><style>{styles}</style>
    <div className="app"><Header/>
      <section className="hero">
        <div className="hero-blur1"/><div className="hero-blur2"/>
        <div className="hero-logo"><YoManLogo variant="white" height={64}/></div>
        <h1>Vente entre particuliers<br/><em>partout au Burkina !</em></h1>
        <p>Achète, vends, échange — gratuit, simple et en confiance</p>
        <div className="sbar">
          <input placeholder="Que cherchez-vous ?" value={searchInput} onChange={e=>setSI(e.target.value)} onKeyDown={e=>e.key==="Enter"&&setSearch(searchInput)}/>
          <button onClick={() => setSearch(searchInput)}>Rechercher</button>
        </div>
        <div className="stats">
          <div className="stat"><div className="stn">{annonces.length}</div><div className="stl">Annonces</div></div>
          <div className="stat"><div className="stn">{villes.length}</div><div className="stl">Villes</div></div>
        </div>
      </section>

      <div className="sec">
        <div className="stitle">Catégories</div>

        {/* Menu déroulant catégories */}
        <div className="cat-toggle" onClick={() => setShowCats(s => !s)}>
          <div className="cat-toggle-left">
            <span style={{fontSize:20}}>{catActive === "tous" ? "🗂️" : catActive === "favoris" ? "❤️" : categories.find(c=>c.id===catActive)?.icon}</span>
            <span>{catActive === "tous" ? "Toutes les catégories" : catActive === "favoris" ? "Mes favoris" : categories.find(c=>c.id===catActive)?.label}</span>
          </div>
          <div className="cat-toggle-right">
            {catActive !== "tous" && catActive !== "favoris" && <span className="cat-active-badge">{categories.find(c=>c.id===catActive)?.label}</span>}
            <span className={`cat-arrow${showCats ? " open" : ""}`}>▼</span>
          </div>
        </div>

        {showCats && (
          <div className="cat-grid">
            <div className={`cat-item-all${catActive==="tous"?" on":""}`} onClick={()=>{setCat("tous");setCurrentPage(1);setShowCats(false);}}>
              <span className="cat-item-icon">🗂️</span>Toutes
            </div>
            {categories.map(c => (
              <div key={c.id} className={`cat-item${catActive===c.id?" on":""}`} onClick={()=>{setCat(c.id);setCurrentPage(1);setShowCats(false);}}>
                <span className="cat-item-icon">{c.icon}</span>{c.label}
              </div>
            ))}
            <div className={`cat-item${catActive==="favoris"?" on":""}`} style={catActive==="favoris"?{borderColor:"#FF6B6B",background:"#FF6B6B"}:{}} onClick={()=>{setCat("favoris");setCurrentPage(1);setShowCats(false);}}>
              <span className="cat-item-icon">❤️</span>Favoris
            </div>
          </div>
        )}

        {/* FILTRES */}
        <div className="filter-bar" style={{marginTop:16}}>
          <button className={`filter-btn${showFiltres?" on":""}`} onClick={()=>setShowFiltres(f=>!f)}>
            🔽 Filtres {(filtreVille!=="toutes"||filtrePrixMin||filtrePrixMax) ? "●" : ""}
          </button>
          {(filtreVille!=="toutes"||filtrePrixMin||filtrePrixMax) && (
            <button className="filter-btn" onClick={()=>{setFiltreVille("toutes");setFiltrePrixMin("");setFiltrePrixMax("");}}>✕ Effacer</button>
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
              <input className="fi" placeholder="Ex: 100 000" value={filtrePrixMin} onChange={e=>setFiltrePrixMin(e.target.value)}/>
            </div>
            <div>
              <label className="filter-label">Prix max (FCFA)</label>
              <input className="fi" placeholder="Ex: 5 000 000" value={filtrePrixMax} onChange={e=>setFiltrePrixMax(e.target.value)}/>
            </div>
            <button className="filter-reset" onClick={()=>{setFiltreVille("toutes");setFiltrePrixMin("");setFiltrePrixMax("");}}>🔄 Réinitialiser les filtres</button>
          </div>
        )}
        <div className="stitle">{filtered.length} annonce{filtered.length!==1?"s":""}{search?` pour « ${search} »`:""}</div>
        {filtered.length === 0
          ? <div className="empty"><div className="eico">🔍</div><div className="emsg">Aucune annonce trouvée</div></div>
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
                    <div className="cvend"><strong>{a.vendeur}</strong>{formatDate(a.createdAt)}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:"var(--muted)"}}>👁️ {a.vues||0}</span>
                      <a className="wabtn" href={waLink(a.whatsapp, a.titre)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>💬 WhatsApp</a>
                    </div>
                  </div>
                </div>
              </div>
            ))}</div>
            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>‹</button>
                {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                  <button key={n} className={`page-btn${n===currentPage?" on":""}`} onClick={()=>{ setCurrentPage(n); window.scrollTo(0,0); }}>{n}</button>
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
              <div className="macts">
                <button className="mclose" onClick={() => setSelected(null)}>Fermer</button>
                <button className="mclose" style={{color:"#DC2626",borderColor:"#FCA5A5"}} onClick={()=>reportAd(selected)}>🚩 Signaler</button>
                <button className="mwa" style={{background:"#128C7E"}} onClick={()=>{
                  const txt = `🛍️ *${selected.titre}*\n💰 ${selected.prix}\n📍 ${selected.quartier}, ${selected.ville}\n\n${selected.description}\n\n👉 YoMan! : https://yoman-teal.vercel.app`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`,"_blank");
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                  Partager
                </button>
                <a className="mwa" href={waLink(selected.whatsapp, selected.titre)} target="_blank" rel="noopener noreferrer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.562 4.14 1.541 5.873L0 24l6.336-1.521A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.796 9.796 0 01-5.031-1.388l-.361-.214-3.736.897.939-3.618-.235-.374A9.76 9.76 0 012.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z"/></svg>
                  Contacter
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer/>
    </div>
  </>);
}
