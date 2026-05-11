import { useEffect, useState } from 'react';
import { getAdminStats } from '@/api/services';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { getAdminUsers, adminUnlockUser } from '@/api/services';
// ─── Shared stat card ────────────────────────────────────────────────────────

function StatCard({
  label, value, color = 'var(--accent-primary)', sub,
}: {
  label: string; value: any; color?: string; sub?: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 16,
      padding: '20px 24px',
      minWidth: 110,
      flex: 1,
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      {sub && (
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, opacity: 0.7 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: any }) {
  const { users, tasks, pomodoros_today, signups_by_day } = stats;

  return (
    <>
      {/* Summary cards */}
      <section style={{ marginBottom: 32 }}>
        <h2>Overview</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          <StatCard label="Total Users"     value={users.total} />
          <StatCard label="Active (7d)"     value={users.active_7d}     color="var(--accent-tertiary)" />
          <StatCard label="Total Tasks"     value={tasks.total}          color="var(--accent-secondary)" />
          <StatCard label="Completion %"    value={tasks.completion_rate + '%'} color="var(--accent-secondary)" />
          <StatCard label="🍅 Pomodoros Today" value={pomodoros_today} />
        </div>
      </section>

      {/* Signups chart */}
      <section style={{ marginBottom: 32 }}>
        <h2>Signups (last 7 days)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={signups_by_day}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
            <YAxis  tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="count" stroke="var(--accent-primary)" strokeWidth={2} dot={{ fill: 'var(--accent-primary)' }} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </>
  );
}

// ─── Tab: Users ───────────────────────────────────────────────────────────────

function UsersTab({ stats }: { stats: any }) {
  const { users, level_distribution } = stats;          // ← kept from old version

  // New: live user table with unlock
  const [userList, setUserList] = useState<any[]>([]);
  useEffect(() => { getAdminUsers().then(r => setUserList(r.data)); }, []);

  const unlock = (id: number) =>
    adminUnlockUser(id).then(() =>
      setUserList(u => u.map(x => x.id === id ? { ...x, locked: false, failed_attempts: 0 } : x))
    );

  return (
    <>
      {/* ── Stat cards (kept from old UsersTab) ── */}
      <section style={{ marginBottom: 32 }}>
        <h2>Users</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          <StatCard label="Total Users" value={users.total} />
          <StatCard
            label="Active (7d)"
            value={users.active_7d}
            color="var(--accent-tertiary)"
            sub={`${Math.round(users.active_7d / users.total * 100)}% of total`}
          />
          <StatCard label="Locked" value={users.locked} color="var(--danger)" />
        </div>
      </section>

      {/* ── Level distribution (kept from old UsersTab) ── */}
      <section style={{ marginBottom: 32 }}>
        <h2>Level Distribution</h2>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={level_distribution}>
            <XAxis dataKey="level" tickFormatter={l => `Lv${l}`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* ── Live user table (new) ── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Recent Users</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['User', 'Joined', 'Last Login', 'Level', 'XP', 'Streak', 'Status', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {userList.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.joined}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.last_login ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>{u.level}</td>
                <td style={{ padding: '10px 12px', color: 'var(--accent-primary)' }}>{u.xp}</td>
                <td style={{ padding: '10px 12px', color: '#f59e0b' }}>{u.streak > 0 ? `${u.streak}🔥` : '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  {u.locked
                    ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>🔒 Locked</span>
                    : <span style={{ color: 'var(--accent-tertiary)' }}>✓ OK</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {u.locked && (
                    <button onClick={() => unlock(u.id)} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem',
                      background: 'rgba(255,68,68,0.1)', border: '1px solid var(--danger)',
                      color: 'var(--danger)', cursor: 'pointer',
                    }}>Unlock</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
// ─── Tab: Leaderboard ─────────────────────────────────────────────────────────

function LeaderboardTab({ stats }: { stats: any }) {
  const { xp_leaderboard, streak_leaderboard } = stats;

  const tableStyle: React.CSSProperties = {
    width: '100%', marginTop: 12, borderCollapse: 'collapse', fontSize: '0.82rem',
  };
  const thStyle: React.CSSProperties = { color: 'var(--text-muted)', textAlign: 'left', padding: '4px 8px' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* XP */}
      <section>
        <h2>XP Leaderboard</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>User</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>XP</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Lv</th>
            </tr>
          </thead>
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

      {/* Streak */}
      <section>
        <h2>Streak Leaderboard</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>User</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Streak</th>
            </tr>
          </thead>
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
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<'overview' | 'users' | 'leaderboard'>('overview');
  const [stats, setStats]           = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading]       = useState(false);

  const refresh = () => {
    setLoading(true);
    getAdminStats()
      .then(r => { setStats(r.data); setLastUpdated(new Date()); })
      .finally(() => setLoading(false));
  };

  // Single effect – removed the duplicate
  useEffect(() => { refresh(); }, []);

  if (!stats) return <div style={{ padding: 32 }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* ── Sidebar ── */}
      <nav style={{
        width: 200,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '24px 12px',
        display: 'flex', flexDirection: 'column', gap: 4,
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)', padding: '0 12px 20px' }}>
          ⚙ Admin
        </div>

        {(['overview', 'users', 'leaderboard'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 12px', borderRadius: 8, textAlign: 'left',
            fontSize: '0.82rem', fontWeight: tab === t ? 600 : 400,
            background: tab === t ? 'rgba(124,106,255,0.1)' : 'transparent',
            color:      tab === t ? 'var(--accent-primary)' : 'var(--text-muted)',
            border:     tab === t ? '1px solid var(--border-accent)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all 150ms',
          }}>
            {{ overview: '📊 Overview', users: '👥 Users', leaderboard: '🏆 Leaderboard' }[t]}
          </button>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main style={{ flex: 1, padding: 32, overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <h1 style={{ color: 'var(--accent-primary)', margin: 0 }}>Admin Dashboard</h1>
          <button onClick={refresh} disabled={loading} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem',
            background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>
            {loading ? '…' : '↻ Refresh'}
          </button>
          {lastUpdated && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Tab content */}
        {tab === 'overview'    && <OverviewTab    stats={stats} />}
        {tab === 'users'       && <UsersTab       stats={stats} />}
        {tab === 'leaderboard' && <LeaderboardTab stats={stats} />}
      </main>
    </div>
  );
}