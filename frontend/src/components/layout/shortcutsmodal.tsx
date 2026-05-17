import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './shortcutsmodal.module.css';

const SHORTCUTS = [
  { key: 'N',   desc: 'New task' },
  { key: 'P',   desc: 'Toggle Pomodoro' },
  { key: 'M',   desc: 'Toggle sticky notes' },
  { key: 'V',   desc: 'Toggle list / calendar view' },
  { key: '1',   desc: 'Show all tasks' },
  { key: '2',   desc: 'Show active tasks' },
  { key: '3',   desc: 'Show completed tasks' },
  { key: 'Esc', desc: 'Clear search' },
  { key: '?',   desc: 'Show this help' },
];

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const trapRef = useFocusTrap(true);
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
        <div
        ref={trapRef}
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        >
        <h3 className={styles.title}>Keyboard Shortcuts</h3>
        {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className={styles.row}>
            <span className={styles.desc}>{desc}</span>
            <kbd className={styles.kbd}>{key}</kbd>
            </div>
        ))}
        <button className={styles.closeBtn} onClick={onClose}>Close</button>
        </div>
    </div>,
    document.body
    );
}