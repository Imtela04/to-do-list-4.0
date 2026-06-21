import styles from './skeleton.module.css';

export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <div className={`${styles.shimmer} ${styles.line}`} style={{ width }} />;
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <div className={`${styles.shimmer} ${styles.circle}`} style={{ width: size, height: size }} />;
}

export function SkeletonTaskCard() {
  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <SkeletonCircle size={20} />
        <div style={{ flex: 1 }}><SkeletonLine width="70%" /></div>
      </div>
    </div>
  );
}