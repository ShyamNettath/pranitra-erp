import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const PROJECT_REPORTS = [
  { key:'performance',   label:'Project Performance',   api: id => `/reports/project/${id}/performance` },
  { key:'effort',        label:'Effort Variance',        api: id => `/reports/project/${id}/effort-variance` },
  { key:'schedule',      label:'Schedule Variance',      api: id => `/reports/project/${id}/schedule-variance` },
  { key:'budget',        label:'Budget Variance',        api: id => `/reports/project/${id}/budget-variance`, directorOnly: true },
  { key:'rework',        label:'Rework Analysis',        api: id => `/reports/project/${id}/rework` },
];

const ASSOC_REPORTS = [
  { key:'productivity',  label:'Associate Productivity', api: id => `/reports/associate/${id}/productivity` },
  { key:'idle',          label:'Idle Time Analysis',     api: id => `/reports/associate/${id}/idle-time`, directorOnly: true },
];

function Bar({ label, value, max, color='var(--navy)' }) {
  const pct = max > 0 ? Math.min(100, Math.round(100*value/max)) : 0;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
        <span style={{ fontSize:13,color:'var(--navy)' }}>{label}</span>
        <span style={{ fontSize:12,fontWeight:700,color }}>{typeof value==='number'?value.toFixed(1):value}</span>
      </div>
      <div style={{ height:8,background:'var(--grey-bg)',borderRadius:4 }}>
        <div style={{ width:`${pct}%`,height:'100%',background:color,borderRadius:4,transition:'width 0.4s' }}/>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color='var(--navy)' }) {
  return (
    <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:9,padding:'14px 16px',borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--grey-text)',marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22,fontWeight:700,color }}>{value}</div>
    </div>
  );
}

function PerformanceReport({ data }) {
  if (!data) return null;
  const s = data.task_stats || [];
  const count = k => parseInt(s.find(x=>x.status===k)?.count||0);
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}>
        <KpiCard label="Total Tasks"     value={s.reduce((a,x)=>a+parseInt(x.count),0)}    color="var(--navy)"/>
        <KpiCard label="Done"            value={count('done')}            color="var(--green)"/>
        <KpiCard label="In Progress"     value={count('in_progress')}     color="var(--amber)"/>
        <KpiCard label="Team Members"    value={data.member_count||0}      color="var(--purple)"/>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
        <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:9,padding:16 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--navy)',marginBottom:12 }}>Task Status Breakdown</div>
          {s.map(st=><Bar key={st.status} label={st.status.replace('_',' ')} value={parseInt(st.count)} max={s.reduce((a,x)=>a+parseInt(x.count),0)} color={st.status==='done'?'var(--green)':st.status==='in_progress'?'var(--amber)':'var(--navy)'}/>)}
        </div>
        <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:9,padding:16 }}>
          <div style={{ fontWeight:700,fontSize:13,color:'var(--navy)',marginBottom:12 }}>Milestones</div>
          {data.milestones&&<>
            <Bar label="Achieved" value={data.milestones.achieved} max={data.milestones.total} color="var(--green)"/>
            <Bar label="Missed"   value={data.milestones.missed}   max={data.milestones.total} color="var(--red)"/>
            <Bar label="Pending"  value={data.milestones.total-data.milestones.achieved-data.milestones.missed} max={data.milestones.total} color="var(--amber)"/>
          </>}
        </div>
      </div>
    </div>
  );
}

