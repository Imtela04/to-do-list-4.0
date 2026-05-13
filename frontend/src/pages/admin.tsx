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
import { useNavigate } from 'react-router-dom';
import styles from './admin.module.css';

// ─── Shared stat card ────────────────────────────────────────────────────────

function StatCard({
  label, value, color, sub,
}: {
  label: string; value: any; color?: string; sub?: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue} style={color ? { color } : undefined}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

const tooltipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-accent)',
  borderRadius: 8,
  fontSize: 12,
};

// ─── Tab: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: any }) {
  const { users, pomodoros_today, signups_by_day } = stats;

  return (
    <>
      <section className={styles.section}>
        <h2>Overview</h2>
        <div className={styles.statRow}>
          <StatCard label="Total Users"        value={users.total} />
          <StatCard label="Active (7d)"        value={users.active_7d}  color="var(--accent-tertiary)"
            sub={`${Math.round(users.active_7d / Math.max(users.total, 1) * 100)}% of total`} />
          <StatCard label="Active (30d)"       value={users.active_30d} color="var(--accent-secondary)"
            sub={`${Math.round(users.active_30d / Math.max(users.total, 1) * 100)}% of total`} />
          <StatCard label="New (7d)"           value={users.new_7d}     color="var(--accent-primary)" />
          <StatCard label="🍅 Pomodoros Today" value={pomodoros_today} />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Signups (last 7 days)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={signups_by_day}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
            <YAxis  tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Signups']} labelFormatter={(l) => `Date: ${l}`} />
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

  const [userList, setUserList]   = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [filterLocked, setFilterLocked] = useState(false);
  const [editingUser, setEditingUser]   = useState<any | null>(null);
  const [editForm, setEditForm]         = useState({ xp: 0, streak: 0, email: '' });

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
      <section className={styles.section}>
        <h2>Users</h2>
        <div className={styles.statRow}>
          <StatCard label="Total Users" value={users.total} />
          <StatCard label="Active (7d)"  value={users.active_7d}  color="var(--accent-tertiary)"
            sub={`${Math.round(users.active_7d / users.total * 100)}% of total`} />
          <StatCard label="Locked"       value={users.locked}      color="var(--danger)" />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Level Distribution</h2>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={level_distribution}>
            <XAxis dataKey="level" tickFormatter={l => `Lv${l}`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <div className={styles.filterBar}>
        <input
          placeholder="Search by username or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <button
          onClick={() => setFilterLocked(f => !f)}
          title="Locked users only"
          className={`${styles.filterLockBtn} ${filterLocked ? styles.filterLockBtnActive : ''}`}
        >
          <Lock size={12} />
        </button>
        <span className={styles.filterCount}>{filtered.length} / {userList.length}</span>
      </div>

      <section className={styles.section}>
        <h2>Recent Users</h2>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              {['User', 'Joined', 'Last Login', 'Level', 'XP', 'Streak', 'Status', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={styles.tableRow}>
                <td className={styles.userCell}>
                  <div className={styles.userName}>{u.username}</div>
                  <div className={styles.userEmail}>{u.email || '—'}</div>
                  <div
                    className={styles.userId}
                    title="Click to copy ID"
                    onClick={() => navigator.clipboard.writeText(String(u.id))}
                  >
                    <Copy size={10} /> #{u.id}
                  </div>
                </td>
                <td className={styles.cellMuted}>{u.joined}</td>
                <td className={styles.cellMuted}>{u.last_login ?? '—'}</td>
                <td>{u.level}</td>
                <td className={styles.cellAccent}>{u.xp}</td>
                <td className={styles.cellStreak}>{u.streak > 0 ? `${u.streak}🔥` : '—'}</td>
                <td>
                  {u.locked
                    ? <span className={styles.statusLocked}>🔒 Locked</span>
                    : <span className={styles.statusOk}><Check size={20} /></span>}
                </td>
                <td className={styles.actionCell}>
                  {u.locked && (
                    <button className={styles.btnUnlock} onClick={() => unlock(u.id)}>Unlock</button>
                  )}
                  <button className={styles.btnEdit} onClick={() => {
                    setEditingUser(u);
                    setEditForm({ xp: u.xp, streak: u.streak, email: u.email || '' });
                  }}>Edit</button>
                  <button className={styles.btnReset} onClick={async () => {
                    if (!confirm(`Reset XP for ${u.username}?`)) return;
                    await adminResetXp(u.id);
                    setUserList(list => list.map(x => x.id === u.id ? { ...x, xp: 0, level: 1, streak: 0 } : x));
                  }}>Reset XP</button>
                  {!u.is_staff && (
                    <button className={styles.btnDelete} onClick={async () => {
                      if (!confirm(`Permanently delete ${u.username}? This cannot be undone.`)) return;
                      await adminDeleteUser(u.id);
                      setUserList(list => list.filter(x => x.id !== u.id));
                    }}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editingUser && (
        <div className={styles.modalBackdrop} onClick={() => setEditingUser(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{editingUser.username}</h3>
            {(['email'] as const).map(field => (
              <label key={field} className={styles.modalLabel}>
                {field.toUpperCase()}
                <input
                  type="email"
                  placeholder={editingUser.email}
                  value={editForm[field]}
                  onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                  className={styles.modalInput}
                />
              </label>
            ))}
            {(['xp', 'streak'] as const).map(field => (
              <label key={field} className={styles.modalLabel}>
                {field.toUpperCase()}
                <input
                  type="number"
                  min={0}
                  value={editForm[field]}
                  onChange={e => setEditForm(f => ({ ...f, [field]: parseInt(e.target.value) || 0 }))}
                  className={styles.modalInput}
                />
              </label>
            ))}
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setEditingUser(null)}>Cancel</button>
              <button className={styles.btnSave} onClick={async () => {
                await adminEditUser(editingUser.id, editForm);
                setUserList(list => list.map(x => x.id === editingUser.id
                  ? { ...x, ...editForm, level: Math.floor(editForm.xp / 50) + 1 }
                  : x
                ));
                setEditingUser(null);
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

  return (
    <div className={styles.lbGrid}>
      <section>
        <h2>XP Leaderboard</h2>
        <table className={styles.lbTable}>
          <thead>
            <tr>
              <th className={styles.lbTh}>#</th>
              <th className={styles.lbTh}>User</th>
              <th className={styles.lbThRight}>XP</th>
              <th className={styles.lbThRight}>Lv</th>
            </tr>
          </thead>
          <tbody>
            {xp_leaderboard.map((u: any, i: number) => (
              <tr key={u.user__username} className={styles.lbRow}>
                <td className={styles.lbCellRank}>{i + 1}</td>
                <td className={styles.lbCellName}>{u.user__username}</td>
                <td className={styles.lbCellXp}>{u.xp}</td>
                <td className={styles.lbCellLevel}>{u.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Streak Leaderboard</h2>
        <table className={styles.lbTable}>
          <thead>
            <tr>
              <th className={styles.lbTh}>#</th>
              <th className={styles.lbTh}>User</th>
              <th className={styles.lbThRight}>Streak</th>
            </tr>
          </thead>
          <tbody>
            {streak_leaderboard.map((u: any, i: number) => (
              <tr key={u.user__username} className={styles.lbRow}>
                <td className={styles.lbCellRank}>{i + 1}</td>
                <td className={styles.lbCellName}>{u.user__username}</td>
                <td className={styles.lbCellStreak}>{u.streak}🔥</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ─── Tab: Tasks ────────────────────────────────────────────────────────────────

function TasksTab({ stats }: { stats: any }) {
  const { tasks } = stats;
  return (
    <section className={styles.section}>
      <h2>Tasks</h2>
      <div className={styles.statRow}>
        <StatCard label="Total"        value={tasks.total} />
        <StatCard label="Completed"    value={tasks.completed}     color="var(--accent-tertiary)" />
        <StatCard label="Avg per User" value={tasks.avg_per_user}  color="var(--accent-secondary)" />
        <StatCard label="Completion %"  value={`${tasks.completion_rate}%`} color="var(--accent-secondary)" />
      </div>
      <div className={styles.completionBar}>
        <div className={styles.completionFill} style={{ width: `${tasks.completion_rate}%` }} />
      </div>
      <p className={styles.completionLabel}>
        {tasks.completed} of {tasks.total} tasks completed
      </p>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: '📊 Overview'     },
  { id: 'users',       label: '👥 Users'         },
  { id: 'leaderboard', label: '🏆 Leaderboard'   },
  { id: 'tasks',       label: '✅ Tasks'          },
] as const;

type Tab = typeof TABS[number]['id'];

export default function AdminDashboard() {
  const [tab, setTab]               = useState<Tab>('overview');
  const [stats, setStats]           = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const navigate                    = useNavigate();

  const refresh = () => {
    getAdminStats()
      .then(r => { setStats(r.data); setLastUpdated(new Date()); });
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  if (!stats) return <div style={{ padding: 32 }}>Loading…</div>;

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ── */}
      <nav className={styles.sidebar}>
        <Logo />
        <div className={styles.sidebarTitle}>
          <button className={styles.sidebarUserBtn} onClick={() => navigate('/')} title="Task Mode">
            <UserStar />
          </button>
          Admin
        </div>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`${styles.navBtn} ${tab === t.id ? styles.navBtnActive : ''}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <h1 className={styles.mainTitle}>Admin Dashboard</h1>
          <button
            onClick={() => setAutoRefresh(r => !r)}
            title="Auto sync"
            className={`${styles.refreshBtn} ${autoRefresh ? styles.refreshBtnActive : ''}`}
          >
            <RefreshCcw size={16} />
          </button>
          {lastUpdated && (
            <span className={styles.updatedAt}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {tab === 'overview'    && <OverviewTab    stats={stats} />}
        {tab === 'users'       && <UsersTab       stats={stats} />}
        {tab === 'leaderboard' && <LeaderboardTab stats={stats} />}
        {tab === 'tasks'       && <TasksTab       stats={stats} />}
      </main>
    </div>
  );
}