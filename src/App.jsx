import React, { useEffect, useMemo, useState, useRef } from "react";
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
  query,
  orderBy,
} from "firebase/firestore";

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
function formatMailto(e) { const c = (e||"").trim(); return c ? `mailto:${c}` : "#"; }
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
  {id:"dp1",title:"MCA Alumni Connect",description:"A role-based alumni portal with student, alumni and admin dashboards, notifications and job post management.",tech:"Django, MongoDB Atlas, HTML, CSS, JavaScript",github:"#",demo:"https://mca-alumni-connect.onrender.com",image:"https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop"},
  {id:"dp2",title:"Smart E-Driving Licence System",description:"A web system for learning licence, DL application, document verification, slot booking, exam and QR-based licence validation.",tech:"Java Servlet, JSP, MySQL, Tomcat",github:"#",demo:"#",image:"https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1200&auto=format&fit=crop"},
  {id:"dp3",title:"Gud-Madhur AI",description:"A jaggery e-commerce platform with product listing, cart, orders, payments and an AI FAQ chatbot.",tech:"Servlet, JSP, MySQL, JavaScript",github:"#",demo:"#",image:"https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=1200&auto=format&fit=crop"},
];
const defaultCertificates = [
  {id:"dc1",title:"Generative AI 101",provider:"Learning Program",date:"2026",imageUrl:"",credentialUrl:"#"},
  {id:"dc2",title:"Digital Edge Program",provider:"Learning Program",date:"2026",imageUrl:"",credentialUrl:"#"},
  {id:"dc3",title:"Java Development Practice",provider:"Practice Certificate",date:"2026",imageUrl:"",credentialUrl:"#"},
  {id:"dc4",title:"Power BI Basics",provider:"Learning Program",date:"2026",imageUrl:"",credentialUrl:"#"},
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
      setItems(snap.empty?defaults:snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch { setItems(defaults); } finally { setLoading(false); }
  };
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
  const navigate=useNavigate();
  useScrollReveal(); useCubeReaction();
  const {profile,profileLoading}=useProfile();
  const {items:skills,loading:sl}=useCollection("skills",defaultSkills);
  const {items:projects,loading:pl}=useCollection("projects",defaultProjects);
  const {items:certs,loading:cl}=useCollection("certificates",defaultCertificates);
  const filtered=useMemo(()=>{
    const v=search.toLowerCase();
    return projects.filter(p=>p.title?.toLowerCase().includes(v)||p.tech?.toLowerCase().includes(v)||p.description?.toLowerCase().includes(v));
  },[projects,search]);
  if(profileLoading||sl||pl||cl) return <Loader />;
  return (
    <div className="bo-page">
      <AdminBtn onAdmin={()=>navigate("/admin")} />
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
  );
}

