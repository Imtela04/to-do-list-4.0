import { Ghost, LogIn, UserPen, ArrowRight, Flame, Timer, Calendar, Bolt, ChartColumnStacked, BrickWallFire, Zap } from "lucide-react";
import styles from './landing.module.css';
import { useNavigate } from "react-router-dom";
import { Logo } from "./home";
import { useState } from "react";

const FEATURES = [
  { icon: <Bolt size={20}/>,        title: 'Earn XP',           desc: 'Every completed task awards XP. Priority and on-time bonuses stack up fast.' },
  { icon: <Flame size={20}/>,      title: 'Daily Streaks',     desc: 'Complete tasks daily to build a streak and multiply your XP gains.' },
  { icon: <Timer size={20}/>,      title: 'Pomodoro',          desc: 'Built-in focus timer. Each session awards bonus XP automatically.' },
  { icon: <Calendar size={20}/>,   title: 'Calendar View',     desc: 'See all deadlines at a glance. Add tasks straight from any date.' },
  { icon: <ChartColumnStacked size={20}/>,    title: 'Categories',        desc: 'Organise tasks into colour-coded categories that unlock as you level.' },
  { icon: <BrickWallFire size={20}/>,  title: 'Activity Heatmap',  desc: 'GitHub-style heatmap shows your productivity over the last 365 days.' },
];

const LEVELS = [
  { level: 1, label: 'Novice',     xp: 0,   color: '#6c6c8a' },
  { level: 2, label: 'Apprentice', xp: 50,  color: '#7c6aff' },
  { level: 3, label: 'Journeyman', xp: 150, color: '#a78bfa' },
  { level: 4, label: 'Expert',     xp: 350, color: '#38bdf8' },
  { level: 5, label: 'Master',     xp: 700, color: '#f0abfc' },
];

const MOCK_TASKS = [
  { title: 'Design system audit',   xp: '+40 XP', priority: 'high',   done: true  },
  { title: 'Write unit tests',      xp: '+25 XP', priority: 'medium', done: false },
  { title: 'Review pull requests',  xp: '+20 XP', priority: 'low',    done: false },
];

export default function Landing() {
  const navigate                            = useNavigate();
  const [guestLoading, setGuestLoading]     = useState(false);

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/guest/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      localStorage.setItem('authToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      navigate('/');
    } catch {
      // silently fall through
    } finally {
      setGuestLoading(false);
    }
  };


  return (
    <div className={styles.page}>
      {/* Ambient background */}
      <div className={styles.ambientOrb1} />
      <div className={styles.ambientOrb2} />
      <div className={styles.gridOverlay} />

      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <Logo />
        <div className={styles.navActions}>
          <button onClick={() => navigate('/login')} className={styles.navBtn}>
            <LogIn size={15} /> Log in
          </button>
          <button onClick={() => navigate('/register')} className={styles.navBtnPrimary}>
            <UserPen size={15} /> Sign up
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>

        <h1 className={styles.heroTitle}>
          Weaponise <br />
          <span className={styles.heroAccent} title="big words for 'reward system'">incentive salience</span> for<br />
          productivity.
        </h1>

        <p className={styles.heroSub}>
          Do. Earn. Grow. <br />
        </p>

        <div className={styles.heroActions}>
          <button onClick={() => navigate('/register')} className={styles.heroCta}>
            Start for free <ArrowRight size={16} />
          </button>
          <button onClick={handleGuest} className={styles.heroGuest} disabled={guestLoading}>
            <Ghost size={15} /> {guestLoading ? 'Starting...' : 'Try as guest'}
          </button>
        </div>

        {/* Mock UI preview */}
        <div className={styles.heroPreview}>
          <div className={styles.previewWindow}>
            <div className={styles.previewHeader}>
              <div className={styles.previewDots}>
                <span /><span /><span />
              </div>
              <span className={styles.previewTitle}>Today's tasks</span>
              <div className={styles.previewXpBadge}><Flame size={14}/> 6 day streak</div>
            </div>
            <div className={styles.previewBody}>
              {MOCK_TASKS.map((t) => (
                <div key={t.title} className={`${styles.previewTask} ${t.done ? styles.previewTaskDone : ''}`}>
                  <div className={`${styles.previewCheck} ${t.done ? styles.checked : ''}`}>
                    {t.done && '✓'}
                  </div>
                  <span className={styles.previewTaskTitle}>{t.title}</span>
                  <div className={styles.previewMeta}>
                    <span className={`${styles.previewPriority} ${styles[t.priority]}`}>{t.priority}</span>
                    <span className={styles.previewXp}>{t.xp}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.previewFooter}>
              <div className={styles.previewXpBar}>
                <span>Level 3 — Journeyman</span>
                <span>340 / 350 XP</span>
              </div>
              <div className={styles.previewBarTrack}>
                <div className={styles.previewBarFill} style={{ width: '97%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className={styles.features}>
        <div className={styles.sectionLabel}>Features</div>
        <h2 className={styles.sectionTitle}>Everything you need,<br />nothing you don't.</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIconWrap}>{f.icon}</div>
              <h3 className={styles.featureCardTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LEVELS ── */}
      <section className={styles.levels}>
        <div className={styles.sectionLabel}>Progression</div>
        <h2 className={styles.sectionTitle}>Level up as you work.</h2>
        <p className={styles.sectionSub}>Five tiers of mastery — each unlocking new categories, perks, and bragging rights.</p>
        <div className={styles.levelTrack}>
          {LEVELS.map((l, i) => (
            <div key={l.level} className={styles.levelNode}>
              {i < LEVELS.length - 1 && <div className={styles.levelConnector} />}
              <div className={styles.levelCircle} style={{ '--level-color': l.color }}>
                {l.level}
              </div>
              <span className={styles.levelLabel}>{l.label}</span>
              <span className={styles.levelXp}>{l.xp} XP</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaGlow} />
          <div className={styles.ctaInner}>
            <span className={styles.ctaEmoji}><Zap/></span>
            <h2 className={styles.ctaTitle}>Ready to level up your productivity?</h2>
            <p className={styles.ctaSub}>Join and start turning your task list into an adventure.</p>
            <div className={styles.ctaActions}>
              <button onClick={() => navigate('/register')} className={styles.heroCta}>
                Create free account <ArrowRight size={16} />
              </button>
              <button onClick={handleGuest} className={styles.heroGuest}>
                <Ghost size={15} /> Try as guest
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <Logo/>
        <span className={styles.footerNote}>Built to help you <i>actually</i> accomplish goals.</span>
      </footer>
    </div>
  );
}