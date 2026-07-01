import { useNoteComposer } from '@/hooks/useNoteComposer';
import { useAppStore } from '@/store/useAppStore';
import { Lock } from 'lucide-react';
import styles from './stickynote.module.css'; // reuse .noteForm, .textarea, .colorRow etc.
import ModalShell from '../common/moduleshell';

export default function QuickNote({ onClose }: { onClose: () => void }) {
  const limits = useAppStore(s => s.limits);
  const counts = useAppStore(s => s.counts);
  const level  = useAppStore(s => s.level);
  const notesLocked = limits.notes !== null && counts.notes >= limits.notes;

  const { editorRef, color, setColor, limitError, hasDraft, handleInput, handleSubmit, isPending, NOTE_COLORS }
    = useNoteComposer(onClose);

  if (notesLocked) {
    return (
      <ModalShell onClose={onClose} maxWidth={360}>
        <p className={styles.limitBanner}><Lock size={12} /> Reach Level {level + 1} to unlock sticky notes</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      <div className={styles.noteForm} style={{ border: 'none', padding: 0, borderLeft: `4px solid ${color}`, paddingLeft: 12 }}>
        {limitError && <div className={styles.limitBanner}><Lock size={12} /><span>{limitError}</span></div>}
        {hasDraft && <div className={styles.draftBadge}><span>📝 Draft restored</span></div>}
        <div
          ref={editorRef}
          className={styles.textarea}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          data-placeholder="Quick note..."
          autoFocus
        />
        <div className={styles.colorRow}>
          {NOTE_COLORS.map(c => (
            <button key={c} className={`${styles.colorDot} ${color === c ? styles.colorSelected : ''}`}
              style={{ background: c }} onClick={() => setColor(c)} />
          ))}
          <div style={{ flex: 1 }} />
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSubmit} disabled={isPending}>
            {isPending ? '...' : 'Save'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}