function AdminPage() {
  const navigate=useNavigate();
  const {profile,setProfile,profileLoading}=useProfile();
  const {items:skills,loading:sl,fetch:fs}=useCollection("skills",defaultSkills);
  const {items:projects,loading:pl,fetch:fp}=useCollection("projects",defaultProjects);
  const {items:certs,loading:cl,fetch:fc}=useCollection("certificates",defaultCertificates);
  const {items:msgs,loading:ml,fetch:fm}=useCollection("messages",[]);
  if(profileLoading||sl||pl||cl||ml) return <Loader />;
  return <AdminPanel projects={projects} fetchProjects={fp} certificates={certs} fetchCertificates={fc} messages={msgs} fetchMessages={fm} profile={profile} setProfile={setProfile} skills={skills} fetchSkills={fs} onClose={()=>navigate("/")} />;
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
function AdminBtn({onAdmin}) {
  return <button className="bo-admin" onClick={onAdmin}>Admin</button>;
}

/* ─── HERO ─── */
function Hero({profile}) {
  const roles = ["Java Developer","React Builder","Web Developer","MCA Student","Full-Stack Dev"];
  const typed = useTypewriter(roles);
  const stats = [
    {num:"3+",label:"Projects Built"},
    {num:"12+",label:"Skills Mastered"},
    {num:"4+",label:"Certificates"},
  ];
  return (
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
  );
}

/* ─── ABOUT ─── */
function About({profile}) {
  const cards = [
    {icon:"🎓",title:"Education",text:profile.education,color:"#b18025"},
    {icon:"⚙️",title:"Development",text:profile.development,color:"#31596b"},
    {icon:"🎯",title:"Goal",text:profile.goal,color:"#3d6b31"},
  ];
  return (
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
  );
}

/* ─── SKILLS ─── */
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
  const [status,setStatus]=useState("");
  const [loading,setLoading]=useState(false);
  const set=(f,v)=>setForm(p=>({...p,[f]:v}));
  const send=async()=>{
    if(!form.name.trim()||!form.email.trim()||!form.message.trim()){setStatus("⚠ Please fill all fields.");return;}
    try {
      setLoading(true); setStatus("");
      await addDoc(collection(db,"messages"),{...form,status:"new",createdAt:serverTimestamp()});
      setForm({name:"",email:"",message:""}); setStatus("✓ Message sent successfully!");
    } catch { setStatus("✗ Failed to send. Try again."); } finally {
      setLoading(false); setTimeout(()=>setStatus(""),3500);
    }
  };
  const links=[
    {label:"LinkedIn",href:formatUrl(profile.linkedin)},
    {label:"GitHub",href:formatUrl(profile.github)},
    {label:"Instagram",href:formatInstagramUrl(profile.instagram)},
    {label:"Email",href:formatMailto(profile.email)},
  ];
  return (
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
          </div>
        </div>
      </div>
      <span className="bo-cube one" /><span className="bo-cube two" />
    </section>
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
function AdminPanel({projects,fetchProjects,certificates,fetchCertificates,messages,fetchMessages,profile,setProfile,skills,fetchSkills,onClose}) {
  const emptyProject={title:"",description:"",tech:"",github:"",demo:"",image:""};
  const emptyCert={title:"",provider:"",date:"",imageUrl:"",credentialUrl:""};

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

  const [profileForm,setProfileForm]=useState(profile);
  const [profileMsg,setProfileMsg]=useState("");

  const [skillForm,setSkillForm]=useState({name:"",category:""});
  const [editingSkillId,setEditingSkillId]=useState(null);
  const [skillMsg,setSkillMsg]=useState("");

  const [msgStatus,setMsgStatus]=useState("");
  const [tab,setTab]=useState("profile");

  const tabs=[{id:"profile",label:"Profile",icon:"👤"},{id:"skills",label:"Skills",icon:"💻"},{id:"projects",label:"Projects",icon:"💼"},{id:"certificates",label:"Certificates",icon:"🏆"},{id:"messages",label:"Messages",icon:"💬"}];

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,u=>{setIsLoggedIn(!!u);setAuthLoading(false);});
    return unsub;
  },[]);

  const login=async()=>{
    try{setLoginError("");await signInWithEmailAndPassword(auth,loginData.email.trim(),loginData.password.trim());}
    catch{setLoginError("Invalid email or password.");}
  };
  const logout=async()=>{try{await signOut(auth);setLoginData({email:"",password:""});onClose();}catch{}};

  const flash=(setter,msg)=>{setter(msg);setTimeout(()=>setter(""),2800);};

  const saveProfile=async()=>{
    try{await setDoc(doc(db,"profile","main"),{...profileForm,updatedAt:serverTimestamp()},{merge:true});setProfile(profileForm);flash(setProfileMsg,"✓ Profile saved.");}
    catch{flash(setProfileMsg,"✗ Failed to save.");}
  };

  const saveSkill=async()=>{
    if(!skillForm.name.trim()||!skillForm.category.trim()){flash(setSkillMsg,"Fill name and category.");return;}
    try{
      if(editingSkillId) await updateDoc(doc(db,"skills",editingSkillId),{...skillForm,updatedAt:serverTimestamp()});
      else await addDoc(collection(db,"skills"),{...skillForm,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
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
      else await addDoc(collection(db,"projects"),{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      setForm(emptyProject);setEditingId(null);await fetchProjects();flash(setProjectMsg,"✓ Project saved.");
    }catch{flash(setProjectMsg,"✗ Failed.");}
  };
  const editProject=(p)=>{if(String(p.id).startsWith("dp")){flash(setProjectMsg,"Cannot edit default.");return;}setEditingId(p.id);setForm({title:p.title||"",description:p.description||"",tech:p.tech||"",github:p.github||"",demo:p.demo||"",image:p.image||""});};
  const deleteProject=async(id)=>{
    if(!window.confirm("Delete?")) return;
    if(String(id).startsWith("dp")){flash(setProjectMsg,"Cannot delete default.");return;}
    try{await deleteDoc(doc(db,"projects",id));await fetchProjects();flash(setProjectMsg,"✓ Deleted.");}catch{flash(setProjectMsg,"✗ Failed.");}
  };

  const saveCert=async()=>{
    if(!certForm.title.trim()){flash(setCertMsg,"Fill certificate title.");return;}
    try{
      if(editingCertId) await updateDoc(doc(db,"certificates",editingCertId),{...certForm,updatedAt:serverTimestamp()});
      else await addDoc(collection(db,"certificates"),{...certForm,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      setCertForm(emptyCert);setEditingCertId(null);await fetchCertificates();flash(setCertMsg,"✓ Saved.");
    }catch{flash(setCertMsg,"✗ Failed.");}
  };
  const editCert=(c)=>{if(String(c.id).startsWith("dc")){flash(setCertMsg,"Cannot edit default.");return;}setEditingCertId(c.id);setCertForm({title:c.title||"",provider:c.provider||"",date:c.date||"",imageUrl:c.imageUrl||"",credentialUrl:c.credentialUrl||""});};
  const deleteCert=async(id)=>{
    if(!window.confirm("Delete?")) return;
    if(String(id).startsWith("dc")){flash(setCertMsg,"Cannot delete default.");return;}
    try{await deleteDoc(doc(db,"certificates",id));await fetchCertificates();flash(setCertMsg,"✓ Deleted.");}catch{flash(setCertMsg,"✗ Failed.");}
  };

  const markRead=async(id)=>{try{await updateDoc(doc(db,"messages",id),{status:"read",updatedAt:serverTimestamp()});await fetchMessages();flash(setMsgStatus,"✓ Marked as read.");}catch{flash(setMsgStatus,"✗ Failed.");}};
  const deleteMsg=async(id)=>{if(!window.confirm("Delete message?")) return;try{await deleteDoc(doc(db,"messages",id));await fetchMessages();flash(setMsgStatus,"✓ Deleted.");}catch{flash(setMsgStatus,"✗ Failed.");}};
  const fmtDate=(ts)=>ts?.toDate?ts.toDate().toLocaleString():"—";

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
              {skills.map(s=>(
                <div key={s.id} className="admin-item-card">
                  <div className="item-name">{s.name}</div>
                  <div className="item-sub">{s.category}</div>
                  <div className="item-actions">
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
              {projects.map(p=>(
                <div key={p.id} className="admin-item-card">
                  <div className="item-name">{p.title}</div>
                  <div className="item-sub">{p.tech}</div>
                  <div className="item-actions">
                    <button className="item-edit" onClick={()=>editProject(p)}><Pencil /> Edit</button>
                    <button className="item-delete" onClick={()=>deleteProject(p.id)}><Trash2 /> Delete</button>
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
              {certificates.map(c=>(
                <div key={c.id} className="admin-item-card">
                  <div className="item-name">{c.title}</div>
                  <div className="item-sub">{c.provider} • {c.date}</div>
                  <div className="item-actions">
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
      </div>
    </div>
  );
}
