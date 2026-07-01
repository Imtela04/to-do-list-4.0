import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Greeting from '@/components/layout/greetings';
import ClockWidget from '@/components/widgets/clock';
import TaskList from '@/components/tasks/tasklist';
import CalendarView from '@/components/layout/calendarview';
import StatsWidget from '@/components/widgets/stats';
import Categories from '@/components/categories/categorypanel';
import UserNav from '@/components/layout/usernav';
import styles from './home.module.css';
import { Menu, X, LayoutList, CalendarDays, Kanban, BellCheck, AlarmClockCheck, ChevronDown, ChevronRight, Timer } from 'lucide-react';
import SessionGuard from '@/components/layout/sessionguard';
import LevelUpToast from '@/components/layout/leveluptoast';
import Pomodoro from '../components/widgets/pomodoro/pomodoro';
import { BellOff } from 'lucide-react';
import AlarmModal from '@/components/layout/alarmmodal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import ShortcutsModal from '@/components/layout/shortcutsmodal';
import Heatmap from '@/components/widgets/heatmap';
import GuestBanner from '@/components/layout/guestbanner';
import { useAppStore } from '@/store/useAppStore';
import MediaHub from '@/components/layout/mediahub';
import KanbanView from '@/components/tasks/kanbanview';
import SpeedDial from '@/components/layout/speeddial';
import AddTask from '@/components/tasks/addtask';
import QuickNote from '@/components/widgets/notes/quicknote';
import NotesBoard from '@/components/widgets/notes/notesboard';
import { usePomodoroEngine } from '@/hooks/usePomodoroEngine';
import PomodoroPill from '@/components/widgets/pomodoro/pomodoropill';

