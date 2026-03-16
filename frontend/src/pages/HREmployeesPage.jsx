import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const cardStyle = { background:'white', border:'1px solid var(--grey-border)', borderRadius:10, padding:20 };
const labelStyle = { fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'var(--grey-text)', marginBottom:2 };
const valueStyle = { fontSize:13, color:'var(--navy)', fontWeight:500, wordBreak:'break-word' };

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

function FieldGrid({ fields }) {
  const visible = fields.filter(f => f.value);
  if (visible.length === 0) return <div style={{ color:'var(--grey-text)', fontSize:13, padding:12 }}>No data available</div>;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
      {visible.map(f => <Field key={f.label} label={f.label} value={f.value} />)}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  const color = s === 'active' ? 'var(--green)' : s === 'inactive' ? 'var(--red)' : 'var(--amber)';
  return (
    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:`${color}18`, color, whiteSpace:'nowrap' }}>
      {status || '—'}
    </span>
  );
}

// ── Detail Side Panel ────────────────────────────────────────────
function DetailPanel({ employee, onClose, isSuperUser }) {
  const [tab, setTab] = useState('basic');
  const e = employee;

  const isHROnly = !isSuperUser;

  const tabs = [
    { key:'basic', label:'Basic Info' },
    { key:'personal', label:'Personal' },
    { key:'family', label:'Family & Emergency' },
    { key:'financial', label:'Financial' },
  ];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', justifyContent:'flex-end' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div style={{ position:'relative', width:560, maxWidth:'90vw', background:'white', boxShadow:'-4px 0 24px rgba(0,0,0,0.12)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--grey-border)', display:'flex', alignItems:'center', gap:14 }}>
          {e.photo_url ? (
            <img src={e.photo_url} alt="" style={{ width:48, height:48, borderRadius:'50%', objectFit:'cover' }} />
          ) : (
            <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'white', flexShrink:0 }}>
              {(e.full_name || e.first_name || '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--navy)' }}>{e.full_name || `${e.first_name || ''} ${e.last_name || ''}`}</div>
            <div style={{ fontSize:12, color:'var(--grey-text)' }}>{e.designation} {e.department ? `· ${e.department}` : ''}</div>
          </div>
          <StatusBadge status={e.employee_status} />
          <button onClick={onClose} title="Close panel" style={{ width:28, height:28, borderRadius:6, border:'1px solid var(--grey-border)', background:'white', cursor:'pointer', fontSize:14, color:'var(--grey-text)', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--grey-border)', padding:'0 24px' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'10px 16px', fontSize:12, fontWeight:tab === t.key ? 700 : 400,
              color: tab === t.key ? 'var(--navy)' : 'var(--grey-text)',
              borderBottom: tab === t.key ? '2px solid var(--navy)' : '2px solid transparent',
              background:'none', border:'none', borderBottomStyle:'solid', cursor:'pointer',
              fontFamily:'var(--font)',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex:1, overflow:'auto', padding:24 }}>
          {tab === 'basic' && (
            <FieldGrid fields={[
              { label:'Employee ID', value:e.employee_id },
              { label:'Email', value:e.email },
              { label:'Department', value:e.department },
              { label:'Designation', value:e.designation },
              { label:'Zoho Role', value:e.zoho_role },
              { label:'Employment Type', value:e.employment_type },
              { label:'Employee Status', value:e.employee_status },
              { label:'Source of Hire', value:e.source_of_hire },
              { label:'Date of Joining', value:e.date_of_joining },
              { label:'Date of Confirmation', value:e.date_of_confirmation },
              { label:'Current Experience', value:e.current_experience },
              { label:'Total Experience', value:e.total_experience },
              { label:'Reporting Manager', value:e.reporting_manager },
              { label:'Secondary Reporting Manager', value:e.secondary_reporting_manager },
              { label:'Onboarding Status', value:e.onboarding_status },
              { label:'Company', value:e.company },
              { label:'Business Unit', value:e.business_unit },
              { label:'Division', value:e.division },
              { label:'Teams', value:e.teams },
              { label:'Banding', value:e.banding },
              { label:'New Joiner', value:e.new_joiner },
              { label:'Work Phone', value:e.work_phone },
              { label:'Seating Location', value:e.seating_location },
              { label:'Tags', value:e.tags },
              { label:'Work Experience', value:e.work_experience },
              { label:'Date of Exit', value:e.date_of_exit },
              { label:'Contract End Date', value:e.contract_end_date },
            ]} />
          )}

          {tab === 'personal' && (
            <FieldGrid fields={[
              { label:'Date of Birth', value:e.date_of_birth },
              { label:'Age', value:e.age },
              { label:'Gender', value:e.gender },
              { label:'Marital Status', value:e.marital_status },
              { label:'Blood Group', value:e.blood_group },
              { label:'About Me', value:e.about_me },
              { label:'Expertise', value:e.expertise },
              { label:'Passport', value:e.passport },
              { label:'Personal Mobile', value:e.personal_mobile },
              { label:'Personal Email', value:e.personal_email },
              { label:'Present Address', value:e.present_address },
              { label:'Permanent Address', value:e.permanent_address },
            ]} />
          )}

          {tab === 'family' && (
            <>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--navy)', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>Family</div>
              <FieldGrid fields={[
                { label:"Father's Name", value:e.fathers_name },
                { label:'DOB - Father', value:e.dob_father },
                { label:"Mother's Name", value:e.mothers_name },
                { label:'DOB - Mother', value:e.dob_mother },
                { label:'Spouse Name', value:e.spouse_name },
                { label:'DOB - Spouse', value:e.dob_spouse },
                { label:'Having Kids', value:e.having_kids },
                { label:'Number of Kids', value:e.number_of_kids },
                { label:'Child 1 Name', value:e.child1_name },
                { label:'Child 1 DOB', value:e.child1_dob },
                { label:'Child 2 Name', value:e.child2_name },
                { label:'Child 2 DOB', value:e.child2_dob },
              ]} />
              <div style={{ fontSize:12, fontWeight:700, color:'var(--navy)', margin:'20px 0 12px', textTransform:'uppercase', letterSpacing:1 }}>Emergency Contact</div>
              <FieldGrid fields={[
                { label:'Contact Name', value:e.emergency_contact_name },
                { label:'Contact Number', value:e.emergency_contact_number },
                { label:'Relation', value:e.emergency_contact_relation },
              ]} />
            </>
          )}

          {tab === 'financial' && (
            isHROnly ? (
              <div style={{ padding:40, textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🔒</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--navy)', marginBottom:8 }}>Access Restricted</div>
                <p style={{ fontSize:13, color:'var(--grey-text)', lineHeight:1.6 }}>
                  Financial and identity information is restricted to Super User access only.
                </p>
              </div>
            ) : (
              <FieldGrid fields={[
                { label:'Aadhaar', value:e.aadhaar },
                { label:'PAN', value:e.pan },
                { label:'UAN', value:e.uan },
                { label:'Do You Have UAN', value:e.do_you_have_uan },
                { label:'Bank Name', value:e.bank_name },
                { label:'Account Holder Name', value:e.account_holder_name },
                { label:'Bank Account Number', value:e.bank_account_number },
                { label:'IFSC Code', value:e.ifsc_code },
                { label:'Account Type', value:e.account_type },
                { label:'Payment Mode', value:e.payment_mode },
                { label:'Existing Bank Account', value:e.existing_bank_account },
              ]} />
            )
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 24px', borderTop:'1px solid var(--grey-border)', fontSize:11, color:'var(--grey-text)' }}>
          Last synced: {e.last_synced_at ? new Date(e.last_synced_at).toLocaleString() : '—'}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────
export default function HREmployeesPanel() {
  const { user } = useAuthStore();
  const isSuperUser = user?.roles?.includes('super_user');

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const limit = 30;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hr-employees', search, deptFilter, statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      if (deptFilter) params.set('department', deptFilter);
      if (statusFilter) params.set('status', statusFilter);
      return api.get(`/zoho/employees?${params}`).then(r => r.data);
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: () => api.get('/zoho/departments').then(r => r.data),
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['hr-sync-status'],
    queryFn: () => api.get('/zoho/sync-status').then(r => r.data),
  });

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const { data: result } = await api.post('/zoho/sync');
      setSyncMsg(`Synced: ${result.upserted} updated, ${result.skipped} skipped`);
      refetch();
    } catch (err) {
      setSyncMsg(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const employees = data?.employees || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Detail fetch
  const { data: detail } = useQuery({
    queryKey: ['hr-employee-detail', selected],
    queryFn: () => api.get(`/zoho/employees/${selected}`).then(r => r.data),
    enabled: !!selected,
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--navy)', margin:0 }}>HR Employees</h2>
          <div style={{ fontSize:12, color:'var(--grey-text)', marginTop:2 }}>
            {total} employees {syncStatus?.last_sync ? `· Last sync: ${new Date(syncStatus.last_sync).toLocaleString()}` : ''}
          </div>
        </div>
        {isSuperUser && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {syncMsg && <span style={{ fontSize:12, color:syncMsg.includes('fail') ? 'var(--red)' : 'var(--green)' }}>{syncMsg}</span>}
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Sync employee data from Zoho People"
              style={{ padding:'8px 16px', background:'var(--navy)', color:'white', border:'none', borderRadius:7, fontFamily:'var(--font)', fontSize:12, fontWeight:700, cursor:syncing?'not-allowed':'pointer' }}
            >
              {syncing ? 'Syncing...' : 'Sync from Zoho'}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ ...cardStyle, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, ID, email, department..."
          title="Search by name, ID, email or department"
          style={{ flex:1, minWidth:200, height:34, border:'1.5px solid var(--grey-border)', borderRadius:6, padding:'0 10px', fontFamily:'var(--font)', fontSize:13, color:'var(--navy)', outline:'none' }}
        />
        <select
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
          title="Filter by department"
          style={{ height:34, border:'1.5px solid var(--grey-border)', borderRadius:6, padding:'0 10px', fontFamily:'var(--font)', fontSize:12, color:'var(--navy)', background:'white' }}
        >
          <option value="">All Departments</option>
          {(departments || []).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          title="Filter by status"
          style={{ height:34, border:'1.5px solid var(--grey-border)', borderRadius:6, padding:'0 10px', fontFamily:'var(--font)', fontSize:12, color:'var(--navy)', background:'white' }}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="On Probation">On Probation</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding:0, overflow:'hidden' }}>
        {isLoading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--grey-text)' }}>Loading...</div>
        ) : employees.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--grey-text)', fontSize:13 }}>
            {total === 0 && !search && !deptFilter && !statusFilter
              ? 'No employees synced yet. Click "Sync from Zoho" to import employee data.'
              : 'No employees match your filters.'}
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--font)', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--grey-bg)', borderBottom:'1px solid var(--grey-border)' }}>
                  {['Emp ID','','Full Name','Email','Department','Designation','Location','Reporting To','Status','Joined'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'var(--grey-text)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelected(emp.id)}
                    style={{ borderBottom:'1px solid var(--grey-border)', cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--grey-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding:'10px 12px', whiteSpace:'nowrap', fontWeight:600, color:'var(--navy)' }}>{emp.employee_id || '—'}</td>
                    <td style={{ padding:'10px 4px', width:32 }}>
                      {emp.photo_url ? (
                        <img src={emp.photo_url} alt="" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover' }} />
                      ) : (
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white' }}>
                          {(emp.full_name || emp.first_name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding:'10px 12px', fontWeight:600, color:'var(--navy)' }}>{emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`}</td>
                    <td style={{ padding:'10px 12px', color:'var(--grey-text)', fontSize:12 }}>{emp.email || '—'}</td>
                    <td style={{ padding:'10px 12px' }}>{emp.department || '—'}</td>
                    <td style={{ padding:'10px 12px' }}>{emp.designation || '—'}</td>
                    <td style={{ padding:'10px 12px' }}>{emp.seating_location || '—'}</td>
                    <td style={{ padding:'10px 12px', fontSize:12 }}>{emp.reporting_manager || '—'}</td>
                    <td style={{ padding:'10px 12px' }}><StatusBadge status={emp.employee_status} /></td>
                    <td style={{ padding:'10px 12px', whiteSpace:'nowrap', fontSize:12, color:'var(--grey-text)' }}>{emp.date_of_joining || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, padding:'12px 0', borderTop:'1px solid var(--grey-border)' }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} title="Previous page" style={{ padding:'6px 12px', borderRadius:6, border:'1px solid var(--grey-border)', background:'white', cursor:page <= 1 ? 'not-allowed' : 'pointer', fontFamily:'var(--font)', fontSize:12 }}>Prev</button>
            <span style={{ fontSize:12, color:'var(--grey-text)' }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} title="Next page" style={{ padding:'6px 12px', borderRadius:6, border:'1px solid var(--grey-border)', background:'white', cursor:page >= totalPages ? 'not-allowed' : 'pointer', fontFamily:'var(--font)', fontSize:12 }}>Next</button>
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      {selected && detail && (
        <DetailPanel employee={detail} onClose={() => setSelected(null)} isSuperUser={isSuperUser} />
      )}
    </div>
  );
}
