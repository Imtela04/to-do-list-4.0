import { useEffect, useState } from 'react';
import { getAdminStats } from '@/api/services';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    getAdminStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  if (!stats) return <div style={{ padding: 32 }}>Loading...</div>;

  const { users, tasks, level_distribution, xp_leaderboard, streak_leaderboard, signups_by_day, pomodoros_today } = stats;

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ color: 'var(--accent-primary)', marginBottom: 24 }}>Admin Dashboard</h1>

      {/* User metrics */}
      <section style={{ marginBottom: 32 }}>
        <h2>Users</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          {[
            ['Total', users.total], ['Active (7d)', users.active_7d],
            ['Active (30d)', users.active_30d], ['New (7d)', users.new_7d],
            ['Locked', users.locked],
          ].map(([label, val]) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 24px', minWidth: 100 }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{val}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Task metrics */}
      <section style={{ marginBottom: 32 }}>
        <h2>Tasks</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          {[
            ['Total', tasks.total], ['Completed', tasks.completed],
            ['Completion %', tasks.completion_rate + '%'], ['Avg/user', tasks.avg_per_user],
            ['🍅 Today', pomodoros_today],
          ].map(([label, val]) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 24px', minWidth: 100 }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{val}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Level distribution */}
      <section style={{ marginBottom: 32 }}>
        <h2>Level Distribution</h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
          {level_distribution.map((l: any) => (
            <div key={l.level} style={{ textAlign: 'center' }}>
              <div style={{ background: 'var(--accent-primary)', borderRadius: 4, width: 40, height: l.count * 4 + 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700 }}>
                {l.count}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Lv{l.level}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <section>
          <h2>XP Leaderboard</h2>
          <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead><tr style={{ color: 'var(--text-muted)' }}><th style={{ textAlign: 'left', padding: '4px 8px' }}>#</th><th style={{ textAlign: 'left', padding: '4px 8px' }}>User</th><th style={{ textAlign: 'right', padding: '4px 8px' }}>XP</th><th style={{ textAlign: 'right', padding: '4px 8px' }}>Lv</th></tr></thead>
            <tbody>
              {xp_leaderboard.map((u: any, i: number) => (
                <tr key={u.user__username} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ padding: '6px 8px' }}>{u.user__username}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--accent-primary)' }}>{u.xp}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{u.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h2>Streak Leaderboard</h2>
          <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead><tr style={{ color: 'var(--text-muted)' }}><th style={{ textAlign: 'left', padding: '4px 8px' }}>#</th><th style={{ textAlign: 'left', padding: '4px 8px' }}>User</th><th style={{ textAlign: 'right', padding: '4px 8px' }}>Streak</th></tr></thead>
            <tbody>
              {streak_leaderboard.map((u: any, i: number) => (
                <tr key={u.user__username} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ padding: '6px 8px' }}>{u.user__username}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#f59e0b' }}>{u.streak}🔥</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Signups chart (simple) */}
      <section>
        <h2>Signups (last 7 days)</h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
          {signups_by_day.map((d: any) => (
            <div key={d.day} style={{ textAlign: 'center' }}>
              <div style={{ background: 'var(--accent-tertiary)', borderRadius: 4, width: 36, height: d.count * 8 + 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.7rem', fontWeight: 700 }}>
                {d.count}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4 }}>{d.day.slice(5)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}