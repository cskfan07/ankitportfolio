import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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

const Github = (props) => <span {...props}>⌘</span>;
const Mail = (props) => <span {...props}>✉</span>;
const Download = (props) => <span {...props}>⬇</span>;
const ExternalLink = (props) => <span {...props}>↗</span>;
const Plus = (props) => <span {...props}>＋</span>;
const Trash2 = (props) => <span {...props}>🗑</span>;
const Pencil = (props) => <span {...props}>✎</span>;
const Save = (props) => <span {...props}>✓</span>;
const X = (props) => <span {...props}>×</span>;
const User = (props) => <span {...props}>👤</span>;
const Code2 = (props) => <span {...props}>💻</span>;
const Award = (props) => <span {...props}>🏆</span>;
const Briefcase = (props) => <span {...props}>💼</span>;
const MessageCircle = (props) => <span {...props}>💬</span>;
const ShieldCheck = (props) => <span {...props}>🛡</span>;
const Search = (props) => <span {...props}>🔍</span>;

function formatUrl(url) {
  if (!url || url.trim() === "" || url === "#") {
    return "#";
  }

  const cleanUrl = url.trim();

  if (/^https?:\/\//i.test(cleanUrl)) {
    return cleanUrl;
  }

  return `https://${cleanUrl}`;
}

function formatMailto(email) {
  const cleanEmail = (email || "").trim();
  return cleanEmail ? `mailto:${cleanEmail}` : "#";
}

function formatInstagramUrl(value) {
  const cleanValue = (value || "").trim();

  if (!cleanValue || cleanValue === "#") {
    return "#";
  }

  if (/^https?:\/\//i.test(cleanValue) || /^www\./i.test(cleanValue)) {
    return formatUrl(cleanValue);
  }

  return `https://www.instagram.com/${cleanValue.replace(/^@/, "")}`;
}

function LinkifiedText({ text }) {
  const value = String(text || "");
  const pattern =
    /(https?:\/\/[^\s]+|www\.[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  const parts = value.split(pattern);

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(part)) {
      return (
        <a key={`${part}-${index}`} href={formatMailto(part)}>
          {part}
        </a>
      );
    }

    if (/^(https?:\/\/|www\.)/i.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={formatUrl(part)}
          target="_blank"
          rel="noreferrer"
        >
          {part}
        </a>
      );
    }

    return part;
  });
}

function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll(
      ".bo-info-card, .bo-project-card, .bo-skill-card, .bo-cert-card, .bo-form, .bo-contact-info, .bo-map, .bo-photo-wrapper, .bo-certificate-stamp"
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-show");
          }
        });
      },
      {
        threshold: 0.15,
      }
    );

    elements.forEach((element) => {
      element.classList.add("reveal-hidden");
      observer.observe(element);
    });

    return () => {
      elements.forEach((element) => observer.unobserve(element));
    };
  }, []);
}

function useCubeReaction() {
  useEffect(() => {
    let frameId = 0;

    const resetCube = (cube) => {
      cube.style.setProperty("--cube-hit-x", "0px");
      cube.style.setProperty("--cube-hit-y", "0px");
      cube.style.setProperty("--cube-hit-rotate", "0deg");
      cube.style.setProperty("--cube-hit-scale", "1");
      cube.classList.remove("is-hit");
    };

    const reactToPointer = (event) => {
      window.cancelAnimationFrame(frameId);

      frameId = window.requestAnimationFrame(() => {
        const cubes = document.querySelectorAll(".bo-cube");
        const isSmallScreen = window.innerWidth <= 700;
        const threshold = isSmallScreen ? 86 : 130;
        const maxPush = isSmallScreen ? 34 : 58;

        cubes.forEach((cube) => {
          const rect = cube.getBoundingClientRect();
          const cubeX = rect.left + rect.width / 2;
          const cubeY = rect.top + rect.height / 2;
          const dx = cubeX - event.clientX;
          const dy = cubeY - event.clientY;
          const distance = Math.hypot(dx, dy);

          if (distance > threshold) {
            resetCube(cube);
            return;
          }

          const safeDistance = Math.max(distance, 1);
          const force = (1 - safeDistance / threshold) * maxPush;
          const pushX = (dx / safeDistance) * force;
          const pushY = (dy / safeDistance) * force;
          const rotate = Math.max(-22, Math.min(22, (pushX - pushY) * 0.5));

          cube.style.setProperty("--cube-hit-x", `${pushX.toFixed(2)}px`);
          cube.style.setProperty("--cube-hit-y", `${pushY.toFixed(2)}px`);
          cube.style.setProperty("--cube-hit-rotate", `${rotate.toFixed(2)}deg`);
          cube.style.setProperty("--cube-hit-scale", "1.08");
          cube.classList.add("is-hit");
        });
      });
    };

    const resetAllCubes = () => {
      document.querySelectorAll(".bo-cube").forEach(resetCube);
    };

    window.addEventListener("pointermove", reactToPointer);
    window.addEventListener("pointerleave", resetAllCubes);
    window.addEventListener("blur", resetAllCubes);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", reactToPointer);
      window.removeEventListener("pointerleave", resetAllCubes);
      window.removeEventListener("blur", resetAllCubes);
    };
  }, []);
}

const defaultProfile = {
  name: "Ankit",
  title: "MCA Student • Java Developer • Web Developer",
  headline: "I build clean and dynamic web projects.",
  about:
    "I work with Java Servlet/JSP, React, Python, Django, MySQL and MongoDB. This portfolio shows my projects, skills, certificates and development journey.",
  education:
    "MCA student focused on software development, web technologies and real-world projects.",
  development:
    "I build projects using Java Servlet/JSP, React, Django, MySQL and MongoDB.",
  goal:
    "My goal is to become a confident full-stack developer and build deployable applications.",
  email: "ga8774040@gmail.com",
  github: "https://github.com/cskfan07",
  linkedin:
    "https://www.linkedin.com/in/ankit-gupta2201?utm_source=share_via&utm_content=profile&utm_medium=member_android",
  instagram: "mky_2201",
  resumeUrl: "#",
};

