import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const STATUS_COLORS = { active: '#4AE08A', pending_approval: '#B86A00', draft: '#B0BAC8', on_hold: '#E8232A', completed: '#0A7A79', changes_requested: '#E8232A' };
const STATUS_LABELS = { active: 'Active', pending_approval: 'Pending Approval', draft: 'Draft', on_hold: 'On Hold', completed: 'Completed', changes_requested: 'Changes Requested' };

const SECTION_DEFS = [
  { key: 'Design', softwareLabel: 'Design Software', options: ['CATIA V5', 'UG NX', 'Other'] },
  { key: 'Simulation', softwareLabel: 'Simulation Software', options: ['Process Simulate', 'Delmia', 'RobCAD'] },
  { key: 'Planning', softwareLabel: 'Planning Software', options: ['Process Designer', 'Excel'] },
  { key: 'Layout', softwareLabel: 'Layout Software', options: ['MicroStation', 'FactoryCAD', 'AutoCAD'] },
];
const SECTION_COLORS = { Design: 'var(--navy)', Simulation: 'var(--purple)', Planning: 'var(--green)', Layout: 'var(--amber)' };
const SECTION_BG = { Design: 'rgba(0,50,100,0.08)', Simulation: 'rgba(90,45,138,0.08)', Planning: 'rgba(10,122,121,0.08)', Layout: 'rgba(184,106,0,0.08)' };
const PAYMENT_OPTIONS = ['Fixed Price', 'Milestone Basis', 'Time & Material', 'Retainer'];

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 };
const inputStyle = { width: '100%', height: 38, border: '1.5px solid var(--grey-border)', borderRadius: 7, padding: '0 12px', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--navy)', background: 'var(--grey-bg)', outline: 'none' };

