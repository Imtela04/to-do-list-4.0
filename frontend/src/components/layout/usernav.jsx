import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Moon, Pipette, X, User, Power } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { HexColorPicker } from 'react-colorful';
import styles from './usernav.module.css';

const COLOR_PICKERS = [
  { variable: '--accent-primary',   label: 'Accent'      },
  { variable: '--accent-secondary', label: 'Accent 2'    },
  { variable: '--bg-primary',       label: 'Background'  },
];

function getInitials(username) {
  if (!username) return '?';
  const parts = username.trim().split(/[\s_-]+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function UserNav() {
  const [open, setOpen]           = useState(false);
  const [openPicker, setOpenPicker] = useState(null);
  const { state, resetState }     = useApp();
  const { theme, custom, applyTheme, updateCustomColor } = useTheme();
  const drawerRef                 = useRef(null);
  const btnRef                    = useRef(null);
  const navigate                  = useNavigate();
  const [pos, setPos] = useState({ left: 0, bottom: 0 });

  // Close drawer on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        !drawerRef.current?.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
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
      setPos({
        left: rect.right + 8,
        bottom: window.innerHeight - rect.bottom,
      });
    }
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    resetState();
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const initials = getInitials(state.username);

  return (
    <div className={styles.parent}>
      {/* Avatar button */}
      <button ref={btnRef} className={styles.avatar} onClick={() => setOpen(o => !o)}>
        {initials}
      </button>

     

      {/* Inline drawer — portalled to body */}
      {open && createPortal(
      <div
        ref={drawerRef}
        className={styles.drawer}
        style={{
          position: 'fixed',
          left: pos.left,
          bottom: pos.bottom,
        }}
      >
      {/* Header */}
          <div className={styles.drawerHeader}>
            <div className={styles.drawerAvatar}><User/></div>
            <div className={styles.drawerUser}>
              <span className={styles.drawerUsername}>{state.username ?? 'User'}</span>
              <span className={styles.drawerRole}>Member</span>
            </div>
             {/* Logout button — separate, always visible */}
            <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
              <Power size={15} />
            </button>
          </div>

          <div className={styles.divider} />

          {/* Theme */}
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

          {/* Color pickers — only when custom */}
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