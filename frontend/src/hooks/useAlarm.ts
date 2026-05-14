import { useEffect } from 'react';
import type { Task } from '@/types';
import { fireAlarmEvent } from '@/components/layout/alarmmodal';

const WARN_MS = 15 * 60 * 1000;

// Module-level — React renders cannot touch these
const scheduledKeys = new Set<string>();
const timerMap      = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleAlarm(key: string, ms: number, title: string, task: Task) {
  if (scheduledKeys.has(key)) return;
  scheduledKeys.add(key);

  const tid = setTimeout(() => {
    try { new Notification(title, { body: task.title, tag: key }); } catch (_) {}
    fireAlarmEvent({ task, type: key.startsWith('warn') ? 'warn' : 'due' });
    scheduledKeys.delete(key);
    timerMap.delete(key);
  }, ms);

  timerMap.set(key, tid);
}

function cancelAlarm(key: string) {
  const tid = timerMap.get(key);
  if (tid !== undefined) {
    clearTimeout(tid);
    timerMap.delete(key);
    scheduledKeys.delete(key);
  }
}

export function useAlarms(tasks: Task[]) {
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const now           = Date.now();
    const activeDueKeys = new Set<string>();
    const activeWarnKeys = new Set<string>();

    tasks
      .filter(t => !t.completed && t.deadline)
      .forEach(t => {
        const dueMs  = new Date(t.deadline!).getTime();
        const dueIn  = dueMs - now;
        const warnIn = dueMs - WARN_MS - now;

        const dueKey  = `due-${t.id}`;
        const warnKey = `warn-${t.id}`;

        activeDueKeys.add(dueKey);
        activeWarnKeys.add(warnKey);

        if (dueIn  > 0) scheduleAlarm(dueKey,  dueIn,  '🔔 Task due now',     t);
        if (warnIn > 0) scheduleAlarm(warnKey, warnIn, '⏰ Due in 15 minutes', t);
      });

    // Cancel alarms for tasks that are now completed or have no deadline
    timerMap.forEach((_, key) => {
      if (!activeDueKeys.has(key) && !activeWarnKeys.has(key)) {
        cancelAlarm(key);
      }
    });

  }, [tasks]);
}