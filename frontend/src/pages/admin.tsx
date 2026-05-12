import { useEffect, useState } from 'react';
import { getAdminStats } from '@/api/services';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { getAdminUsers, adminUnlockUser } from '@/api/services';
import { Check, Copy, Lock, RefreshCcw, UserStar } from 'lucide-react';
import { Logo } from './home';
import { adminResetXp, adminDeleteUser, adminEditUser } from '@/api/services';

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
  const { users, pomodoros_today, signups_by_day } = stats;

  return (
    <>
      {/* Summary cards */}
      <section style={{ marginBottom: 32 }}>
        <h2>Overview</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          <StatCard label="Total Users"        value={users.total} />
          <StatCard label="Active (7d)"        value={users.active_7d}  color="var(--accent-tertiary)"
            sub={`${Math.round(users.active_7d / Math.max(users.total,1) * 100)}% of total`} />
          <StatCard label="Active (30d)"       value={users.active_30d} color="var(--accent-secondary)"
            sub={`${Math.round(users.active_30d / Math.max(users.total,1) * 100)}% of total`} />
          <StatCard label="New (7d)"           value={users.new_7d}     color="var(--accent-primary)" />
          <StatCard label="🍅 Pomodoros Today" value={pomodoros_today} />        </div>
      </section>

      {/* Signups chart */}
      <section style={{ marginBottom: 32 }}>
        <h2>Signups (last 7 days)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={signups_by_day}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
            <YAxis  tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [value, 'Signups']}
              labelFormatter={(label: string) => `Date: ${label}`}
            />
            <Line type="monotone" dataKey="count" stroke="var(--accent-primary)" strokeWidth={2} dot={{ fill: 'var(--accent-primary)' }} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </>
  );
}

// ─── Tab: Users ───────────────────────────────────────────────────────────────

