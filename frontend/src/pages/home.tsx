import { useState, useEffect, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Greeting from '@/components/layout/greetings';
import ClockWidget from '@/components/widgets/clock';
import TaskList from '@/components/tasks/tasklist';
import CalendarView from '@/components/layout/calendarview';
import StatsWidget from '@/components/widgets/stats';
import StickyNotes from '@/components/widgets/stickynote';
import Categories from '@/components/categories/categorypanel';
import UserNav from '@/components/layout/usernav';
import styles from './home.module.css';
import { Menu, X, NotebookPen, LayoutList, CalendarDays, BellCheck, AlarmClockCheck, FolderOpen } from 'lucide-react';
import SessionGuard from '@/components/layout/sessionguard';
import LevelUpToast from '@/components/layout/leveluptoast';
import Pomodoro from '../components/widgets/pomodoro';
import { BellOff } from 'lucide-react';
import AlarmModal from '@/components/layout/alarmmodal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import ShortcutsModal from '@/components/layout/shortcutsmodal';
import Heatmap from '@/components/widgets/heatmap';
import GuestBanner from '@/components/layout/guestbanner';
import { useAppStore } from '@/store/useAppStore';
import MediaHub from '@/components/layout/mediahub';

type View = 'list' | 'calendar';
interface Props {
  children:                                 ReactNode;
  enabled?:                                 boolean;
}
export function Logo(){
  return(
    <div>
        <div className={styles.logo}><span className={styles.logoText}>what-d<AlarmClockCheck className={styles.logoIcon} /></span></div>
    </div>
  
  )
}
export default function Dashboard() {

  const [sidebarOpen, setSidebarOpen]      = useState(false);
  const [notesOpen, setNotesOpen]          = useState(false);
  const [view, setView]                    = useState<View>('list');
  const pomodoroOpen    = useAppStore(s => s.pomodoroOpen);
  const setPomodoroOpen = useAppStore(s => s.setPomodoroOpen);
  const location                           = useLocation();
  const [notifStatus, setNotifStatus]      = useState(Notification.permission);
  const [shortcutsOpen, setShortcutsOpen]  = useState(false);
  const [addOpen, setAddOpen]              = useState(false);
  const isGuest                            = useAppStore(s=>s.isGuest)
  const [mediaOpen, setMediaOpen]          = useState(false);
  const setFocusTask = useAppStore(s => s.setFocusTask);
  const pomodoroQueue = useAppStore(s => s.pomodoroQueue);

  const handleViewTask = (taskId: number) => {
    setFocusTask(taskId);
    setView('list');
  };

  useKeyboardShortcuts({
    onNewTask:       () => setAddOpen(true),
    onToggleNotes:   () => setNotesOpen(o => !o),
    onTogglePomodoro: () => setPomodoroOpen(o => !o),
    onToggleView:    () => setView(v => v === 'list' ? 'calendar' : 'list'),
  });

  useEffect(() => {
    const handler = () => setShortcutsOpen(true);
    window.addEventListener('show-shortcuts', handler);
    return () => window.removeEventListener('show-shortcuts', handler);
  }, []);
  const requestNotifs = async () => {
    const result = await Notification.requestPermission();
    setNotifStatus(result);
  };


  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const rememberMe = localStorage.getItem('rememberMe') === '1';
  return (
    <SessionGuard enabled={!rememberMe}>
      <LevelUpToast />
      <AlarmModal />
      <GuestBanner />

      <div className={styles.layout}>

        {sidebarOpen && (
          <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <Link to="/landing"><Logo/></Link>
          <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
          <div className={styles.sideSection}><ClockWidget /></div>
          <div className={styles.sideSection}><StatsWidget /></div>
          {!isGuest && (<div className={styles.sideSection}><Heatmap /></div>)}
          <div className={`${styles.sideSection} ${styles.sideSectionGrow}`}>
            <Categories onNavigate={() => setSidebarOpen(false)} />
          </div>
          <div className={styles.sidebarFooter}>
            <UserNav />
            <button
              className={styles.alarmBtn}
              onClick={requestNotifs}
              disabled={notifStatus === 'denied'}
              title={
                notifStatus === 'granted' ? 'Notifications Enabled'
                : notifStatus === 'denied' ? 'Blocked — check browser settings'
                : 'Enable deadline notifications'
              }
              style={{ opacity: notifStatus === 'denied' ? 0.4 : 1 }}
            >
              {notifStatus === 'denied' ? <BellOff size={18} /> : <BellCheck size={18} />}
            </button>
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
              </div>
              <button
                className={`${styles.pomToggle} ${pomodoroOpen ? styles.viewBtnActive : ''}`}
                onClick={() => setPomodoroOpen(!pomodoroOpen)}
                title="Pomodoro timer"
              >
                  🍅︎
                  {pomodoroQueue.length > 0 && <span className={styles.pomBadge}>{pomodoroQueue.length}</span>}
              </button>

              <button className={styles.notesToggle} onClick={() => setNotesOpen(o => !o)} title='Sticky Notes'>
                <NotebookPen size={18} />
              </button>

              <button className={styles.notesToggle} onClick={() => setMediaOpen(o => !o)} title='Media Hub'>
                <FolderOpen size={18} />
              </button>

            </div>
          </header>

          <section className={styles.tasksSection}>
            {view === 'list' ? <TaskList addOpen={addOpen} setAddOpen={setAddOpen} /> : <CalendarView onViewTask={handleViewTask} />}
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

        {mediaOpen && (
          <div className={styles.overlay} onClick={() => setMediaOpen(false)} />
        )}
        <aside className={`${styles.notesDrawer} ${mediaOpen ? styles.notesDrawerOpen : ''}`}>
          <div className={styles.notesDrawerHeader}>
            <span className={styles.notesDrawerTitle}>Media Hub</span>
            <button className={styles.notesDrawerClose} onClick={() => setMediaOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.notesDrawerBody}>
            <MediaHub />
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
        
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      </div>

    </SessionGuard>
  );
}