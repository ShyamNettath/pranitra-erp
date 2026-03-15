import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const ADMIN_SECTIONS = [
  { key:'users',      label:'User Management',      group:'Access & Users' },
  { key:'workspaces', label:'Workspaces',            group:'Access & Users' },
  { key:'roles',      label:'Roles & Permissions',   group:'Access & Users' },
  { key:'audit',      label:'Audit Log',             group:'Access & Users' },
  { key:'complexity', label:'Complexity Settings',   group:'Project Config' },
  { key:'lop-sections', label:'LOP Sections', group:'Project Config' },
  { key:'holidays',   label:'Holiday List',          group:'Project Config' },
  { key:'branding',   label:'Branding',              group:'System' },
  { key:'visibility', label:'Report Visibility',     group:'System' },
  { key:'security',   label:'Session & Security',    group:'System' },
  { key:'recycle',    label:'Recycle Bin',           group:'System' },
  { key:'sysinfo',    label:'System Info',           group:'System' },
];

const ROLES_ALL = ['admin','director','project_manager','team_member','client'];
const REPORTS_ALL = ['project_performance','effort_variance','schedule_variance','budget_variance','rework_analysis','escalations_log','associate_productivity','rework_hours','efficiency_analysis','idle_time','lessons_learned'];
const REPORT_LABELS = { project_performance:'Project Performance',effort_variance:'Effort Variance',schedule_variance:'Schedule Variance',budget_variance:'Budget Variance',rework_analysis:'Rework Analysis',escalations_log:'Escalations Log',associate_productivity:'Associate Productivity',rework_hours:'Rework Hours',efficiency_analysis:'Efficiency Analysis',idle_time:'Idle Time',lessons_learned:'Lessons Learned' };
const ROLE_LABELS = { admin:'Admin',director:'Director',project_manager:'Project Mgr',team_member:'Member',client:'Client' };

const ROLE_COLORS = { admin:'var(--red)',director:'var(--navy)',project_manager:'var(--purple)',team_member:'var(--green)',client:'var(--amber)' };

function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{ width:36,height:20,borderRadius:10,background:on?'var(--navy)':'var(--grey-border)',position:'relative',cursor:'pointer',flexShrink:0,transition:'background 0.2s' }}>
      <div style={{ width:16,height:16,borderRadius:'50%',background:'white',position:'absolute',top:2,left:on?18:2,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
    </div>
  );
}

