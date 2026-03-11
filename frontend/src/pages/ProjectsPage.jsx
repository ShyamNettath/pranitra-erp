import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const STATUS_COLORS = { active: '#4AE08A', pending_approval: '#B86A00', draft: '#B0BAC8', on_hold: '#E8232A', completed: '#0A7A79', changes_requested: '#E8232A' };
const STATUS_LABELS = { active: 'Active', pending_approval: 'Pending Approval', draft: 'Draft', on_hold: 'On Hold', completed: 'Completed', changes_requested: 'Changes Requested' };

function CreateProjectModal({ onClose }) {
  const qc = useQueryClient();
  const { workspace } = useAuthStore();
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '', budget: '', color: '#003264' });
  const [err, setErr] = useState('');

  const create = useMutation({
    mutationFn: (data) => api.post('/projects', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['projects']); onClose(); },
    onError: (e) => setErr(e.response?.data?.error || 'Failed to create project'),
  });

  function submit(e) {
    e.preventDefault();
    if (!form.name) return setErr('Project name is required');
    create.mutate({ ...form, workspace_id: workspace?.id });
  }

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 };
  const inputStyle = { width: '100%', height: 38, border: '1.5px solid var(--grey-border)', borderRadius: 7, padding: '0 12px', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--navy)', background: 'var(--grey-bg)', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: 12, width: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--grey-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>New Project</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--grey-text)' }}>×</button>
        </div>
        <form onSubmit={submit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Project Name *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. BMW SOP 2026 — Design Phase" />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{...inputStyle, height: 70, padding: '8px 12px', resize: 'vertical'}} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Brief project description..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="date" style={inputStyle} value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input type="date" style={inputStyle} value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Budget (€)</label>
              <input type="number" style={inputStyle} value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>Colour</label>
              <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} style={{ width: '100%', height: 38, border: '1.5px solid var(--grey-border)', borderRadius: 7, padding: '2px 4px', cursor: 'pointer' }} />
            </div>
          </div>
          {err && <div style={{ fontSize: 13, color: 'var(--red)', padding: '8px 12px', background: 'rgba(232,35,42,0.08)', borderRadius: 6 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid var(--grey-border)', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={create.isPending} style={{ padding: '8px 16px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {create.isPending ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { workspace, user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const canCreate = user?.roles?.some(r => ['project_manager', 'admin'].includes(r));

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', workspace?.id, search, statusFilter],
    queryFn: () => api.get('/projects', { params: { workspace_id: workspace?.id, search: search || undefined, status: statusFilter || undefined } }).then(r => r.data),
    enabled: !!workspace?.id,
  });

  return (
    <div style={{ padding: 28 }}>
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>Projects</h1>
          <p style={{ fontSize: 13, color: 'var(--grey-text)' }}>{projects.length} project{projects.length !== 1 ? 's' : ''} in {workspace?.name}</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + New Project
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects…"
          style={{ height: 34, border: '1.5px solid var(--grey-border)', borderRadius: 7, padding: '0 12px', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--navy)', background: 'white', outline: 'none', width: 220 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: 34, border: '1.5px solid var(--grey-border)', borderRadius: 7, padding: '0 10px', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--navy)', background: 'white', outline: 'none', cursor: 'pointer' }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid var(--grey-border)', borderRadius: 10, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-text)' }}>Loading projects…</div>
        ) : projects.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey-text)', fontSize: 13 }}>
            {search || statusFilter ? 'No projects match your filters.' : 'No projects yet. Create your first project to get started.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Project', 'Status', 'Project Manager', 'Start', 'End', 'Budget', 'Progress', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--grey-text)', textAlign: 'left', background: 'var(--grey-bg)', borderBottom: '1.5px solid var(--grey-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--grey-bg)', fontWeight: 700, color: 'var(--navy)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || 'var(--navy)', flexShrink: 0 }} />
                      {p.name}
                    </div>
                  </td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--grey-bg)' }}>
                    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[p.status]}22`, color: STATUS_COLORS[p.status] }}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.pm_name || '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.start_date ? new Date(p.start_date).toLocaleDateString('en-GB') : '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.budget ? `€${Number(p.budget).toLocaleString('en-GB')}` : '—'}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--grey-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: 'var(--grey-bg)', borderRadius: 3 }}>
                        <div style={{ width: `${p.progress_pct || 0}%`, height: '100%', background: 'var(--navy)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{p.progress_pct || 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--grey-bg)' }}>
                    <span style={{ fontSize: 18, color: 'var(--grey-text)' }}>›</span>
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
