import { createPortal } from 'react-dom';
import styles from './modalshell.module.css';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { X } from 'lucide-react';

export default function ModalShell({ onClose, maxWidth, children }: { onClose: () => void; maxWidth?: number; children: React.ReactNode }) {
  useEscapeKey(onClose, true);
    return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} style={maxWidth ? { maxWidth } : undefined} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} title="Close">
          <X size={15} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}