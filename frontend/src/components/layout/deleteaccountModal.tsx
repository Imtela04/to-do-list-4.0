import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash, X, AlertTriangle } from 'lucide-react';
import { deleteAccount } from '@/api/services';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './deleteaccountModal.module.css';

interface Props {
  username: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteAccountModal({ username, onClose, onDeleted }: Props) {
  const trapRef = useFocusTrap(true);
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleDelete = async (): Promise<void> => {
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await deleteAccount(password);
      onDeleted();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div 
        className={styles.modal} 
        ref={trapRef} 
        onClick={e => e.stopPropagation()} 
        onKeyDown={e => e.key === 'Escape' && onClose()}
      >
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={15} />
        </button>

        <div className={styles.icon}>
          <AlertTriangle size={22} />
        </div>

        <h2 className={styles.title}>Delete account?</h2>
        <p className={styles.body}>
          This permanently deletes <strong>{username}</strong> and all your tasks,
          categories, and notes. There's no going back.
        </p>

        <input
          type="password"
          className={styles.input}
          placeholder="Enter your password to confirm"
          value={password}
          autoFocus
          onChange={e => { setPassword(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleDelete();}}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={loading || !password.trim()}
          >
            <Trash size={13} />
            {loading ? 'Deleting...' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}