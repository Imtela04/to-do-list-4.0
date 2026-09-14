import { useNoteComposer } from '@/hooks/useNoteComposer';
import { useAppStore } from '@/store/useAppStore';
import { Lock, LayoutDashboard } from 'lucide-react';
import styles from './stickynote.module.css'; // reuse .noteForm, .textarea, .colorRow etc.
import ModalShell from '../../common/moduleshell';
import { useEffect } from 'react';
import { useTasksQuery } from '@/hooks/useTasksQuery';

export default function QuickNote({ onClose, onOpenBoard }: { onClose: () => void; onOpenBoard: () => void }) {

  const limits = useAppStore(s => s.limits);
  const counts = useAppStore(s => s.counts);
  const level  = useAppStore(s => s.level);
  const notesLocked = limits.notes !== null && counts.notes >= limits.notes;
  const { data: tasks = [] }                  = useTasksQuery();

  const { editorRef, color, setColor, limitError, hasDraft, handleInput, handleSubmit, isPending, NOTE_COLORS, linkedTaskId, setLinkedTaskId }
    = useNoteComposer(onClose);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);
  
  if (notesLocked) {
    return (
      <ModalShell onClose={onClose} maxWidth={360}>
        <p className={styles.limitBanner}><Lock size={12} /> Reach Level {level + 1} to unlock sticky notes</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      <div className={styles.quickNoteHeader}>
        <button className={styles.noteBtn} onClick={onOpenBoard} title="Open notes board">
          <LayoutDashboard size={14} />
        </button>
      </div>
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
        />
        <select
          className={styles.taskLinkSelect}
          value={linkedTaskId ?? ''}
          onChange={e => setLinkedTaskId(e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">No linked task</option>
          {tasks.filter(t => !t.completed).map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
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