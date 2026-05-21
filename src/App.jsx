import { useEffect, useMemo, useState, useRef } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
} from "firebase/firestore";

/* eslint-disable no-unused-vars */

/* ─── Icon stubs ─── */
const User = (props) => <span {...props}>👤</span>;
const Code2 = (props) => <span {...props}>💻</span>;
const Award = (props) => <span {...props}>🏆</span>;
const Briefcase = (props) => <span {...props}>💼</span>;
const MessageCircle = (props) => <span {...props}>💬</span>;
const Save = (props) => <span {...props}>✓</span>;
const X = (props) => <span {...props}>×</span>;
const Plus = (props) => <span {...props}>＋</span>;
const Trash2 = (props) => <span {...props}>🗑</span>;
const Pencil = (props) => <span {...props}>✎</span>;

/* ─── Helpers ─── */
/* eslint-enable no-unused-vars */
function formatUrl(url) {
  if (!url || url.trim() === "" || url === "#") return "#";
  const c = url.trim();
  return /^https?:\/\//i.test(c) ? c : `https://${c}`;
}
function getGoogleDriveFileId(url) {
  const c = (url || "").trim();
  const pats = [
    /drive\.google\.com\/file\/d\/([^/]+)/i,
    /drive\.google\.com\/open\?id=([^&]+)/i,
    /drive\.google\.com\/uc\?id=([^&]+)/i,
    /drive\.google\.com\/thumbnail\?id=([^&]+)/i,
  ];
  for (const p of pats) { const m = c.match(p); if (m?.[1]) return m[1]; }
  return "";
}
const DEFAULT_PROJECT_IMAGE = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop";

function formatImageUrl(url) {
  const id = getGoogleDriveFileId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200` : formatUrl(url);
}
const formatCertificateImageUrl = formatImageUrl;
function formatDownloadUrl(url) {
  const id = getGoogleDriveFileId(url);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : formatUrl(url);
}
function formatMailto(e) { const c = (e||"").trim(); return c ? `mailto:${c}` : "#"; }
function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test((e || "").trim());
}
function formatInstagramUrl(v) {
  const c = (v||"").trim();
  if (!c || c==="#") return "#";
  if (/^https?:\/\//i.test(c)||/^www\./i.test(c)) return formatUrl(c);
  return `https://www.instagram.com/${c.replace(/^@/,"")}`;
}
function LinkifiedText({ text }) {
  const v = String(text||"");
  const pat = /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  return v.split(pat).map((part,i) => {
    if (!part) return null;
    if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(part))
      return <a key={i} href={formatMailto(part)}>{part}</a>;
    if (/^(https?:\/\/|www\.)/i.test(part))
      return <a key={i} href={formatUrl(part)} target="_blank" rel="noreferrer">{part}</a>;
    return part;
  });
}

/* ─── Scroll reveal ─── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal-target");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, idx) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add("revealed"), idx * 80);
        }
      });
    }, { threshold: 0.1 });
    els.forEach(el => { el.classList.add("not-revealed"); obs.observe(el); });
    return () => els.forEach(el => obs.unobserve(el));
  }, []);
}

/* ─── Cube magnetic ─── */
function useCubeReaction() {
  useEffect(() => {
    let fid = 0;
    const reset = (c) => {
      c.style.setProperty("--hx","0px"); c.style.setProperty("--hy","0px");
      c.style.setProperty("--hr","0deg"); c.style.setProperty("--hs","1");
      c.classList.remove("is-hit");
    };
    const react = (ev) => {
      cancelAnimationFrame(fid);
      fid = requestAnimationFrame(() => {
        document.querySelectorAll(".bo-cube").forEach(cube => {
          const r = cube.getBoundingClientRect();
          const cx = r.left + r.width/2, cy = r.top + r.height/2;
          const dx = cx - ev.clientX, dy = cy - ev.clientY;
          const dist = Math.hypot(dx,dy);
          const thresh = window.innerWidth<=700 ? 90 : 140;
          if (dist > thresh) { reset(cube); return; }
          const f = (1-dist/thresh)*60, safe = Math.max(dist,1);
          cube.style.setProperty("--hx",`${(dx/safe)*f}px`);
          cube.style.setProperty("--hy",`${(dy/safe)*f}px`);
          cube.style.setProperty("--hr",`${Math.max(-25,Math.min(25,(dx-dy)*0.5))}deg`);
          cube.style.setProperty("--hs","1.1");
          cube.classList.add("is-hit");
        });
      });
    };
    const resetAll = () => document.querySelectorAll(".bo-cube").forEach(reset);
    window.addEventListener("pointermove", react);
    window.addEventListener("pointerleave", resetAll);
    window.addEventListener("blur", resetAll);
    return () => { cancelAnimationFrame(fid); window.removeEventListener("pointermove",react); window.removeEventListener("pointerleave",resetAll); window.removeEventListener("blur",resetAll); };
  },[]);
}

/* ─── Typewriter ─── */
function useTypewriter(words, speed=80, pause=1800) {
  const [display, setDisplay] = useState("");
  const [wIdx, setWIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[wIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(word.slice(0, cIdx+1));
        if (cIdx+1 === word.length) setTimeout(() => setDeleting(true), pause);
        else setCIdx(c => c+1);
      } else {
        setDisplay(word.slice(0, cIdx-1));
        if (cIdx-1 === 0) { setDeleting(false); setWIdx(w => (w+1)%words.length); setCIdx(0); }
        else setCIdx(c => c-1);
      }
    }, deleting ? speed/2 : speed);
    return () => clearTimeout(timeout);
  }, [cIdx, deleting, wIdx, words, speed, pause]);
  return display;
}

/* ─── Defaults ─── */
const defaultProfile = {
  name:"Ankit", title:"MCA Student • Java Developer • Web Developer",
  headline:"I build clean and dynamic web projects.",
  about:"I work with Java Servlet/JSP, React, Python, Django, MySQL and MongoDB. This portfolio shows my projects, skills, certificates and development journey.",
  education:"MCA student focused on software development, web technologies and real-world projects.",
  development:"I build projects using Java Servlet/JSP, React, Django, MySQL and MongoDB.",
  goal:"My goal is to become a confident full-stack developer and build deployable applications.",
  email:"ga8774040@gmail.com", github:"https://github.com/cskfan07",
  linkedin:"https://www.linkedin.com/in/ankit-gupta2201?utm_source=share_via&utm_content=profile&utm_medium=member_android",
  instagram:"mky_2201", resumeUrl:"#",
  maintenanceMode:false,
};
const defaultSkills = [
  {id:"d1",name:"Java",category:"Backend"},{id:"d2",name:"Servlet/JSP",category:"Backend"},
  {id:"d3",name:"Python",category:"Backend"},{id:"d4",name:"Django",category:"Backend"},
  {id:"d5",name:"React JS",category:"Frontend"},{id:"d6",name:"HTML",category:"Frontend"},
  {id:"d7",name:"CSS",category:"Frontend"},{id:"d8",name:"JavaScript",category:"Frontend"},
  {id:"d9",name:"MySQL",category:"Database"},{id:"d10",name:"MongoDB",category:"Database"},
  {id:"d11",name:"GitHub",category:"Tools"},{id:"d12",name:"Power BI",category:"Analytics"},
];
const defaultProjects = [
  {id:"dp1",title:"MCA Alumni Connect",description:"A role-based alumni portal with student, alumni and admin dashboards, notifications and job post management.",experience:"Built a practical full-stack dashboard flow with authentication, data management and deployment practice.",tech:"Django, MongoDB Atlas, HTML, CSS, JavaScript",github:"#",demo:"https://mca-alumni-connect.onrender.com",image:"https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop"},
  {id:"dp2",title:"Smart E-Driving Licence System",description:"A web system for learning licence, DL application, document verification, slot booking, exam and QR-based licence validation.",experience:"Practiced Java web development, form handling, database operations and role-based workflows.",tech:"Java Servlet, JSP, MySQL, Tomcat",github:"#",demo:"#",image:"https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1200&auto=format&fit=crop"},
  {id:"dp3",title:"Gud-Madhur AI",description:"A jaggery e-commerce platform with product listing, cart, orders, payments and an AI FAQ chatbot.",experience:"Improved e-commerce logic, UI flow, cart handling and chatbot integration experience.",tech:"Servlet, JSP, MySQL, JavaScript",github:"#",demo:"#",image:"https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=1200&auto=format&fit=crop"},
];
const defaultCertificates = [
  {id:"dc1",title:"Generative AI 101",provider:"Learning Program",date:"2026",experience:"Learned AI fundamentals, prompt basics and practical ways to use generative tools.",imageUrl:"",credentialUrl:"#"},
  {id:"dc2",title:"Digital Edge Program",provider:"Learning Program",date:"2026",experience:"Gained exposure to digital skills, workplace readiness and modern technology concepts.",imageUrl:"",credentialUrl:"#"},
  {id:"dc3",title:"Java Development Practice",provider:"Practice Certificate",date:"2026",experience:"Strengthened Java programming, backend logic and object-oriented development concepts.",imageUrl:"",credentialUrl:"#"},
  {id:"dc4",title:"Power BI Basics",provider:"Learning Program",date:"2026",experience:"Practiced dashboard creation, data visualization and basic analytics reporting.",imageUrl:"",credentialUrl:"#"},
];
const defaultResources = [
  {
    id:"dr1",
    title:"AI/ML Notes",
    tag:"Intelligence",
    summary:"Core concepts from machine learning, generative AI, model evaluation and practical prompt workflows.",
    topics:["ML basics","Neural networks","Prompting","Model metrics"],
    accent:"#4a9aa5",
    href:"#",
  },
  {
    id:"dr2",
    title:"Java Notes",
    tag:"Backend",
    summary:"Object-oriented programming, collections, JDBC, Servlets, JSP and backend project patterns.",
    topics:["OOP","Collections","JDBC","Servlet/JSP"],
    accent:"#b7791f",
    href:"#",
  },
  {
    id:"dr3",
    title:"Power BI Notes",
    tag:"Analytics",
    summary:"Dashboard building, data cleaning, relationships, DAX basics and visual storytelling.",
    topics:["DAX","Reports","Charts","Data model"],
    accent:"#d4962d",
    href:"#",
  },
  {
    id:"dr4",
    title:"STQA Notes",
    tag:"Testing",
    summary:"Software testing fundamentals, test case design, quality assurance and defect tracking.",
    topics:["Test cases","SDLC","QA process","Bug reports"],
    accent:"#3d6b31",
    href:"#",
  },
  {
    id:"dr5",
    title:"Web Dev Notes",
    tag:"Frontend",
    summary:"HTML, CSS, JavaScript, React and responsive UI patterns used in real projects.",
    topics:["HTML/CSS","JavaScript","React","Responsive UI"],
    accent:"#31596b",
    href:"#",
  },
];

