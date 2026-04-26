import { AppProvider } from '@/context/AppContext';
import Greeting from '@/components/layout/greetings';
import ClockWidget from '@/components/widgets/clock';
import TaskList from '@/components/tasks/tasklist';
import StatsWidget from '@/components/widgets/stats';
import StickyNotes from '@/components/widgets/stickynote';
import Categories from '@/components/categories/categorypanel';
import styles from './home.module.css';

export default function Dashboard() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          {/* <span className={styles.logoIcon}></span> */}
          <span className={styles.logoText}>what-do</span>
        </div>
        <div className={styles.sideSection}><ClockWidget /></div>
        <div className={styles.sideSection}><StatsWidget /></div>
        <div className={styles.sideSection}><Categories /></div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <Greeting />
          <div className={styles.headerRight}>

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


