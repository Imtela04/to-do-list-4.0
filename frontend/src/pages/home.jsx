import { useState } from 'react';
import Greeting from '@/components/layout/greetings';
import ClockWidget from '@/components/widgets/clock';
import TaskList from '@/components/tasks/tasklist';
import StatsWidget from '@/components/widgets/stats';
import StickyNotes from '@/components/widgets/stickynote';
import Categories from '@/components/categories/categorypanel';
import UserNav from '@/components/layout/usernav';
import styles from './home.module.css';
import { ClockAlert, Menu, X, PanelRight, StickyNote } from 'lucide-react';
import SessionGuard from '@/components/layout/sessionguard';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <SessionGuard>
        <div className={styles.layout}>

        {/* Sidebar overlay on mobile */}
        {sidebarOpen && (
          <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <span className={styles.logoText}>what-d<ClockAlert className={styles.logoIcon} /></span>
          <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
          <div className={styles.sideSection}><ClockWidget /></div>
          <div className={styles.sideSection}><StatsWidget /></div>
          <div className={`${styles.sideSection} ${styles.sideSectionGrow}`}>
            <Categories />
          </div>
          <div className={styles.sidebarFooter}>
            <UserNav />
          </div>
        </aside> 
               <main className={styles.main}>
          <header className={styles.header}>
            {/* Burger — visible on mobile */}
            <button className={styles.burger} onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>

            <Greeting />

            <div className={styles.headerRight}>
              <button className={styles.notesToggle} onClick={() => setNotesOpen(o => !o)}>
                <StickyNote size={18} />
              </button>
            </div>
          </header>
          <section className={styles.tasksSection}><TaskList /></section>
        </main>

        {/* Right panel overlay */}
        {notesOpen && (
          <div className={styles.overlay} onClick={() => setNotesOpen(false)} />
        )}
        <aside className={`${styles.notesDrawer} ${notesOpen ? styles.notesDrawerOpen : ''}`}>
          <div className={styles.notesDrawerHeader}>
            <span className={styles.notesDrawerTitle}>Sticky Notes</span>
            <button className={styles.notesDrawerClose} onClick={() => setNotesOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.notesDrawerBody}>
            <StickyNotes />
          </div>
        </aside>

      </div>
    </SessionGuard>
    
  );
}