/* ─── Data hooks ─── */
function useProfile() {
  const [profile,setProfile]=useState(defaultProfile);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    (async()=>{
      try {
        const ref=doc(db,"profile","main"); const snap=await getDoc(ref);
        if(snap.exists()) setProfile({...defaultProfile,...snap.data()});
        else { await setDoc(ref,{...defaultProfile,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}); setProfile(defaultProfile); }
      } catch { setProfile(defaultProfile); } finally { setLoading(false); }
    })();
  },[]);
  return {profile,setProfile,profileLoading:loading};
}
function useCollection(col,defaults) {
  const [items,setItems]=useState(defaults);
  const [loading,setLoading]=useState(true);
  const fetch=async()=>{
    try {
      const snap=await getDocs(query(collection(db,col),orderBy("createdAt","desc")));
      if (snap.empty) {
        setItems(defaults);
      } else {
        const docs=snap.docs.map((d,index)=>({id:d.id,...d.data(),__fallbackOrder:index}));
        docs.sort((a,b)=>{
          const ao=Number.isFinite(a.order)?a.order:a.__fallbackOrder;
          const bo=Number.isFinite(b.order)?b.order:b.__fallbackOrder;
          return ao-bo;
        });
        docs.forEach(item=>{delete item.__fallbackOrder;});
        setItems(docs);
      }
    } catch { setItems(defaults); } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(()=>{fetch();},[]);
  return {items,loading,fetch};
}

/* ─── App ─── */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortfolioPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function PortfolioPage() {
  const [search,setSearch]=useState("");
  const [activePage,setActivePage]=useState(0);
  const pageSwipeRef=useRef({x:0,y:0,skip:false});
  const navigate=useNavigate();
  useScrollReveal(); useCubeReaction();
  const {profile,profileLoading}=useProfile();
  const {items:skills,loading:sl}=useCollection("skills",defaultSkills);
  const {items:projects,loading:pl}=useCollection("projects",defaultProjects);
  const {items:certs,loading:cl}=useCollection("certificates",defaultCertificates);
  const {items:resources,loading:rl}=useCollection("resources",defaultResources);
  const filtered=useMemo(()=>{
    const v=search.toLowerCase();
    return projects.filter(p=>p.title?.toLowerCase().includes(v)||p.tech?.toLowerCase().includes(v)||p.description?.toLowerCase().includes(v)||p.experience?.toLowerCase().includes(v));
  },[projects,search]);
  if(profileLoading||sl||pl||cl||rl) return <Loader />;
  if(profile.maintenanceMode) return <MaintenancePage />;
  const goToPage=(page)=>setActivePage(Math.max(0,Math.min(page,1)));
  const startPageSwipe=(e)=>{
    const touch=e.touches?.[0];
    if(!touch) return;
    pageSwipeRef.current={
      x:touch.clientX,
      y:touch.clientY,
      skip:Boolean(e.target.closest(".notes-track")),
    };
  };
  const endPageSwipe=(e)=>{
    const touch=e.changedTouches?.[0];
    const swipe=pageSwipeRef.current;
    if(!touch||swipe.skip) return;
    const dx=touch.clientX-swipe.x;
    const dy=touch.clientY-swipe.y;
    if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.2) return;
    goToPage(dx<0 ? 1 : 0);
  };
  return (
    <div className={`bo-page two-page-shell page-${activePage}`}>
      <AdminBtn onAdmin={()=>navigate("/admin")} />
      <div className="page-slider-controls" aria-label="Portfolio pages">
        <button type="button" className={activePage===0?"active":""} onClick={()=>goToPage(0)}>Portfolio</button>
        <button type="button" className={activePage===1?"active":""} onClick={()=>goToPage(1)}>Notes & Resources</button>
      </div>
      <button type="button" className="page-arrow page-arrow-left" onClick={()=>goToPage(0)} disabled={activePage===0} aria-label="Show portfolio page">&lsaquo;</button>
      <button type="button" className="page-arrow page-arrow-right" onClick={()=>goToPage(1)} disabled={activePage===1} aria-label="Show notes and resources page">&rsaquo;</button>
      <div className="portfolio-slider" onTouchStart={startPageSwipe} onTouchEnd={endPageSwipe}>
        <div className="portfolio-slider-track" style={{"--active-page":activePage}}>
          <div className="portfolio-slide portfolio-slide-main">
            <main>
              <Hero profile={profile} />
              <About profile={profile} />
              <Skills skills={skills} />
              <Projects projects={filtered} search={search} setSearch={setSearch} />
              <Certificates certs={certs} />
              <Contact profile={profile} />
            </main>
            <Footer />
          </div>
          <div className="portfolio-slide portfolio-slide-notes">
            <Notes resources={resources} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPage() {
  const navigate=useNavigate();
  const {profile,setProfile,profileLoading}=useProfile();
  const {items:skills,loading:sl,fetch:fs}=useCollection("skills",defaultSkills);
  const {items:projects,loading:pl,fetch:fp}=useCollection("projects",defaultProjects);
  const {items:certs,loading:cl,fetch:fc}=useCollection("certificates",defaultCertificates);
  const {items:resources,loading:rl,fetch:fr}=useCollection("resources",defaultResources);
  const {items:msgs,loading:ml,fetch:fm}=useCollection("messages",[]);
  const {items:feedback,loading:fl,fetch:ff}=useCollection("feedback",[]);
  if(profileLoading||sl||pl||cl||rl||ml||fl) return <Loader />;
  return <AdminPanel projects={projects} fetchProjects={fp} certificates={certs} fetchCertificates={fc} resources={resources} fetchResources={fr} messages={msgs} fetchMessages={fm} feedback={feedback} fetchFeedback={ff} profile={profile} setProfile={setProfile} skills={skills} fetchSkills={fs} onClose={()=>navigate("/")} />;
}

/* ─── Loader ─── */
function Loader() {
  return (
    <div className="loader-screen">
      <div className="loader-cube" />
      <p className="loader-text">Loading portfolio…</p>
    </div>
  );
}

/* ─── Admin button (fixed) ─── */
function MaintenancePage() {
  const navigate = useNavigate();

  return (
    <div className="maintenance-screen">
      <div className="maintenance-card">
        <div className="repair-scene">
          <button className="repair-boy admin-repair-link" onClick={() => navigate("/admin")} aria-label="Open admin login">
            <span className="boy-head" />
            <span className="boy-body" />
            <span className="boy-arm" />
            <span className="boy-leg left" />
            <span className="boy-leg right" />
          </button>
          <div className="repair-car">
            <span className="car-cabin" />
            <span className="car-body" />
            <span className="car-hood" />
            <span className="car-wheel left" />
            <span className="car-wheel right" />
          </div>
          <span className="car-part wrench" />
          <span className="car-part bolt one" />
          <span className="car-part bolt two" />
          <span className="car-part tire" />
          <span className="car-part panel" />
        </div>
        <div className="maintenance-label">Maintenance Mode</div>
        <h1>Website maintenance error</h1>
        <p>This website is temporarily unavailable while maintenance is in progress.</p>
      </div>
    </div>
  );
}

function AdminBtn({onAdmin}) {
  return <button className="bo-admin" onClick={onAdmin}>Admin</button>;
}

/* ─── HERO ─── */
/* eslint-disable no-undef */
function Hero({profile}) {
  const roles = ["Java Developer","React Builder","Web Developer","MCA Student","Full-Stack Dev"];
  const typed = useTypewriter(roles);
  const showFeedbackModal = false;
  const stats = [
    {num:"3+",label:"Projects Built"},
    {num:"12+",label:"Skills Mastered"},
    {num:"4+",label:"Certificates"},
  ];
  return (
    <>
    <section id="home" className="hero-section">
      {/* animated bg orbs */}
      <div className="hero-orb orb1" />
      <div className="hero-orb orb2" />
      <div className="hero-orb orb3" />

      <div className="hero-inner">
        {/* left */}
        <div className="hero-left">
          <div className="hero-badge">
            <span className="badge-dot" />
            <span>Available for opportunities</span>
          </div>

          <h1 className="hero-name">
            Hi, I'm<br/>
            <span className="name-accent">{profile.name?.toUpperCase()}</span>
          </h1>

          <div className="hero-role-line">
            <span className="role-prefix">I'm a </span>
            <span className="role-typed">{typed}<span className="cursor">|</span></span>
          </div>

          <p className="hero-tagline">{profile.headline}</p>
          <p className="hero-about-mini">{profile.about}</p>

          <div className="hero-actions">
            <a className="cta-primary" href="#projects">View Projects</a>
            <a className="cta-secondary" href="#contact">Contact Me</a>
            <a className="cta-ghost" href={formatUrl(profile.resumeUrl)} target="_blank" rel="noreferrer">Resume ↗</a>
          </div>

          <div className="hero-stats">
            {stats.map(s=>(
              <div key={s.label} className="stat-item">
                <span className="stat-num">{s.num}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="hero-socials">
            <a href={formatUrl(profile.github)} target="_blank" rel="noreferrer" className="social-pill">GitHub</a>
            <a href={formatUrl(profile.linkedin)} target="_blank" rel="noreferrer" className="social-pill">LinkedIn</a>
            <a href={formatMailto(profile.email)} className="social-pill">Email</a>
            <a href={formatInstagramUrl(profile.instagram)} target="_blank" rel="noreferrer" className="social-pill">Instagram</a>
          </div>
        </div>

        {/* right - illustration */}
        <div className="hero-right">
          <div className="hero-card-frame">
            <div className="frame-grid-bg" />
            <div className="profile-circle">
              <img src="/images/ankit-p.png" alt="Ankit Kumar Gupta" className="profile-photo" onError={e=>e.target.style.display='none'} />
              <div className="profile-fallback">AK</div>
            </div>
            <div className="stamp-badge">MKY_2201</div>
            <div className="tech-tag t1">Java</div>
            <div className="tech-tag t2">React</div>
            <div className="tech-tag t3">Python</div>
            <div className="tech-tag t4">Django</div>
          </div>
        </div>
      </div>

      {/* floating cubes */}
      <span className="bo-cube one" />
      <span className="bo-cube two" />
      <span className="bo-cube three" />

      {/* scroll cue */}
      <a href="#about" className="scroll-cue">
        <span className="scroll-line" />
        <span className="scroll-label">Scroll</span>
      </a>
    </section>
    {showFeedbackModal && (
      <div className="rating-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rating-modal-title">
        <div className="rating-modal">
          <button className="rating-modal-close" onClick={closeFeedbackModal} aria-label="Close rating popup">×</button>
          <div className="section-label rating-modal-label">Quick Feedback</div>
          <h3 id="rating-modal-title" className="rating-modal-title">Rate this portfolio</h3>
          <p className="rating-modal-subtitle">Your rating and suggestion help me improve this page.</p>
          <input value={feedback.name} onChange={e=>setFeedbackField("name",e.target.value)} className="contact-input rating-name" placeholder="Your name (optional)" />
          <div className="rating-stars" aria-label="Portfolio rating">
            {[1,2,3,4,5].map(star=>(
              <button key={star} type="button" className={star<=feedback.rating?"active":""} onClick={()=>setFeedbackField("rating",star)} aria-label={`${star} star rating`}>
                ★
              </button>
            ))}
          </div>
          <textarea value={feedback.suggestion} onChange={e=>setFeedbackField("suggestion",e.target.value)} className="contact-input rating-textarea" placeholder="Write your suggestion..." />
          <button className="send-btn rating-send" onClick={sendFeedback} disabled={feedbackLoading}>
            {feedbackLoading ? <><span className="btn-spinner"/>Saving...</> : "Submit Rating"}
          </button>
          {feedbackStatus && <p className={`form-status ${feedbackStatus.startsWith("Thanks")?"success":"error"}`}>{feedbackStatus}</p>}
        </div>
      </div>
    )}
    </>
  );
}

/* ─── ABOUT ─── */
function About({profile}) {
  const showFeedbackModal = false;
  const cards = [
    {icon:"🎓",title:"Education",text:profile.education,color:"#b18025"},
    {icon:"⚙️",title:"Development",text:profile.development,color:"#31596b"},
    {icon:"🎯",title:"Goal",text:profile.goal,color:"#3d6b31"},
  ];
  return (
    <>
    <section id="about" className="section about-section">
      <div className="section-inner">
        <div className="section-label reveal-target">About Me</div>
        <h2 className="section-title reveal-target">Who I Am</h2>
        <p className="section-subtitle reveal-target">A quick view into my education, focus and career ambitions.</p>

        <div className="about-grid">
          {cards.map((c,i)=>(
            <div key={c.title} className={`about-card reveal-target`} style={{"--accent":c.color,"--delay":`${i*120}ms`}}>
              <div className="about-card-icon">{c.icon}</div>
              <h3 className="about-card-title">{c.title}</h3>
              <p className="about-card-text">{c.text}</p>
              <div className="about-card-bar" />
            </div>
          ))}
        </div>
      </div>
      <span className="bo-cube one" /><span className="bo-cube two" />
    </section>
    {showFeedbackModal && (
      <div className="rating-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rating-modal-title">
        <div className="rating-modal">
          <button className="rating-modal-close" onClick={closeFeedbackModal} aria-label="Close rating popup">×</button>
          <div className="section-label rating-modal-label">Quick Feedback</div>
          <h3 id="rating-modal-title" className="rating-modal-title">Rate this portfolio</h3>
          <p className="rating-modal-subtitle">Your rating and suggestion help me improve this page.</p>
          <input value={feedback.name} onChange={e=>setFeedbackField("name",e.target.value)} className="contact-input rating-name" placeholder="Your name (optional)" />
          <div className="rating-stars" aria-label="Portfolio rating">
            {[1,2,3,4,5].map(star=>(
              <button key={star} type="button" className={star<=feedback.rating?"active":""} onClick={()=>setFeedbackField("rating",star)} aria-label={`${star} star rating`}>
                ★
              </button>
            ))}
          </div>
          <textarea value={feedback.suggestion} onChange={e=>setFeedbackField("suggestion",e.target.value)} className="contact-input rating-textarea" placeholder="Write your suggestion..." />
          <button className="send-btn rating-send" onClick={sendFeedback} disabled={feedbackLoading}>
            {feedbackLoading ? <><span className="btn-spinner"/>Saving...</> : "Submit Rating"}
          </button>
          {feedbackStatus && <p className={`form-status ${feedbackStatus.startsWith("Thanks")?"success":"error"}`}>{feedbackStatus}</p>}
        </div>
      </div>
    )}
    </>
  );
}

/* ─── SKILLS ─── */
/* eslint-enable no-undef */
function Skills({skills}) {
  const categories=[...new Set(skills.map(s=>s.category||"Other"))];
  const featuredSkills = [
    ...skills.filter(s => /react/i.test(s.name || "")).map(s => s.name),
    ...skills.map(s => s.name),
  ].filter(Boolean).filter((name, index, arr) => arr.indexOf(name) === index).slice(0, 5);
  const categoryIcons = {Backend:"⚙️",Frontend:"🎨",Database:"🗄️",Tools:"🔧",Analytics:"📊",Other:"💡"};
  return (
    <section id="skills" className="section skills-section">
      <div className="section-inner">
        <div className="section-label reveal-target">My Stack</div>
        <h2 className="section-title reveal-target">Skills & Technologies</h2>
        <p className="section-subtitle reveal-target">Technology I work with, grouped by domain.</p>
        <SectionMascot mode="skills" items={featuredSkills} />

        <div className="skills-grid">
          {categories.map((cat,ci)=>(
            <div key={cat} className="skill-card reveal-target" style={{"--delay":`${ci*100}ms`}}>
              <div className="skill-card-header">
                <span className="skill-cat-icon">{categoryIcons[cat]||"💡"}</span>
                <h3 className="skill-cat-title">{cat}</h3>
              </div>
              <div className="skill-pills">
                {skills.filter(s=>(s.category||"Other")===cat).map(s=>(
                  <span key={s.id} className="skill-pill">{s.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="bo-cube one" /><span className="bo-cube two" />
    </section>
  );
}

/* ─── PROJECTS ─── */
function Projects({projects,search,setSearch}) {
  return (
    <section id="projects" className="section projects-section">
      <div className="section-inner">
        <div className="section-label reveal-target">Portfolio</div>
        <h2 className="section-title reveal-target">Projects</h2>
        <p className="section-subtitle reveal-target">Dashboard systems, e-commerce apps and full-stack academic projects.</p>
        <SectionMascot mode="projects" />

        <div className="search-wrap reveal-target">
          <span className="search-icon">🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title, tech, or description…" className="search-input" />
          {search && <button className="search-clear" onClick={()=>setSearch("")}>×</button>}
        </div>

        {projects.length===0
          ? <div className="no-results">No projects match "<strong>{search}</strong>"</div>
          : <div className="projects-grid">
              {projects.map((p,i)=>(
                <article key={p.id} className="project-card reveal-target" style={{"--delay":`${i*120}ms`}}>
                  <div className="project-img-wrap">
                    <img
                      src={p.image ? formatImageUrl(p.image) : DEFAULT_PROJECT_IMAGE}
                      alt={p.title}
                      className="project-img"
                      referrerPolicy="no-referrer"
                      onError={(e)=>{ if (e.currentTarget.src !== DEFAULT_PROJECT_IMAGE) e.currentTarget.src = DEFAULT_PROJECT_IMAGE; }}
                    />
                    <div className="project-img-overlay">
                      <a href={formatUrl(p.github)} target="_blank" rel="noreferrer" className="overlay-btn">Code ⌘</a>
                      <a href={formatUrl(p.demo)} target="_blank" rel="noreferrer" className="overlay-btn accent">Live ↗</a>
                    </div>
                  </div>
                  <div className="project-body">
                    <h3 className="project-title">{p.title}</h3>
                    <p className="project-desc">{p.description}</p>
                    {p.experience && <p className="project-experience"><span>Experience</span>{p.experience}</p>}
                    <div className="project-tech">
                      {p.tech.split(",").map(t=><span key={t} className="tech-badge">{t.trim()}</span>)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
        }
      </div>
      <span className="bo-cube one" /><span className="bo-cube two" />
    </section>
  );
}

/* ─── CERTIFICATES ─── */
/* NOTES */
function Notes({resources=defaultResources}) {
  const [active,setActive]=useState(0);
  const trackRef=useRef(null);
  const dragRef=useRef({down:false,startX:0,scrollLeft:0});

  const scrollToNote=(index)=>{
    const nextIndex=Math.max(0,Math.min(index,resources.length-1));
    const track=trackRef.current;
    const card=track?.children?.[nextIndex];
    setActive(nextIndex);
    if(card) card.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
  };
  const moveNote=(step)=>scrollToNote((active+step+resources.length)%resources.length);
  const updateActive=()=>{
    const track=trackRef.current;
    if(!track) return;
    const center=track.scrollLeft+(track.clientWidth/2);
    let closest=0;
    let distance=Infinity;
    Array.from(track.children).forEach((card,index)=>{
      const cardCenter=card.offsetLeft+(card.clientWidth/2);
      const diff=Math.abs(center-cardCenter);
      if(diff<distance){distance=diff;closest=index;}
    });
    setActive(closest);
  };
  const startDrag=(clientX)=>{
    const track=trackRef.current;
    if(!track) return;
    dragRef.current={down:true,startX:clientX,scrollLeft:track.scrollLeft};
    track.classList.add("is-dragging");
  };
  const dragMove=(clientX)=>{
    const track=trackRef.current;
    if(!track||!dragRef.current.down) return;
    track.scrollLeft=dragRef.current.scrollLeft-(clientX-dragRef.current.startX);
  };
  const endDrag=()=>{
    const track=trackRef.current;
    if(!track) return;
    dragRef.current.down=false;
    track.classList.remove("is-dragging");
    updateActive();
  };

  return (
    <section id="notes" className="section notes-section">
      <div className="section-inner">
        <div className="notes-header">
          <div>
            <div className="section-label reveal-target">Learning Resources</div>
            <h2 className="section-title reveal-target">Notes & Resources</h2>
            <p className="section-subtitle reveal-target">Swipe through my notes for AI/ML, Java, Power BI, STQA and web development.</p>
          </div>
          <div className="notes-controls reveal-target" aria-label="Notes carousel controls">
            <button type="button" className="note-nav-btn" onClick={()=>moveNote(-1)} aria-label="Previous note">&lsaquo;</button>
            <button type="button" className="note-nav-btn" onClick={()=>moveNote(1)} aria-label="Next note">&rsaquo;</button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="notes-track reveal-target"
          onScroll={updateActive}
          onMouseDown={e=>startDrag(e.clientX)}
          onMouseMove={e=>dragMove(e.clientX)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={e=>startDrag(e.touches[0].clientX)}
          onTouchMove={e=>dragMove(e.touches[0].clientX)}
          onTouchEnd={endDrag}
        >
          {resources.map((note,index)=>{
            const topics=Array.isArray(note.topics) ? note.topics : String(note.topics||"").split(",").map(topic=>topic.trim()).filter(Boolean);
            return (
            <article key={note.title} className="note-card" style={{"--note-accent":note.accent,"--delay":`${index*90}ms`}}>
              <div className="note-card-top">
                <span className="note-index">{String(index+1).padStart(2,"0")}</span>
                <span className="note-tag">{note.tag}</span>
              </div>
              <h3 className="note-title">{note.title}</h3>
              <p className="note-summary">{note.summary}</p>
              <div className="note-topic-list">
                {topics.map(topic=><span key={topic}>{topic}</span>)}
              </div>
              <a className="note-link" href={formatDownloadUrl(note.href)} target="_blank" rel="noreferrer" download>Download Notes</a>
            </article>
          )})}
        </div>

        <div className="notes-dots reveal-target" aria-label="Choose note">
          {resources.map((note,index)=>(
            <button
              key={note.title}
              type="button"
              className={index===active?"active":""}
              onClick={()=>scrollToNote(index)}
              aria-label={`Show ${note.title}`}
            />
          ))}
        </div>
      </div>
      <span className="bo-cube one" /><span className="bo-cube two" />
    </section>
  );
}

function SectionMascot({ mode, items=[] }) {
  const isSkills = mode === "skills";
  const boardItems = isSkills ? items : ["Code", "Live", "Search"];
  return (
    <div className={`guide-scene guide-${mode} reveal-target`}>
      <div className="guide-boy" aria-hidden="true">
        <div className="guide-hair" />
        <div className="guide-head">
          <span className="guide-eye left" />
          <span className="guide-eye right" />
          <span className="guide-smile" />
        </div>
        <div className="guide-body">
          <span className="guide-arm left" />
          <span className="guide-arm right" />
        </div>
        <span className="guide-leg left" />
        <span className="guide-leg right" />
      </div>
      <div className="guide-board">
        <div className="guide-board-title">{isSkills ? "Skill List" : "Project Actions"}</div>
        <div className="guide-board-items">
          {boardItems.map(item => <span key={item}>{item}</span>)}
        </div>
      </div>
    </div>
  );
}

function Certificates({certs}) {
  return (
    <section id="certificates" className="section certs-section">
      <div className="section-inner">
        <div className="section-label reveal-target">Achievements</div>
        <h2 className="section-title reveal-target">Certificates</h2>
        <p className="section-subtitle reveal-target">Certificates and achievements from learning programs and events.</p>

        <div className="certs-grid">
          {certs.map((c,i)=>(
            <div key={c.id} className="cert-card reveal-target" style={{"--delay":`${i*100}ms`}}>
              <div className="cert-img-wrap">
                {c.imageUrl
                  ? <img src={formatCertificateImageUrl(c.imageUrl)} alt={c.title} className="cert-img" referrerPolicy="no-referrer" />
                  : <div className="cert-placeholder"><span>🏆</span></div>
                }
              </div>
              <div className="cert-body">
                <h3 className="cert-title">{c.title}</h3>
                <p className="cert-provider">{c.provider}</p>
                {c.experience && <p className="cert-experience"><span>Experience</span>{c.experience}</p>}
                <span className="cert-date">{c.date}</span>
                {c.credentialUrl && c.credentialUrl!=="#" &&
                  <a href={formatUrl(c.credentialUrl)} target="_blank" rel="noreferrer" className="cert-link">View Credential ↗</a>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="bo-cube one" /><span className="bo-cube two" />
    </section>
  );
}

/* ─── CONTACT ─── */
function Contact({profile}) {
  const [form,setForm]=useState({name:"",email:"",message:""});
  const [feedback,setFeedback]=useState({name:"",email:"",rating:0,suggestion:""});
  const [status,setStatus]=useState("");
  const [feedbackStatus,setFeedbackStatus]=useState("");
  const [loading,setLoading]=useState(false);
  const [feedbackLoading,setFeedbackLoading]=useState(false);
  const [showFeedbackModal,setShowFeedbackModal]=useState(false);
  const set=(f,v)=>{
    setForm(p=>({...p,[f]:v}));
    if(f==="email" && isValidEmail(v)){
      setFeedback(p=>p.email.trim() ? p : {...p,email:v.trim()});
    }
  };
  const setFeedbackField=(f,v)=>setFeedback(p=>({...p,[f]:v}));
  useEffect(()=>{
    if(sessionStorage.getItem("portfolioFeedbackClosed")==="true"||localStorage.getItem("portfolioFeedbackSent")==="true") return;
    const timer=setTimeout(()=>setShowFeedbackModal(true),20000);
    return ()=>clearTimeout(timer);
  },[]);
  const closeFeedbackModal=()=>{
    sessionStorage.setItem("portfolioFeedbackClosed","true");
    setShowFeedbackModal(false);
  };
  const send=async()=>{
    if(!form.name.trim()||!form.email.trim()||!form.message.trim()){setStatus("⚠ Please fill all fields.");return;}
    if(!isValidEmail(form.email)){setStatus("Please enter a valid email.");return;}
    try {
      setLoading(true); setStatus("");
      await addDoc(collection(db,"messages"),{...form,email:form.email.trim(),status:"new",createdAt:serverTimestamp()});
      setForm({name:"",email:"",message:""}); setStatus("✓ Message sent successfully!");
    } catch { setStatus("✗ Failed to send. Try again."); } finally {
      setLoading(false); setTimeout(()=>setStatus(""),3500);
    }
  };
  const sendFeedback=async()=>{
    if(!feedback.rating){setFeedbackStatus("Please select a rating.");return;}
    if(!isValidEmail(feedback.email)){setFeedbackStatus("Please enter a valid email.");return;}
    if(!feedback.suggestion.trim()){setFeedbackStatus("Please write a suggestion.");return;}
    try {
      setFeedbackLoading(true); setFeedbackStatus("");
      await addDoc(collection(db,"feedback"),{
        name:feedback.name.trim(),
        email:feedback.email.trim(),
        rating:Number(feedback.rating),
        suggestion:feedback.suggestion.trim(),
        status:"new",
        createdAt:serverTimestamp()
      });
      setFeedback({name:"",email:"",rating:0,suggestion:""}); setFeedbackStatus("Thanks for your feedback!");
      localStorage.setItem("portfolioFeedbackSent","true");
      setTimeout(()=>setShowFeedbackModal(false),900);
    } catch { setFeedbackStatus("Failed to send feedback. Try again."); } finally {
      setFeedbackLoading(false); setTimeout(()=>setFeedbackStatus(""),3500);
    }
  };
  const links=[
    {label:"LinkedIn",href:formatUrl(profile.linkedin)},
    {label:"GitHub",href:formatUrl(profile.github)},
    {label:"Instagram",href:formatInstagramUrl(profile.instagram)},
    {label:"Email",href:formatMailto(profile.email)},
  ];
  return (
    <>
    <section id="contact" className="section contact-section">
      <div className="section-inner">
        <div className="section-label reveal-target">Get In Touch</div>
        <h2 className="section-title reveal-target">Message Me</h2>
        <p className="section-subtitle reveal-target">Open to collaborations, internships, and interesting discussions.</p>

        <div className="contact-grid">
          <div className="contact-form-wrap reveal-target">
            <div className="form-field">
              <label>Name</label>
              <input value={form.name} onChange={e=>set("name",e.target.value)} className="contact-input" placeholder="Your name" />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input value={form.email} onChange={e=>set("email",e.target.value)} className="contact-input" placeholder="your@email.com" />
            </div>
            <div className="form-field">
              <label>Message</label>
              <textarea value={form.message} onChange={e=>set("message",e.target.value)} className="contact-input contact-textarea" placeholder="What's on your mind?" />
            </div>
            <button className="send-btn" onClick={send} disabled={loading}>
              {loading ? <><span className="btn-spinner"/>Sending…</> : "Send Message →"}
            </button>
            {status && <p className={`form-status ${status.startsWith("✓")?"success":"error"}`}>{status}</p>}
          </div>

          <div className="contact-info-wrap reveal-target">
            <div className="info-card">
              <h3 className="info-card-title">Find me on</h3>
              <div className="contact-links">
                {links.map(l=>(
                  <a key={l.label} href={l.href} target={l.href.startsWith("mailto")?"_self":"_blank"} rel="noreferrer" className="contact-link-btn">{l.label} ↗</a>
                ))}
              </div>
            </div>
            <div className="map-card">
              <div className="map-pin">📍</div>
              <p className="map-label">Based in India</p>
              <p className="map-sub">Open to remote & hybrid work</p>
            </div>
            <div className="rating-card">
              <h3 className="info-card-title">Rate this portfolio</h3>
              <input value={feedback.name} onChange={e=>setFeedbackField("name",e.target.value)} className="contact-input rating-name" placeholder="Your name (optional)" />
              <input type="email" value={feedback.email} onChange={e=>setFeedbackField("email",e.target.value)} className="contact-input rating-name" placeholder="Your email" autoComplete="email" />
              <div className="rating-stars" aria-label="Portfolio rating">
                {[1,2,3,4,5].map(star=>(
                  <button key={star} type="button" className={star<=feedback.rating?"active":""} onClick={()=>setFeedbackField("rating",star)} aria-label={`${star} star rating`}>
                    ★
                  </button>
                ))}
              </div>
              <textarea value={feedback.suggestion} onChange={e=>setFeedbackField("suggestion",e.target.value)} className="contact-input rating-textarea" placeholder="Write your suggestion..." />
              <button className="send-btn rating-send" onClick={sendFeedback} disabled={feedbackLoading}>
                {feedbackLoading ? <><span className="btn-spinner"/>Saving...</> : "Submit Rating"}
              </button>
              {feedbackStatus && <p className={`form-status ${feedbackStatus.startsWith("Thanks")?"success":"error"}`}>{feedbackStatus}</p>}
            </div>
          </div>
        </div>
      </div>
      <span className="bo-cube one" /><span className="bo-cube two" />
    </section>
    {showFeedbackModal && (
      <div className="rating-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rating-modal-title">
        <div className="rating-modal">
          <button className="rating-modal-close" onClick={closeFeedbackModal} aria-label="Close rating popup">×</button>
          <div className="section-label rating-modal-label">Quick Feedback</div>
          <h3 id="rating-modal-title" className="rating-modal-title">Rate this portfolio</h3>
          <p className="rating-modal-subtitle">Your rating and suggestion help me improve this page.</p>
          <input value={feedback.name} onChange={e=>setFeedbackField("name",e.target.value)} className="contact-input rating-name" placeholder="Your name (optional)" />
          <input type="email" value={feedback.email} onChange={e=>setFeedbackField("email",e.target.value)} className="contact-input rating-name" placeholder="Your email" autoComplete="email" />
          <div className="rating-stars" aria-label="Portfolio rating">
            {[1,2,3,4,5].map(star=>(
              <button key={star} type="button" className={star<=feedback.rating?"active":""} onClick={()=>setFeedbackField("rating",star)} aria-label={`${star} star rating`}>
                ★
              </button>
            ))}
          </div>
          <textarea value={feedback.suggestion} onChange={e=>setFeedbackField("suggestion",e.target.value)} className="contact-input rating-textarea" placeholder="Write your suggestion..." />
          <button className="send-btn rating-send" onClick={sendFeedback} disabled={feedbackLoading}>
            {feedbackLoading ? <><span className="btn-spinner"/>Saving...</> : "Submit Rating"}
          </button>
          {feedbackStatus && <p className={`form-status ${feedbackStatus.startsWith("Thanks")?"success":"error"}`}>{feedbackStatus}</p>}
        </div>
      </div>
    )}
    </>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer className="bo-footer">
      <div className="footer-inner">
        <div className="footer-brand">ANKIT<span>.DEV</span></div>
        <p className="footer-copy">© 2026 Ankit Kumar Gupta • Built with React & Firebase</p>
        <p className="footer-sub">Inspired by BlackOrange retro developer portfolio design</p>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════
   ADMIN PANEL (unchanged logic, new theme)
   ════════════════════════════════════════ */
function AdminPanel({projects,fetchProjects,certificates,fetchCertificates,resources,fetchResources,messages,fetchMessages,feedback,fetchFeedback,profile,setProfile,skills,fetchSkills,onClose}) {
  const emptyProject={title:"",description:"",experience:"",tech:"",github:"",demo:"",image:""};
  const emptyCert={title:"",provider:"",date:"",experience:"",imageUrl:"",credentialUrl:""};
  const emptyResource={title:"",tag:"",summary:"",topics:"",accent:"#4a9aa5",href:""};

  const [isLoggedIn,setIsLoggedIn]=useState(false);
  const [authLoading,setAuthLoading]=useState(true);
  const [loginData,setLoginData]=useState({email:"",password:""});
  const [loginError,setLoginError]=useState("");

  const [form,setForm]=useState(emptyProject);
  const [editingId,setEditingId]=useState(null);
  const [projectMsg,setProjectMsg]=useState("");

  const [certForm,setCertForm]=useState(emptyCert);
  const [editingCertId,setEditingCertId]=useState(null);
  const [certMsg,setCertMsg]=useState("");

  const [resourceForm,setResourceForm]=useState(emptyResource);
  const [editingResourceId,setEditingResourceId]=useState(null);
  const [resourceMsg,setResourceMsg]=useState("");

  const [profileForm,setProfileForm]=useState(profile);
  const [profileMsg,setProfileMsg]=useState("");

  const [skillForm,setSkillForm]=useState({name:"",category:""});
  const [editingSkillId,setEditingSkillId]=useState(null);
  const [skillMsg,setSkillMsg]=useState("");

  const [msgStatus,setMsgStatus]=useState("");
  const [feedbackAdminStatus,setFeedbackAdminStatus]=useState("");
  const [tab,setTab]=useState("profile");

  const tabs=[{id:"profile",label:"Profile",icon:"👤"},{id:"skills",label:"Skills",icon:"💻"},{id:"projects",label:"Projects",icon:"💼"},{id:"resources",label:"Resources",icon:"📚"},{id:"certificates",label:"Certificates",icon:"🏆"},{id:"messages",label:"Messages",icon:"💬"},{id:"feedback",label:"Feedback",icon:"★"}];

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,u=>{setIsLoggedIn(!!u);setAuthLoading(false);});
    return unsub;
  },[]);

  const login=async()=>{
    try{setLoginError("");await signInWithEmailAndPassword(auth,loginData.email.trim(),loginData.password.trim());}
    catch{setLoginError("Invalid email or password.");}
  };
  const logout=async()=>{try{await signOut(auth);setLoginData({email:"",password:""});onClose();}catch{/* ignore logout failures */}};

  const flash=(setter,msg)=>{setter(msg);setTimeout(()=>setter(""),2800);};

  const reorderItems=async(collectionName,items,index,direction,fetchItems,setter,label,defaultIds)=>{
    const nextIndex=index+direction;
    if(nextIndex<0||nextIndex>=items.length) return;
    if(items.some(item=>defaultIds.includes(String(item.id)))){
      flash(setter,`Default ${label} order cannot be saved. Add your own ${label} first.`);
      return;
    }
    const reordered=[...items];
    [reordered[index],reordered[nextIndex]]=[reordered[nextIndex],reordered[index]];
    try{
      const batch=writeBatch(db);
      reordered.forEach((item,order)=>{
        batch.update(doc(db,collectionName,item.id),{order,updatedAt:serverTimestamp()});
      });
      await batch.commit();
      await fetchItems();
      flash(setter,"✓ Order updated.");
    }catch{
      flash(setter,"✗ Failed to update order.");
    }
  };

  const saveProfile=async()=>{
    try{await setDoc(doc(db,"profile","main"),{...profileForm,updatedAt:serverTimestamp()},{merge:true});setProfile(profileForm);flash(setProfileMsg,"✓ Profile saved.");}
    catch{flash(setProfileMsg,"✗ Failed to save.");}
  };

  const toggleMaintenance=async()=>{
    const nextMode=!profileForm.maintenanceMode;
    try{
      await setDoc(doc(db,"profile","main"),{maintenanceMode:nextMode,updatedAt:serverTimestamp()},{merge:true});
      setProfileForm(p=>({...p,maintenanceMode:nextMode}));
      setProfile({...profileForm,maintenanceMode:nextMode});
      flash(setProfileMsg,nextMode?"Maintenance mode enabled.":"Maintenance mode disabled.");
    }catch{
      flash(setProfileMsg,"Failed to update maintenance mode.");
    }
  };

  const saveSkill=async()=>{
    if(!skillForm.name.trim()||!skillForm.category.trim()){flash(setSkillMsg,"Fill name and category.");return;}
    try{
      if(editingSkillId) await updateDoc(doc(db,"skills",editingSkillId),{...skillForm,updatedAt:serverTimestamp()});
      else await addDoc(collection(db,"skills"),{...skillForm,order:skills.length,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      setSkillForm({name:"",category:""});setEditingSkillId(null);await fetchSkills();flash(setSkillMsg,"✓ Skill saved.");
    }catch{flash(setSkillMsg,"✗ Failed.");}
  };

  const deleteSkill=async(id)=>{
    if(!window.confirm("Delete this skill?")) return;
    if(String(id).startsWith("d")){flash(setSkillMsg,"Cannot delete default skills.");return;}
    try{await deleteDoc(doc(db,"skills",id));await fetchSkills();flash(setSkillMsg,"✓ Deleted.");}catch{flash(setSkillMsg,"✗ Failed.");}
  };

  const saveProject=async()=>{
    if(!form.title.trim()||!form.description.trim()||!form.tech.trim()){flash(setProjectMsg,"Fill title, description and tech.");return;}
    try{
      const data={...form,github:form.github||"#",demo:form.demo||"#",image:form.image||DEFAULT_PROJECT_IMAGE};
      if(editingId) await updateDoc(doc(db,"projects",editingId),{...data,updatedAt:serverTimestamp()});
      else await addDoc(collection(db,"projects"),{...data,order:projects.length,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      setForm(emptyProject);setEditingId(null);await fetchProjects();flash(setProjectMsg,"✓ Project saved.");
    }catch{flash(setProjectMsg,"✗ Failed.");}
  };
  const editProject=(p)=>{if(String(p.id).startsWith("dp")){flash(setProjectMsg,"Cannot edit default.");return;}setEditingId(p.id);setForm({title:p.title||"",description:p.description||"",experience:p.experience||"",tech:p.tech||"",github:p.github||"",demo:p.demo||"",image:p.image||""});};
  const deleteProject=async(id)=>{
    if(!window.confirm("Delete?")) return;
    if(String(id).startsWith("dp")){flash(setProjectMsg,"Cannot delete default.");return;}
    try{await deleteDoc(doc(db,"projects",id));await fetchProjects();flash(setProjectMsg,"✓ Deleted.");}catch{flash(setProjectMsg,"✗ Failed.");}
  };

  const saveCert=async()=>{
    if(!certForm.title.trim()){flash(setCertMsg,"Fill certificate title.");return;}
    try{
      if(editingCertId) await updateDoc(doc(db,"certificates",editingCertId),{...certForm,updatedAt:serverTimestamp()});
      else await addDoc(collection(db,"certificates"),{...certForm,order:certificates.length,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      setCertForm(emptyCert);setEditingCertId(null);await fetchCertificates();flash(setCertMsg,"✓ Saved.");
    }catch{flash(setCertMsg,"✗ Failed.");}
  };
  const editCert=(c)=>{if(String(c.id).startsWith("dc")){flash(setCertMsg,"Cannot edit default.");return;}setEditingCertId(c.id);setCertForm({title:c.title||"",provider:c.provider||"",date:c.date||"",experience:c.experience||"",imageUrl:c.imageUrl||"",credentialUrl:c.credentialUrl||""});};
  const deleteCert=async(id)=>{
    if(!window.confirm("Delete?")) return;
    if(String(id).startsWith("dc")){flash(setCertMsg,"Cannot delete default.");return;}
    try{await deleteDoc(doc(db,"certificates",id));await fetchCertificates();flash(setCertMsg,"✓ Deleted.");}catch{flash(setCertMsg,"✗ Failed.");}
  };

  const saveResource=async()=>{
    if(!resourceForm.title.trim()||!resourceForm.summary.trim()){flash(setResourceMsg,"Fill title and summary.");return;}
    try{
      const data={
        ...resourceForm,
        tag:resourceForm.tag||"Resource",
        href:resourceForm.href||"#",
        accent:resourceForm.accent||"#4a9aa5",
        topics:String(resourceForm.topics||"").split(",").map(topic=>topic.trim()).filter(Boolean),
      };
      if(editingResourceId) await updateDoc(doc(db,"resources",editingResourceId),{...data,updatedAt:serverTimestamp()});
      else await addDoc(collection(db,"resources"),{...data,order:resources.length,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      setResourceForm(emptyResource);setEditingResourceId(null);await fetchResources();flash(setResourceMsg,"✓ Resource saved.");
    }catch{flash(setResourceMsg,"✗ Failed.");}
  };
  const editResource=(r)=>{
    if(String(r.id).startsWith("dr")){flash(setResourceMsg,"Cannot edit default resources.");return;}
    setEditingResourceId(r.id);
    setResourceForm({
      title:r.title||"",
      tag:r.tag||"",
      summary:r.summary||"",
      topics:Array.isArray(r.topics)?r.topics.join(", "):(r.topics||""),
      accent:r.accent||"#4a9aa5",
      href:r.href||"",
    });
  };
  const deleteResource=async(id)=>{
    if(!window.confirm("Delete this resource?")) return;
    if(String(id).startsWith("dr")){flash(setResourceMsg,"Cannot delete default resources.");return;}
    try{await deleteDoc(doc(db,"resources",id));await fetchResources();flash(setResourceMsg,"✓ Deleted.");}catch{flash(setResourceMsg,"✗ Failed.");}
  };

  const markRead=async(id)=>{try{await updateDoc(doc(db,"messages",id),{status:"read",updatedAt:serverTimestamp()});await fetchMessages();flash(setMsgStatus,"✓ Marked as read.");}catch{flash(setMsgStatus,"✗ Failed.");}};
  const deleteMsg=async(id)=>{if(!window.confirm("Delete message?")) return;try{await deleteDoc(doc(db,"messages",id));await fetchMessages();flash(setMsgStatus,"✓ Deleted.");}catch{flash(setMsgStatus,"✗ Failed.");}};
  const fmtDate=(ts)=>ts?.toDate?ts.toDate().toLocaleString():"—";

  const markFeedbackRead=async(id)=>{try{await updateDoc(doc(db,"feedback",id),{status:"read",updatedAt:serverTimestamp()});await fetchFeedback();flash(setFeedbackAdminStatus,"✓ Marked as read.");}catch{flash(setFeedbackAdminStatus,"✗ Failed.");}};
  const deleteFeedback=async(id)=>{if(!window.confirm("Delete feedback?")) return;try{await deleteDoc(doc(db,"feedback",id));await fetchFeedback();flash(setFeedbackAdminStatus,"✓ Deleted.");}catch{flash(setFeedbackAdminStatus,"✗ Failed.");}};
  const avgRating=feedback.length ? (feedback.reduce((sum,item)=>sum+Number(item.rating||0),0)/feedback.length).toFixed(1) : "0.0";

  if(authLoading) return <div className="admin-shell"><div className="admin-card"><p style={{color:"#324152"}}>Checking auth…</p></div></div>;

  if(!isLoggedIn) return (
    <div className="admin-shell">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h2>Admin Login</h2>
          <button className="admin-x-btn" onClick={onClose}><X /></button>
        </div>
        <p className="admin-hint">Login with your Firebase Authentication account.</p>
        <div className="admin-form-group">
          <input type="email" value={loginData.email} onChange={e=>setLoginData({...loginData,email:e.target.value})} placeholder="Admin Email" className="admin-input" />
        </div>
        <div className="admin-form-group">
          <input type="password" value={loginData.password} onChange={e=>setLoginData({...loginData,password:e.target.value})} placeholder="Admin Password" className="admin-input" onKeyDown={e=>e.key==="Enter"&&login()} />
        </div>
        {loginError && <p className="admin-error">{loginError}</p>}
        <button className="admin-login-btn" onClick={login}>Login →</button>
      </div>
    </div>
  );

  return (
    <div className="admin-shell">
      <div className="admin-dashboard">
        {/* header */}
        <div className="admin-header">
          <div>
            <h2 className="admin-title">Admin Dashboard</h2>
            <p className="admin-subtitle">Manage profile, skills, projects and certificates.</p>
            <button className="admin-logout-btn" onClick={logout}>Logout</button>
          </div>
          <button className="admin-x-btn" onClick={onClose}><X /></button>
        </div>

        {/* tabs */}
        <div className="admin-tabs">
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} className={`admin-tab ${tab===t.id?"active":""}`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* profile */}
        {tab==="profile" && (
          <div className="admin-panel-box">
            <h3 className="panel-title">Manage Profile</h3>
            <div className={`maintenance-toggle-card ${profileForm.maintenanceMode?"active":""}`}>
              <div>
                <p className="maintenance-toggle-title">Website Maintenance</p>
                <p className="maintenance-toggle-copy">
                  {profileForm.maintenanceMode
                    ? "Visitors currently see only the maintenance error message."
                    : "Visitors can currently see the full portfolio website."}
                </p>
              </div>
              <button className="maintenance-toggle-btn" onClick={toggleMaintenance}>
                {profileForm.maintenanceMode ? "Turn Off Maintenance" : "Turn On Maintenance"}
              </button>
            </div>
            <div className="admin-grid-2">
              {[["name","Name"],["title","Title"],["headline","Headline"],["email","Email"],["github","GitHub URL"],["linkedin","LinkedIn URL"],["instagram","Instagram"],["resumeUrl","Resume URL"]].map(([k,ph])=>(
                <input key={k} value={profileForm[k]||""} onChange={e=>setProfileForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} className="admin-input" />
              ))}
            </div>
            <textarea value={profileForm.about||""} onChange={e=>setProfileForm(p=>({...p,about:e.target.value}))} placeholder="About" className="admin-input admin-textarea" />
            <div className="admin-grid-3">
              {[["education","Education"],["development","Development"],["goal","Goal"]].map(([k,ph])=>(
                <textarea key={k} value={profileForm[k]||""} onChange={e=>setProfileForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} className="admin-input admin-textarea-sm" />
              ))}
            </div>
            <div className="panel-footer">
              <button className="panel-save-btn" onClick={saveProfile}><Save /> Save Profile</button>
              {profileMsg && <span className="panel-msg">{profileMsg}</span>}
            </div>
          </div>
        )}

        {/* skills */}
        {tab==="skills" && (
          <div className="admin-panel-box">
            <h3 className="panel-title">Manage Skills</h3>
            <div className="admin-grid-2">
              <input value={skillForm.name} onChange={e=>setSkillForm(p=>({...p,name:e.target.value}))} placeholder="Skill name, e.g. React JS" className="admin-input" />
              <input value={skillForm.category} onChange={e=>setSkillForm(p=>({...p,category:e.target.value}))} placeholder="Category, e.g. Frontend" className="admin-input" />
            </div>
            <div className="panel-footer">
              <button className="panel-save-btn" onClick={saveSkill}><Save /> {editingSkillId?"Update":"Add"} Skill</button>
              {editingSkillId && <button className="panel-cancel-btn" onClick={()=>{setEditingSkillId(null);setSkillForm({name:"",category:""});}}>Cancel</button>}
              {skillMsg && <span className="panel-msg">{skillMsg}</span>}
            </div>
            <div className="admin-items-grid">
              {skills.map((s,i)=>(
                <div key={s.id} className="admin-item-card">
                  <div className="item-name">{s.name}</div>
                  <div className="item-sub">{s.category}</div>
                  <div className="item-actions">
                    <button className="item-move" disabled={i===0} onClick={()=>reorderItems("skills",skills,i,-1,fetchSkills,setSkillMsg,"skills",defaultSkills.map(item=>item.id))}>Up</button>
                    <button className="item-move" disabled={i===skills.length-1} onClick={()=>reorderItems("skills",skills,i,1,fetchSkills,setSkillMsg,"skills",defaultSkills.map(item=>item.id))}>Down</button>
                    <button className="item-edit" onClick={()=>{setEditingSkillId(s.id);setSkillForm({name:s.name,category:s.category});}}>Edit</button>
                    <button className="item-delete" onClick={()=>deleteSkill(s.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* projects */}
        {tab==="projects" && (
          <>
          <div className="admin-panel-box">
            <h3 className="panel-title">{editingId?"Edit":"Add"} Project</h3>
            <div className="admin-form-stack">
              {[["title","Project title"],["tech","Technology used"],["github","GitHub link"],["demo","Live demo link"],["image","Image URL"]].map(([k,ph])=>(
                <input key={k} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} className="admin-input" />
              ))}
              <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Project description" className="admin-input admin-textarea" />
              <textarea value={form.experience} onChange={e=>setForm(p=>({...p,experience:e.target.value}))} placeholder="Write experience for this project" className="admin-input admin-textarea" />
            </div>
            <div className="panel-footer">
              <button className="panel-save-btn" onClick={saveProject}><Save /> {editingId?"Update":"Save"} Project</button>
              {editingId && <button className="panel-cancel-btn" onClick={()=>{setEditingId(null);setForm(emptyProject);}}>Cancel</button>}
              {projectMsg && <span className="panel-msg">{projectMsg}</span>}
            </div>
          </div>
          <div className="admin-panel-box" style={{marginTop:"20px"}}>
            <h3 className="panel-title">All Projects</h3>
            <div className="admin-items-grid">
              {projects.map((p,i)=>(
                <div key={p.id} className="admin-item-card">
                  <div className="item-name">{p.title}</div>
                  <div className="item-sub">{p.tech}</div>
                  <div className="item-actions">
                    <button className="item-move" disabled={i===0} onClick={()=>reorderItems("projects",projects,i,-1,fetchProjects,setProjectMsg,"projects",defaultProjects.map(item=>item.id))}>Up</button>
                    <button className="item-move" disabled={i===projects.length-1} onClick={()=>reorderItems("projects",projects,i,1,fetchProjects,setProjectMsg,"projects",defaultProjects.map(item=>item.id))}>Down</button>
                    <button className="item-edit" onClick={()=>editProject(p)}><Pencil /> Edit</button>
                    <button className="item-delete" onClick={()=>deleteProject(p.id)}><Trash2 /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}

        {/* resources */}
        {tab==="resources" && (
          <>
          <div className="admin-panel-box">
            <h3 className="panel-title">{editingResourceId?"Edit":"Add"} Resource / Note</h3>
            <div className="admin-form-stack">
              <div className="admin-grid-3">
                <input value={resourceForm.title} onChange={e=>setResourceForm(p=>({...p,title:e.target.value}))} placeholder="Title, e.g. AI/ML Notes" className="admin-input" />
                <input value={resourceForm.tag} onChange={e=>setResourceForm(p=>({...p,tag:e.target.value}))} placeholder="Tag, e.g. Intelligence" className="admin-input" />
                <input type="color" value={resourceForm.accent} onChange={e=>setResourceForm(p=>({...p,accent:e.target.value}))} className="admin-input admin-color-input" aria-label="Resource accent color" />
              </div>
              <input value={resourceForm.href} onChange={e=>setResourceForm(p=>({...p,href:e.target.value}))} placeholder="Resource link / Google Drive / notes URL" className="admin-input" />
              <textarea value={resourceForm.summary} onChange={e=>setResourceForm(p=>({...p,summary:e.target.value}))} placeholder="Short summary for this resource" className="admin-input admin-textarea" />
              <input value={resourceForm.topics} onChange={e=>setResourceForm(p=>({...p,topics:e.target.value}))} placeholder="Topics separated by commas, e.g. OOP, JDBC, Servlet/JSP" className="admin-input" />
            </div>
            <div className="panel-footer">
              <button className="panel-save-btn" onClick={saveResource}><Save /> {editingResourceId?"Update":"Save"} Resource</button>
              {editingResourceId && <button className="panel-cancel-btn" onClick={()=>{setEditingResourceId(null);setResourceForm(emptyResource);}}>Cancel</button>}
              {resourceMsg && <span className="panel-msg">{resourceMsg}</span>}
            </div>
          </div>
          <div className="admin-panel-box" style={{marginTop:"20px"}}>
            <h3 className="panel-title">All Notes & Resources</h3>
            <div className="admin-items-grid">
              {resources.map((r,i)=>(
                <div key={r.id} className="admin-item-card">
                  <div className="item-name">{r.title}</div>
                  <div className="item-sub">{r.tag} • {(Array.isArray(r.topics)?r.topics.join(", "):r.topics)||"No topics"}</div>
                  <div className="item-actions">
                    <button className="item-move" disabled={i===0} onClick={()=>reorderItems("resources",resources,i,-1,fetchResources,setResourceMsg,"resources",defaultResources.map(item=>item.id))}>Up</button>
                    <button className="item-move" disabled={i===resources.length-1} onClick={()=>reorderItems("resources",resources,i,1,fetchResources,setResourceMsg,"resources",defaultResources.map(item=>item.id))}>Down</button>
                    <button className="item-edit" onClick={()=>editResource(r)}><Pencil /> Edit</button>
                    <button className="item-delete" onClick={()=>deleteResource(r.id)}><Trash2 /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}

        {/* certificates */}
        {tab==="certificates" && (
          <>
          <div className="admin-panel-box">
            <h3 className="panel-title">{editingCertId?"Edit":"Add"} Certificate</h3>
            <div className="admin-form-stack">
              {[["title","Certificate title"],["provider","Provider / Organization"],["date","Date, e.g. 2026"],["imageUrl","Image URL or Google Drive link"],["credentialUrl","Credential URL"]].map(([k,ph])=>(
                <input key={k} value={certForm[k]} onChange={e=>setCertForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} className="admin-input" />
              ))}
              <textarea value={certForm.experience} onChange={e=>setCertForm(p=>({...p,experience:e.target.value}))} placeholder="Write experience for this certificate" className="admin-input admin-textarea" />
            </div>
            <div className="panel-footer">
              <button className="panel-save-btn" onClick={saveCert}><Save /> {editingCertId?"Update":"Save"} Certificate</button>
              {editingCertId && <button className="panel-cancel-btn" onClick={()=>{setEditingCertId(null);setCertForm(emptyCert);}}>Cancel</button>}
              {certMsg && <span className="panel-msg">{certMsg}</span>}
            </div>
          </div>
          <div className="admin-panel-box" style={{marginTop:"20px"}}>
            <h3 className="panel-title">All Certificates</h3>
            <div className="admin-items-grid">
              {certificates.map((c,i)=>(
                <div key={c.id} className="admin-item-card">
                  <div className="item-name">{c.title}</div>
                  <div className="item-sub">{c.provider} • {c.date}</div>
                  <div className="item-actions">
                    <button className="item-move" disabled={i===0} onClick={()=>reorderItems("certificates",certificates,i,-1,fetchCertificates,setCertMsg,"certificates",defaultCertificates.map(item=>item.id))}>Up</button>
                    <button className="item-move" disabled={i===certificates.length-1} onClick={()=>reorderItems("certificates",certificates,i,1,fetchCertificates,setCertMsg,"certificates",defaultCertificates.map(item=>item.id))}>Down</button>
                    <button className="item-edit" onClick={()=>editCert(c)}><Pencil /> Edit</button>
                    <button className="item-delete" onClick={()=>deleteCert(c.id)}><Trash2 /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}

        {/* messages */}
        {tab==="messages" && (
          <div className="admin-panel-box">
            <div className="panel-footer" style={{marginBottom:"16px"}}>
              <h3 className="panel-title" style={{margin:0}}>Contact Messages</h3>
              <button className="panel-cancel-btn" onClick={fetchMessages}>Refresh</button>
              {msgStatus && <span className="panel-msg">{msgStatus}</span>}
            </div>
            {messages.length===0
              ? <p style={{color:"#324152",padding:"20px"}}>No messages yet.</p>
              : <div className="msg-grid">
                  {messages.map(m=>(
                    <div key={m.id} className="msg-card">
                      <div className="msg-header">
                        <div>
                          <div className="msg-name">{m.name}</div>
                          <a href={formatMailto(m.email)} className="msg-email">{m.email}</a>
                        </div>
                        <span className={`msg-badge ${m.status==="read"?"read":"new"}`}>{m.status||"new"}</span>
                      </div>
                      <p className="msg-text"><LinkifiedText text={m.message} /></p>
                      <p className="msg-date">{fmtDate(m.createdAt)}</p>
                      <div className="item-actions">
                        <button className="item-edit" onClick={()=>markRead(m.id)}>Mark Read</button>
                        <a href={formatMailto(m.email)} className="item-edit" style={{textDecoration:"none",display:"inline-flex",alignItems:"center"}}>Reply</a>
                        <button className="item-delete" onClick={()=>deleteMsg(m.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* feedback */}
        {tab==="feedback" && (
          <div className="admin-panel-box">
            <div className="panel-footer" style={{marginBottom:"16px"}}>
              <h3 className="panel-title" style={{margin:0}}>Page Feedback</h3>
              <span className="feedback-summary">Average {avgRating}/5 from {feedback.length} rating{feedback.length===1?"":"s"}</span>
              <button className="panel-cancel-btn" onClick={fetchFeedback}>Refresh</button>
              {feedbackAdminStatus && <span className="panel-msg">{feedbackAdminStatus}</span>}
            </div>
            {feedback.length===0
              ? <p style={{color:"#324152",padding:"20px"}}>No ratings yet.</p>
              : <div className="msg-grid">
                  {feedback.map(item=>(
                    <div key={item.id} className="msg-card">
                      <div className="msg-header">
                        <div>
                          <div className="msg-name">{item.name?.trim()||"Anonymous visitor"}</div>
                          {item.email && <a href={formatMailto(item.email)} className="msg-email">{item.email}</a>}
                          <div className="feedback-stars">{"★".repeat(Number(item.rating||0))}{"☆".repeat(5-Number(item.rating||0))}</div>
                        </div>
                        <span className={`msg-badge ${item.status==="read"?"read":"new"}`}>{item.status||"new"}</span>
                      </div>
                      <p className="msg-text"><LinkifiedText text={item.suggestion} /></p>
                      <p className="msg-date">{fmtDate(item.createdAt)}</p>
                      <div className="item-actions">
                        <button className="item-edit" onClick={()=>markFeedbackRead(item.id)}>Mark Read</button>
                        {item.email && <a href={formatMailto(item.email)} className="item-edit" style={{textDecoration:"none",display:"inline-flex",alignItems:"center"}}>Reply</a>}
                        <button className="item-delete" onClick={()=>deleteFeedback(item.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}
