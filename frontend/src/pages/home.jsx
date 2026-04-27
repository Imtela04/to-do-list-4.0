import { useState } from 'react';
import Greeting from '@/components/layout/greetings';
import ClockWidget from '@/components/widgets/clock';
import TaskList from '@/components/tasks/tasklist';
import StatsWidget from '@/components/widgets/stats';
import StickyNotes from '@/components/widgets/stickynote';
import Categories from '@/components/categories/categorypanel';
import UserNav from '@/components/layout/usernav';
import styles from './home.module.css';
import { ClockAlert, Menu, X, PanelRight } from 'lucide-react';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightOpen, setRightOpen]     = useState(false);

  return (
    <div className={styles.layout}>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoText}>what-d<ClockAlert className={styles.logoIcon} /></span>
          {/* Close button — mobile only */}
          <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <div className={styles.sideSection}><ClockWidget /></div>
        <div className={styles.sideSection}><StatsWidget /></div>
        <div className={styles.sideSection}><Categories /></div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          {/* Burger — visible on mobile */}
          <button className={styles.burger} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          <Greeting />

          <div className={styles.headerRight}>
            {/* Right panel toggle — visible when panel is hidden */}
            <button className={styles.panelToggle} onClick={() => setRightOpen(o => !o)}>
              <PanelRight size={18} />
            </button>
            <UserNav />
          </div>
        </header>
        <section className={styles.tasksSection}><TaskList /></section>
      </main>

      {/* Right panel overlay on mobile */}
      {rightOpen && (
        <div className={styles.overlay} onClick={() => setRightOpen(false)} />
      )}

      <aside className={`${styles.rightPanel} ${rightOpen ? styles.rightOpen : ''}`}>
        <StickyNotes />
      </aside>
    </div>
  );
}