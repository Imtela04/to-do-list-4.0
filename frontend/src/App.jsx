import { AppProvider } from './context/AppContext';
import Greeting from './components/Greeting';
import ClockWidget from './components/ClockWidget';
import TaskList from './components/TaskList';
import StatsWidget from './components/StatsWidget';
import StickyNotes from './components/StickyNotes';
import Categories from './components/Categories';
import styles from './App.module.css';

function Dashboard() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>FlowTask</span>
        </div>
        <div className={styles.sideSection}><ClockWidget /></div>
        <div className={styles.sideSection}><StatsWidget /></div>
        <div className={styles.sideSection}><Categories /></div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <Greeting />
          <div className={styles.headerRight}>
            <span className={styles.apiStatus}>
              <span className={styles.statusDot} />
              API: localhost:8000
            </span>
          </div>
        </header>
        <section className={styles.tasksSection}><TaskList /></section>
      </main>

      <aside className={styles.rightPanel}>
        <StickyNotes />
      </aside>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  );
}
