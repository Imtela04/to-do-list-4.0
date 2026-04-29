import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import styles from './greetings.module.css';
import { isToday } from 'date-fns';
import { PenLine } from 'lucide-react';

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function getMotivation(completedCount, totalCount) {
  if (totalCount === 0) return "Ready to conquer the day?";
  const ratio = completedCount / totalCount;
  if (ratio === 0) return "Let's get started! You've got this.";
  if (ratio < 0.3) return "Great start — keep the momentum going!";
  if (ratio < 0.6) return "You're making real progress today.";
  if (ratio < 1) return "Almost there — finish strong!";
  return "Incredible — all tasks done! 🎉";
}


export default function Greeting() {
  const { state, dispatch } = useApp();
  const [editing, setEditing] = useState(false);
  
  const displayName = state.greeting || state.username || '';
  
  //derive from state, not frozen initial value
  const [nameInput, setNameInput] = useState('');
  
  //sync input when state.username arrives (after loadUsername resolves)
  useEffect(() => {
    setNameInput(state.greeting || state.username || '');
  }, [state.username, state.greeting]);

  const todayTasks  = state.tasks.filter(t => t.deadline && isToday(new Date(t.deadline)));
  const completed   = todayTasks.filter(t => t.completed).length;
  const total       = todayTasks.length;


  const handleSave = () => {
    const name = nameInput.trim() || state.username;
    dispatch({ type: 'SET_GREETING', payload: name });
    setEditing(false);
  };
  return (
    <div className={styles.greeting}>
      <div className={styles.topLine}>
        <span className={styles.timeGreeting}>{getTimeGreeting()},</span>
        {editing ? (
          <span className={styles.nameEdit}>
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              className={styles.nameInput}
              placeholder="Your name"
              maxLength={20}
            />
            <button className={styles.saveBtn} onClick={handleSave}>✓</button>
          </span>
        ) : (
          <span className={styles.nameLine}>
            <span className={styles.name}>{displayName}</span>
            <button className={styles.editBtn} onClick={() => setEditing(true)} title="Edit name"><PenLine size={12}/></button>
          </span>
        )}
      </div>
      <p className={styles.motivation}>{getMotivation(completed, total)}</p>
      {total > 0 && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      )}
      {total > 0 && (
        <span className={styles.stats}>{completed}/{total} tasks completed today</span>
      )}
    </div>
  );
}