function EffortReport({ data }) {
  if (!data) return null;
  const maxHours = Math.max(...(data.design||[]).map(d=>Math.max(d.baseline_hours||0,d.actual_hours||0)),1);
  return (
    <div>
      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:9,padding:16,marginBottom:16 }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--navy)',marginBottom:12 }}>Design Sub-Categories</div>
        {(data.design||[]).map(d=>(
          <div key={d.name} style={{ marginBottom:14 }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
              <span style={{ fontSize:13,color:'var(--navy)',fontWeight:700 }}>{d.name}</span>
              <span style={{ fontSize:12,color:parseFloat(d.variance_pct||0)>0?'var(--red)':'var(--green)',fontWeight:700 }}>{d.variance_pct||0}%</span>
            </div>
            <div style={{ height:8,background:'var(--grey-bg)',borderRadius:4,position:'relative',marginBottom:2 }}>
              <div style={{ width:`${Math.round(100*(d.baseline_hours||0)/maxHours)}%`,height:'100%',background:'rgba(0,50,100,0.2)',borderRadius:4,position:'absolute' }}/>
              <div style={{ width:`${Math.round(100*(d.actual_hours||0)/maxHours)}%`,height:'100%',background:'var(--navy)',borderRadius:4,position:'absolute' }}/>
            </div>
            <div style={{ fontSize:11,color:'var(--grey-text)' }}>Baseline: {parseFloat(d.baseline_hours||0).toFixed(1)}h · Actual: {parseFloat(d.actual_hours||0).toFixed(1)}h</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleReport({ data }) {
  if (!data) return null;
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16 }}>
        <KpiCard label="Total Tasks"  value={data.total||0}          color="var(--navy)"/>
        <KpiCard label="Overdue"      value={data.overdue_count||0}  color="var(--red)"/>
        <KpiCard label="Completed"    value={data.completed||0}       color="var(--green)"/>
      </div>
      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:9,overflow:'hidden' }}>
        <div style={{ padding:'10px 16px',borderBottom:'1px solid var(--grey-border)',fontWeight:700,fontSize:13,color:'var(--navy)' }}>Overdue Tasks</div>
        {(data.tasks||[]).filter(t=>t.is_overdue).map(t=>(
          <div key={t.id} style={{ display:'flex',gap:12,padding:'9px 16px',borderBottom:'1px solid var(--grey-bg)',alignItems:'center' }}>
            <div style={{ flex:1,fontSize:13,color:'var(--navy)',fontWeight:700 }}>{t.name}</div>
            <div style={{ fontSize:12,color:'var(--red)' }}>Due: {new Date(t.due_date).toLocaleDateString('en-GB')}</div>
            <div style={{ fontSize:12,color:'var(--grey-text)' }}>+{t.days_variance||0}d late</div>
          </div>
        ))}
        {(data.tasks||[]).filter(t=>t.is_overdue).length===0&&<div style={{ padding:'20px 16px',fontSize:13,color:'var(--grey-text)' }}>No overdue tasks.</div>}
      </div>
    </div>
  );
}

function BudgetReport({ data }) {
  if (!data) return null;
  const overspend = data.variance_pct > 0;
  return (
    <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12 }}>
      <KpiCard label="Total Budget"   value={`€${Number(data.budget||0).toLocaleString('en-GB')}`}        color="var(--navy)"/>
      <KpiCard label="Actual Cost"    value={`€${Number(data.actual_cost||0).toLocaleString('en-GB')}`}   color={overspend?'var(--red)':'var(--green)'}/>
      <KpiCard label="Remaining"      value={`€${Number(data.remaining||0).toLocaleString('en-GB')}`}     color={data.remaining>=0?'var(--green)':'var(--red)'}/>
      <KpiCard label="Variance"       value={`${data.variance_pct||0}%`}                                  color={overspend?'var(--red)':'var(--green)'}/>
    </div>
  );
}

