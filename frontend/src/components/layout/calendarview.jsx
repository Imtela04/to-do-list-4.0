import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { createTask, deleteTask, toggleTask, getTasks } from '@/api/services';
import { ChevronLeft, ChevronRight, Plus, X, Check, Lock } from 'lucide-react';
import styles from './calendarview.module.css';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const PRIORITY_COLORS = {
  low: '#6ab4ff', medium: '#6affdc', high: '#ffaa6a', critical: '#ff6a6a',
};

export default function CalendarView() {
  const queryClient = useQueryClient();
  const limits      = useAppStore(s => s.limits);
  const level       = useAppStore(s => s.level);

  const { data: tasks = [] } = useTasksQuery();

  const [calMonth, setCalMonth]       = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [newTitle, setNewTitle]       = useState('');
  const [adding, setAdding]           = useState(false);
  const [limitError, setLimitError]   = useState(null);

  const year  = calMonth.getFullYear();
  const month = calMonth.getMonth();

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calCells    = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const today       = new Date();
  const tasksLocked = limits.tasks !== null && tasks.length >= limits.tasks;

  const tasksByDay = {};
  tasks.forEach(t => {
    if (!t.deadline) return;
    const d = new Date(t.deadline);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    if (!tasksByDay[day]) tasksByDay[day] = [];
    tasksByDay[day].push(t);
  });

  const selectedTasks = selectedDay ? (tasksByDay[selectedDay.day] || []) : [];

  const addMutation = useMutation({
    mutationFn: (payload) => createTask(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(['tasks'], old => [res.data, ...(old ?? [])]);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTitle('');
      setAdding(false);
    },
    onError: (err) => {
      if (err.response?.status === 403 && err.response?.data?.limit_reached) {
        setLimitError(err.response.data.detail);
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) => toggleTask(id, completed),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], old =>
        old?.map(t => t.id === id ? { ...t, completed } : t) ?? []
      );
      return { previous };
    },
    onError:   (err, vars, ctx) => queryClient.setQueryData(['tasks'], ctx.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], old => old?.filter(t => t.id !== id) ?? []);
      return { previous };
    },
    onError:   (err, vars, ctx) => queryClient.setQueryData(['tasks'], ctx.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleDayClick = (day) => {
    if (!day) return;
    if (selectedDay?.day === day && selectedDay?.month === month && selectedDay?.year === year) {
      setSelectedDay(null);
    } else {
      setSelectedDay({ year, month, day });
    }
    setNewTitle('');
    setAdding(false);
  };

  const handleAddTask = () => {
    if (!newTitle.trim() || !selectedDay) return;
    if (tasksLocked) { setLimitError(`Reach Level ${level + 1} to add more tasks`); return; }
    setLimitError(null);
    const deadline = new Date(selectedDay.year, selectedDay.month, selectedDay.day, 23, 59, 0, 0);
    addMutation.mutate({ title: newTitle.trim(), deadline: deadline.toISOString(), completed: false });
  };

  const prevMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday   = () => { setCalMonth(new Date()); setSelectedDay(null); };
  const isToday    = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (day) => selectedDay?.day === day && selectedDay?.month === month && selectedDay?.year === year;

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.grid} ${selectedDay ? styles.gridNarrow : ''}`}>
        <div className={styles.header}>
          <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={16} /></button>
          <button className={styles.monthLabel} onClick={goToday}>{MONTHS[month]} {year}</button>
          <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={16} /></button>
        </div>
        <div className={styles.dayNames}>
          {DAYS_SHORT.map(d => <div key={d} className={styles.dayName}>{d}</div>)}
        </div>
        <div className={styles.cells}>
          {calCells.map((day, i) => {
            const dayTasks = day ? (tasksByDay[day] || []) : [];
            const active   = dayTasks.filter(t => !t.completed);
            const done     = dayTasks.filter(t => t.completed);
            return (
              <div
                key={i}
                className={`${styles.cell} ${!day ? styles.empty : ''} ${day && isToday(day) ? styles.today : ''} ${day && isSelected(day) ? styles.selected : ''} ${day && dayTasks.length > 0 ? styles.hasTasks : ''}`}
                onClick={() => handleDayClick(day)}
              >
                {day && (
                  <>
                    <span className={styles.dayNum}>{day}</span>
                    <div className={styles.pills}>
                      {active.slice(0, 3).map(t => (
                        <span key={t.id} className={styles.pill} style={{ background: PRIORITY_COLORS[t.priority] || 'var(--accent-primary)' }} title={t.title}>
                          {t.title}
                        </span>
                      ))}
                      {active.length > 3 && <span className={styles.pillMore}>+{active.length - 3}</span>}
                      {done.length > 0 && active.length === 0 && <span className={styles.pillDone}>✓ {done.length}</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelDay}>{DAYS_SHORT[new Date(selectedDay.year, selectedDay.month, selectedDay.day).getDay()]}</p>
              <p className={styles.panelDate}>{MONTHS[selectedDay.month]} {selectedDay.day}, {selectedDay.year}</p>
            </div>
            <button className={styles.panelClose} onClick={() => setSelectedDay(null)}><X size={15} /></button>
          </div>
          <div className={styles.panelTasks}>
            {selectedTasks.length === 0 && !adding && <p className={styles.panelEmpty}>No tasks for this day</p>}
            {selectedTasks.map(task => (
              <div key={task.id} className={`${styles.panelTask} ${task.completed ? styles.panelTaskDone : ''}`}>
                <button className={styles.panelToggle} onClick={() => toggleMutation.mutate({ id: task.id, completed: !task.completed })}>
                  {task.completed ? <Check size={11} /> : <span className={styles.toggleDot} />}
                </button>
                <span className={styles.panelTaskTitle}>{task.title}</span>
                {task.priority && <span className={styles.panelPrio} style={{ background: PRIORITY_COLORS[task.priority] }} />}
                <button className={styles.panelDelete} onClick={() => deleteMutation.mutate(task.id)}><X size={11} /></button>
              </div>
            ))}
            {limitError && <div className={styles.limitError}><Lock size={12} /><span>{limitError}</span></div>}
            {adding ? (
              <div className={styles.addRow}>
                <input
                  autoFocus
                  className={styles.addInput}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setAdding(false); }}
                  placeholder="Task title..."
                />
                <button className={styles.addConfirm} onClick={handleAddTask}><Check size={13} /></button>
                <button className={styles.addCancel} onClick={() => setAdding(false)}><X size={13} /></button>
              </div>
            ) : (
              <button
                className={`${styles.addBtn} ${tasksLocked ? styles.addBtnLocked : ''}`}
                onClick={() => {
                  if (tasksLocked) { setLimitError(`Reach Level ${level + 1} to add more tasks`); return; }
                  setAdding(true);
                  setLimitError(null);
                }}
              >
                {tasksLocked ? <Lock size={13} /> : <Plus size={13} />}
                {tasksLocked ? 'Locked' : 'Add task'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}