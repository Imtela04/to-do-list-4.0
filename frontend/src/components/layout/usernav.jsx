import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, LogOut, Sun, Moon, Pipette } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { logout } from '@/api/services';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { HexColorPicker } from 'react-colorful';
import styles from './usernav.module.css';

const COLOR_PICKERS = [
  { variable: '--accent-primary',   label: 'Accent'      },
  { variable: '--accent-secondary', label: 'Accent 2'    },
  { variable: '--bg-primary',       label: 'Background'  },
];

export default function UserNav() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const { state } = useApp();
  const { theme, custom, applyTheme, updateCustomColor } = useTheme();
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [openPicker, setOpenPicker] = useState(null);
  const { resetState } = useApp();


  // Calculate position from button whenever dropdown opens
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  // Close on outside click — checks both button and portalled dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !dropdownRef.current?.contains(e.target)
      ) {
        setOpen(false);
        setOpenPicker(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    resetState();                                   // 👈 wipe all state
    window.dispatchEvent(new Event('auth-change')); // 👈 reset theme
    navigate('/login');
  };

  return (
    // parent no longer needs ref — outside-click is handled above
    <div className={styles.parent}>
      <button ref={btnRef} className={styles.user} onClick={() => setOpen(o => !o)}>
        <User size={18} />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className={styles.dropdown}
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
        >
          <div className={styles.username}>
            <User size={14} />
            {state.username ?? 'User'}
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

          <div className={styles.divider} />

          <button className={styles.logout} onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>,

        document.body
      )}
    </div>
  );
}