const defaultSkills = [
  { id: "default-1", name: "Java", category: "Backend" },
  { id: "default-2", name: "Servlet/JSP", category: "Backend" },
  { id: "default-3", name: "Python", category: "Backend" },
  { id: "default-4", name: "Django", category: "Backend" },
  { id: "default-5", name: "React JS", category: "Frontend" },
  { id: "default-6", name: "HTML", category: "Frontend" },
  { id: "default-7", name: "CSS", category: "Frontend" },
  { id: "default-8", name: "JavaScript", category: "Frontend" },
  { id: "default-9", name: "MySQL", category: "Database" },
  { id: "default-10", name: "MongoDB", category: "Database" },
  { id: "default-11", name: "GitHub", category: "Tools" },
  { id: "default-12", name: "Power BI", category: "Analytics" },
];

const defaultProjects = [
  {
    id: "default-project-1",
    title: "MCA Alumni Connect",
    description:
      "A role-based alumni portal with student, alumni and admin dashboards, notifications and job post management.",
    tech: "Django, MongoDB Atlas, HTML, CSS, JavaScript",
    github: "#",
    demo: "https://mca-alumni-connect.onrender.com",
    image:
      "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "default-project-2",
    title: "Smart E-Driving Licence System",
    description:
      "A web system for learning licence, DL application, document verification, slot booking, exam and QR-based licence validation.",
    tech: "Java Servlet, JSP, MySQL, Tomcat",
    github: "#",
    demo: "#",
    image:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "default-project-3",
    title: "Gud-Madhur AI",
    description:
      "A jaggery e-commerce platform with product listing, cart, orders, payments and an AI FAQ chatbot.",
    tech: "Servlet, JSP, MySQL, JavaScript",
    github: "#",
    demo: "#",
    image:
      "https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=1200&auto=format&fit=crop",
  },
];

const defaultCertificates = [
  {
    id: "default-certificate-1",
    title: "Generative AI 101",
    provider: "Learning Program",
    date: "2026",
    imageUrl: "",
    credentialUrl: "#",
  },
  {
    id: "default-certificate-2",
    title: "Digital Edge Program",
    provider: "Learning Program",
    date: "2026",
    imageUrl: "",
    credentialUrl: "#",
  },
  {
    id: "default-certificate-3",
    title: "Java Development Practice",
    provider: "Practice Certificate",
    date: "2026",
    imageUrl: "",
    credentialUrl: "#",
  },
  {
    id: "default-certificate-4",
    title: "Power BI Basics",
    provider: "Learning Program",
    date: "2026",
    imageUrl: "",
    credentialUrl: "#",
  },
];

