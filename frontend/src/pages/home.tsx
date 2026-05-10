import { useState } from 'react';
import Greeting from '@/components/layout/greetings';
import ClockWidget from '@/components/widgets/clock';
import TaskList from '@/components/tasks/tasklist';
import CalendarView from '@/components/layout/calendarview';
import StatsWidget from '@/components/widgets/stats';
import StickyNotes from '@/components/widgets/stickynote';
import Categories from '@/components/categories/categorypanel';
import UserNav from '@/components/layout/usernav';
import styles from './home.module.css';
import { ClockAlert, Menu, X, NotebookPen, LayoutList, CalendarDays, Timer } from 'lucide-react';
import SessionGuard from '@/components/layout/sessionguard';
import LevelUpToast from '@/components/layout/leveluptoast';
import Pomodoro from '../components/widgets/pomodoro';

type View = 'list' | 'calendar';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [notesOpen, setNotesOpen]       = useState(false);
  const [view, setView]                 = useState<View>('list');
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  return (
    <SessionGuard>
      <LevelUpToast />
      <div className={styles.layout}>

        {sidebarOpen && (
          <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.logo}><span className={styles.logoText}>what-d<ClockAlert className={styles.logoIcon} /></span></div>
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
            <button className={styles.burger} onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>

            <Greeting />

            <div className={styles.headerRight}>
              {/* View toggle */}
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
                  onClick={() => setView('list')}
                  title="List view"
                >
                  <LayoutList size={16} />
                </button>
                <button
                  className={`${styles.viewBtn} ${view === 'calendar' ? styles.viewBtnActive : ''}`}
                  onClick={() => setView('calendar')}
                  title="Calendar view"
                >
                  <CalendarDays size={16} />
                </button>
                <button
                  className={`${styles.viewBtn} ${pomodoroOpen ? styles.viewBtnActive : ''}`}
                  onClick={() => setPomodoroOpen(o => !o)}
                  title="Pomodoro timer"
                >
                  <Timer size={16} />
                </button>
              </div>

              <button className={styles.notesToggle} onClick={() => setNotesOpen(o => !o)} title='Sticky Notes'>
                <NotebookPen size={18} />
              </button>

            </div>
          </header>

          <section className={styles.tasksSection}>
            {view === 'list' ? <TaskList /> : <CalendarView />}
          </section>
        </main>

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

        {pomodoroOpen && (
          <>
            <div className={styles.overlay} onClick={() => setPomodoroOpen(false)} />
            <aside className={`${styles.notesDrawer} ${styles.pomodoroDrawer} ${pomodoroOpen ? styles.notesDrawerOpen : ''}`}>
              <Pomodoro onClose={() => setPomodoroOpen(false)} />
            </aside>
          </>
        )}

      </div>
    </SessionGuard>
  );
}