export function Logo(){
  return(
    <div>
      <div className={styles.logo}><span className={styles.logoText}>what-d<AlarmClockCheck className={styles.logoIcon} /></span></div>
    </div>
  
  )
}
export default function Dashboard() {

  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [notesOpen, setNotesOpen]               = useState(false);
  const view                                    = useAppStore(s => s.view);
  const setView                                 = useAppStore(s => s.setView);
  const lastView                                = useAppStore(s => s.lastView);
  const pomodoroOpen                            = useAppStore(s => s.pomodoroOpen);
  const setPomodoroOpen                         = useAppStore(s => s.setPomodoroOpen);
  const location                                = useLocation();
  const [notifStatus, setNotifStatus]           = useState(Notification.permission);
  const [shortcutsOpen, setShortcutsOpen]       = useState(false);
  const [addOpen, setAddOpen]                   = useState(false);
  const isGuest                                 = useAppStore(s=>s.isGuest)
  const [mediaExpanded, setMediaExpanded]       = useState(true);
  const [clockExpanded, setClockExpanded]       = useState(true);
  const [statsExpanded, setStatsExpanded]       = useState(true);
  const [heatmapExpanded, setHeatmapExpanded]   = useState(true);
  const [catExpanded, setCatExpanded]           = useState(true);
  const setFocusTask                            = useAppStore(s => s.setFocusTask);
  const [quickNoteOpen, setQuickNoteOpen]       = useState(false);

  usePomodoroEngine();

  const handleViewTask = (taskId: number) => {
    setFocusTask(taskId);
    setView('list');
  };

  useKeyboardShortcuts({
    onNewTask:       () => setAddOpen(true),
    onToggleNotes:   () => setNotesOpen(o => !o),
    onTogglePomodoro: () => setView(view === 'pomodoro' ? lastView : 'pomodoro'),
    onToggleView: () => setView(
      view === 'list'     ? 'calendar' :
      view === 'calendar' ? 'kanban'   :
      view === 'kanban'   ? 'pomodoro' :
      'list'
    ),
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
      <PomodoroPill onOpen={() => setView('pomodoro')} />
      <SpeedDial
        onAddTask={() => setAddOpen(true)}
        onQuickNote={() => setQuickNoteOpen(true)}
      />
      {quickNoteOpen && <QuickNote onClose={() => setQuickNoteOpen(false)}/>}
      <AddTask open={addOpen} setOpen={setAddOpen} />

      <GuestBanner />

      <div className={styles.layout}>

        {sidebarOpen && (
          <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <Link to="/landing"><Logo/></Link>
          <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>
            <X size={14} strokeWidth={1.75} />
          </button>          
          <div className={`${styles.sideSection} ${styles.sideSectionGrow} ${styles.sectionList}`}>

            <div className={styles.sectionBlock}>
              <button className={styles.sectionToggle} onClick={() => setClockExpanded(o => !o)}>
                <span><ChevronRight size={15}/>Clock</span>
                <ChevronDown size={13} className={clockExpanded ? styles.chevronOpen : styles.chevron} />
              </button>
              {clockExpanded && <div className={styles.sectionContent}><ClockWidget /></div>}
            </div>

            <div className={styles.sectionBlock}>
              <button className={styles.sectionToggle} onClick={() => setStatsExpanded(o => !o)}>
                <span><ChevronRight size={15}/>Stats</span>
                <ChevronDown size={13} className={statsExpanded ? styles.chevronOpen : styles.chevron} />
              </button>
              {statsExpanded && <div className={styles.sectionContent}><StatsWidget /></div>}
            </div>

            {!isGuest && (
              <div className={styles.sectionBlock}>
                <button className={styles.sectionToggle} onClick={() => setHeatmapExpanded(o => !o)}>
                  <span><ChevronRight size={15}/>Activity</span>
                  <ChevronDown size={13} className={heatmapExpanded ? styles.chevronOpen : styles.chevron} />
                </button>
                {heatmapExpanded && <div className={styles.sectionContent}><Heatmap /></div>}
              </div>
            )}

            <div className={styles.sectionBlock}>
              <button className={styles.sectionToggle} onClick={() => setCatExpanded(o => !o)}>
                <span><ChevronRight size={15}/>Categories</span>
                <ChevronDown size={13} className={catExpanded ? styles.chevronOpen : styles.chevron} />
              </button>
              {catExpanded && (
                <div className={styles.sectionContent}>
                  <Categories onNavigate={() => setSidebarOpen(false)} />
                </div>
              )}
            </div>

            <div className={styles.sectionBlock}>
              <button className={styles.sectionToggle} onClick={() => setMediaExpanded(o => !o)}>
                <span><ChevronRight size={15}/>Media Hub</span>
                <ChevronDown size={13} className={mediaExpanded ? styles.chevronOpen : styles.chevron} />
              </button>
              {mediaExpanded && <div className={styles.sectionContent}><MediaHub /></div>}
            </div>

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
                <button
                  className={`${styles.viewBtn} ${view === 'kanban' ? styles.viewBtnActive : ''}`}
                  onClick={() => setView('kanban')}
                  title="Kanban view"
                >
                  <Kanban size={16} />
                </button>
                <button
                  className={`${styles.viewBtn} ${view === 'pomodoro' ? styles.viewBtnActive : ''}`}
                  onClick={() => setView('pomodoro')}
                  title="Pomodoro view"
                >
                  <Timer size={16} />
                </button>

              </div>
            </div>
          </header>

          <section className={styles.tasksSection}>
            {view === 'list'     ? <TaskList/>
            : view === 'calendar' ? <CalendarView onViewTask={handleViewTask} />
            : view === 'kanban'   ? <KanbanView onViewTask={handleViewTask} />
            : <Pomodoro />}
          </section>

        </main>

        {notesOpen && <NotesBoard onClose={() => setNotesOpen(false)} />}

        {pomodoroOpen && (
          <>
            <div className={styles.overlay} onClick={() => setPomodoroOpen(false)} />
            <aside className={`${styles.notesDrawer} ${styles.pomodoroDrawer} ${pomodoroOpen ? styles.notesDrawerOpen : ''}`}>
              <Pomodoro/>
            </aside>
          </>
        )}
        
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      </div>

    </SessionGuard>
  );
}