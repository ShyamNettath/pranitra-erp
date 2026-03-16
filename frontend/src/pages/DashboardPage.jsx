import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--grey-border)', borderRadius: 10, padding: '18px 20px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--grey-text)' }}>{sub}</div>}
    </div>
  );
}

const STATUS_COLORS = { active: '#4AE08A', pending_approval: '#B86A00', draft: '#B0BAC8', on_hold: '#E8232A', completed: '#0A7A79' };
const STATUS_LABELS = { active: 'Active', pending_approval: 'Pending Approval', draft: 'Draft', on_hold: 'On Hold', completed: 'Completed' };

export default function DashboardPage() {
  const { workspace, user } = useAuthStore();
  const navigate = useNavigate();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', workspace?.id],
    queryFn: () => api.get('/projects', { params: { workspace_id: workspace?.id } }).then(r => r.data),
    enabled: !!workspace?.id,
  });

  const active   = projects.filter(p => p.status === 'active').length;
  const pending  = projects.filter(p => p.status === 'pending_approval').length;
  const onHold   = projects.filter(p => p.status === 'on_hold').length;
  const recent   = [...projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6);

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>
          {(() => { const h = new Date().getHours(); return h >= 5 && h <= 11 ? 'Good morning' : h >= 12 && h <= 16 ? 'Good afternoon' : h >= 17 && h <= 20 ? 'Good evening' : 'Good night'; })()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: 13, color: 'var(--grey-text)' }}>
          {workspace?.name} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KpiCard label="Total Projects"    value={projects.length}  sub="in this workspace"     color="var(--navy)" />
        <KpiCard label="Active Projects"   value={active}           sub="currently running"     color="var(--green)" />
        <KpiCard label="Pending Approval"  value={pending}          sub="awaiting Director"     color="var(--amber)" />
        <KpiCard label="On Hold"           value={onHold}           sub="paused projects"       color="var(--red)" />
      </div>

      {/* Recent projects */}
      <div style={{ background: 'white', border: '1px solid var(--grey-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--grey-border)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Recent Projects</div>
            <div style={{ fontSize: 12, color: 'var(--grey-text)', marginTop: 2 }}>Recently updated in your workspace</div>
          </div>
          <button onClick={() => navigate('/projects')} style={{ padding: '6px 14px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            View All
          </button>
        </div>

        {recent.length === 0 ? (
          <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--grey-text)', fontSize: 13 }}>
            No projects yet. <span onClick={() => navigate('/projects')} style={{ color: 'var(--navy)', cursor: 'pointer', fontWeight: 700 }}>Create your first project →</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Project', 'Status', 'Project Manager', 'Start Date', 'End Date', 'Progress'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--grey-text)', textAlign: 'left', background: 'var(--grey-bg)', borderBottom: '1.5px solid var(--grey-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                  <td style={{ padding: '11px 12px', fontWeight: 700, color: 'var(--navy)', borderBottom: '1px solid var(--grey-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || 'var(--navy)', flexShrink: 0 }} />
                      {p.name}
                    </div>
                  </td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--grey-bg)' }}>
                    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[p.status] || '#B0BAC8'}22`, color: STATUS_COLORS[p.status] || '#B0BAC8' }}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.pm_name || '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.start_date ? new Date(p.start_date).toLocaleDateString('en-GB') : '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : '—'}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--grey-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--grey-bg)', borderRadius: 3 }}>
                        <div style={{ width: `${p.progress_pct || 0}%`, height: '100%', background: 'var(--navy)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>{p.progress_pct || 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