function UsersPanel() {
  const { data: users=[], isLoading } = useQuery({ queryKey:['admin-users'], queryFn:()=>api.get('/users').then(r=>r.data) });
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();
  const [form, setForm] = useState({ email:'',name:'',job_title:'',roles:['team_member'] });
  const create = useMutation({ mutationFn:data=>api.post('/users',data).then(r=>r.data), onSuccess:()=>{ qc.invalidateQueries(['admin-users']); setShowCreate(false); } });
  const deactivate = useMutation({ mutationFn:id=>api.post(`/users/${id}/deactivate`), onSuccess:()=>qc.invalidateQueries(['admin-users']) });
  const reactivate = useMutation({ mutationFn:id=>api.post(`/users/${id}/reactivate`), onSuccess:()=>qc.invalidateQueries(['admin-users']) });

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
        <div><h2 style={{ fontSize:18,fontWeight:700,color:'var(--navy)',marginBottom:3 }}>User Management</h2><p style={{ fontSize:13,color:'var(--grey-text)' }}>{users.length} accounts</p></div>
        <button onClick={()=>setShowCreate(true)} style={{ padding:'7px 14px',background:'var(--navy)',color:'white',border:'none',borderRadius:7,fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer' }}>+ Add User</button>
      </div>
      {showCreate&&(
        <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,padding:18,marginBottom:16 }}>
          <div style={{ fontSize:14,fontWeight:700,color:'var(--navy)',marginBottom:12 }}>New User</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10 }}>
            {[['email','Email *','email'],['name','Full Name *','text'],['job_title','Job Title','text']].map(([k,l,t])=>(
              <div key={k}><label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--grey-text)',marginBottom:4 }}>{l}</label>
              <input type={t} value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%',height:34,border:'1.5px solid var(--grey-border)',borderRadius:6,padding:'0 10px',fontFamily:'var(--font)',fontSize:13,color:'var(--navy)',background:'var(--grey-bg)',outline:'none' }}/></div>
            ))}
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ display:'block',fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--grey-text)',marginBottom:6 }}>Roles</label>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              {ROLES_ALL.map(r=><label key={r} style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,cursor:'pointer' }}><input type="checkbox" checked={(form.roles||[]).includes(r)} onChange={e=>{const next=e.target.checked?[...(form.roles||[]),r]:(form.roles||[]).filter(x=>x!==r);setForm({...form,roles:next});}}/>{ROLE_LABELS[r]}</label>)}
            </div>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={()=>setShowCreate(false)} style={{ padding:'6px 14px',background:'white',border:'1.5px solid var(--grey-border)',borderRadius:6,fontFamily:'var(--font)',fontSize:13,cursor:'pointer' }}>Cancel</button>
            <button onClick={()=>create.mutate(form)} disabled={create.isPending||!form.email||!form.name} style={{ padding:'6px 14px',background:'var(--navy)',color:'white',border:'none',borderRadius:6,fontFamily:'var(--font)',fontSize:13,fontWeight:700,cursor:'pointer' }}>{create.isPending?'Creating…':'Create'}</button>
          </div>
        </div>
      )}
      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,overflow:'hidden' }}>
        {isLoading?<div style={{ padding:30,textAlign:'center',color:'var(--grey-text)',fontSize:13 }}>Loading…</div>:(
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead><tr>{['User','Email','Roles','Last Login','Status',''].map(h=><th key={h} style={{ padding:'8px 12px',fontSize:10.5,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',textAlign:'left',background:'var(--grey-bg)',borderBottom:'1.5px solid var(--grey-border)' }}>{h}</th>)}</tr></thead>
            <tbody>{users.map(u=>(
              <tr key={u.id} style={{ opacity:u.is_active?1:0.55 }}>
                <td style={{ padding:'9px 12px',borderBottom:'1px solid var(--grey-bg)' }}><div style={{ display:'flex',alignItems:'center',gap:8 }}><div style={{ width:28,height:28,borderRadius:'50%',background:u.is_active?'var(--navy)':'#8A9BB0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white',flexShrink:0 }}>{u.name.slice(0,2).toUpperCase()}</div><div><div style={{ fontSize:13,fontWeight:700,color:'var(--navy)' }}>{u.name}</div><div style={{ fontSize:11,color:'var(--grey-text)' }}>{u.job_title||''}</div></div></div></td>
                <td style={{ padding:'9px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{u.email}</td>
                <td style={{ padding:'9px 12px',borderBottom:'1px solid var(--grey-bg)' }}><div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>{(u.roles||[]).map(r=><span key={r} style={{ fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:10,background:`${ROLE_COLORS[r]||'#999'}22`,color:ROLE_COLORS[r]||'#999' }}>{ROLE_LABELS[r]||r}</span>)}</div></td>
                <td style={{ padding:'9px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{u.last_login?new Date(u.last_login).toLocaleDateString('en-GB'):'Never'}</td>
                <td style={{ padding:'9px 12px',borderBottom:'1px solid var(--grey-bg)' }}><span style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:12,fontWeight:700,color:u.is_active?'var(--green)':'var(--grey-text)' }}><span style={{ width:7,height:7,borderRadius:'50%',background:u.is_active?'#4AE08A':'var(--grey-border)',display:'inline-block' }}/>{u.is_active?'Active':'Inactive'}</span></td>
                <td style={{ padding:'9px 12px',borderBottom:'1px solid var(--grey-bg)' }}>{u.is_active?<button onClick={()=>deactivate.mutate(u.id)} style={{ padding:'3px 8px',background:'rgba(232,35,42,0.08)',color:'var(--red)',border:'none',borderRadius:4,fontFamily:'var(--font)',fontSize:11,cursor:'pointer' }}>Deactivate</button>:<button onClick={()=>reactivate.mutate(u.id)} style={{ padding:'3px 8px',background:'rgba(10,122,121,0.08)',color:'var(--green)',border:'none',borderRadius:4,fontFamily:'var(--font)',fontSize:11,cursor:'pointer' }}>Reactivate</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BrandingPanel() {
  const qc = useQueryClient();
  const { data: branding, isLoading } = useQuery({
    queryKey: ['branding'],
    queryFn: () => api.get('/settings/branding').then(r => r.data),
  });
  const [companyName, setCompanyName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useState(() => {
    if (branding?.company_name) setCompanyName(branding.company_name);
  });

  // Sync companyName when branding loads
  React.useEffect(() => {
    if (branding?.company_name && !companyName) setCompanyName(branding.company_name);
  }, [branding]);

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('File must be under 2MB'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    try {
      const fd = new FormData();
      if (logoFile) fd.append('logo', logoFile);
      fd.append('company_name', companyName);
      await api.post('/settings/branding', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      qc.invalidateQueries(['branding']);
      setSuccess(true);
      setLogoFile(null);
      setLogoPreview(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <div style={{ padding: 20, color: 'var(--grey-text)', fontSize: 13 }}>Loading…</div>;

  const displayLogo = logoPreview || branding?.logo_url || null;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Branding</h2>
      <div style={{ background: 'white', border: '1px solid var(--grey-border)', borderRadius: 10, padding: 24 }}>
        {/* Logo upload */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 10 }}>Company Logo</div>
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <input type="file" accept="image/png,image/jpeg" onChange={handleFileSelect} style={{ display: 'none' }} />
            {displayLogo ? (
              <div style={{ width: 240, height: 160, border: '2px dashed var(--grey-border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--grey-bg)' }}>
                <img src={displayLogo} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: 240, height: 160, border: '2px dashed var(--grey-border)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--grey-bg)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B0BAC8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Upload Company Logo</span>
                <span style={{ fontSize: 11, color: 'var(--grey-text)' }}>PNG or JPG, max 2MB</span>
              </div>
            )}
          </label>
          {displayLogo && <div style={{ fontSize: 11, color: 'var(--grey-text)', marginTop: 6 }}>Click the image to replace</div>}
        </div>

        {/* Company name */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>Company Name</div>
          <input
            type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            style={{ width: 320, height: 40, border: '1.5px solid var(--grey-border)', borderRadius: 7, padding: '0 12px', fontFamily: 'var(--font)', fontSize: 14, color: 'var(--navy)', outline: 'none' }}
          />
        </div>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 20px', background: 'var(--navy)', color: 'white', border: 'none',
            borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {success && <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>Saved successfully</span>}
        </div>
      </div>
    </div>
  );
}

function SecurityPanel() {
  const navigate = useNavigate();
  const { data: settings=[], isLoading } = useQuery({ queryKey:['admin-settings'], queryFn:()=>api.get('/admin/settings').then(r=>r.data) });
  const qc = useQueryClient();
  const save = useMutation({ mutationFn:data=>api.put('/admin/settings',data), onSuccess:()=>qc.invalidateQueries(['admin-settings']) });
  const getSetting = k => settings.find(s=>s.key===k)?.value||'';

  const ROWS = [
    { key:'session_timeout_minutes', label:'Session Timeout', desc:'Auto-logout after N minutes of inactivity', unit:'minutes' },
    { key:'otp_expiry_minutes', label:'OTP Expiry', desc:'Time before one-time code expires', unit:'minutes' },
    { key:'otp_max_attempts', label:'Max OTP Attempts', desc:'Failed attempts before account lock', unit:'attempts' },
    { key:'jwt_access_expiry', label:'JWT Access Token Expiry', desc:'Short-lived access token duration' },
    { key:'recycle_bin_days', label:'Recycle Bin Retention', desc:'Days before purged', unit:'days' },
  ];

  if (isLoading) return <div style={{ padding:20,color:'var(--grey-text)',fontSize:13 }}>Loading…</div>;

  return (
    <div>
      <h2 style={{ fontSize:18,fontWeight:700,color:'var(--navy)',marginBottom:16 }}>Session & Security</h2>
      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,overflow:'hidden' }}>
        <div style={{ padding:'10px 18px',borderBottom:'1px solid var(--grey-border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <span style={{ fontSize:13,fontWeight:700,color:'var(--navy)' }}>Security Settings</span>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <button onClick={()=>navigate('/mfa-setup')} style={{ padding:'6px 14px',background:'var(--navy)',color:'white',border:'none',borderRadius:6,fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer' }}>Set up Authenticator App</button>
            <span style={{ fontSize:12,color:'var(--green)',fontWeight:700 }}>🔒 2FA is mandatory — cannot be disabled</span>
          </div>
        </div>
        <div style={{ padding:'0 18px' }}>
          {ROWS.map(r=>(
            <div key={r.key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderBottom:'1px solid var(--grey-bg)',gap:20 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:'var(--navy)',marginBottom:3 }}>{r.label}</div>
                <div style={{ fontSize:12,color:'var(--grey-text)' }}>{r.desc}</div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
                <input defaultValue={getSetting(r.key)} onBlur={e=>save.mutate({key:r.key,value:e.target.value})}
                  style={{ width:64,height:32,border:'1.5px solid var(--grey-border)',borderRadius:6,padding:'0 8px',fontFamily:'var(--font)',fontSize:13,fontWeight:700,color:'var(--navy)',background:'var(--grey-bg)',outline:'none',textAlign:'center' }}/>
                {r.unit&&<span style={{ fontSize:12,color:'var(--grey-text)' }}>{r.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VisibilityPanel() {
  const qc = useQueryClient();
  const { data: vis=[] } = useQuery({ queryKey:['report-vis'], queryFn:()=>api.get('/admin/report-visibility').then(r=>r.data) });
  const toggle = useMutation({ mutationFn:data=>api.put('/admin/report-visibility',data), onSuccess:()=>qc.invalidateQueries(['report-vis']) });
  const isVisible = (report_key,role) => vis.find(v=>v.report_key===report_key&&v.role===role)?.visible||false;

  return (
    <div>
      <h2 style={{ fontSize:18,fontWeight:700,color:'var(--navy)',marginBottom:16 }}>Report Visibility</h2>
      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,overflow:'hidden' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ padding:'8px 14px',fontSize:10.5,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',textAlign:'left',background:'var(--grey-bg)',borderBottom:'1.5px solid var(--grey-border)' }}>Report</th>
            {ROLES_ALL.map(r=><th key={r} style={{ padding:'8px 12px',fontSize:10.5,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',textAlign:'center',background:'var(--grey-bg)',borderBottom:'1.5px solid var(--grey-border)',width:80 }}>{ROLE_LABELS[r]}</th>)}
          </tr></thead>
          <tbody>{REPORTS_ALL.map(rk=>(
            <tr key={rk}>
              <td style={{ padding:'10px 14px',fontSize:13,color:'var(--navy)',borderBottom:'1px solid var(--grey-bg)' }}>{REPORT_LABELS[rk]||rk}</td>
              {ROLES_ALL.map(role=>(
                <td key={role} style={{ padding:'10px 12px',textAlign:'center',borderBottom:'1px solid var(--grey-bg)' }}>
                  <div onClick={()=>toggle.mutate({report_key:rk,role,visible:!isVisible(rk,role)})} style={{ width:18,height:18,borderRadius:4,cursor:'pointer',border:`2px solid ${isVisible(rk,role)?'var(--navy)':'var(--grey-border)'}`,background:isVisible(rk,role)?'var(--navy)':'white',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',transition:'all 0.15s' }}>
                    {isVisible(rk,role)&&<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function LopSectionsPanel() {
  const { workspace } = useAuthStore();
  const qc = useQueryClient();
  const { data: sections=[] } = useQuery({
    queryKey: ['lop-sections', workspace?.id],
    queryFn: () => api.get(`/tenants/${workspace.id}/lop-sections`).then(r=>r.data),
    enabled: !!workspace,
  });

  const addSection = useMutation({
    mutationFn: data => api.post(`/tenants/${workspace.id}/lop-sections`, data),
    onSuccess: () => qc.invalidateQueries(['lop-sections', workspace?.id]),
  });
  const updateSection = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/tenants/${workspace.id}/lop-sections/${id}`, data),
    onSuccess: () => qc.invalidateQueries(['lop-sections', workspace?.id]),
  });

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
        <div><h2 style={{ fontSize:18,fontWeight:700,color:'var(--navy)',marginBottom:3 }}>LOP Sections</h2><p style={{ fontSize:13,color:'var(--grey-text)' }}>{sections.length} sections</p></div>
      </div>
      <div style={{ marginBottom:12,display:'flex',gap:8 }}>
        <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder='Section name' style={{ height:34,border:'1.5px solid var(--grey-border)',borderRadius:6,padding:'0 10px',fontSize:13 }} />
        <input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder='Description' style={{ height:34,border:'1.5px solid var(--grey-border)',borderRadius:6,padding:'0 10px',fontSize:13 }} />
        <button onClick={()=>{ if (!newName.trim()) return; addSection.mutate({ name:newName.trim(), description:newDesc.trim() }); setNewName(''); setNewDesc(''); }} style={{ padding:'7px 12px',background:'var(--navy)',color:'white',border:'none',borderRadius:6,cursor:'pointer' }}>Add</button>
      </div>
      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,overflow:'hidden' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead><tr>{['Name','Description','Active'].map(h=><th key={h} style={{ padding:'8px 12px',fontSize:10.5,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',textAlign:'left',background:'var(--grey-bg)',borderBottom:'1.5px solid var(--grey-border)' }}>{h}</th>)}</tr></thead>
          <tbody>{sections.map(s=>(
            <tr key={s.id}>
              <td style={{ padding:'8px 12px',borderBottom:'1px solid var(--grey-bg)' }}><input value={s.name||''} onChange={()=>{}} onBlur={e=>updateSection.mutate({ id:s.id, name:e.target.value })} style={{ width:'100%', border:'1px solid var(--grey-border)', borderRadius:5, padding:'4px 6px' }} /></td>
              <td style={{ padding:'8px 12px',borderBottom:'1px solid var(--grey-bg)' }}><input value={s.description||''} onChange={()=>{}} onBlur={e=>updateSection.mutate({ id:s.id, description:e.target.value })} style={{ width:'100%', border:'1px solid var(--grey-border)', borderRadius:5, padding:'4px 6px' }} /></td>
              <td style={{ padding:'8px 12px',borderBottom:'1px solid var(--grey-bg)' }}><button onClick={()=>updateSection.mutate({ id:s.id, is_active: !s.is_active })} style={{ padding:'5px 8px',background:s.is_active?'var(--green)':'var(--grey-border)',color:'white',border:'none',borderRadius:5,cursor:'pointer' }}>{s.is_active?'Active':'Inactive'}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const HOLIDAY_TYPE_COLORS = { Public:'var(--navy)', Company:'var(--amber)', Optional:'var(--grey-text)' };
const HOLIDAY_TYPE_BG = { Public:'rgba(0,50,100,0.08)', Company:'rgba(184,106,0,0.08)', Optional:'rgba(107,122,144,0.08)' };

function HolidayPanel() {
  const { workspace } = useAuthStore();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [newRow, setNewRow] = useState(null);

  const { data: holidays=[], isLoading } = useQuery({
    queryKey: ['holidays', workspace?.id, year],
    queryFn: () => api.get(`/tenants/${workspace.id}/holidays`, { params: { year } }).then(r=>r.data),
    enabled: !!workspace,
  });

  const createHoliday = useMutation({
    mutationFn: data => api.post(`/tenants/${workspace.id}/holidays`, data).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries(['holidays']); setNewRow(null); },
  });
  const updateHoliday = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/tenants/${workspace.id}/holidays/${id}`, data).then(r=>r.data),
    onSuccess: () => qc.invalidateQueries(['holidays']),
  });
  const deleteHoliday = useMutation({
    mutationFn: id => api.delete(`/tenants/${workspace.id}/holidays/${id}`),
    onSuccess: () => qc.invalidateQueries(['holidays']),
  });

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const resp = await api.post(`/tenants/${workspace.id}/holidays/import`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(resp.data);
      qc.invalidateQueries(['holidays']);
    } catch (err) {
      setImportResult({ imported: 0, failed: 1, errors: [{ row: 0, error: err.response?.data?.error || 'Import failed' }] });
    }
    e.target.value = '';
  };

  const handleExport = async () => {
    const resp = await api.get(`/tenants/${workspace.id}/holidays/export`, { params: { year }, responseType: 'blob' });
    const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `holidays_${year}.xlsx`;
    link.click();
  };

  const handleTemplate = async () => {
    const resp = await api.get(`/tenants/${workspace.id}/holidays/template`, { responseType: 'blob' });
    const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'holiday_import_template.xlsx';
    link.click();
  };

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18,fontWeight:700,color:'var(--navy)',marginBottom:3 }}>Holiday List</h2>
          <p style={{ fontSize:13,color:'var(--grey-text)' }}>{holidays.length} holidays in {year}</p>
        </div>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <select value={year} onChange={e=>setYear(Number(e.target.value))} style={{ height:34,border:'1.5px solid var(--grey-border)',borderRadius:6,padding:'0 10px',fontSize:13,fontFamily:'var(--font)' }}>
            {[currentYear-1, currentYear, currentYear+1, currentYear+2].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={()=>setNewRow({ name:'', date:'', holiday_type:'Public' })} style={{ padding:'7px 14px',background:'var(--navy)',color:'white',border:'none',borderRadius:7,fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer' }}>+ Add Holiday</button>
          <button onClick={()=>setShowImport(!showImport)} style={{ padding:'7px 14px',background:'var(--amber)',color:'white',border:'none',borderRadius:7,fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer' }}>Import Excel</button>
          <button onClick={handleExport} style={{ padding:'7px 14px',background:'var(--green)',color:'white',border:'none',borderRadius:7,fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer' }}>Export Excel</button>
        </div>
      </div>

      {showImport && (
        <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,padding:16,marginBottom:16 }}>
          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:10 }}>
            <label style={{ padding:'7px 14px',background:'var(--navy)',color:'white',borderRadius:7,fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer' }}>
              Choose File
              <input type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display:'none' }} />
            </label>
            <button onClick={handleTemplate} style={{ padding:'7px 14px',background:'white',border:'1.5px solid var(--grey-border)',borderRadius:7,fontFamily:'var(--font)',fontSize:12,cursor:'pointer',color:'var(--navy)' }}>Download Template</button>
            <button onClick={()=>{ setShowImport(false); setImportResult(null); }} style={{ padding:'7px 14px',background:'white',border:'1.5px solid var(--grey-border)',borderRadius:7,fontFamily:'var(--font)',fontSize:12,cursor:'pointer' }}>Close</button>
          </div>
          {importResult && (
            <div style={{ padding:12,background:importResult.failed?'rgba(232,35,42,0.05)':'rgba(10,122,121,0.05)',borderRadius:7,fontSize:13 }}>
              <div style={{ fontWeight:700,color:'var(--navy)',marginBottom:6 }}>{importResult.imported} imported, {importResult.failed} failed</div>
              {importResult.errors?.map((e,i) => (
                <div key={i} style={{ fontSize:12,color:'var(--red)',marginBottom:2 }}>Row {e.row}: {e.error}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,overflow:'hidden' }}>
        {isLoading ? <div style={{ padding:30,textAlign:'center',color:'var(--grey-text)',fontSize:13 }}>Loading…</div> : (
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead><tr>{['SI','Holiday Name','Date','Day','Type','Actions'].map(h=><th key={h} style={{ padding:'8px 12px',fontSize:10.5,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',textAlign:'left',background:'var(--grey-bg)',borderBottom:'1.5px solid var(--grey-border)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {newRow && (
                <tr>
                  <td style={{ padding:'6px 12px',borderBottom:'1px solid var(--grey-bg)' }}>—</td>
                  <td style={{ padding:'6px 12px',borderBottom:'1px solid var(--grey-bg)' }}><input value={newRow.name} onChange={e=>setNewRow({...newRow,name:e.target.value})} placeholder="Holiday name" style={{ width:'100%',height:30,border:'1px solid var(--grey-border)',borderRadius:5,padding:'0 8px',fontSize:12 }}/></td>
                  <td style={{ padding:'6px 12px',borderBottom:'1px solid var(--grey-bg)' }}><input type="date" value={newRow.date} onChange={e=>setNewRow({...newRow,date:e.target.value})} style={{ height:30,border:'1px solid var(--grey-border)',borderRadius:5,fontSize:12 }}/></td>
                  <td style={{ padding:'6px 12px',borderBottom:'1px solid var(--grey-bg)',fontSize:12,color:'var(--grey-text)' }}>{newRow.date ? DAY_NAMES[new Date(newRow.date).getDay()] : '—'}</td>
                  <td style={{ padding:'6px 12px',borderBottom:'1px solid var(--grey-bg)' }}><select value={newRow.holiday_type} onChange={e=>setNewRow({...newRow,holiday_type:e.target.value})} style={{ height:30,border:'1px solid var(--grey-border)',borderRadius:5,fontSize:12 }}><option>Public</option><option>Company</option><option>Optional</option></select></td>
                  <td style={{ padding:'6px 12px',borderBottom:'1px solid var(--grey-bg)' }}>
                    <div style={{ display:'flex',gap:4 }}>
                      <button onClick={()=>createHoliday.mutate(newRow)} disabled={!newRow.name||!newRow.date} style={{ padding:'4px 10px',background:'var(--green)',color:'white',border:'none',borderRadius:4,fontSize:11,cursor:'pointer' }}>Save</button>
                      <button onClick={()=>setNewRow(null)} style={{ padding:'4px 10px',background:'var(--grey-border)',color:'white',border:'none',borderRadius:4,fontSize:11,cursor:'pointer' }}>Cancel</button>
                    </div>
                  </td>
                </tr>
              )}
              {holidays.map((h,idx) => (
                <tr key={h.id} style={{ background: HOLIDAY_TYPE_BG[h.holiday_type] || 'white', textDecoration: h.is_active ? 'none' : 'line-through', opacity: h.is_active ? 1 : 0.55 }}>
                  <td style={{ padding:'8px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{idx+1}</td>
                  <td style={{ padding:'8px 12px',borderBottom:'1px solid var(--grey-bg)' }}><input defaultValue={h.name} onBlur={e=>{ if(e.target.value!==h.name) updateHoliday.mutate({id:h.id,name:e.target.value}); }} style={{ width:'100%',border:'1px solid transparent',borderRadius:5,padding:'4px 6px',fontSize:13,fontWeight:700,color:'var(--navy)',background:'transparent' }}/></td>
                  <td style={{ padding:'8px 12px',borderBottom:'1px solid var(--grey-bg)' }}><input type="date" defaultValue={h.date?.slice(0,10)} onBlur={e=>{ if(e.target.value!==h.date?.slice(0,10)) updateHoliday.mutate({id:h.id,date:e.target.value}); }} style={{ border:'1px solid transparent',borderRadius:5,fontSize:12,background:'transparent' }}/></td>
                  <td style={{ padding:'8px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{h.date ? DAY_NAMES[new Date(h.date).getDay()] : ''}</td>
                  <td style={{ padding:'8px 12px',borderBottom:'1px solid var(--grey-bg)' }}><span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,background:HOLIDAY_TYPE_BG[h.holiday_type],color:HOLIDAY_TYPE_COLORS[h.holiday_type] }}>{h.holiday_type}</span></td>
                  <td style={{ padding:'8px 12px',borderBottom:'1px solid var(--grey-bg)' }}>
                    <div style={{ display:'flex',gap:4 }}>
                      <button onClick={()=>updateHoliday.mutate({id:h.id,is_active:!h.is_active})} style={{ padding:'3px 8px',fontSize:11,border:'none',borderRadius:4,cursor:'pointer',background:h.is_active?'rgba(10,122,121,0.08)':'rgba(184,106,0,0.08)',color:h.is_active?'var(--green)':'var(--amber)' }}>{h.is_active?'Active':'Inactive'}</button>
                      <button onClick={()=>deleteHoliday.mutate(h.id)} style={{ padding:'3px 8px',fontSize:11,background:'rgba(232,35,42,0.08)',color:'var(--red)',border:'none',borderRadius:4,cursor:'pointer' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {holidays.length===0 && !newRow && <tr><td colSpan={6} style={{ padding:30,textAlign:'center',color:'var(--grey-text)',fontSize:13 }}>No holidays for {year}. Add holidays or import from Excel.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AuditPanel() {
  const { data: logs=[], isLoading } = useQuery({ queryKey:['audit'], queryFn:()=>api.get('/admin/audit-log').then(r=>r.data) });
  return (
    <div>
      <h2 style={{ fontSize:18,fontWeight:700,color:'var(--navy)',marginBottom:16 }}>Audit Log</h2>
      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,overflow:'hidden' }}>
        {isLoading?<div style={{ padding:20,textAlign:'center',color:'var(--grey-text)',fontSize:13 }}>Loading…</div>:(
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead><tr>{['Time','Actor','Action','Entity','IP'].map(h=><th key={h} style={{ padding:'8px 12px',fontSize:10.5,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',textAlign:'left',background:'var(--grey-bg)',borderBottom:'1.5px solid var(--grey-border)' }}>{h}</th>)}</tr></thead>
            <tbody>{logs.map(l=>(
              <tr key={l.id}>
                <td style={{ padding:'8px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)',whiteSpace:'nowrap' }}>{new Date(l.created_at).toLocaleString('en-GB')}</td>
                <td style={{ padding:'8px 12px',fontSize:12,fontWeight:700,color:'var(--navy)',borderBottom:'1px solid var(--grey-bg)' }}>{l.actor_name||'System'}</td>
                <td style={{ padding:'8px 12px',borderBottom:'1px solid var(--grey-bg)' }}><code style={{ fontSize:11,background:'var(--grey-bg)',padding:'2px 6px',borderRadius:3,color:'var(--navy)' }}>{l.action}</code></td>
                <td style={{ padding:'8px 12px',fontSize:11,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{l.entity_type&&`${l.entity_type}`}</td>
                <td style={{ padding:'8px 12px',fontSize:11,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{l.ip_address||'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SysInfoPanel() {
  const { data: info } = useQuery({ queryKey:['sysinfo'], queryFn:()=>api.get('/admin/system-info').then(r=>r.data) });
  if (!info) return null;
  return (
    <div>
      <h2 style={{ fontSize:18,fontWeight:700,color:'var(--navy)',marginBottom:16 }}>System Information</h2>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
        {[
          ['Version', info.version], ['Environment', 'On-Premise · Windows Server'],
          ['Active Users', info.users], ['Workspaces', info.workspaces],
          ['Projects', info.projects], ['Node.js', info.node_version],
          ['Uptime', `${Math.floor(info.uptime_seconds/3600)}h ${Math.floor((info.uptime_seconds%3600)/60)}m`],
          ['DB Status', '● PostgreSQL'],
        ].map(([k,v])=>(
          <div key={k} style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:9,padding:'14px 16px' }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--grey-text)',marginBottom:6 }}>{k}</div>
            <div style={{ fontSize:14,fontWeight:700,color:'var(--navy)' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [section, setSection] = useState('users');

  const groups = [...new Set(ADMIN_SECTIONS.map(s=>s.group))];

  return (
    <div style={{ padding:28, display:'flex', gap:20, height:'100%', overflow:'hidden' }}>
      {/* Left nav */}
      <div style={{ width:220,flexShrink:0,background:'white',border:'1px solid var(--grey-border)',borderRadius:10,padding:12,overflow:'auto' }}>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',color:'var(--grey-text)',padding:'6px 8px',marginBottom:4 }}>ADMIN PANEL</div>
        {groups.map(g=>(
          <div key={g}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#B0BAC8',padding:'10px 8px 4px' }}>{g}</div>
            {ADMIN_SECTIONS.filter(s=>s.group===g).map(s=>(
              <button key={s.key} onClick={()=>setSection(s.key)} style={{ width:'100%',padding:'8px 10px',borderRadius:6,border:'none',background:section===s.key?'var(--navy-xlight)':'white',color:section===s.key?'var(--navy)':'var(--grey-text)',fontFamily:'var(--font)',fontSize:13,fontWeight:section===s.key?700:400,cursor:'pointer',textAlign:'left',marginBottom:2 }}>{s.label}</button>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto' }}>
        {section==='users'      && <UsersPanel/>}
        {section==='branding'   && <BrandingPanel/>}
        {section==='security'   && <SecurityPanel/>}
        {section==='lop-sections' && <LopSectionsPanel/>}
        {section==='holidays'   && <HolidayPanel/>}
        {section==='visibility' && <VisibilityPanel/>}
        {section==='audit'      && <AuditPanel/>}
        {section==='sysinfo'    && <SysInfoPanel/>}
        {!['users','branding','security','lop-sections','holidays','visibility','audit','sysinfo'].includes(section) && (
          <div style={{ padding:40,textAlign:'center',color:'var(--grey-text)',fontSize:14 }}>
            {ADMIN_SECTIONS.find(s=>s.key===section)?.label} — available in full deployment.
          </div>
        )}
      </div>
    </div>
  );
}
