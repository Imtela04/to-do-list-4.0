import { useEffect, useState } from 'react';
import { getAdminStats } from '@/api/services';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  getAdminUsers, adminUnlockUser, adminForceLogout, adminToggleStaff,
  adminUserDetail, adminAwardXp, adminBulkAction, adminClearOnboarding,
  adminDeleteNote, adminExportCsv,
} from '@/api/services';
import { Ban, Bolt, ChartNoAxesCombined, Check, ClipboardClock, Copy, Download, Edit, Eye, Flame, ListTodo, Lock, LogOut, MonitorCog, RefreshCcw, RotateCcw, ShieldUser, SquareCheck, Trash2, TriangleAlert, Trophy, User, Users, UserStar } from 'lucide-react';
import { Logo } from './home';
import { adminResetXp, adminDeleteUser, adminEditUser, adminAuditLog, adminViewNote } from '@/api/services';
import { useNavigate } from 'react-router-dom';
import styles from './admin.module.css';
import DOMPurify from 'dompurify';

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
          <StatCard label="Pomodoros Today" value={pomodoros_today} />
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
function NoteRow({ note, onDelete }: { note: any; userId: number; onDelete: (id: number) => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reveal = async () => {
    if (content !== null) { setContent(null); return; }  // toggle off
    if (!confirm('Reading this note will be logged against your admin account. Continue?')) return;
    setLoading(true);
    const r = await adminViewNote(note.id);
    setContent(r.data.note);
    setLoading(false);
  };

  return (
    <div style={{ padding:'6px 0', borderBottom:'1px solid var(--border-subtle)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:10, height:10, borderRadius:'50%', background: note.color,
          flexShrink:0, display:'inline-block' }} />
        <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
          {note.length} chars · {new Date(note.created_at).toLocaleDateString()}
        </span>
        <button
          onClick={reveal}
          disabled={loading}
          style={{ fontSize:'0.68rem', padding:'1px 8px', borderRadius:6, marginLeft:'auto',
            background:'var(--bg-glass)', border:'1px solid var(--border-subtle)',
            color:'var(--text-muted)', cursor:'pointer' }}
        >
          {loading ? '…' : content !== null ? 'Hide' : 'Read ⚠'}
        </button>
        <button className={styles.btnDelete} style={{ fontSize:'0.65rem', padding:'2px 6px' }}
          onClick={async () => {
            if (!confirm('Delete this note?')) return;
            await adminDeleteNote(note.id);
            onDelete(note.id);
          }}>Del</button>
      </div>
      {content !== null && (
        <div style={{ marginTop:6, padding:'6px 8px', background:'var(--bg-secondary)',
          borderRadius:6, fontSize:'0.72rem', color:'var(--text-secondary)', lineHeight:1.5 }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      )}
    </div>
  );
}
// ─── Tab: Users ───────────────────────────────────────────────────────────────

function UsersTab({ stats }: { stats: any }) {
  const { users, level_distribution } = stats;
  const [userList, setUserList]         = useState<any[]>([]);
  const [search, setSearch]             = useState('');
  const [filterLocked, setFilterLocked] = useState(false);
  const [editingUser, setEditingUser]   = useState<any | null>(null);
  const [editForm, setEditForm]         = useState({ xp: 0, streak: 0, email: '', awardAmount: 0 });
  const [drillUser, setDrillUser]       = useState<any | null>(null);
  const [drillData, setDrillData]       = useState<any | null>(null);
  const [selected, setSelected]         = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading]   = useState(false);

  const filtered = userList.filter(u => {
    const matchSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filterLocked ? u.locked : true);
  });

  useEffect(() => { getAdminUsers().then(r => setUserList(r.data)); }, []);

  const unlock = (id: number) =>
    adminUnlockUser(id).then(() =>
      setUserList(u => u.map(x => x.id === id ? { ...x, locked: false, failed_attempts: 0 } : x))
    );

  const forceLogout = (id: number, username: string) => {
    if (!confirm(`Force-logout all sessions for ${username}?`)) return;
    adminForceLogout(id).then(r => alert(r.data.detail));
  };

  const toggleStaff = async (u: any) => {
    if (!confirm(`${u.is_staff ? 'Remove' : 'Grant'} staff access for ${u.username}?`)) return;
    const r = await adminToggleStaff(u.id);
    setUserList(list => list.map(x => x.id === u.id ? { ...x, is_staff: r.data.is_staff } : x));
  };

  const openDrill = async (u: any) => {
    setDrillUser(u);
    setDrillData(null);
    const r = await adminUserDetail(u.id);
    setDrillData(r.data);
  };

  const bulkAction = async (action: string) => {
    if (!selected.size) return;
    if (!confirm(`${action} ${selected.size} user(s)?`)) return;
    setBulkLoading(true);
    await adminBulkAction(action, Array.from(selected));
    setBulkLoading(false);
    setSelected(new Set());
    getAdminUsers().then(r => setUserList(r.data));
  };

  const exportCsv = async () => {
    const r = await adminExportCsv();
    const url = URL.createObjectURL(new Blob([r.data]));
    const a   = Object.assign(document.createElement('a'), { href: url, download: 'users.csv' });
    a.click(); URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: number) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(u => u.id)));

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
            <YAxis  tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <div className={styles.filterBar}>
        <input placeholder="Search by username or email" value={search}
          onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
        <button onClick={() => setFilterLocked(f => !f)} title="Locked only"
          className={`${styles.filterLockBtn} ${filterLocked ? styles.filterLockBtnActive : ''}`}>
          <Lock size={12} />
        </button>
        <button onClick={exportCsv} title="Export CSV" className={styles.filterLockBtn}><Download size={15} y={20} /> CSV</button>
        <span className={styles.filterCount}>{filtered.length} / {userList.length}</span>
      </div>

      {selected.size > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
          <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{selected.size} selected</span>
          <button className={styles.btnUnlock}  disabled={bulkLoading} onClick={() => bulkAction('unlock')}>Bulk Unlock</button>
          <button className={styles.btnReset}   disabled={bulkLoading} onClick={() => bulkAction('reset_xp')}>Bulk Reset XP</button>
          <button className={styles.btnDelete}  disabled={bulkLoading} onClick={() => bulkAction('delete')}>Bulk Delete</button>
        </div>
      )}

      <section className={styles.section}>
        <h2>Recent Users</h2>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                onChange={selectAll} /></th>
              {['User','Joined','Last Login','Level','XP','Streak','Status',''].map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={styles.tableRow}>
                <td><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                <td className={styles.userCell}>
                  <div className={styles.userName}>
                    {u.username} {u.is_staff && <span title="Staff" style={{color:'var(--accent-tertiary)',fontSize:'0.65rem'}}><ShieldUser size={15} /></span>}
                  </div>
                  <div className={styles.userEmail}>{u.email || '—'}</div>
                  <div className={styles.userId} title="Click to copy"
                    onClick={() => navigator.clipboard.writeText(String(u.id))}>
                    <Copy size={10} /> #{u.id}
                  </div>
                </td>
                <td className={styles.cellMuted}>{u.joined}</td>
                <td className={styles.cellMuted}>{u.last_login ?? '—'}</td>
                <td>{u.level}</td>
                <td className={styles.cellAccent}>{u.xp}</td>
                <td className={styles.cellStreak}>{u.streak > 0 ? `${u.streak}` : <Ban size={15}/>}{u.streak > 0 ? <Flame size={15}/> : ''}</td>
                <td>{u.locked
                  ? <span title='Locked' className={styles.statusLocked}><Lock size={20}/></span>
                  : <span title='OK' className={styles.statusOk}><Check size={20}/></span>}
                </td>
                <td className={styles.actionCell}>
                  <button title='View' className={styles.btnEdit} onClick={() => openDrill(u)}><Eye size={15}/></button>
                  {u.locked && <button className={styles.btnUnlock} onClick={() => unlock(u.id)}>Unlock</button>}
                  <button title='Edit'className={styles.btnEdit} onClick={() => {
                    setEditingUser(u);
                    setEditForm({ xp: u.xp, streak: u.streak, email: u.email || '', awardAmount: 0 });
                  }}><Edit size={15}/></button>
                  <button title='Reset XP' className={styles.btnReset} onClick={async () => {
                    if (!confirm(`Reset XP for ${u.username}?`)) return;
                    await adminResetXp(u.id);
                    setUserList(list => list.map(x => x.id === u.id ? { ...x, xp: 0, level: 1, streak: 0 } : x));
                  }}><Bolt size={15}><RotateCcw/></Bolt></button>
                  <button title='Force Log Out'className={styles.btnReset} onClick={() => forceLogout(u.id, u.username)}><LogOut size={15}/></button>
                  <button className={styles.btnEdit} onClick={() => toggleStaff(u)}
                    title={u.is_staff ? 'Disable Staff Privilege':'Enable Staff Privilege'}
                    style={{ borderColor: u.is_staff ? 'var(--accent-tertiary)' : undefined }}>
                    {u.is_staff ? <User size={15}/> : <UserStar size={15}/>}
                  </button>
                  {!u.is_staff && <button title='Delete' className={styles.btnDelete} onClick={async () => {
                    if (!confirm(`Permanently delete ${u.username}?`)) return;
                    await adminDeleteUser(u.id);
                    setUserList(list => list.filter(x => x.id !== u.id));
                  }}><Trash2 size={15}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Edit modal ── */}
      {editingUser && (
        <div className={styles.modalBackdrop} onClick={() => setEditingUser(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{editingUser.username}</h3>
            <label className={styles.modalLabel}>EMAIL
              <input type="email" value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className={styles.modalInput} />
            </label>
            <label className={styles.modalLabel}>XP (set directly)
              <input type="number" min={0} value={editForm.xp}
                onChange={e => setEditForm(f => ({ ...f, xp: parseInt(e.target.value) || 0 }))} className={styles.modalInput} />
            </label>
            <label className={styles.modalLabel}>STREAK
              <input type="number" min={0} value={editForm.streak}
                onChange={e => setEditForm(f => ({ ...f, streak: parseInt(e.target.value) || 0 }))} className={styles.modalInput} />
            </label>
            <label className={styles.modalLabel}>AWARD XP (±)
              <input type="number" value={editForm.awardAmount}
                onChange={e => setEditForm(f => ({ ...f, awardAmount: parseInt(e.target.value) || 0 }))} className={styles.modalInput} />
            </label>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setEditingUser(null)}>Cancel</button>
              {editForm.awardAmount !== 0 && (
                <button className={styles.btnReset} onClick={async () => {
                  const r = await adminAwardXp(editingUser.id, editForm.awardAmount);
                  setUserList(list => list.map(x => x.id === editingUser.id ? { ...x, xp: r.data.xp, level: r.data.level } : x));
                  setEditingUser(null);
                }}>Award XP</button>
              )}
              <button className={styles.btnSave} onClick={async () => {
                await adminEditUser(editingUser.id, { xp: editForm.xp, streak: editForm.streak, email: editForm.email });
                setUserList(list => list.map(x => x.id === editingUser.id
                  ? { ...x, xp: editForm.xp, streak: editForm.streak, email: editForm.email,
                      level: Math.max(1, Object.entries({1:0,2:50,3:150,4:350,5:700}).reverse().find(([,v]) => editForm.xp >= (v as number))?.[0] as unknown as number ?? 1) }
                  : x));
                setEditingUser(null);
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drill-down modal ── */}
      {drillUser && (
        <div className={styles.modalBackdrop} onClick={() => { setDrillUser(null); setDrillData(null); }}>
          <div className={styles.modal} style={{ maxWidth: 560, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{drillUser.username}'s data</h3>
            {!drillData ? <p style={{ textAlign:'center', color:'var(--text-muted)' }}>Loading…</p> : (
              <>
                <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:4 }}>
                  Tasks: {drillData.tasks.length} · Categories: {drillData.categories.length} · Notes: {drillData.notes.length}
                </p>
                <button className={styles.btnReset} style={{ marginBottom:8, fontSize:'0.7rem' }}
                  onClick={async () => {
                    if (!confirm('Delete all onboarding records for this user?')) return;
                    await adminClearOnboarding(drillUser.id);
                    const r = await adminUserDetail(drillUser.id);
                    setDrillData(r.data);
                  }}>🧹 Clear onboarding data</button>

                <p style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginTop:8 }}>TASKS</p>
                {drillData.tasks.slice(0,20).map((t: any) => (
                  <div key={t.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem',
                    padding:'4px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                    <span style={{ color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
                    <span style={{ color:'var(--text-muted)' }}>{t.priority}</span>
                  </div>
                ))}

                <p style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginTop:10 }}>
                  NOTES ({drillData.notes.length})
                </p>
                {drillData.notes.length === 0
                  ? <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>None</p>
                  : drillData.notes.map((n: any) => (
                    <NoteRow key={n.id} note={n} userId={drillUser.id} onDelete={(id: number) =>
                      setDrillData((d: any) => ({ ...d, notes: d.notes.filter((x: any) => x.id !== id) }))
                    } />
                  ))
                }
              </>
            )}
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => { setDrillUser(null); setDrillData(null); }}>Close</button>
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
                <td className={styles.lbCellStreak}>{u.streak}<Flame size={15}/></td>
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
function SystemTab({ stats }: { stats: any }) {
  const { users, tasks } = stats;

  return (
    <>
      <section className={styles.section}>
        <h2>System Health</h2>
        <div className={styles.statRow}>
          <StatCard label="Total Users"   value={users.total} />
          <StatCard label="Locked Accts"  value={users.locked}      color="var(--danger)" />
          <StatCard label="Total Tasks"   value={tasks.total} />
          <StatCard label="Completion %"  value={`${tasks.completion_rate}%`} color="var(--accent-tertiary)" />
          <StatCard label="Avg Tasks/User" value={tasks.avg_per_user} />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Quick Checks</h2>
        <table className={styles.table}>
          <tbody>
            {[
              ['Locked accounts',         users.locked,                   users.locked > 0 ? <TriangleAlert size={15}/> : <SquareCheck size={15} />],
              ['New users (7d)',           users.new_7d,                   <ChartNoAxesCombined size={15} />],
              ['Task completion rate',     `${tasks.completion_rate}%`,    tasks.completion_rate > 50 ?  <SquareCheck size={15}/> : <TriangleAlert size={15}/>],
            ].map(([label, value, icon]) => (
              <tr key={label as string} className={styles.tableRow}>
                <td style={{ padding:'8px 12px', color:'var(--text-muted)', fontSize:'0.8rem' }}>{icon} {label}</td>
                <td style={{ padding:'8px 12px', fontFamily:'var(--font-mono)', fontSize:'0.8rem' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
const ACTION_COLORS: Record<string, string> = {
  login_ok:       'var(--accent-tertiary)',
  login_fail:     'var(--danger)',
  register:       'var(--accent-primary)',
  task_complete:  'var(--accent-tertiary)',
  task_delete:    'var(--danger)',
  task_create:    'var(--accent-primary)',
  admin_delete:   'var(--danger)',
  admin_award_xp: '#ffaa6a',
  admin_reset_xp: '#ffaa6a',
  admin_kick:     'var(--danger)',
  admin_staff:    'var(--accent-secondary)',
  admin_bulk:     'var(--danger)',
  level_up:       '#f59e0b',
  delete_account: 'var(--danger)',
};

function AuditTab() {
  const [logs, setLogs]         = useState<any[]>([]);
  const [search, setSearch]     = useState('');
  const [action, setAction]     = useState('');
  const [loading, setLoading]   = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const r = await adminAuditLog({ search: search || undefined, action: action || undefined });
    setLogs(r.data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const ACTIONS = [
    '','login_ok','login_fail','register','task_create','task_complete',
    'task_delete','note_create','note_delete','cat_create','cat_delete',
    'admin_unlock','admin_delete','admin_award_xp','admin_reset_xp',
    'admin_kick','admin_staff','admin_note_del','admin_bulk',
    'delete_account','level_up',
  ];

  return (
    <section className={styles.section}>
      <h2>Audit Log <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:400 }}>(last 200)</span></h2>
      <div className={styles.filterBar} style={{ marginBottom: 12 }}>
        <input
          placeholder="Search actor / target / detail"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchLogs()}
          className={styles.searchInput}
        />
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          style={{ padding:'6px 10px', borderRadius:8, background:'var(--bg-secondary)',
            border:'1px solid var(--border-medium)', color:'var(--text-primary)',
            fontSize:'0.78rem', fontFamily:'var(--font-body)' }}
        >
          {ACTIONS.map(a => <option key={a} value={a}>{a || 'All actions'}</option>)}
        </select>
        <button onClick={fetchLogs} className={styles.filterLockBtn} disabled={loading}>
          {loading ? '…' : '⟳'}
        </button>
        <span className={styles.filterCount}>{logs.length} entries</span>
      </div>

      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Target</th>
            <th>Detail</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(e => (
            <tr key={e.id} className={styles.tableRow}>
              <td className={styles.cellMuted} style={{ whiteSpace:'nowrap', fontSize:'0.72rem' }}>{e.created_at}</td>
              <td>
                <span style={{ fontSize:'0.72rem', fontWeight:600,
                  color: ACTION_COLORS[e.action] ?? 'var(--text-secondary)' }}>
                  {e.action_label}
                </span>
              </td>
              <td style={{ fontSize:'0.75rem' }}>{e.actor ?? <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
              <td style={{ fontSize:'0.75rem' }}>{e.target ?? <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
              <td className={styles.cellMuted} style={{ fontSize:'0.72rem', maxWidth:240,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                title={e.detail}>{e.detail || '—'}</td>
              <td className={styles.cellMuted} style={{ fontSize:'0.7rem', fontFamily:'var(--font-mono)' }}>
                {e.ip ?? '—'}
              </td>
            </tr>
          ))}
          {logs.length === 0 && !loading && (
            <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:24 }}>No entries</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

const TABS = [
  { id: 'overview',    icon: <ChartNoAxesCombined size={20}/>, label: ' Overview'   },
  { id: 'users',       icon:<Users size={20}/>,                label: ' Users'},
  { id: 'leaderboard', icon:<Trophy size={20}/>,                label: ' Leaderboard' },
  { id: 'tasks',       icon:<ListTodo size={20}/>,                label: ' Tasks'        },
  { id: 'system',      icon:<MonitorCog size={20}/>,                label: ' System'      },
  { id: 'audit',       icon:<ClipboardClock size={20}/>,                label: ' Audit Log'   },
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
            {t.icon}{t.label}
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
        {tab === 'system' && <SystemTab stats={stats} />}
        {tab === 'audit' && <AuditTab />}
      </main>
    </div>
  );
}