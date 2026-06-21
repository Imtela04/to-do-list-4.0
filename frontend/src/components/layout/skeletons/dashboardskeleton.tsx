import { SkeletonLine, SkeletonCircle, SkeletonTaskCard } from './skeleton';
import styles from '@/pages/home.module.css'
export default function DashboardSkeleton() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sideSection}>
          <SkeletonLine width="50%" />
        </div>
        <div className={styles.sideSection}>
          <SkeletonCircle size={72} />
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.header}>
          <SkeletonLine width="220px" />
        </header>
        <section className={styles.tasksSection}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonTaskCard key={i} />)}
        </section>
      </main>
    </div>
  );
}