function ReworkReport({ data }) {
  if (!data) return null;
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16 }}>
        <KpiCard label="Rework Hours" value={`${data.total_rework_hours||0}h`} color="var(--red)"/>
        <KpiCard label="Rework %"     value={`${data.rework_pct||0}%`}         color="var(--amber)"/>
      </div>
      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:9,overflow:'hidden' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead><tr>{['Unit','Sub-Category','Complexity','Rework Hours','Notes'].map(h=><th key={h} style={{ padding:'8px 12px',fontSize:10.5,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',textAlign:'left',background:'var(--grey-bg)',borderBottom:'1.5px solid var(--grey-border)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {(data.fails||[]).map((f,i)=>(
              <tr key={i}>
                <td style={{ padding:'9px 12px',fontWeight:700,color:'var(--navy)',borderBottom:'1px solid var(--grey-bg)' }}>{f.unit}</td>
                <td style={{ padding:'9px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{f.subcategory}</td>
                <td style={{ padding:'9px 12px',borderBottom:'1px solid var(--grey-bg)' }}><span style={{ fontSize:11,fontWeight:700,padding:'2px 6px',borderRadius:10,background:f.complexity==='simple'?'rgba(10,122,121,0.1)':'rgba(232,35,42,0.1)',color:f.complexity==='simple'?'var(--green)':'var(--red)' }}>{f.complexity}</span></td>
                <td style={{ padding:'9px 12px',fontSize:12,color:'var(--red)',fontWeight:700,borderBottom:'1px solid var(--grey-bg)' }}>{parseFloat(f.qc_hours||0).toFixed(1)}h</td>
                <td style={{ padding:'9px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{f.notes||'—'}</td>
              </tr>
            ))}
            {(!data.fails||!data.fails.length)&&<tr><td colSpan={5} style={{ padding:'20px 12px',textAlign:'center',color:'var(--grey-text)',fontSize:13 }}>No rework recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductivityReport({ data }) {
  if (!data) return null;
  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16 }}>
        <KpiCard label="Total Hours"     value={`${parseFloat(data.total_hours||0).toFixed(1)}h`} color="var(--navy)"/>
        <KpiCard label="Billable Hours"  value={`${parseFloat(data.billable_hours||0).toFixed(1)}h`} color="var(--green)"/>
        <KpiCard label="Tasks Completed" value={data.tasks_completed||0} color="var(--purple)"/>
      </div>
      <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:9,padding:16 }}>
        <div style={{ fontWeight:700,fontSize:13,color:'var(--navy)',marginBottom:12 }}>Weekly Hours</div>
        {(data.weekly||[]).map(w=>(
          <Bar key={w.week} label={new Date(w.week).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} value={parseFloat(w.total||0)} max={Math.max(...(data.weekly||[]).map(x=>parseFloat(x.total)),1)} color="var(--navy)"/>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { user, workspace } = useAuthStore();
  const [selectedReport, setSelectedReport] = useState(PROJECT_REPORTS[0]);
  const [projectId, setProjectId] = useState('');
  const [userId, setUserId] = useState('');
  const [reportType, setReportType] = useState('project');
  const isDir = user?.roles?.some(r=>['director','admin'].includes(r));

  const { data: projects=[] } = useQuery({
    queryKey: ['projects',workspace?.id],
    queryFn: () => api.get('/projects',{params:{workspace_id:workspace?.id}}).then(r=>r.data),
  });
  const { data: users=[] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r=>r.data),
    enabled: reportType==='associate',
  });

  const apiPath = useMemo(() => {
    if (reportType==='project' && projectId) return selectedReport.api(projectId);
    if (reportType==='associate' && userId) return selectedReport.api(userId);
    return null;
  }, [selectedReport, projectId, userId, reportType]);

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['report', selectedReport.key, projectId, userId],
    queryFn: () => api.get(apiPath).then(r=>r.data),
    enabled: !!apiPath,
  });

  const reports = reportType==='project' ? PROJECT_REPORTS : ASSOC_REPORTS;

  return (
    <div style={{ padding:28, display:'flex', gap:20, height:'100%', overflow:'hidden' }}>
      {/* Left nav */}
      <div style={{ width:220,flexShrink:0,background:'white',border:'1px solid var(--grey-border)',borderRadius:10,padding:12,overflow:'auto' }}>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',color:'var(--grey-text)',padding:'6px 8px',marginBottom:4 }}>Report Type</div>
        {[['project','Project Reports'],['associate','Associate Reports']].map(([k,l])=>(
          <button key={k} onClick={()=>{setReportType(k);setSelectedReport(k==='project'?PROJECT_REPORTS[0]:ASSOC_REPORTS[0]);}} style={{ width:'100%',padding:'8px 10px',borderRadius:6,border:'none',background:reportType===k?'var(--navy-xlight)':'white',color:reportType===k?'var(--navy)':'var(--grey-text)',fontFamily:'var(--font)',fontSize:13,fontWeight:reportType===k?700:400,cursor:'pointer',textAlign:'left',marginBottom:2 }}>{l}</button>
        ))}
        <div style={{ height:1,background:'var(--grey-border)',margin:'12px 0' }}/>
        <div style={{ fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',color:'var(--grey-text)',padding:'6px 8px',marginBottom:4 }}>Reports</div>
        {reports.filter(r=>!r.directorOnly||isDir).map(r=>(
          <button key={r.key} onClick={()=>setSelectedReport(r)} style={{ width:'100%',padding:'8px 10px',borderRadius:6,border:'none',background:selectedReport.key===r.key?'var(--navy-xlight)':'white',color:selectedReport.key===r.key?'var(--navy)':'var(--grey-text)',fontFamily:'var(--font)',fontSize:13,fontWeight:selectedReport.key===r.key?700:400,cursor:'pointer',textAlign:'left',marginBottom:2 }}>{r.label}{r.directorOnly&&<span style={{ marginLeft:6,fontSize:9,background:'rgba(232,35,42,0.1)',color:'var(--red)',padding:'1px 4px',borderRadius:3 }}>DIR</span>}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:12 }}>
          <h2 style={{ fontSize:16,fontWeight:700,color:'var(--navy)',flex:1 }}>{selectedReport.label}</h2>
          {reportType==='project' ? (
            <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={{ height:32,border:'1.5px solid var(--grey-border)',borderRadius:6,padding:'0 10px',fontFamily:'var(--font)',fontSize:13,color:'var(--navy)',background:'var(--grey-bg)',outline:'none',cursor:'pointer',minWidth:200 }}>
              <option value="">Select project…</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <select value={userId} onChange={e=>setUserId(e.target.value)} style={{ height:32,border:'1.5px solid var(--grey-border)',borderRadius:6,padding:'0 10px',fontFamily:'var(--font)',fontSize:13,color:'var(--navy)',background:'var(--grey-bg)',outline:'none',cursor:'pointer',minWidth:200 }}>
              <option value="">Select associate…</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
        </div>

        <div style={{ flex:1,overflow:'auto' }}>
          {!apiPath && <div style={{ padding:40,textAlign:'center',color:'var(--grey-text)',fontSize:14 }}>Select a {reportType==='project'?'project':'associate'} to generate the report.</div>}
          {apiPath && isLoading && <div style={{ padding:40,textAlign:'center',color:'var(--grey-text)',fontSize:14 }}>Generating report…</div>}
          {apiPath && error && <div style={{ padding:40,textAlign:'center',color:'var(--red)',fontSize:14 }}>Access denied or report unavailable.</div>}
          {apiPath && !isLoading && !error && reportData && (
            <>
              {selectedReport.key==='performance'  && <PerformanceReport data={reportData}/>}
              {selectedReport.key==='effort'        && <EffortReport data={reportData}/>}
              {selectedReport.key==='schedule'      && <ScheduleReport data={reportData}/>}
              {selectedReport.key==='budget'        && <BudgetReport data={reportData}/>}
              {selectedReport.key==='rework'        && <ReworkReport data={reportData}/>}
              {selectedReport.key==='productivity'  && <ProductivityReport data={reportData}/>}
              {selectedReport.key==='idle'          && <div style={{ padding:24 }}>
                <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:9,padding:16 }}>
                  <div style={{ fontWeight:700,fontSize:13,color:'var(--navy)',marginBottom:12 }}>Weekly Idle Time (last 90 days)</div>
                  {(reportData||[]).map((w,i)=><Bar key={i} label={new Date(w.week).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} value={parseFloat(w.idle||0)} max={w.capacity||40} color="var(--amber)"/>)}
                </div>
              </div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