function UsersTab({ stats }: { stats: any }) {
  const { users, level_distribution } = stats;

  // live user table with unlock
  const [userList, setUserList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterLocked, setFilterLocked] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ xp: 0, streak: 0, email: '' });

  const filtered = userList.filter(u => {
    const matchSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchLocked = filterLocked ? u.locked : true;
    return matchSearch && matchLocked;
  });
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

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <input
          placeholder="Search by username or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: '7px 12px', borderRadius: 8, fontSize: '0.82rem',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)', outline: 'none',
          }}
        />
        <button
          onClick={() => setFilterLocked(f => !f)}
          title='Locked users only'
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer',
            color: filterLocked ? 'var(--priority-medium)' : 'var(--text-muted)',
          }}
        >
          <Lock size={12}/>
        </button>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {filtered.length} / {userList.length}
        </span>
      </div>
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
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email || '—'}</div>
                  <div
                    style={{ fontSize: '0.62rem', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }}
                    title="Click to copy ID"
                    onClick={() => navigator.clipboard.writeText(String(u.id))}
                  >
                    <Copy size={10}/> #{u.id}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.joined}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.last_login ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>{u.level}</td>
                <td style={{ padding: '10px 12px', color: 'var(--accent-primary)' }}>{u.xp}</td>
                <td style={{ padding: '10px 12px', color: '#f59e0b' }}>{u.streak > 0 ? `${u.streak}🔥` : '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  {u.locked
                    ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>🔒 Locked</span>
                    : <span style={{ color: 'var(--accent-tertiary)'}} title='OK'><Check size={20}/></span>}
                </td>
                <td style={{ padding: '10px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {u.locked && (
                    <button onClick={() => unlock(u.id)} style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem',
                      background: 'rgba(255,68,68,0.1)', border: '1px solid var(--danger)',
                      color: 'var(--danger)', cursor: 'pointer',
                    }}>Unlock</button>
                  )}
                  <button onClick={() => {
                    setEditingUser(u);
                    setEditForm({ xp: u.xp, streak: u.streak, email: u.email || '' });
                  }} style={{
                    padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem',
                    background: 'rgba(124,106,255,0.1)', border: '1px solid var(--accent-primary)',
                    color: 'var(--accent-primary)', cursor: 'pointer',
                  }}>Edit</button>
                  <button onClick={async () => {
                    if (!confirm(`Reset XP for ${u.username}?`)) return;
                    await adminResetXp(u.id);
                    setUserList(list => list.map(x => x.id === u.id ? { ...x, xp: 0, level: 1, streak: 0 } : x));
                  }} style={{
                    padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem',
                    background: 'rgba(255,170,106,0.1)', border: '1px solid #ffaa6a',
                    color: '#ffaa6a', cursor: 'pointer',
                  }}>Reset XP</button>
                  {!u.is_staff && (
                    <button onClick={async () => {
                      if (!confirm(`Permanently delete ${u.username}? This cannot be undone.`)) return;
                      await adminDeleteUser(u.id);
                      setUserList(list => list.filter(x => x.id !== u.id));
                    }} style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem',
                      background: 'rgba(255,68,68,0.08)', border: '1px solid var(--danger)',
                      color: 'var(--danger)', cursor: 'pointer',
                    }}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={() => setEditingUser(null)}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
            borderRadius: 16, padding: 28, width: 340, display: 'flex', flexDirection: 'column', gap: 14,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>{editingUser.username}</h3>
            {['username', 'email'].map(field => (
            <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
              {field.toUpperCase()}
              <input
                placeholder={field == 'username' ? editingUser.username : editingUser.email}
                type={field=='email' ? "email":"string"} 
                value={(editForm as any)[field]}
                onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: '0.82rem',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                }}
              />
            </label>
            ))}
            {['xp', 'streak'].map(field => (
              <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
                {field.toUpperCase()}
                <input
                  type="number" min={0}
                  value={(editForm as any)[field]}
                  onChange={e => setEditForm(f => ({ ...f, [field]: parseInt(e.target.value) || 0 }))}
                  style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: '0.82rem',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                  }}
                />
              </label>
            ))}
           
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingUser(null)} style={{
                padding: '7px 16px', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer',
                background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)',
              }}>Cancel</button>
              <button onClick={async () => {
                await adminEditUser(editingUser.id, editForm);
                setUserList(list => list.map(x => x.id === editingUser.id
                  ? { ...x, ...editForm, level: Math.floor(editForm.xp / 50) + 1 }
                  : x
                ));
                setEditingUser(null);
              }} style={{
                padding: '7px 16px', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer',
                background: 'var(--accent-primary)', border: 'none', color: 'white', fontWeight: 600,
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
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

function TasksTab({ stats }: { stats: any }) {
  const { tasks } = stats;
  return (
    <section>
      <h2>Tasks</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, marginBottom: 32 }}>
        <StatCard label="Total" value={tasks.total} />
        <StatCard label="Completed" value={tasks.completed} color="var(--accent-tertiary)" />
        <StatCard label="Avg per User" value={tasks.avg_per_user} color="var(--accent-secondary)" />
        <StatCard label="Completion %" value={tasks.completion_rate + '%'} color="var(--accent-secondary)" />
      </div>
      <div style={{ height: 8, background: 'var(--bg-glass)', borderRadius: 4, overflow: 'hidden', outline: '1px solid var(--border-accent)' }}>
        <div style={{ height: '100%', width: `${tasks.completion_rate}%`, background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-tertiary))', transition: 'width 600ms ease' }} />
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
        {tasks.completed} of {tasks.total} tasks completed
      </p>
    </section>
  );
}
// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<'overview' | 'users' | 'leaderboard' | 'tasks'>('overview');
  const [stats, setStats]           = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading]       = useState(false);


  const [autoRefresh, setAutoRefresh] = useState(false);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh]);

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
        <Logo/>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)', padding: '0 12px 20px' }}>
          <UserStar/> Admin
        </div>

        {(['overview', 'users', 'leaderboard', 'tasks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 12px', borderRadius: 8, textAlign: 'left',
            fontSize: '0.82rem', fontWeight: tab === t ? 600 : 400,
            background: tab === t ? 'rgba(124,106,255,0.1)' : 'transparent',
            color:      tab === t ? 'var(--accent-primary)' : 'var(--text-muted)',
            border:     tab === t ? '1px solid var(--border-accent)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all 150ms',
          }}>
          {{ overview: '📊 Overview', users: '👥 Users', leaderboard: '🏆 Leaderboard', tasks: '✅ Tasks' }[t]}
          </button>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main style={{ flex: 1, padding: 32, overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <h1 style={{ color: 'var(--accent-primary)', margin: 0 }}>Admin Dashboard</h1>
          <button
            onClick={() => setAutoRefresh(r => !r)}
            title='Auto sync'
            style={{
              padding: '6px 0px', fontSize: '0.78rem',
              color: autoRefresh ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer',
              animation:autoRefresh ? 'spin 2s linear infinite': 'none',
            }}
          >
            <RefreshCcw size={16}/>
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
        {tab === 'tasks'       && <TasksTab       stats={stats} />}
      </main>
    </div>
  );
}