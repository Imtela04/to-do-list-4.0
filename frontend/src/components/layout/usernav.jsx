import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Moon, Pipette, User, Power, Flame, Star } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { HexColorPicker } from 'react-colorful';
import styles from './usernav.module.css';

const COLOR_PICKERS = [
  { variable: '--accent-primary',   label: 'Primary Accent' },
  { variable: '--accent-secondary', label: 'Secondary Accent' },
  { variable: '--bg-primary',       label: 'Background' },
];

const LEVEL_LABELS = {
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Expert',
  5: 'Master',
};

function getInitials(username) {
  if (!username) return '?';
  const parts = username.trim().split(/[\s_-]+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function UserNav() {
  const [open, setOpen]             = useState(false);
  const [openPicker, setOpenPicker] = useState(null);

  const username   = useAppStore(s => s.username);
  const xp         = useAppStore(s => s.xp);
  const level      = useAppStore(s => s.level);
  const streak     = useAppStore(s => s.streak);
  const nextLevelXp = useAppStore(s => s.nextLevelXp);
  const resetState = useAppStore(s => s.resetState);

  const { theme, custom, applyTheme, updateCustomColor } = useTheme();
  const drawerRef = useRef(null);
  const btnRef    = useRef(null);
  const navigate  = useNavigate();
  const [pos, setPos] = useState({ left: 0, bottom: 0 });

  const LEVEL_XP    = { 1: 0, 2: 50, 3: 150, 4: 350, 5: 700 };
  const prevLevelXp = LEVEL_XP[level] ?? 0;
  const xpInLevel   = xp - prevLevelXp;
  const xpNeeded    = nextLevelXp ? nextLevelXp - prevLevelXp : xpInLevel;
  const xpPct       = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!drawerRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setOpen(false);
        setOpenPicker(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ left: rect.right + 8, bottom: window.innerHeight - rect.bottom });
    }
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    resetState();
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const initials = getInitials(username);

  return (
    <div className={styles.parent}>
      <div className={styles.avatarRow}>
        <button ref={btnRef} className={styles.avatar} onClick={() => setOpen(o => !o)}>
          {initials}
          <span className={styles.levelBadge}>{level}</span>
        </button>
        <div className={styles.xpInfo}>
          <div className={styles.xpLabelRow}>
            <span className={styles.levelLabel}>{LEVEL_LABELS[level] ?? 'Master'}</span>
            {streak > 0 && (
              <span className={styles.streak}>
                <Flame size={11} /> {streak}d
              </span>
            )}
          </div>
          <div className={styles.xpBarWrap}>
            <div className={styles.xpBar} style={{ width: `${xpPct}%` }} />
          </div>
          <span className={styles.xpText}>
            {nextLevelXp ? `${xpInLevel} / ${xpNeeded} XP` : `${xp} XP · Max Level`}
          </span>
        </div>
      </div>

      {open && createPortal(
        <div
          ref={drawerRef}
          className={styles.drawer}
          style={{ position: 'fixed', left: pos.left, bottom: pos.bottom }}
        >
          <div className={styles.drawerHeader}>
            <div className={styles.drawerAvatar}><User /></div>
            <div className={styles.drawerUser}>
              <span className={styles.drawerUsername}>{username ?? 'User'}</span>
              <span className={styles.drawerRole}>
                <Star size={10} /> {LEVEL_LABELS[level]} · Level {level}
              </span>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
              <Power size={15} />
            </button>
          </div>

          <div className={styles.drawerXp}>
            <div className={styles.drawerXpLabelRow}>
              <span className={styles.drawerXpLabel}>{xp} XP</span>
              {streak > 0 && (
                <span className={styles.drawerStreak}>
                  <Flame size={12} /> {streak} day streak
                </span>
              )}
            </div>
            <div className={styles.drawerXpBarWrap}>
              <div className={styles.drawerXpBar} style={{ width: `${xpPct}%` }} />
            </div>
            {nextLevelXp && (
              <span className={styles.drawerXpSub}>
                {nextLevelXp - xp} XP to Level {level + 1}
              </span>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <span className={styles.sectionLabel}>Theme</span>
            <div className={styles.themeRow}>
              <div className={styles.toggle}>
                <button
                  className={`${styles.toggleBtn} ${theme === 'light' ? styles.toggleActive : ''}`}
                  onClick={() => applyTheme('light')}
                >
                  <Sun size={14} />
                </button>
                <button
                  className={`${styles.toggleBtn} ${theme === 'dark' ? styles.toggleActive : ''}`}
                  onClick={() => applyTheme('dark')}
                >
                  <Moon size={14} />
                </button>
              </div>
              <button
                className={`${styles.customBtn} ${theme === 'custom' ? styles.themeActive : ''}`}
                onClick={() => applyTheme('custom')}
                title="Custom"
              >
                <Pipette size={14} />
              </button>
            </div>
          </div>

          {theme === 'custom' && (
            <>
              <div className={styles.divider} />
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Colors</span>
                <div className={styles.colorGrid}>
                  {COLOR_PICKERS.map(({ variable, label }) => (
                    <div key={variable} className={styles.colorRow}>
                      <div
                        className={`${styles.colorSwatch} ${openPicker === variable ? styles.swatchActive : ''}`}
                        style={{ background: custom[variable] }}
                        onClick={() => setOpenPicker(openPicker === variable ? null : variable)}
                      />
                      <span className={styles.colorLabel}>{label}</span>
                    </div>
                  ))}
                </div>
                {openPicker && (
                  <div className={styles.pickerPopup}>
                    <HexColorPicker
                      color={custom[openPicker]}
                      onChange={val => updateCustomColor(openPicker, val)}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}