function useProfile() {
  const [profile, setProfile] = useState(defaultProfile);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileRef = doc(db, "profile", "main");
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfile({
            ...defaultProfile,
            ...profileSnap.data(),
          });
        } else {
          await setDoc(profileRef, {
            ...defaultProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setProfile(defaultProfile);
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        setProfile(defaultProfile);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return { profile, setProfile, profileLoading };
}

function useSkills() {
  const [skills, setSkills] = useState(defaultSkills);
  const [skillsLoading, setSkillsLoading] = useState(true);

  const fetchSkills = async () => {
    try {
      const skillsRef = collection(db, "skills");
      const skillsQuery = query(skillsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(skillsQuery);

      if (snapshot.empty) {
        setSkills(defaultSkills);
      } else {
        const skillList = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        setSkills(skillList);
      }
    } catch (error) {
      console.error("Skills fetch error:", error);
      setSkills(defaultSkills);
    } finally {
      setSkillsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  return { skills, skillsLoading, fetchSkills };
}

function useProjects() {
  const [projects, setProjects] = useState(defaultProjects);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const projectsRef = collection(db, "projects");
      const projectsQuery = query(projectsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(projectsQuery);

      if (snapshot.empty) {
        setProjects(defaultProjects);
      } else {
        const projectList = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        setProjects(projectList);
      }
    } catch (error) {
      console.error("Projects fetch error:", error);
      setProjects(defaultProjects);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return { projects, projectsLoading, fetchProjects };
}

function useCertificates() {
  const [certificates, setCertificates] = useState(defaultCertificates);
  const [certificatesLoading, setCertificatesLoading] = useState(true);

  const fetchCertificates = async () => {
    try {
      const certificatesRef = collection(db, "certificates");
      const certificatesQuery = query(
        certificatesRef,
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(certificatesQuery);

      if (snapshot.empty) {
        setCertificates(defaultCertificates);
      } else {
        const certificateList = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        setCertificates(certificateList);
      }
    } catch (error) {
      console.error("Certificates fetch error:", error);
      setCertificates(defaultCertificates);
    } finally {
      setCertificatesLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  return { certificates, certificatesLoading, fetchCertificates };
}

function useMessages() {
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const messagesRef = collection(db, "messages");
      const messagesQuery = query(messagesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(messagesQuery);

      const messageList = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      setMessages(messageList);
    } catch (error) {
      console.error("Messages fetch error:", error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return { messages, messagesLoading, fetchMessages };
}


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
  const [activeSection, setActiveSection] = useState("home");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useScrollReveal();
  useCubeReaction();
  const { profile, profileLoading } = useProfile();
  const { skills, skillsLoading } = useSkills();
  const { projects, projectsLoading } = useProjects();
  const { certificates, certificatesLoading } = useCertificates();

  const filteredProjects = useMemo(() => {
    const value = search.toLowerCase();

    return projects.filter(
      (project) =>
        project.title?.toLowerCase().includes(value) ||
        project.tech?.toLowerCase().includes(value) ||
        project.description?.toLowerCase().includes(value)
    );
  }, [projects, search]);

  const scrollToSection = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (
    profileLoading ||
    skillsLoading ||
    projectsLoading ||
    certificatesLoading
  ) {
    return (
      <div className="min-h-screen bg-slate-950 text-white grid place-items-center">
        Loading portfolio...
      </div>
    );
  }

  return (
    <div className="bo-page">
      <Navbar
        activeSection={activeSection}
        scrollToSection={scrollToSection}
        onAdmin={() => navigate("/admin")}
      />

      <main className="bo-frame">
        <Hero scrollToSection={scrollToSection} profile={profile} />
        <About profile={profile} />
        <Skills skills={skills} />
        <Projects
          projects={filteredProjects}
          search={search}
          setSearch={setSearch}
        />
        <Certificates certificates={certificates} />
        <Contact profile={profile} />
      </main>

      <Footer />
    </div>
  );
}

function AdminPage() {
  const navigate = useNavigate();

  const { profile, setProfile, profileLoading } = useProfile();
  const { skills, skillsLoading, fetchSkills } = useSkills();
  const { projects, projectsLoading, fetchProjects } = useProjects();
  const { certificates, certificatesLoading, fetchCertificates } =
    useCertificates();
  const { messages, messagesLoading, fetchMessages } = useMessages();

  if (
    profileLoading ||
    skillsLoading ||
    projectsLoading ||
    certificatesLoading ||
    messagesLoading
  ) {
    return (
      <div className="min-h-screen bg-slate-950 text-white grid place-items-center">
        Loading admin data...
      </div>
    );
  }

  return (
    <AdminPanel
      projects={projects}
      fetchProjects={fetchProjects}
      certificates={certificates}
      fetchCertificates={fetchCertificates}
      messages={messages}
      fetchMessages={fetchMessages}
      profile={profile}
      setProfile={setProfile}
      skills={skills}
      fetchSkills={fetchSkills}
      onClose={() => navigate("/")}
    />
  );
}


function Navbar({ activeSection, scrollToSection, onAdmin }) {
  return (
    <div className="bo-screen bo-nav-screen">
      <div className="bo-paper bo-nav-paper">
        <button className="bo-menu" onClick={() => scrollToSection("home")}>
          ≡
        </button>
        <div className="bo-brand">
          Black<span>Orange</span>
        </div>
        <button className="bo-admin" onClick={onAdmin}>
          Admin
        </button>
      </div>
      <span className="bo-cube one" />
      <span className="bo-cube two" />
    </div>
  );
}


function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/20 text-blue-300">
        <Icon size={24} />
      </div>
      <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-slate-400">{subtitle}</p>
    </div>
  );
}

function Hero({ scrollToSection, profile }) {
  return (
    <section id="home" className="bo-screen">
      <div className="bo-paper">
        <button className="bo-menu">≡</button>
        <div className="bo-brand">
          Black<span>Orange</span>
        </div>

        <div className="bo-social">
          <a href={formatUrl(profile.github)} target="_blank" rel="noreferrer">
            GH
          </a>
          <a href={formatUrl(profile.linkedin)} target="_blank" rel="noreferrer">
            in
          </a>
          <a href={formatMailto(profile.email)}>@</a>
        </div>

        <div className="bo-side-text">PORTFOLIO</div>

        <div className="bo-hero-grid">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="bo-kicker">Welcome</p>
            <h1 className="bo-title">
              I'm <span className="accent">{profile.name}</span> and I'm a
              software developer.
            </h1>
            <p className="bo-desc">
              {profile.about}
            </p>

            <div className="bo-button-row">
              <button className="bo-btn" onClick={() => scrollToSection("projects")}>
                Learn more
              </button>
              <button className="bo-btn secondary" onClick={() => scrollToSection("contact")}>
                Contact me
              </button>
              <a className="bo-btn secondary" href={formatUrl(profile.resumeUrl)} target="_blank" rel="noreferrer">
                Resume
              </a>
            </div>

            <p className="bo-desc bo-desc-small">
              Bridging MCA theory with code. Focused on Java, Python, React,
              Firebase and full stack development.
            </p>
          </motion.div>

          <motion.div
            className="bo-illustration"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="bo-certificate-stamp">MKY_2201</div>
            <div className="bo-avatar" />
            <div className="bo-laptop" />
            <img
  src="/images/ankit-p.png"
  alt="Ankit Kumar Gupta"
  className="bo-profile-img-slide"
/>
          </motion.div>
        </div>

        <span className="bo-cube one" />
        <span className="bo-cube two" />
        <span className="bo-cube three" />
      </div>
    </section>
  );
}


function About({ profile }) {
  return (
    <section id="about" className="bo-screen">
      <div className="bo-paper">
        <button className="bo-menu">≡</button>
        <div className="bo-brand">
          Black<span>Orange</span>
        </div>
        <div className="bo-social">
          <a href={formatUrl(profile.github)} target="_blank" rel="noreferrer">GH</a>
          <a href={formatUrl(profile.linkedin)} target="_blank" rel="noreferrer">in</a>
          <a href={formatMailto(profile.email)}>@</a>
        </div>
        <div className="bo-side-text">ABOUT</div>

        <div className="bo-section-content">
          <h2 className="bo-section-title">About</h2>
          <p className="bo-section-subtitle">
            A quick view of my education, development focus and career goal.
          </p>

          <div className="bo-card-grid">
            {[
              ["Education", profile.education],
              ["Development", profile.development],
              ["Goal", profile.goal],
            ].map(([title, text]) => (
              <motion.div
                key={title}
                className="bo-info-card bo-card-body"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h3 className="bo-card-title">{title}</h3>
                <p className="bo-card-text">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <span className="bo-cube one" />
        <span className="bo-cube two" />
      </div>
    </section>
  );
}


function Skills({ skills }) {
  const categories = [...new Set(skills.map((skill) => skill.category || "Other"))];

  return (
    <section id="skills" className="bo-screen">
      <div className="bo-paper">
        <button className="bo-menu">≡</button>
        <div className="bo-social">
          <a href="#home">H</a>
          <a href="#projects">P</a>
          <a href="#contact">C</a>
        </div>
        <div className="bo-side-text">SKILLS</div>

        <div className="bo-section-content">
          <h2 className="bo-section-title">Skills</h2>
          <p className="bo-section-subtitle">
            My technology stack grouped by category.
          </p>

          <div className="bo-skill-wrap">
            {categories.map((category) => (
              <motion.div
                key={category}
                className="bo-skill-card"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h3 className="bo-skill-title">{category}</h3>
                <div className="bo-pills">
                  {skills
                    .filter((skill) => (skill.category || "Other") === category)
                    .map((skill) => (
                      <span key={skill.id} className="bo-pill">
                        {skill.name}
                      </span>
                    ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <span className="bo-cube one" />
        <span className="bo-cube two" />
      </div>
    </section>
  );
}


function Projects({ projects, search, setSearch }) {
  return (
    <section id="projects" className="bo-screen">
      <div className="bo-paper">
        <button className="bo-menu">≡</button>
        <div className="bo-brand">
          Black<span>Orange</span>
        </div>

        <div className="bo-section-content bo-section-content-wide">
          <h2 className="bo-section-title">Projects</h2>
          <p className="bo-section-subtitle">
            Dashboard systems, e-commerce apps and full-stack academic projects.
          </p>

          <div className="bo-search-box">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects by title or technology..."
              className="bo-input"
            />
          </div>

          <div className="bo-card-grid">
            {projects.map((project) => (
              <motion.article
                key={project.id}
                className="bo-project-card"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <img
                  src={
                    project.image ||
                    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop"
                  }
                  alt={project.title}
                  className="bo-project-img"
                />
                <div className="bo-card-body">
                  <h3 className="bo-card-title">{project.title}</h3>
                  <p className="bo-card-text">{project.description}</p>
                  <p className="bo-tech">• {project.tech}</p>

                  <div className="bo-link-row">
                    <a className="bo-small-btn dark" href={formatUrl(project.github)} target="_blank" rel="noreferrer">
                      Code
                    </a>
                    <a className="bo-small-btn" href={formatUrl(project.demo)} target="_blank" rel="noreferrer">
                      Live
                    </a>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <span className="bo-cube one" />
        <span className="bo-cube two" />
      </div>
    </section>
  );
}


function Certificates({ certificates }) {
  return (
    <section id="certificates" className="bo-screen">
      <div className="bo-paper">
        <button className="bo-menu">≡</button>
        <div className="bo-section-content bo-section-content-wide">
          <h2 className="bo-section-title">Certificates</h2>
          <p className="bo-section-subtitle">
            Certificates and achievements from learning programs and events.
          </p>

          <div className="bo-card-grid">
            {certificates.map((cert) => (
              <motion.div
                key={cert.id}
                className="bo-cert-card"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                {cert.imageUrl ? (
                  <img src={cert.imageUrl} alt={cert.title} className="bo-project-img" />
                ) : (
                  <div className="bo-project-img bo-cert-placeholder">
                    🏆
                  </div>
                )}

                <div className="bo-card-body">
                  <h3 className="bo-card-title">{cert.title}</h3>
                  <p className="bo-card-text">{cert.provider}</p>
                  <p className="bo-tech">• {cert.date}</p>

                  {cert.credentialUrl && cert.credentialUrl !== "#" && (
                    <a className="bo-small-btn" href={formatUrl(cert.credentialUrl)} target="_blank" rel="noreferrer">
                      View Credential
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <span className="bo-cube one" />
        <span className="bo-cube two" />
      </div>
    </section>
  );
}


function Contact({ profile }) {
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [contactStatus, setContactStatus] = useState("");
  const [contactLoading, setContactLoading] = useState(false);

  const handleContactChange = (field, value) => {
    setContactForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveMessage = async () => {
    if (
      !contactForm.name.trim() ||
      !contactForm.email.trim() ||
      !contactForm.message.trim()
    ) {
      setContactStatus("Please fill name, email and message.");
      return;
    }

    try {
      setContactLoading(true);
      setContactStatus("");

      await addDoc(collection(db, "messages"), {
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        message: contactForm.message.trim(),
        status: "new",
        createdAt: serverTimestamp(),
      });

      setContactForm({
        name: "",
        email: "",
        message: "",
      });

      setContactStatus("Message sent successfully!");
    } catch (error) {
      console.error("Message save error:", error);
      setContactStatus("Failed to send message. Try again.");
    } finally {
      setContactLoading(false);

      setTimeout(() => {
        setContactStatus("");
      }, 3000);
    }
  };

  return (
    <section id="contact" className="bo-screen">
      <div className="bo-paper">
        <button className="bo-menu">≡</button>
        <div className="bo-brand">
          Black<span>Orange</span>
        </div>
        <div className="bo-social">
          <a href={formatUrl(profile.github)} target="_blank" rel="noreferrer">GH</a>
          <a href={formatUrl(profile.linkedin)} target="_blank" rel="noreferrer">in</a>
          <a href={formatMailto(profile.email)}>@</a>
        </div>
        <div className="bo-side-text">MESSAGE</div>

        <div className="bo-section-content">
          <h2 className="bo-section-title">Message Me</h2>

          <div className="bo-contact-grid">
            <div className="bo-form">
              <div className="bo-form-group">
                <label>Name</label>
                <input
                  value={contactForm.name}
                  onChange={(e) => handleContactChange("name", e.target.value)}
                  className="bo-input"
                />
              </div>

              <div className="bo-form-group">
                <label>Email</label>
                <input
                  value={contactForm.email}
                  onChange={(e) => handleContactChange("email", e.target.value)}
                  className="bo-input"
                />
              </div>

              <div className="bo-form-group">
                <label>Message</label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => handleContactChange("message", e.target.value)}
                  className="bo-input bo-message-area"
                />
              </div>

              <button className="bo-btn" onClick={saveMessage} disabled={contactLoading}>
                {contactLoading ? "Sending..." : "Send"}
              </button>

              {contactStatus && (
                <p className="bo-card-text">{contactStatus}</p>
              )}
            </div>

            <div>
              <div className="bo-info-card bo-contact-info">
                <h3 className="bo-card-title">Personal Info</h3>
                <div className="bo-contact-actions">
                  <a
                    className="bo-contact-button"
                    href={formatUrl(profile.linkedin)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn
                  </a>
                  <a
                    className="bo-contact-button"
                    href={formatUrl(profile.github)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                  <a
                    className="bo-contact-button"
                    href={formatInstagramUrl(profile.instagram)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Instagram
                  </a>
                  <a
                    className="bo-contact-button"
                    href={formatMailto(profile.email)}
                  >
                    Email
                  </a>
                </div>
              </div>

              <div className="bo-map">
                Based in India
              </div>
            </div>
          </div>
        </div>

        <span className="bo-cube one" />
        <span className="bo-cube two" />
      </div>
    </section>
  );
}


function AdminPanel({
  projects,
  fetchProjects,
  certificates,
  fetchCertificates,
  messages,
  fetchMessages,
  profile,
  setProfile,
  skills,
  fetchSkills,
  onClose,
}) {
  const emptyProject = {
    title: "",
    description: "",
    tech: "",
    github: "",
    demo: "",
    image: "",
  };

  const emptyCertificate = {
    title: "",
    provider: "",
    date: "",
    imageUrl: "",
    credentialUrl: "",
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const [form, setForm] = useState(emptyProject);
  const [editingId, setEditingId] = useState(null);
  const [projectMessage, setProjectMessage] = useState("");

  const [certificateForm, setCertificateForm] = useState(emptyCertificate);
  const [editingCertificateId, setEditingCertificateId] = useState(null);
  const [certificateMessage, setCertificateMessage] = useState("");

  const [profileForm, setProfileForm] = useState(profile);
  const [profileMessage, setProfileMessage] = useState("");

  const [skillForm, setSkillForm] = useState({
    name: "",
    category: "",
  });
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [skillMessage, setSkillMessage] = useState("");
  const [messageAdminStatus, setMessageAdminStatus] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState("profile");

  const adminTabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "skills", label: "Skills", icon: Code2 },
    { id: "projects", label: "Projects", icon: Briefcase },
    { id: "certificates", label: "Certificates", icon: Award },
    { id: "messages", label: "Messages", icon: MessageCircle },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdminLogin = async () => {
    try {
      setLoginError("");

      await signInWithEmailAndPassword(
        auth,
        loginData.email.trim(),
        loginData.password.trim()
      );
    } catch (error) {
      console.error(error);
      setLoginError("Invalid email or password");
    }
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
      setLoginData({ email: "", password: "" });
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCertificateChange = (field, value) => {
    setCertificateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveProfile = async () => {
    try {
      const profileRef = doc(db, "profile", "main");

      await setDoc(
        profileRef,
        {
          ...profileForm,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfile(profileForm);
      setProfileMessage("Profile updated successfully!");

      setTimeout(() => {
        setProfileMessage("");
      }, 2500);
    } catch (error) {
      console.error("Profile update error:", error);
      setProfileMessage("Failed to update profile.");
    }
  };

  const saveSkill = async () => {
    if (!skillForm.name.trim() || !skillForm.category.trim()) {
      setSkillMessage("Please fill skill name and category.");
      return;
    }

    try {
      if (editingSkillId) {
        const skillRef = doc(db, "skills", editingSkillId);

        await updateDoc(skillRef, {
          name: skillForm.name.trim(),
          category: skillForm.category.trim(),
          updatedAt: serverTimestamp(),
        });

        setSkillMessage("Skill updated successfully!");
      } else {
        await addDoc(collection(db, "skills"), {
          name: skillForm.name.trim(),
          category: skillForm.category.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setSkillMessage("Skill added successfully!");
      }

      setSkillForm({ name: "", category: "" });
      setEditingSkillId(null);
      await fetchSkills();

      setTimeout(() => {
        setSkillMessage("");
      }, 2500);
    } catch (error) {
      console.error("Skill save error:", error);
      setSkillMessage("Failed to save skill.");
    }
  };

  const editSkill = (skill) => {
    setEditingSkillId(skill.id);
    setSkillForm({
      name: skill.name,
      category: skill.category,
    });
  };

  const deleteSkill = async (skillId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this skill?"
    );

    if (!confirmDelete) return;

    if (String(skillId).startsWith("default-")) {
      setSkillMessage("Default skills cannot be deleted. Add Firebase skills first.");
      return;
    }

    try {
      await deleteDoc(doc(db, "skills", skillId));
      await fetchSkills();
      setSkillMessage("Skill deleted successfully!");

      setTimeout(() => {
        setSkillMessage("");
      }, 2500);
    } catch (error) {
      console.error("Skill delete error:", error);
      setSkillMessage("Failed to delete skill.");
    }
  };

  const saveProject = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.tech.trim()) {
      setProjectMessage("Please fill title, description and technology fields.");
      return;
    }

    try {
      if (editingId) {
        const projectRef = doc(db, "projects", editingId);

        await updateDoc(projectRef, {
          title: form.title.trim(),
          description: form.description.trim(),
          tech: form.tech.trim(),
          github: form.github.trim() || "#",
          demo: form.demo.trim() || "#",
          image:
            form.image.trim() ||
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
          updatedAt: serverTimestamp(),
        });

        setProjectMessage("Project updated successfully!");
      } else {
        await addDoc(collection(db, "projects"), {
          title: form.title.trim(),
          description: form.description.trim(),
          tech: form.tech.trim(),
          github: form.github.trim() || "#",
          demo: form.demo.trim() || "#",
          image:
            form.image.trim() ||
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setProjectMessage("Project added successfully!");
      }

      setForm(emptyProject);
      setEditingId(null);
      await fetchProjects();

      setTimeout(() => {
        setProjectMessage("");
      }, 2500);
    } catch (error) {
      console.error("Project save error:", error);
      setProjectMessage("Failed to save project.");
    }
  };

  const editProject = (project) => {
    if (String(project.id).startsWith("default-project-")) {
      setProjectMessage("Default project cannot be edited. Add Firebase project first.");
      return;
    }

    setEditingId(project.id);

    setForm({
      title: project.title || "",
      description: project.description || "",
      tech: project.tech || "",
      github: project.github || "",
      demo: project.demo || "",
      image: project.image || "",
    });
  };

  const deleteProject = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmDelete) return;

    if (String(id).startsWith("default-project-")) {
      setProjectMessage("Default project cannot be deleted. Add Firebase project first.");
      return;
    }

    try {
      await deleteDoc(doc(db, "projects", id));
      await fetchProjects();
      setProjectMessage("Project deleted successfully!");

      setTimeout(() => {
        setProjectMessage("");
      }, 2500);
    } catch (error) {
      console.error("Project delete error:", error);
      setProjectMessage("Failed to delete project.");
    }
  };

  const saveCertificate = async () => {
    if (!certificateForm.title.trim()) {
      setCertificateMessage("Please fill certificate title.");
      return;
    }

    try {
      if (editingCertificateId) {
        const certificateRef = doc(db, "certificates", editingCertificateId);

        await updateDoc(certificateRef, {
          title: certificateForm.title.trim(),
          provider: certificateForm.provider.trim(),
          date: certificateForm.date.trim(),
          imageUrl: certificateForm.imageUrl.trim(),
          credentialUrl: certificateForm.credentialUrl.trim() || "#",
          updatedAt: serverTimestamp(),
        });

        setCertificateMessage("Certificate updated successfully!");
      } else {
        await addDoc(collection(db, "certificates"), {
          title: certificateForm.title.trim(),
          provider: certificateForm.provider.trim(),
          date: certificateForm.date.trim(),
          imageUrl: certificateForm.imageUrl.trim(),
          credentialUrl: certificateForm.credentialUrl.trim() || "#",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setCertificateMessage("Certificate added successfully!");
      }

      setCertificateForm(emptyCertificate);
      setEditingCertificateId(null);
      await fetchCertificates();

      setTimeout(() => {
        setCertificateMessage("");
      }, 2500);
    } catch (error) {
      console.error("Certificate save error:", error);
      setCertificateMessage("Failed to save certificate.");
    }
  };

  const editCertificate = (cert) => {
    if (String(cert.id).startsWith("default-certificate-")) {
      setCertificateMessage(
        "Default certificate cannot be edited. Add Firebase certificate first."
      );
      return;
    }

    setEditingCertificateId(cert.id);

    setCertificateForm({
      title: cert.title || "",
      provider: cert.provider || "",
      date: cert.date || "",
      imageUrl: cert.imageUrl || "",
      credentialUrl: cert.credentialUrl || "",
    });
  };

  const deleteCertificate = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this certificate?"
    );

    if (!confirmDelete) return;

    if (String(id).startsWith("default-certificate-")) {
      setCertificateMessage(
        "Default certificate cannot be deleted. Add Firebase certificate first."
      );
      return;
    }

    try {
      await deleteDoc(doc(db, "certificates", id));
      await fetchCertificates();
      setCertificateMessage("Certificate deleted successfully!");

      setTimeout(() => {
        setCertificateMessage("");
      }, 2500);
    } catch (error) {
      console.error("Certificate delete error:", error);
      setCertificateMessage("Failed to delete certificate.");
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        status: "read",
        updatedAt: serverTimestamp(),
      });

      await fetchMessages();
      setMessageAdminStatus("Message marked as read.");

      setTimeout(() => {
        setMessageAdminStatus("");
      }, 2500);
    } catch (error) {
      console.error("Message update error:", error);
      setMessageAdminStatus("Failed to update message.");
    }
  };

  const deleteMessage = async (messageId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this message?"
    );

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "messages", messageId));
      await fetchMessages();
      setMessageAdminStatus("Message deleted successfully.");

      setTimeout(() => {
        setMessageAdminStatus("");
      }, 2500);
    } catch (error) {
      console.error("Message delete error:", error);
      setMessageAdminStatus("Failed to delete message.");
    }
  };

  const formatMessageDate = (createdAt) => {
    if (!createdAt?.toDate) {
      return "No date";
    }

    return createdAt.toDate().toLocaleString();
  };

  if (authLoading) {
    return (
      <div className="bo-admin-shell fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="bo-admin-loading-card rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
          Checking admin login...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="bo-admin-shell fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="bo-admin-login-card w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Admin Login</h2>
              <p className="mt-2 text-sm text-slate-400">
                Login using Firebase Authentication admin account.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl bg-white/10 p-3 hover:bg-white hover:text-slate-950"
            >
              <X />
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              value={loginData.email}
              onChange={(e) =>
                setLoginData({ ...loginData, email: e.target.value })
              }
              placeholder="Admin Email"
              className="admin-input"
            />

            <input
              type="password"
              value={loginData.password}
              onChange={(e) =>
                setLoginData({ ...loginData, password: e.target.value })
              }
              placeholder="Admin Password"
              className="admin-input"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAdminLogin();
                }
              }}
            />

            {loginError && <p className="text-sm text-red-300">{loginError}</p>}

            <button
              onClick={handleAdminLogin}
              className="w-full rounded-2xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400"
            >
              Login
            </button>

            <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-400">
              Use the admin email and password that you created in Firebase
              Authentication.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bo-admin-shell fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="bo-admin-dashboard mx-auto max-w-6xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            <p className="text-sm text-slate-400">
              Manage profile, skills, projects and certificates.
            </p>

            <button
              onClick={handleAdminLogout}
              className="mt-3 rounded-2xl bg-red-500/20 px-4 py-2 text-sm text-red-200 hover:bg-red-500 hover:text-white"
            >
              Logout
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl bg-white/10 p-3 hover:bg-white hover:text-slate-950"
          >
            <X />
          </button>
        </div>

        <div className="bo-admin-tabs mb-6 rounded-3xl border border-white/10 bg-white/5 p-3">
          <div className="grid gap-3 md:grid-cols-5">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    activeAdminTab === tab.id
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-slate-900 text-slate-300 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeAdminTab === "profile" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <User size={20} /> Manage Profile
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={profileForm.name}
                onChange={(e) => handleProfileChange("name", e.target.value)}
                className="admin-input"
                placeholder="Name"
              />

              <input
                value={profileForm.title}
                onChange={(e) => handleProfileChange("title", e.target.value)}
                className="admin-input"
                placeholder="Title"
              />

              <input
                value={profileForm.headline}
                onChange={(e) =>
                  handleProfileChange("headline", e.target.value)
                }
                className="admin-input"
                placeholder="Headline"
              />

              <input
                value={profileForm.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
                className="admin-input"
                placeholder="Email"
              />

              <input
                value={profileForm.github}
                onChange={(e) => handleProfileChange("github", e.target.value)}
                className="admin-input"
                placeholder="GitHub URL"
              />

              <input
                value={profileForm.linkedin}
                onChange={(e) =>
                  handleProfileChange("linkedin", e.target.value)
                }
                className="admin-input"
                placeholder="LinkedIn URL"
              />

              <input
                value={profileForm.instagram || ""}
                onChange={(e) =>
                  handleProfileChange("instagram", e.target.value)
                }
                className="admin-input"
                placeholder="Instagram username or URL"
              />

              <input
                value={profileForm.resumeUrl}
                onChange={(e) =>
                  handleProfileChange("resumeUrl", e.target.value)
                }
                className="admin-input md:col-span-2"
                placeholder="Resume URL"
              />
            </div>

            <textarea
              value={profileForm.about}
              onChange={(e) => handleProfileChange("about", e.target.value)}
              className="admin-input mt-4 h-24"
              placeholder="About text"
            />

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <textarea
                value={profileForm.education}
                onChange={(e) =>
                  handleProfileChange("education", e.target.value)
                }
                className="admin-input h-24"
                placeholder="Education"
              />

              <textarea
                value={profileForm.development}
                onChange={(e) =>
                  handleProfileChange("development", e.target.value)
                }
                className="admin-input h-24"
                placeholder="Development"
              />

              <textarea
                value={profileForm.goal}
                onChange={(e) => handleProfileChange("goal", e.target.value)}
                className="admin-input h-24"
                placeholder="Goal"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={saveProfile}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400"
              >
                <Save size={18} /> Save Profile
              </button>

              {profileMessage && (
                <p className="text-sm text-blue-200">{profileMessage}</p>
              )}
            </div>
          </div>
        )}

        {activeAdminTab === "skills" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Code2 size={20} /> Manage Skills
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={skillForm.name}
                onChange={(e) =>
                  setSkillForm({ ...skillForm, name: e.target.value })
                }
                className="admin-input"
                placeholder="Skill name, e.g. React JS"
              />

              <input
                value={skillForm.category}
                onChange={(e) =>
                  setSkillForm({ ...skillForm, category: e.target.value })
                }
                className="admin-input"
                placeholder="Category, e.g. Frontend"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={saveSkill}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400"
              >
                <Save size={18} />{" "}
                {editingSkillId ? "Update Skill" : "Add Skill"}
              </button>

              {editingSkillId && (
                <button
                  onClick={() => {
                    setEditingSkillId(null);
                    setSkillForm({ name: "", category: "" });
                  }}
                  className="rounded-2xl bg-white/10 px-5 py-3 hover:bg-white hover:text-slate-950"
                >
                  Cancel
                </button>
              )}

              {skillMessage && (
                <p className="text-sm text-blue-200">{skillMessage}</p>
              )}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {skills.map((skill) => (
                <div key={skill.id} className="rounded-2xl bg-slate-900 p-4">
                  <h4 className="font-bold">{skill.name}</h4>
                  <p className="mt-1 text-sm text-slate-400">
                    {skill.category}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => editSkill(skill)}
                      className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white hover:text-slate-950"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteSkill(skill.id)}
                      className="rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-200 hover:bg-red-500 hover:text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAdminTab === "projects" && (
          <>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <Plus size={20} /> {editingId ? "Edit Project" : "Add Project"}
              </h3>

              <div className="space-y-3">
                <input
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className="admin-input"
                  placeholder="Project title"
                />

                <textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="admin-input h-24"
                  placeholder="Project description"
                />

                <input
                  value={form.tech}
                  onChange={(e) => handleChange("tech", e.target.value)}
                  className="admin-input"
                  placeholder="Technology used"
                />

                <input
                  value={form.github}
                  onChange={(e) => handleChange("github", e.target.value)}
                  className="admin-input"
                  placeholder="GitHub link"
                />

                <input
                  value={form.demo}
                  onChange={(e) => handleChange("demo", e.target.value)}
                  className="admin-input"
                  placeholder="Live demo link"
                />

                <input
                  value={form.image}
                  onChange={(e) => handleChange("image", e.target.value)}
                  className="admin-input"
                  placeholder="Image URL"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={saveProject}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400"
                >
                  <Save size={18} />{" "}
                  {editingId ? "Update Project" : "Save Project"}
                </button>

                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyProject);
                    }}
                    className="rounded-2xl bg-white/10 px-5 py-3 hover:bg-white hover:text-slate-950"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {projectMessage && (
                <p className="mt-3 text-sm text-blue-200">{projectMessage}</p>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-4 text-xl font-bold">All Projects</h3>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <div key={project.id} className="rounded-2xl bg-slate-900 p-4">
                    <h4 className="font-bold">{project.title}</h4>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {project.description}
                    </p>

                    <p className="mt-2 text-sm text-blue-200">{project.tech}</p>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => editProject(project)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white hover:text-slate-950"
                      >
                        <Pencil size={15} /> Edit
                      </button>

                      <button
                        onClick={() => deleteProject(project.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-200 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeAdminTab === "certificates" && (
          <>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <Award size={20} />{" "}
                {editingCertificateId ? "Edit Certificate" : "Add Certificate"}
              </h3>

              <div className="space-y-3">
                <input
                  value={certificateForm.title}
                  onChange={(e) =>
                    handleCertificateChange("title", e.target.value)
                  }
                  className="admin-input"
                  placeholder="Certificate title"
                />

                <input
                  value={certificateForm.provider}
                  onChange={(e) =>
                    handleCertificateChange("provider", e.target.value)
                  }
                  className="admin-input"
                  placeholder="Provider / Organization"
                />

                <input
                  value={certificateForm.date}
                  onChange={(e) =>
                    handleCertificateChange("date", e.target.value)
                  }
                  className="admin-input"
                  placeholder="Date, e.g. 2026"
                />

                <input
                  value={certificateForm.imageUrl}
                  onChange={(e) =>
                    handleCertificateChange("imageUrl", e.target.value)
                  }
                  className="admin-input"
                  placeholder="Certificate image URL"
                />

                <input
                  value={certificateForm.credentialUrl}
                  onChange={(e) =>
                    handleCertificateChange("credentialUrl", e.target.value)
                  }
                  className="admin-input"
                  placeholder="Credential URL"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={saveCertificate}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 font-semibold hover:bg-blue-400"
                >
                  <Save size={18} />{" "}
                  {editingCertificateId
                    ? "Update Certificate"
                    : "Save Certificate"}
                </button>

                {editingCertificateId && (
                  <button
                    onClick={() => {
                      setEditingCertificateId(null);
                      setCertificateForm(emptyCertificate);
                    }}
                    className="rounded-2xl bg-white/10 px-5 py-3 hover:bg-white hover:text-slate-950"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {certificateMessage && (
                <p className="mt-3 text-sm text-blue-200">
                  {certificateMessage}
                </p>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-4 text-xl font-bold">All Certificates</h3>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {certificates.map((cert) => (
                  <div key={cert.id} className="rounded-2xl bg-slate-900 p-4">
                    <h4 className="font-bold">{cert.title}</h4>
                    <p className="mt-1 text-sm text-slate-400">{cert.provider}</p>
                    <p className="mt-1 text-sm text-blue-200">{cert.date}</p>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => editCertificate(cert)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white hover:text-slate-950"
                      >
                        <Pencil size={15} /> Edit
                      </button>

                      <button
                        onClick={() => deleteCertificate(cert.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-200 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeAdminTab === "messages" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">Contact Messages</h3>
                <p className="text-sm text-slate-400">
                  Messages submitted from the public contact form.
                </p>
              </div>

              <button
                onClick={fetchMessages}
                className="rounded-2xl bg-white/10 px-4 py-2 text-sm hover:bg-white hover:text-slate-950"
              >
                Refresh
              </button>
            </div>

            {messageAdminStatus && (
              <p className="mb-4 text-sm text-blue-200">{messageAdminStatus}</p>
            )}

            {messages.length === 0 ? (
              <div className="rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">
                No messages yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-2xl border border-white/10 bg-slate-900 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold">{msg.name}</h4>
                        <a
                          href={formatMailto(msg.email)}
                          className="text-sm text-blue-200 hover:underline"
                        >
                          {msg.email}
                        </a>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          msg.status === "read"
                            ? "bg-green-500/20 text-green-200"
                            : "bg-blue-500/20 text-blue-200"
                        }`}
                      >
                        {msg.status || "new"}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      <LinkifiedText text={msg.message} />
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      {formatMessageDate(msg.createdAt)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => markMessageAsRead(msg.id)}
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white hover:text-slate-950"
                      >
                        Mark as Read
                      </button>

                      <a
                        href={formatMailto(msg.email)}
                        className="rounded-xl bg-blue-500 px-3 py-2 text-sm hover:bg-blue-400"
                      >
                        Reply
                      </a>

                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-200 hover:bg-red-500 hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        .admin-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgb(15 23 42);
          padding: 0.8rem 1rem;
          color: white;
          outline: none;
        }

        .admin-input:focus {
          border-color: rgb(96 165 250);
        }

        .space-y-3 > * + * {
          margin-top: 12px;
        }

        .space-y-4 > * + * {
          margin-top: 16px;
        }

        .place-items-center {
          place-items: center;
        }

        .max-w-md {
          max-width: 430px;
        }

        .lg\\:col-span-2 {
          grid-column: span 2 / span 2;
        }

        .md\\:col-span-2 {
          grid-column: span 2 / span 2;
        }

        @media (max-width: 900px) {
          .lg\\:col-span-2,
          .md\\:col-span-2 {
            grid-column: span 1 / span 1;
          }
        }
      `}</style>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bo-footer">
      <p>© 2026 Ankit Portfolio. Built with React and Firebase.</p>
      <p className="bo-footer-subtitle">
        Inspired by a BlackOrange retro developer portfolio design.
      </p>
    </footer>
  );
}