function CreateProjectModal({ onClose }) {
  const qc = useQueryClient();
  const { workspace } = useAuthStore();
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');

  // Step 1 fields
  const [customer_name, setCustomerName] = useState('');
  const [oem_name, setOemName] = useState('');
  const [name, setName] = useState('');
  const [project_code, setProjectCode] = useState('');
  const [description, setDescription] = useState('');
  const [cycle_time, setCycleTime] = useState('');
  const [color, setColor] = useState('#003264');
  const [sections, setSections] = useState([]);
  const [software, setSoftware] = useState({});
  const [otherSoftware, setOtherSoftware] = useState('');

  // Step 2 fields
  const [budget, setBudget] = useState('');
  const [start_date, setStartDate] = useState('');
  const [end_date, setEndDate] = useState('');
  const [payment_terms, setPaymentTerms] = useState('');
  const [milestones, setMilestones] = useState([
    { name: '', due_date: '', amount: '' },
    { name: '', due_date: '', amount: '' },
    { name: '', due_date: '', amount: '' },
  ]);

  const create = useMutation({
    mutationFn: (data) => api.post('/projects', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['projects']); onClose(); },
    onError: (e) => setErr(e.response?.data?.error || 'Failed to create project'),
  });

  function toggleSection(key) {
    setSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
    if (sections.includes(key)) {
      setSoftware(prev => { const next = { ...prev }; delete next[key]; return next; });
    }
  }

  function validateStep1() {
    if (!customer_name.trim()) return 'Customer Name is required';
    if (!oem_name.trim()) return 'OEM Name is required';
    if (!name.trim()) return 'Project Name is required';
    if (!project_code.trim()) return 'Project Code is required';
    if (sections.length === 0) return 'Select at least one project section';
    if (sections.includes('Design') && software.Design === 'Other' && !otherSoftware.trim()) return 'Specify the design software name';
    return null;
  }

  function validateStep2() {
    if (!budget) return 'Budget is required';
    if (!start_date) return 'Start Date is required';
    if (!end_date) return 'End Date is required';
    if (!payment_terms) return 'Payment Terms is required';
    return null;
  }

  function goNext() {
    setErr('');
    if (step === 1) {
      const e = validateStep1();
      if (e) return setErr(e);
      setStep(2);
    } else if (step === 2) {
      const e = validateStep2();
      if (e) return setErr(e);
      setStep(3);
    }
  }

  function handleSubmit() {
    setErr('');
    const finalSoftware = { ...software };
    if (finalSoftware.Design === 'Other') finalSoftware.Design = otherSoftware;

    const payload = {
      workspace_id: workspace?.id,
      customer_name, oem_name, name, project_code, description, cycle_time, color,
      sections, software: finalSoftware,
      budget, start_date, end_date, payment_terms,
      milestones: payment_terms === 'Milestone Basis' ? milestones.filter(m => m.name.trim()) : [],
    };
    create.mutate(payload);
  }

  function updateMilestone(idx, field, value) {
    setMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  const STEPS = ['Project Details', 'Commercial', 'Review'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: 12, width: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--grey-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>New Project</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--grey-text)' }}>×</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '14px 24px', borderBottom: '1px solid var(--grey-border)', flexShrink: 0 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: i < step ? 'var(--navy)' : 'var(--grey-border)', margin: '0 8px' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: i + 1 <= step ? 'var(--navy)' : 'var(--grey-bg)',
                  color: i + 1 <= step ? 'white' : 'var(--grey-text)',
                  border: i + 1 === step ? '2px solid var(--navy)' : '2px solid transparent',
                }}>{i + 1}</div>
                <span style={{ fontSize: 12, fontWeight: i + 1 === step ? 700 : 400, color: i + 1 === step ? 'var(--navy)' : 'var(--grey-text)' }}>{s}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflow: 'auto', flex: 1 }}>
          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Customer Name *</label>
                  <input style={inputStyle} value={customer_name} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. BMW" />
                </div>
                <div>
                  <label style={labelStyle}>OEM Name *</label>
                  <input style={inputStyle} value={oem_name} onChange={e => setOemName(e.target.value)} placeholder="e.g. Dürr" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Project Name *</label>
                  <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder={`${customer_name || '[Customer]'} ${oem_name || '[OEM]'} ${project_code || '[Code]'}`} />
                </div>
                <div>
                  <label style={labelStyle}>Project Code *</label>
                  <input style={inputStyle} value={project_code} onChange={e => setProjectCode(e.target.value)} placeholder="e.g. L463" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, height: 60, padding: '8px 12px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief project description..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Cycle Time</label>
                  <input style={inputStyle} value={cycle_time} onChange={e => setCycleTime(e.target.value)} placeholder="e.g. 60 JPH" />
                </div>
                <div>
                  <label style={labelStyle}>Colour</label>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: '100%', height: 38, border: '1.5px solid var(--grey-border)', borderRadius: 7, padding: '2px 4px', cursor: 'pointer' }} />
                </div>
              </div>

              {/* Sections */}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Project Sections</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SECTION_DEFS.map(sec => {
                    const checked = sections.includes(sec.key);
                    return (
                      <div key={sec.key} style={{ border: `1.5px solid ${checked ? 'var(--navy)' : 'var(--grey-border)'}`, borderRadius: 8, padding: '10px 14px', background: checked ? 'var(--navy-xlight)' : 'white', transition: 'all 0.15s' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSection(sec.key)} />
                          {sec.key}
                        </label>
                        {checked && (
                          <div style={{ marginTop: 8, paddingLeft: 24 }}>
                            <label style={labelStyle}>{sec.softwareLabel}</label>
                            <select
                              value={software[sec.key] || ''}
                              onChange={e => setSoftware({ ...software, [sec.key]: e.target.value })}
                              style={{ ...inputStyle, width: 240 }}
                            >
                              <option value="">Select…</option>
                              {sec.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            {sec.key === 'Design' && software.Design === 'Other' && (
                              <div style={{ marginTop: 8 }}>
                                <label style={labelStyle}>Specify Software Name</label>
                                <input style={{ ...inputStyle, width: 240 }} value={otherSoftware} onChange={e => setOtherSoftware(e.target.value)} placeholder="Software name…" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Budget (₹) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: 9, fontSize: 14, color: 'var(--grey-text)', fontWeight: 700 }}>₹</span>
                  <input type="number" style={{ ...inputStyle, paddingLeft: 28 }} value={budget} onChange={e => setBudget(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Start Date *</label>
                  <input type="date" style={inputStyle} value={start_date} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>End Date *</label>
                  <input type="date" style={inputStyle} value={end_date} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Payment Terms *</label>
                <select style={inputStyle} value={payment_terms} onChange={e => setPaymentTerms(e.target.value)}>
                  <option value="">Select…</option>
                  {PAYMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {payment_terms === 'Milestone Basis' && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Payment Milestones</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {milestones.map((m, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, alignItems: 'end' }}>
                        <div>
                          <label style={labelStyle}>Milestone {i + 1} Name</label>
                          <input style={inputStyle} value={m.name} onChange={e => updateMilestone(i, 'name', e.target.value)} placeholder={`Milestone ${i + 1}`} />
                        </div>
                        <div>
                          <label style={labelStyle}>Due Date</label>
                          <input type="date" style={inputStyle} value={m.due_date} onChange={e => updateMilestone(i, 'due_date', e.target.value)} />
                        </div>
                        <div>
                          <label style={labelStyle}>Amount (₹)</label>
                          <input type="number" style={inputStyle} value={m.amount} onChange={e => updateMilestone(i, 'amount', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Review */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Project Details */}
              <div style={{ border: '1px solid var(--grey-border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: 'var(--grey-bg)', fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Project Details</div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['Customer', customer_name], ['OEM', oem_name],
                    ['Project Name', name], ['Project Code', project_code],
                    ['Cycle Time', cycle_time || '—'], ['Colour', color],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 2 }}>{k}</div>
                      {k === 'Colour' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, background: v, border: '1px solid var(--grey-border)' }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{v}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{v}</div>
                      )}
                    </div>
                  ))}
                  {description && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 2 }}>Description</div>
                      <div style={{ fontSize: 13, color: 'var(--navy)' }}>{description}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sections & Software */}
              <div style={{ border: '1px solid var(--grey-border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: 'var(--grey-bg)', fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Sections & Software</div>
                <div style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {sections.map(s => {
                    const sw = s === 'Design' && software.Design === 'Other' ? otherSoftware : software[s];
                    return (
                      <div key={s} style={{ padding: '6px 12px', background: SECTION_BG[s], borderRadius: 6, fontSize: 12, fontWeight: 700, color: SECTION_COLORS[s] }}>
                        {s}{sw ? ` — ${sw}` : ''}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Commercial */}
              <div style={{ border: '1px solid var(--grey-border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: 'var(--grey-bg)', fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Commercial Details</div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['Budget', `₹${Number(budget).toLocaleString('en-IN')}`],
                    ['Start Date', start_date ? new Date(start_date + 'T00:00').toLocaleDateString('en-GB') : '—'],
                    ['End Date', end_date ? new Date(end_date + 'T00:00').toLocaleDateString('en-GB') : '—'],
                    ['Payment Terms', payment_terms],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {payment_terms === 'Milestone Basis' && milestones.some(m => m.name.trim()) && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>Payment Milestones</div>
                    {milestones.filter(m => m.name.trim()).map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: 'var(--navy)' }}>
                        <span style={{ fontWeight: 700 }}>{m.name}</span>
                        <span style={{ color: 'var(--grey-text)' }}>
                          {m.due_date ? new Date(m.due_date + 'T00:00').toLocaleDateString('en-GB') : '—'}
                          {m.amount ? ` · ₹${Number(m.amount).toLocaleString('en-IN')}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {err && <div style={{ fontSize: 13, color: 'var(--red)', padding: '8px 12px', background: 'rgba(232,35,42,0.08)', borderRadius: 6, marginTop: 10 }}>{err}</div>}
        </div>

        {/* Footer nav */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--grey-border)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            {step > 1 && (
              <button onClick={() => { setErr(''); setStep(step - 1); }} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid var(--grey-border)', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, cursor: 'pointer' }}>Back</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid var(--grey-border)', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            {step < 3 ? (
              <button onClick={goNext} style={{ padding: '8px 16px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={handleSubmit} disabled={create.isPending} style={{ padding: '8px 16px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: create.isPending ? 'not-allowed' : 'pointer' }}>
                {create.isPending ? 'Creating…' : 'Create Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { workspace, user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
  const canCreate = user?.roles?.some(r => ['project_manager', 'admin'].includes(r));
  const isSuperUser = user?.roles?.includes('super_user');

  const approveMut = useMutation({
    mutationFn: (id) => api.patch(`/projects/${id}/approve`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries(['projects']),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}/super-delete`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['projects']); setDeleteConfirm(null); },
  });

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
                {['Project', 'Status', 'Sections', 'Project Manager', 'Start', 'End', 'Budget', 'Progress', ...(isSuperUser ? ['Actions'] : ['']),].map(h => (
                  <th key={h} style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--grey-text)', textAlign: 'left', background: 'var(--grey-bg)', borderBottom: '1.5px solid var(--grey-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const pSections = Array.isArray(p.sections) ? p.sections : [];
                return (
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
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--grey-bg)' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {pSections.map(s => (
                          <span key={s} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: SECTION_BG[s] || 'var(--grey-bg)', color: SECTION_COLORS[s] || 'var(--grey-text)' }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.pm_name || '—'}</td>
                    <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.start_date ? new Date(p.start_date).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--grey-text)', borderBottom: '1px solid var(--grey-bg)' }}>{p.budget ? `₹${Number(p.budget).toLocaleString('en-IN')}` : '—'}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--grey-bg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: 'var(--grey-bg)', borderRadius: 3 }}>
                          <div style={{ width: `${p.progress_pct || 0}%`, height: '100%', background: 'var(--navy)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{p.progress_pct || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--grey-bg)' }}>
                      {isSuperUser ? (
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          {p.status === 'pending_approval' && (
                            <button
                              onClick={() => approveMut.mutate(p.id)}
                              disabled={approveMut.isPending}
                              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: 'none', background: 'rgba(10,122,121,0.1)', color: 'var(--green)', cursor: 'pointer', fontFamily: 'var(--font)' }}
                            >Approve</button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm({ id: p.id, name: p.name })}
                            style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 5, border: 'none', background: 'rgba(232,35,42,0.08)', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font)' }}
                          >Delete</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 18, color: 'var(--grey-text)' }}>›</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Delete Project</h3>
            <p style={{ fontSize: 13, color: 'var(--grey-text)', lineHeight: 1.6, marginBottom: 20 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--navy)' }}>{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid var(--grey-border)', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteMut.mutate(deleteConfirm.id)} disabled={deleteMut.isPending} style={{ padding: '8px 16px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: deleteMut.isPending ? 'not-allowed' : 'pointer' }}>
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
