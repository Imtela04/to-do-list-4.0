import { createPortal } from 'react-dom';
import styles from './modalshell.module.css';

export default function ModalShell({
  onClose, maxWidth, children,
}: { onClose: () => void; maxWidth?: number; children: React.ReactNode }) {
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} style={maxWidth ? { maxWidth } : undefined} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}