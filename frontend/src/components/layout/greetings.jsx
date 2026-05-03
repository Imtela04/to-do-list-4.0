import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './greetings.module.css';
import { isToday } from 'date-fns';
import { PenLine } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';  // add this
import { useTasksQuery } from '@/hooks/useTasksQuery';          // add this

function getTimeGreeting(allDone) {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return allDone ? 'Good night' : 'Good evening';
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
  const greeting    = useAppStore(s => s.greeting);
  const username    = useAppStore(s => s.username);
  const { data: tasks = [] } = useTasksQuery();
  const setGreeting = useAppStore(s => s.setGreeting);

  const [editing, setEditing]     = useState(false);
  const [nameInput, setNameInput] = useState('');

  const displayName = greeting || username || '';

  useEffect(() => {
    setNameInput(greeting || username || '');
  }, [username, greeting]);

  const todayTasks = tasks.filter(t => t.deadline && isToday(new Date(t.deadline)));
  const completed  = todayTasks.filter(t => t.completed).length;
  const total      = todayTasks.length;
  const allDone    = total > 0 && completed === total;

  const handleSave = () => {
    const name = nameInput.trim() || username;
    setGreeting(name);
    setEditing(false);
  };

  return (
    <div className={styles.greeting}>
      <div className={styles.topLine}>
        <span className={styles.timeGreeting}>{getTimeGreeting(allDone)},</span>
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
            <button className={styles.editBtn} onClick={() => setEditing(true)} title="Edit name">
              <PenLine size={12} />
            </button>
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