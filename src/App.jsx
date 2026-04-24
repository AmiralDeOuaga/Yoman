import { useState, useRef, useEffect } from "react";
import { db, auth } from "./firebase";
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";

// ─────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME    = "dw4clwa2b";
const CLOUDINARY_UPLOAD_PRESET = "yo man";
// ─────────────────────────────────────────────────────────────

const categories = [
  { id: "immobilier",   label: "Immobilier",   icon: "🏠" },
  { id: "vehicules",    label: "Véhicules",    icon: "🚗" },
  { id: "electronique", label: "Électronique", icon: "📱" },
];

const catEmojis  = { immobilier:"🏡", vehicules:"🚗", electronique:"📱" };
const villes     = ["Ouagadougou","Bobo-Dioulasso","Koudougou","Ouahigouya","Banfora","Dédougou","Fada N'Gourma","Tenkodogo"];
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

// ── LOGOS ─────────────────────────────────────────────────────
const YoManLogo = ({ variant = "white", height = 48 }) => {
  const isWhite = variant === "white";
  const bagBlue  = isWhite ? "rgba(255,255,255,0.22)" : "#1756C8";
  const bagDark  = isWhite ? "rgba(255,255,255,0.38)" : "#0A2463";
  const bagBorder= isWhite ? "rgba(255,255,255,0.6)"  : "#0A2463";
  const handleC  = "#FFD93D";
  const textMan  = isWhite ? "#FFD93D"                : "#1756C8";
  const subBg    = isWhite ? "rgba(255,255,255,0.18)" : "#1756C8";
  const subText  = isWhite ? "#FFD93D"                : "#FFFFFF";
  const w = height * 3.2;
  return (
    <svg width={w} height={height} viewBox="0 0 228 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{maxWidth:"100%"}}>
      <rect x="2" y="20" width="46" height="36" rx="5" fill={bagBlue} stroke={bagBorder} strokeWidth="2"/>
      <rect x="43" y="23" width="8" height="30" rx="3" fill={bagDark} opacity="0.5"/>
      <path d="M13 20 C13 10 22 6 25 6 C28 6 37 10 37 20" stroke={handleC} strokeWidth="4" strokeLinecap="round" fill="none"/>
      <rect x="6" y="24" width="8" height="18" rx="3" fill="white" opacity="0.18"/>
      <path d="M42 22 L43 19 L44 22 L47 23.5 L44 25 L43 28 L42 25 L39 23.5 Z" fill={handleC} opacity="0.9"/>
      <text x="60" y="30" fontFamily="'Montserrat','Arial Black',sans-serif" fontWeight="900" fontSize="22" fill="white" stroke={textMan} strokeWidth="1.2" paintOrder="stroke" letterSpacing="-1">Yo</text>
      <text x="88" y="30" fontFamily="'Montserrat','Arial Black',sans-serif" fontWeight="900" fontSize="22" fill={textMan} letterSpacing="-1">Man!</text>
      <rect x="60" y="36" width="162" height="18" rx="9" fill={subBg}/>
      <text x="141" y="49" fontFamily="'Montserrat',sans-serif" fontWeight="700" fontSize="8" fill={subText} letterSpacing="0.8" textAnchor="middle">· ENTRE PARTICULIERS ·</text>
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

  .hdr { background:linear-gradient(135deg,var(--dark),var(--blue)); padding:0 20px; position:sticky; top:0; z-index:100; box-shadow:0 4px 24px rgba(10,36,99,.28); }
  .hdr-in { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:66px; }
  .hdr-r { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .huser { font-size:13px; color:rgba(255,255,255,.75); }
  .huser strong { color:var(--gold); }
  .btn-p { background:var(--gold); color:var(--dark); border:none; border-radius:10px; padding:9px 18px; font-size:13px; font-weight:800; cursor:pointer; font-family:'Montserrat',sans-serif; transition:all .2s; }
  .btn-p:hover { background:#FFC800; transform:translateY(-1px); }
  .btn-o { background:rgba(255,255,255,.12); color:white; border:1.5px solid rgba(255,255,255,.25); border-radius:10px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer; font-family:'Nunito',sans-serif; transition:all .2s; }
  .btn-o:hover { background:rgba(255,255,255,.22); }

  /* AUTH */
  .auth-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:linear-gradient(145deg,var(--dark) 0%,#0D3380 45%,var(--blue) 75%,#38CFFF 100%); }
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
  .hero { background:linear-gradient(135deg,var(--dark) 0%,#0D3380 40%,var(--blue) 100%); padding:52px 24px 44px; text-align:center; position:relative; overflow:hidden; }
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
  .cats { display:flex; gap:8px; flex-wrap:wrap; }
  .cbt { display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:50px; border:2px solid var(--border); background:white; font-size:13px; font-weight:700; cursor:pointer; font-family:'Montserrat',sans-serif; color:var(--muted); transition:all .2s; }
  .cbt:hover { border-color:var(--blue); color:var(--blue); }
  .cbt.on { border-color:var(--blue); background:var(--blue); color:white; box-shadow:0 4px 12px rgba(23,86,200,.25); }

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
  .modal { background:white; border-radius:24px; max-width:520px; width:100%; overflow:hidden; box-shadow:0 32px 80px rgba(10,36,99,.35); animation:fadeUp .3s ease; max-height:90vh; overflow-y:auto; }
  .mimg-wrap { height:230px; position:relative; overflow:hidden; background:linear-gradient(135deg,#EBF2FF,#D6E4FF); }
  .mimg-real { width:100%; height:100%; object-fit:cover; display:block; }
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

function ModalImage({ annonce }) {
  const [idx, setIdx] = useState(0);
  const photos = annonce.photos || [];
  if (!photos.length) return <div className="mimg-emoji">{annonce.emoji}</div>;
  return (
    <div className="mimg-wrap">
      <img src={photos[idx]} alt="" className="mimg-real"/>
      <div className="mbadges">
        <span className="bcat">{categories.find(c=>c.id===annonce.categorie)?.label}</span>
        {annonce.urgent && <span className="burg">⚡ Urgent</span>}
      </div>
      {photos.length > 1 && <>
        <div className="mimg-nav">
          <button className="mnav-btn" onClick={e=>{e.stopPropagation();setIdx(i=>(i-1+photos.length)%photos.length)}}>‹</button>
          <button className="mnav-btn" onClick={e=>{e.stopPropagation();setIdx(i=>(i+1)%photos.length)}}>›</button>
        </div>
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

  const postAd = async () => {
    if (!pTitre||!pPrix||!pQ||!pDesc) return;
    setSubmitting(true);
    try {
      const na = {
        categorie: pCat, titre: pTitre, prix: pPrix + " FCFA",
        ville: pVille, quartier: pQ, description: pDesc,
        whatsapp: rWa || rTel || user.email,
        vendeur: user.displayName || user.email,
        urgent: pUrg, emoji: catEmojis[pCat],
        userId: user.uid, photos: pPhotos,
        createdAt: serverTimestamp()
      };
      const doc = await addDoc(collection(db, "annonces"), na);
      setAnnonces(p => [{ id: doc.id, ...na, date: "À l'instant" }, ...p]);
      setPTitre(""); setPPrix(""); setPQ(""); setPDesc(""); setPUrg(false); setPPhotos([]);
      setPostOk(true);
      setTimeout(() => { setPostOk(false); setPage("home"); }, 2000);
    } catch(e) { alert("Erreur : " + e.message); }
    setSubmitting(false);
  };

  const logout = () => { signOut(auth); setPage("home"); };

  const myAds = annonces.filter(a => a.userId === user?.uid);
  const filtered = annonces.filter(a => {
    const mc = catActive === "tous" || a.categorie === catActive;
    const ms = search === "" || [a.titre, a.description, a.ville].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    return mc && ms;
  });

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
        <button className="btn-o" onClick={() => setPage("profile")}>Mon profil</button>
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
      {authTab === "login" ? <>
        <div className="fg"><label className="fl">Email</label><input className="fi" type="email" placeholder="votre@email.com" value={lEmail} onChange={e=>setLEmail(e.target.value)}/></div>
        <div className="fg"><label className="fl">Mot de passe</label><input className="fi" type="password" placeholder="••••••••" value={lPwd} onChange={e=>setLPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/></div>
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
          <div className="ptitle">📝 Déposer une annonce</div>
          <div className="fg"><label className="fl">Catégorie *</label><select className="fs" value={pCat} onChange={e=>setPCat(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
          <div className="fg"><label className="fl">Titre *</label><input className="fi" placeholder="Ex : Toyota Corolla 2020" value={pTitre} onChange={e=>setPTitre(e.target.value)}/></div>
          <div className="fg"><label className="fl">Prix (FCFA) *</label><input className="fi" placeholder="Ex : 2 500 000" value={pPrix} onChange={e=>setPPrix(e.target.value)}/></div>
          <div className="frow">
            <div className="fg"><label className="fl">Ville *</label><select className="fs" value={pVille} onChange={e=>setPVille(e.target.value)}>{villes.map(v=><option key={v}>{v}</option>)}</select></div>
            <div className="fg"><label className="fl">Quartier *</label><input className="fi" placeholder="Ex : Ouaga 2000" value={pQ} onChange={e=>setPQ(e.target.value)}/></div>
          </div>
          <div className="fg"><label className="fl">Description *</label><textarea className="fta" placeholder="Décrivez votre article…" value={pDesc} onChange={e=>setPDesc(e.target.value)}/></div>
          <PhotoUploader photos={pPhotos} setPhotos={setPPhotos}/>
          <div className="fg"><label className="utog"><div className={`tog${pUrg?" on":""}`} onClick={()=>setPUrg(p=>!p)}/><span style={{fontSize:13,color:"var(--dark)",fontWeight:700}}>⚡ Marquer comme urgent</span></label></div>
          <button className="fb" onClick={postAd} disabled={submitting}>{submitting ? "Publication…" : "Publier l'annonce →"}</button>
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
                <div className="cbody"><div className="ctitle">{a.titre}</div><div className="cprix">{a.prix}</div><div className="clieu">📍 {a.quartier}, {a.ville}</div></div>
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
        <p>Achète, vends, échange — gratuit, simple et en confiance 🇧🇫</p>
        <div className="sbar">
          <input placeholder="Que cherchez-vous ?" value={searchInput} onChange={e=>setSI(e.target.value)} onKeyDown={e=>e.key==="Enter"&&setSearch(searchInput)}/>
          <button onClick={() => setSearch(searchInput)}>Rechercher</button>
        </div>
        <div className="stats">
          <div className="stat"><div className="stn">{annonces.length}</div><div className="stl">Annonces</div></div>
          <div className="stat"><div className="stn">14</div><div className="stl">Villes</div></div>
        </div>
      </section>

      <div className="sec">
        <div className="stitle">Catégories</div>
        <div className="cats">
          <button className={`cbt${catActive==="tous"?" on":""}`} onClick={()=>setCat("tous")}>🗂️ Toutes</button>
          {categories.map(c=><button key={c.id} className={`cbt${catActive===c.id?" on":""}`} onClick={()=>setCat(c.id)}>{c.icon} {c.label}</button>)}
        </div>
        <div className="stitle">{filtered.length} annonce{filtered.length!==1?"s":""}{search?` pour « ${search} »`:""}</div>
        {filtered.length === 0
          ? <div className="empty"><div className="eico">🔍</div><div className="emsg">Aucune annonce trouvée</div></div>
          : <div className="grid">{filtered.map(a => (
              <div key={a.id} className="card" onClick={() => setSelected(a)}>
                <div style={{position:"relative"}}>
                  <CardImage annonce={a}/>
                  {a.userId === user.uid && <span className="bmine">Ma annonce</span>}
                </div>
                <div className="cbody">
                  <div className="ctitle">{a.titre}</div>
                  <div className="cprix">{a.prix}</div>
                  <div className="clieu">📍 {a.quartier}, {a.ville}</div>
                  <div className="cdesc">{a.description}</div>
                  <div className="cfoot">
                    <div className="cvend"><strong>{a.vendeur}</strong>{formatDate(a.createdAt)}</div>
                    <a className="wabtn" href={waLink(a.whatsapp, a.titre)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>💬 WhatsApp</a>
                  </div>
                </div>
              </div>
            ))}</div>
        }
      </div>

      {selected && (
        <div className="moverlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <ModalImage annonce={selected}/>
            <div className="mbody">
              <div className="mtitle">{selected.titre}</div>
              <div className="mprix">{selected.prix}</div>
              <div className="mmeta">
                <span>📍 {selected.quartier}, {selected.ville}</span>
                <span>👤 {selected.vendeur}</span>
                <span>🕐 {formatDate(selected.createdAt)}</span>
              </div>
              <div className="mdesc">{selected.description}</div>
              <div className="macts">
                <button className="mclose" onClick={() => setSelected(null)}>Fermer</button>
                <a className="mwa" href={waLink(selected.whatsapp, selected.titre)} target="_blank" rel="noopener noreferrer">💬 Contacter sur WhatsApp</a>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer/>
    </div>
  </>);
}
