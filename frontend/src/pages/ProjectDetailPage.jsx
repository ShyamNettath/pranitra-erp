import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const ALL_TABS = ['Overview','Design','Simulation','Planning','Layout','Tasks','LOP','Files'];
const SECTION_TABS = ['Design','Simulation','Planning','Layout'];
const SC = { active:'#4AE08A',pending_approval:'#B86A00',draft:'#B0BAC8',on_hold:'#E8232A',completed:'#0A7A79',changes_requested:'#E8232A' };
const SL = { active:'Active',pending_approval:'Pending Approval',draft:'Draft',on_hold:'On Hold',completed:'Completed',changes_requested:'Changes Requested' };

function Stat({ label, value }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:13,fontWeight:700,color:'var(--navy)' }}>{value}</div>
    </div>
  );
}

function TasksPanel({ projectId }) {
  const { data: tasks=[] } = useQuery({ queryKey:['tasks',projectId,'root'], queryFn:()=>api.get('/tasks',{params:{project_id:projectId,parent_id:'null'}}).then(r=>r.data) });
  const SC2 = { todo:'#B0BAC8',in_progress:'var(--amber)',in_review:'var(--purple)',done:'var(--green)' };
  return tasks.length===0 ? <p style={{ color:'var(--grey-text)',fontSize:13 }}>No tasks yet.</p> : (
    <div>{tasks.map(t=>(
      <div key={t.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 12px',border:'1px solid var(--grey-border)',borderRadius:7,marginBottom:5,background:'white' }}>
        <div style={{ width:8,height:8,borderRadius:'50%',background:SC2[t.status]||'#999',flexShrink:0 }}/>
        <div style={{ flex:1,fontSize:13,fontWeight:700,color:'var(--navy)' }}>{t.name}</div>
        {t.assignee_name&&<span style={{ fontSize:11,color:'var(--grey-text)' }}>{t.assignee_name}</span>}
        {t.due_date&&<span style={{ fontSize:11,color:'var(--grey-text)' }}>{new Date(t.due_date).toLocaleDateString('en-GB')}</span>}
        <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,background:`${SC2[t.status]||'#999'}22`,color:SC2[t.status]||'#999' }}>{t.status?.replace('_',' ')}</span>
      </div>
    ))}</div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('Overview');
  const [modal, setModal] = useState(null);
  const [comment, setComment] = useState('');

  const { data: project, isLoading } = useQuery({ queryKey:['project',id], queryFn:()=>api.get(`/projects/${id}`).then(r=>r.data) });
  const { data: design=[] } = useQuery({ queryKey:['design',id], queryFn:()=>api.get(`/categories/design/${id}`).then(r=>r.data), enabled:tab==='Design' });
  const { data: simulation=[] } = useQuery({ queryKey:['simulation',id], queryFn:()=>api.get(`/categories/simulation/${id}`).then(r=>r.data), enabled:tab==='Simulation' });

  const isDir = user?.roles?.includes('director');
  const isPM = user?.roles?.some(r=>['project_manager','admin'].includes(r));

  const approveMut = useMutation({ mutationFn:({action,comment})=>api.post(`/projects/${id}/${action}`,{comment}), onSuccess:()=>{ qc.invalidateQueries(['project',id]); setModal(null); setComment(''); } });
  const submitMut = useMutation({ mutationFn:()=>api.post(`/projects/${id}/submit`), onSuccess:()=>qc.invalidateQueries(['project',id]) });
  const initDesign = useMutation({ mutationFn:()=>api.post(`/categories/design/${id}/init`,{}), onSuccess:()=>qc.invalidateQueries(['design',id]) });

  const [lopStatusFilter, setLopStatusFilter] = useState('');
  const [lopImpactFilter, setLopImpactFilter] = useState('');
  const [lopSectionFilter, setLopSectionFilter] = useState('');
  const [lopOwnerFilter, setLopOwnerFilter] = useState('');
  const [lopAddingSection, setLopAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');

  const { data: lopSections=[] } = useQuery({
    queryKey: ['lop-sections', project?.workspace_id],
    queryFn: () => api.get(`/tenants/${project.workspace_id}/lop-sections`).then(r=>r.data),
    enabled: !!project,
  });

  const { data: lopItems=[], isFetching: lopLoading, refetch: refetchLop } = useQuery({
    queryKey: ['lop-items', id, lopStatusFilter, lopImpactFilter, lopSectionFilter, lopOwnerFilter],
    queryFn: () => api.get(`/projects/${id}/lop`, { params: {
      status: lopStatusFilter || undefined,
      impact: lopImpactFilter || undefined,
      section_id: lopSectionFilter || undefined,
      owner_id: lopOwnerFilter || undefined,
    } }).then(r=>r.data),
    enabled: !!project && tab === 'LOP',
  });

  if (isLoading || !project) return <div style={{ padding:28,color:'var(--grey-text)' }}>Loading…</div>;

  return (
    <div style={{ padding:'16px 24px' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8 }}>
        <div>
          <button onClick={()=>navigate('/projects')} style={{ background:'none',border:'none',color:'var(--grey-text)',cursor:'pointer',fontSize:13,marginBottom:4 }}>← Projects</button>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:12,height:12,borderRadius:'50%',background:project.color||'var(--navy)' }}/>
            <h1 style={{ fontSize:18,fontWeight:700,color:'var(--navy)',margin:0 }}>
              {project.customer_name ? `${project.customer_name} — ${project.project_code || project.name}` : project.name}
            </h1>
            <span style={{ padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:`${SC[project.status]||'#B0BAC8'}22`,color:SC[project.status]||'#B0BAC8' }}>{SL[project.status]||project.status}</span>
          </div>
          {project.oem_name && <div style={{ fontSize:13,color:'var(--grey-text)',marginTop:2,marginBottom:0,fontWeight:600 }}>{project.oem_name}</div>}
          {project.description&&<p style={{ fontSize:12,color:'var(--grey-text)',marginTop:2,marginBottom:0 }}>{project.description}</p>}
        </div>
        <div style={{ display:'flex',gap:6 }}>
          {isPM&&['draft','changes_requested'].includes(project.status)&&<button onClick={()=>submitMut.mutate()} style={{ padding:'5px 12px',background:'var(--amber)',color:'white',border:'none',borderRadius:6,fontFamily:'var(--font)',fontSize:11,fontWeight:700,cursor:'pointer' }}>Submit for Approval</button>}
          {isDir&&project.status==='pending_approval'&&<>
            <button onClick={()=>setModal('approve')} style={{ padding:'5px 12px',background:'var(--green)',color:'white',border:'none',borderRadius:6,fontFamily:'var(--font)',fontSize:11,fontWeight:700,cursor:'pointer' }}>Approve</button>
            <button onClick={()=>setModal('request-changes')} style={{ padding:'5px 12px',background:'var(--amber)',color:'white',border:'none',borderRadius:6,fontFamily:'var(--font)',fontSize:11,fontWeight:700,cursor:'pointer' }}>Request Changes</button>
            <button onClick={()=>setModal('reject')} style={{ padding:'5px 12px',background:'var(--red)',color:'white',border:'none',borderRadius:6,fontFamily:'var(--font)',fontSize:11,fontWeight:700,cursor:'pointer' }}>Reject</button>
          </>}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'white',border:'1px solid var(--grey-border)',borderRadius:6,padding:'6px 20px',marginBottom:8,height:42 }}>
        {project.cycle_time && <><Stat label="Cycle Time" value={project.cycle_time}/><div style={{ width:1,height:22,background:'var(--grey-border)' }}/></>}
        {project.payment_terms && <><Stat label="Payment Terms" value={project.payment_terms}/><div style={{ width:1,height:22,background:'var(--grey-border)' }}/></>}
        <Stat label="Budget" value={project.budget?`€${Number(project.budget).toLocaleString('en-GB')}`:'—'}/>
        <div style={{ width:1,height:22,background:'var(--grey-border)' }}/>
        <Stat label="Start" value={project.start_date?new Date(project.start_date).toLocaleDateString('en-GB'):'—'}/>
        <div style={{ width:1,height:22,background:'var(--grey-border)' }}/>
        <Stat label="End" value={project.end_date?new Date(project.end_date).toLocaleDateString('en-GB'):'—'}/>
        <div style={{ width:1,height:22,background:'var(--grey-border)' }}/>
        <Stat label="Baseline" value={`${parseFloat(project.baseline_hours||0).toFixed(0)}h`}/>
        <div style={{ width:1,height:22,background:'var(--grey-border)' }}/>
        <Stat label="Actual" value={`${parseFloat(project.actual_hours||0).toFixed(0)}h`}/>
      </div>

      {/* Tabs */}
      {(() => {
        const projectSections = Array.isArray(project.sections) ? project.sections : [];
        const hasSections = projectSections.length > 0;
        const visibleTabs = ALL_TABS.filter(t => {
          if (!SECTION_TABS.includes(t)) return true; // Overview, Tasks, LOP, Files always visible
          return hasSections ? projectSections.includes(t) : true; // Old projects: show all tabs
        });
        return (
          <div style={{ display:'flex',gap:2,borderBottom:'2px solid var(--grey-border)',marginBottom:10 }}>
            {visibleTabs.map(t=><button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 16px',background:'none',border:'none',borderBottom:tab===t?'2px solid var(--navy)':'2px solid transparent',marginBottom:-2,fontFamily:'var(--font)',fontSize:13,fontWeight:tab===t?700:400,color:tab===t?'var(--navy)':'var(--grey-text)',cursor:'pointer' }}>{t}</button>)}
          </div>
        );
      })()}

      {/* Tab content */}
      {tab==='Overview'&&(
        <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:16 }}>
          <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,overflow:'hidden' }}>
            <div style={{ padding:'12px 18px',borderBottom:'1px solid var(--grey-border)',fontWeight:700,fontSize:14,color:'var(--navy)' }}>Team Members ({(project.members||[]).length})</div>
            <div style={{ padding:16 }}>
              {(project.members||[]).map(m=>(
                <div key={m.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--grey-bg)' }}>
                  <div style={{ width:30,height:30,borderRadius:'50%',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white',flexShrink:0 }}>{m.name.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700 }}>{m.name}</div><div style={{ fontSize:11,color:'var(--grey-text)' }}>{m.role}</div></div>
                </div>
              ))}
              {(!project.members||project.members.length===0)&&<p style={{ fontSize:13,color:'var(--grey-text)' }}>No members.</p>}
            </div>
          </div>
          <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,overflow:'hidden' }}>
            <div style={{ padding:'12px 18px',borderBottom:'1px solid var(--grey-border)',fontWeight:700,fontSize:14,color:'var(--navy)' }}>Approval Notes</div>
            <div style={{ padding:16 }}>
              {project.approval_comment?<p style={{ fontSize:13,color:'var(--grey-text)',lineHeight:1.5 }}>{project.approval_comment}</p>:<p style={{ fontSize:13,color:'var(--grey-text)' }}>No notes.</p>}
              {project.approved_at&&<p style={{ fontSize:11,color:'var(--grey-text)',marginTop:8 }}>Approved: {new Date(project.approved_at).toLocaleDateString('en-GB')}</p>}
            </div>
          </div>
        </div>
      )}

      {tab==='Design'&&(
        <div>
          {design.length===0&&(
            <div style={{ padding:40,textAlign:'center' }}>
              <p style={{ color:'var(--grey-text)',marginBottom:16,fontSize:14 }}>Design not initialised.</p>
              {isPM&&<button onClick={()=>initDesign.mutate()} style={{ padding:'8px 20px',background:'var(--navy)',color:'white',border:'none',borderRadius:7,fontFamily:'var(--font)',fontSize:13,fontWeight:700,cursor:'pointer' }}>Initialise Design (3 Sub-Categories)</button>}
            </div>
          )}
          {design.map(sc=>(
            <div key={sc.id} style={{ marginBottom:12,border:'1px solid var(--grey-border)',borderRadius:9,overflow:'hidden' }}>
              <div style={{ background:'var(--navy-xlight)',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontWeight:700,fontSize:14,color:'var(--navy)' }}>{sc.name}</span>
                <span style={{ fontSize:12,color:'var(--grey-text)' }}>{sc.effort_share_pct}% effort · QC {sc.qc_pct}% · {parseFloat(sc.baseline_hours||0).toFixed(0)}h baseline</span>
              </div>
              {(sc.zones||[]).map(z=>(
                <div key={z.id} style={{ padding:'8px 24px',borderTop:'1px solid var(--grey-bg)' }}>
                  <div style={{ fontWeight:700,fontSize:12,color:'var(--navy)',marginBottom:4 }}>Zone: {z.name}</div>
                  {(z.stations||[]).map(st=>(
                    <div key={st.id} style={{ paddingLeft:16,marginBottom:6 }}>
                      <div style={{ fontSize:11,color:'var(--grey-text)',marginBottom:4,fontWeight:700 }}>Station: {st.name}</div>
                      <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
                        {(st.units||[]).map(u=>(
                          <div key={u.id} style={{ padding:'3px 9px',border:'1px solid var(--grey-border)',borderRadius:5,fontSize:11,display:'flex',gap:5,alignItems:'center' }}>
                            {u.name}
                            <span style={{ fontWeight:700,fontSize:9,padding:'1px 5px',borderRadius:3,background:u.complexity==='simple'?'rgba(10,122,121,0.1)':u.complexity==='medium'?'rgba(184,106,0,0.1)':'rgba(232,35,42,0.1)',color:u.complexity==='simple'?'var(--green)':u.complexity==='medium'?'var(--amber)':'var(--red)' }}>{u.complexity}</span>
                            <span style={{ color:'var(--grey-text)',fontSize:9 }}>{u.baseline_hours}h</span>
                          </div>
                        ))}
                        {(!st.units||st.units.length===0)&&<span style={{ fontSize:11,color:'var(--grey-text)' }}>No units</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab==='Simulation'&&(
        <div>
          {simulation.length===0&&<div style={{ padding:40,textAlign:'center',color:'var(--grey-text)',fontSize:14 }}>No simulation structure defined.</div>}
          {simulation.map(z=>(
            <div key={z.id} style={{ marginBottom:12,border:'1px solid var(--grey-border)',borderRadius:9,overflow:'hidden' }}>
              <div style={{ background:'var(--navy-xlight)',padding:'10px 16px',fontWeight:700,fontSize:14,color:'var(--navy)' }}>Safety Zone: {z.name}</div>
              {(z.robots||[]).map(r=>(
                <div key={r.id} style={{ padding:'10px 18px',borderTop:'1px solid var(--grey-bg)' }}>
                  <div style={{ fontWeight:700,fontSize:13,color:'var(--navy)',marginBottom:6 }}>{r.name} <span style={{ color:'var(--grey-text)',fontWeight:400,fontSize:12 }}>({r.category_name})</span></div>
                  <div style={{ display:'flex',gap:8 }}>
                    {(r.stages||[]).map(s=>(
                      <div key={s.id} style={{ flex:1,padding:'8px 10px',border:'1px solid var(--grey-border)',borderRadius:6,textAlign:'center' }}>
                        <div style={{ fontSize:11,fontWeight:700,color:'var(--navy)',marginBottom:3 }}>{s.name}</div>
                        <div style={{ fontSize:10,color:'var(--grey-text)',marginBottom:3 }}>{s.split_pct}% · {s.baseline_hours}h</div>
                        <span style={{ fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:8,background:s.qc_result==='pass'?'rgba(10,122,121,0.1)':s.qc_result==='fail'?'rgba(232,35,42,0.1)':'rgba(184,106,0,0.1)',color:s.qc_result==='pass'?'var(--green)':s.qc_result==='fail'?'var(--red)':'var(--amber)' }}>QC: {s.qc_result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {(tab==='Planning'||tab==='Layout')&&<PlanningLayoutTab type={tab.toLowerCase()} projectId={id} isPM={isPM}/>}
      {tab==='Tasks'&&<TasksPanel projectId={id}/>}
      {tab==='Files'&&<FilesTab projectId={id}/>}
      {tab==='LOP'&&<LopTab projectId={id} project={project} user={user} lopSections={lopSections} lopItems={lopItems} lopLoading={lopLoading} refetchLop={refetchLop} lopStatusFilter={lopStatusFilter} setLopStatusFilter={setLopStatusFilter} lopImpactFilter={lopImpactFilter} setLopImpactFilter={setLopImpactFilter} lopSectionFilter={lopSectionFilter} setLopSectionFilter={setLopSectionFilter} lopOwnerFilter={lopOwnerFilter} setLopOwnerFilter={setLopOwnerFilter} lopAddingSection={lopAddingSection} setLopAddingSection={setLopAddingSection} newSectionName={newSectionName} setNewSectionName={setNewSectionName} newSectionDescription={newSectionDescription} setNewSectionDescription={setNewSectionDescription} qc={qc} isPM={isPM}/>}
      {/* Approval modal */}
      {modal&&(
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 }}>
          <div style={{ background:'white',borderRadius:12,width:440,padding:24 }}>
            <h3 style={{ fontSize:16,fontWeight:700,color:'var(--navy)',marginBottom:12 }}>{modal.replace('-',' ')} Project</h3>
            {modal!=='approve'&&<textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a comment…" style={{ width:'100%',height:90,border:'1.5px solid var(--grey-border)',borderRadius:7,padding:10,fontFamily:'var(--font)',fontSize:13,outline:'none',resize:'vertical',marginBottom:16 }}/>}
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
              <button onClick={()=>setModal(null)} style={{ padding:'7px 14px',background:'white',border:'1.5px solid var(--grey-border)',borderRadius:7,fontFamily:'var(--font)',fontSize:13,cursor:'pointer' }}>Cancel</button>
              <button onClick={()=>approveMut.mutate({action:modal,comment})} style={{ padding:'7px 14px',border:'none',borderRadius:7,fontFamily:'var(--font)',fontSize:13,fontWeight:700,cursor:'pointer',color:'white',background:modal==='approve'?'var(--green)':modal==='reject'?'var(--red)':'var(--amber)' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Planning / Layout Tab ──────────────────────────────────────────
function PlanningLayoutTab({ type, projectId, isPM }) {
  const qc = useQueryClient();
  const apiBase = type === 'planning' ? '/categories/planning' : '/categories/layout';
  const [addNodeParent, setAddNodeParent] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [metricForm, setMetricForm] = useState({ name:'', target:'', unit:'' });
  const [entryForm, setEntryForm] = useState({ metric_id:'', week:'', value:'' });

  const { data: nodes=[] } = useQuery({
    queryKey: [type, projectId],
    queryFn: () => api.get(`${apiBase}/${projectId}`).then(r => r.data),
  });
  const { data: metrics=[] } = useQuery({
    queryKey: [type+'-metrics', selectedNode?.id],
    queryFn: () => api.get(`${apiBase}/metrics/${selectedNode.id}`).then(r => r.data),
    enabled: !!selectedNode,
  });

  const addNode = async (parentId) => {
    if (!newNodeName.trim()) return;
    await api.post(`${apiBase}/node`, { project_id: projectId, parent_id: parentId || null, name: newNodeName });
    setNewNodeName(''); setAddNodeParent(null);
    qc.invalidateQueries([type, projectId]);
  };
  const addMetric = async () => {
    if (!selectedNode || !metricForm.name) return;
    await api.post(`${apiBase}/metric`, { node_id: selectedNode.id, metric_name: metricForm.name, target_value: metricForm.target || null, unit: metricForm.unit });
    setMetricForm({ name:'', target:'', unit:'' });
    qc.invalidateQueries([type+'-metrics', selectedNode.id]);
  };
  const logEntry = async () => {
    if (!entryForm.metric_id || !entryForm.week || !entryForm.value) return;
    await api.post(`${apiBase}/entry`, { metric_id: entryForm.metric_id, week_ending: entryForm.week, value: entryForm.value });
    setEntryForm({ metric_id:'', week:'', value:'' });
    qc.invalidateQueries([type+'-metrics', selectedNode.id]);
  };

  const renderNode = (node, depth=0) => (
    <div key={node.id}>
      <div onClick={() => setSelectedNode(selectedNode?.id===node.id ? null : node)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:`8px ${12+depth*20}px`, cursor:'pointer',
          background: selectedNode?.id===node.id ? 'var(--navy-xlight)' : 'transparent',
          borderBottom:'1px solid var(--grey-bg)', transition:'background 0.1s' }}>
        <span style={{ fontSize:12, color:'var(--grey-text)' }}>{depth===0?'◉':depth===1?'○':'▸'}</span>
        <span style={{ fontSize:13, fontWeight: depth===0?700:400, color:'var(--navy)', flex:1 }}>{node.name}</span>
        {isPM && <button onClick={e=>{e.stopPropagation();setAddNodeParent(node.id);}} style={{ fontSize:11, padding:'2px 7px', background:'var(--navy)', color:'white', border:'none', borderRadius:4, cursor:'pointer' }}>+ Child</button>}
      </div>
      {addNodeParent===node.id && (
        <div style={{ padding:`8px ${12+(depth+1)*20}px`, background:'var(--grey-bg)', display:'flex', gap:6 }}>
          <input value={newNodeName} onChange={e=>setNewNodeName(e.target.value)} placeholder="Node name…"
            style={{ height:30, border:'1.5px solid var(--grey-border)', borderRadius:5, padding:'0 8px', fontFamily:'var(--font)', fontSize:12, flex:1 }} />
          <button onClick={()=>addNode(node.id)} style={{ height:30, padding:'0 10px', background:'var(--navy)', color:'white', border:'none', borderRadius:5, fontFamily:'var(--font)', fontSize:11, fontWeight:700, cursor:'pointer' }}>Add</button>
          <button onClick={()=>setAddNodeParent(null)} style={{ height:30, padding:'0 8px', background:'white', border:'1.5px solid var(--grey-border)', borderRadius:5, fontFamily:'var(--font)', fontSize:11, cursor:'pointer' }}>✕</button>
        </div>
      )}
      {(node.children||[]).map(c => renderNode(c, depth+1))}
    </div>
  );

  return (
    <div style={{ display:'flex', gap:16 }}>
      {/* Left: tree */}
      <div style={{ width:320, flexShrink:0, background:'white', border:'1px solid var(--grey-border)', borderRadius:10, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--grey-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--navy)' }}>{type==='planning'?'Planning':'Layout'} Structure</span>
          {isPM && <button onClick={()=>setAddNodeParent('root')} style={{ fontSize:11, padding:'4px 9px', background:'var(--navy)', color:'white', border:'none', borderRadius:5, cursor:'pointer', fontWeight:700 }}>+ Root Node</button>}
        </div>
        {addNodeParent==='root' && (
          <div style={{ padding:'10px 12px', background:'var(--grey-bg)', borderBottom:'1px solid var(--grey-border)', display:'flex', gap:6 }}>
            <input value={newNodeName} onChange={e=>setNewNodeName(e.target.value)} placeholder="Root node name…"
              style={{ height:30, border:'1.5px solid var(--grey-border)', borderRadius:5, padding:'0 8px', fontFamily:'var(--font)', fontSize:12, flex:1 }} />
            <button onClick={()=>addNode(null)} style={{ height:30, padding:'0 10px', background:'var(--navy)', color:'white', border:'none', borderRadius:5, fontFamily:'var(--font)', fontSize:11, fontWeight:700, cursor:'pointer' }}>Add</button>
            <button onClick={()=>setAddNodeParent(null)} style={{ height:30, padding:'0 8px', background:'white', border:'1.5px solid var(--grey-border)', borderRadius:5, fontFamily:'var(--font)', fontSize:11, cursor:'pointer' }}>✕</button>
          </div>
        )}
        {nodes.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--grey-text)', fontSize:13 }}>No structure defined yet. Add root nodes to begin.</div>
        ) : nodes.map(n => renderNode(n))}
      </div>

      {/* Right: metrics panel */}
      <div style={{ flex:1 }}>
        {!selectedNode ? (
          <div style={{ background:'white', border:'1px solid var(--grey-border)', borderRadius:10, padding:40, textAlign:'center', color:'var(--grey-text)', fontSize:13 }}>
            Select a node on the left to view and manage its metrics.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ background:'white', border:'1px solid var(--grey-border)', borderRadius:10, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--grey-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700, color:'var(--navy)' }}>Metrics — {selectedNode.name}</span>
              </div>
              {/* Add metric form */}
              {isPM && (
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--grey-bg)', background:'var(--grey-bg)', display:'flex', gap:8, flexWrap:'wrap' }}>
                  <input value={metricForm.name} onChange={e=>setMetricForm({...metricForm,name:e.target.value})} placeholder="Metric name…"
                    style={{ height:32, border:'1.5px solid var(--grey-border)', borderRadius:5, padding:'0 8px', fontFamily:'var(--font)', fontSize:12, flex:'2 1 160px' }}/>
                  <input value={metricForm.target} onChange={e=>setMetricForm({...metricForm,target:e.target.value})} placeholder="Target…"
                    style={{ height:32, border:'1.5px solid var(--grey-border)', borderRadius:5, padding:'0 8px', fontFamily:'var(--font)', fontSize:12, width:80 }}/>
                  <input value={metricForm.unit} onChange={e=>setMetricForm({...metricForm,unit:e.target.value})} placeholder="Unit…"
                    style={{ height:32, border:'1.5px solid var(--grey-border)', borderRadius:5, padding:'0 8px', fontFamily:'var(--font)', fontSize:12, width:70 }}/>
                  <button onClick={addMetric} style={{ height:32, padding:'0 12px', background:'var(--navy)', color:'white', border:'none', borderRadius:5, fontFamily:'var(--font)', fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Metric</button>
                </div>
              )}
              {metrics.length === 0 ? (
                <div style={{ padding:'24px', textAlign:'center', color:'var(--grey-text)', fontSize:13 }}>No metrics yet.</div>
              ) : metrics.map(m => (
                <div key={m.id} style={{ padding:'12px 16px', borderBottom:'1px solid var(--grey-bg)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>{m.metric_name}</span>
                    <span style={{ fontSize:12, color:'var(--grey-text)' }}>Target: {m.target_value ?? '—'} {m.unit}</span>
                  </div>
                  {/* Weekly entries mini-chart */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {(m.entries||[]).slice(0,8).map(e=>(
                      <div key={e.id} style={{ fontSize:11, padding:'3px 7px', background:'var(--navy-xlight)', borderRadius:5, color:'var(--navy)' }}>
                        <span style={{ color:'var(--grey-text)' }}>{new Date(e.week_ending).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}: </span>
                        <strong>{e.value} {m.unit}</strong>
                      </div>
                    ))}
                    {isPM && (
                      <button onClick={()=>setEntryForm({...entryForm,metric_id:m.id})} style={{ fontSize:11, padding:'3px 7px', background:'var(--navy)', color:'white', border:'none', borderRadius:5, cursor:'pointer' }}>+ Log</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Log entry form */}
            {isPM && entryForm.metric_id && (
              <div style={{ background:'white', border:'1px solid var(--grey-border)', borderRadius:10, padding:16, display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
                <div><div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'var(--grey-text)',marginBottom:4 }}>Week Ending</div>
                  <input type="date" value={entryForm.week} onChange={e=>setEntryForm({...entryForm,week:e.target.value})} style={{ height:32,border:'1.5px solid var(--grey-border)',borderRadius:5,padding:'0 8px',fontFamily:'var(--font)',fontSize:12 }}/></div>
                <div><div style={{ fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'var(--grey-text)',marginBottom:4 }}>Value</div>
                  <input type="number" value={entryForm.value} onChange={e=>setEntryForm({...entryForm,value:e.target.value})} placeholder="0" style={{ height:32,border:'1.5px solid var(--grey-border)',borderRadius:5,padding:'0 8px',fontFamily:'var(--font)',fontSize:12,width:100 }}/></div>
                <button onClick={logEntry} style={{ height:32,padding:'0 14px',background:'var(--green)',color:'white',border:'none',borderRadius:5,fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer' }}>Save Entry</button>
                <button onClick={()=>setEntryForm({metric_id:'',week:'',value:''})} style={{ height:32,padding:'0 10px',background:'white',border:'1.5px solid var(--grey-border)',borderRadius:5,fontFamily:'var(--font)',fontSize:12,cursor:'pointer' }}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── LOP Tab ──────────────────────────────────────────────────────
const IMPACT_COLORS = { High:'var(--red)', Medium:'var(--amber)', Low:'var(--green)' };
const IMPACT_BG = { High:'rgba(232,35,42,0.08)', Medium:'rgba(184,106,0,0.08)', Low:'rgba(10,122,121,0.08)' };
const STATUS_COLORS = { Open:'var(--amber)', Closed:'var(--green)', 'Force Closed':'#C94A1A' };
const STATUS_BG = { Open:'rgba(184,106,0,0.08)', Closed:'rgba(10,122,121,0.08)', 'Force Closed':'rgba(201,74,26,0.08)' };

function LopTab({ projectId, project, user, lopSections, lopItems, lopLoading, refetchLop,
  lopStatusFilter, setLopStatusFilter, lopImpactFilter, setLopImpactFilter,
  lopSectionFilter, setLopSectionFilter, lopOwnerFilter, setLopOwnerFilter,
  lopAddingSection, setLopAddingSection, newSectionName, setNewSectionName,
  newSectionDescription, setNewSectionDescription, qc, isPM }) {

  // Summary counts (computed from ALL items, not just filtered — fetch unfiltered for counts)
  const { data: allLopItems=[] } = useQuery({
    queryKey: ['lop-items-all', projectId],
    queryFn: () => api.get(`/projects/${projectId}/lop`).then(r=>r.data),
    enabled: !!project,
  });
  const totalCount = allLopItems.length;
  const openCount = allLopItems.filter(i=>i.status==='Open').length;
  const closedCount = allLopItems.filter(i=>i.status==='Closed').length;
  const forceClosedCount = allLopItems.filter(i=>i.status==='Force Closed').length;
  const highOpenCount = allLopItems.filter(i=>i.status==='Open'&&i.impact==='High').length;

  const handleAddRow = async () => {
    // Let server auto-calculate target_date via addWorkingDays
    const newItem = {
      date_raised: new Date().toISOString().split('T')[0],
      description: 'New LOP entry',
      impact: 'Medium',
      status: 'Open',
    };
    await api.post(`/projects/${projectId}/lop`, newItem);
    refetchLop();
    qc.invalidateQueries(['lop-items-all', projectId]);
  };

  const handleExport = async () => {
    const url = `/projects/${projectId}/lop/export?status=${lopStatusFilter||''}&impact=${lopImpactFilter||''}&section_id=${lopSectionFilter||''}&owner_id=${lopOwnerFilter||''}`;
    const resp = await api.get(url, { responseType:'blob' });
    const blob = new Blob([resp.data], { type:'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lop_${projectId}.csv`;
    link.click();
  };

  const updateItem = async (itemId, payload) => {
    await api.put(`/projects/${projectId}/lop/${itemId}`, payload);
    refetchLop();
    qc.invalidateQueries(['lop-items-all', projectId]);
  };

  const deleteItem = async (itemId) => {
    await api.delete(`/projects/${projectId}/lop/${itemId}`);
    refetchLop();
    qc.invalidateQueries(['lop-items-all', projectId]);
  };

  return (
    <div style={{ background:'white',border:'1px solid var(--grey-border)',borderRadius:10,padding:14 }}>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
        <div>
          <div style={{ fontSize:14,fontWeight:700,color:'var(--navy)' }}>LOP — List of Open Points</div>
          <div style={{ fontSize:12,color:'var(--grey-text)' }}>Live per-project issue tracker with inline updates.</div>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={()=>refetchLop()} style={{ padding:'6px 10px',background:'var(--navy)',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:12 }}>Refresh</button>
          <button onClick={handleExport} style={{ padding:'6px 10px',background:'var(--green)',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:12 }}>Export CSV</button>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display:'flex',gap:10,marginBottom:14 }}>
        {[
          { label:'Total', value:totalCount, color:'var(--navy)', bg:'var(--navy-xlight)' },
          { label:'Open', value:openCount, color:'var(--amber)', bg:'rgba(184,106,0,0.08)' },
          { label:'Closed', value:closedCount, color:'var(--green)', bg:'rgba(10,122,121,0.08)' },
          { label:'Force Closed', value:forceClosedCount, color:'#C94A1A', bg:'rgba(201,74,26,0.08)' },
          { label:'High + Open', value:highOpenCount, color:'var(--red)', bg:'rgba(232,35,42,0.08)' },
        ].map(s=>(
          <div key={s.label} style={{ flex:1,padding:'10px 14px',background:s.bg,borderRadius:8,textAlign:'center' }}>
            <div style={{ fontSize:20,fontWeight:700,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11,fontWeight:700,color:s.color,opacity:0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:10 }}>
        {['Open','Closed','Force Closed'].map(s=>(<button key={s} onClick={()=>setLopStatusFilter(lopStatusFilter===s?'':s)} style={{ padding:'5px 10px',border:'1px solid var(--grey-border)',borderRadius:5,background:lopStatusFilter===s?'#E8EEF6':'white',cursor:'pointer',fontSize:11 }}>{s}</button>))}
        {['High','Medium','Low'].map(s=>(<button key={s} onClick={()=>setLopImpactFilter(lopImpactFilter===s?'':s)} style={{ padding:'5px 10px',border:'1px solid var(--grey-border)',borderRadius:5,background:lopImpactFilter===s?'#E8EEF6':'white',cursor:'pointer',fontSize:11 }}>{s}</button>))}
        <select value={lopSectionFilter} onChange={e=>setLopSectionFilter(e.target.value)} style={{ height:30,border:'1px solid var(--grey-border)',borderRadius:5,fontSize:12 }}>
          <option value=''>All sections</option>
          {lopSections.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={lopOwnerFilter} onChange={e=>setLopOwnerFilter(e.target.value)} style={{ height:30,border:'1px solid var(--grey-border)',borderRadius:5,fontSize:12 }}>
          <option value=''>All owners</option>
          {project.members?.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Actions */}
      <div style={{ marginBottom:10,display:'flex',gap:8,flexWrap:'wrap' }}>
        {isPM && <button onClick={handleAddRow} style={{ padding:'6px 10px',background:'var(--navy)',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:12 }}>+ Add Row</button>}
        {lopAddingSection ? (
          <div style={{ display:'flex',gap:6 }}>
            <input value={newSectionName} onChange={e=>setNewSectionName(e.target.value)} placeholder='Section name' style={{ height:30,border:'1px solid var(--grey-border)',borderRadius:5,padding:'0 8px' }}/>
            <input value={newSectionDescription} onChange={e=>setNewSectionDescription(e.target.value)} placeholder='Description' style={{ height:30,border:'1px solid var(--grey-border)',borderRadius:5,padding:'0 8px' }}/>
            <button onClick={async()=>{ if (!newSectionName) return; await api.post(`/tenants/${project.workspace_id}/lop-sections`, { name:newSectionName, description:newSectionDescription }); setNewSectionName(''); setNewSectionDescription(''); setLopAddingSection(false); qc.invalidateQueries(['lop-sections', project.workspace_id]); }} style={{ padding:'6px 10px',background:'var(--green)',color:'white',border:'none',borderRadius:5, cursor:'pointer' }}>Save</button>
            <button onClick={()=>setLopAddingSection(false)} style={{ padding:'6px 10px',background:'var(--grey-border)',border:'none',borderRadius:5,cursor:'pointer' }}>Cancel</button>
          </div>
        ) : (
          isPM && <button onClick={()=>setLopAddingSection(true)} style={{ padding:'6px 10px',background:'var(--amber)',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:12 }}>+ Add section</button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead><tr>
            {['SI','Date Raised','Section','Description','Raised By','Owner','Impact','Status','Target Date','Closed Date','Closed By','Comments',''].map(h=><th key={h} style={{ textAlign:'left',fontSize:10,padding:'8px',color:'var(--grey-text)',borderBottom:'1px solid var(--grey-border)',fontWeight:700,letterSpacing:0.5,textTransform:'uppercase' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {lopLoading ? <tr><td colSpan={13} style={{ padding:12,color:'var(--grey-text)' }}>Loading…</td></tr> : lopItems.length===0 ? <tr><td colSpan={13} style={{ padding:12,color:'var(--grey-text)' }}>No open points.</td></tr> : lopItems.map(item => {
                const overdue = item.status === 'Open' && item.target_date && new Date(item.target_date) < new Date();
                const rowBg = overdue ? '#fff0f0' : 'white';
                return (
                  <tr key={item.id} style={{ background: rowBg }}>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8',fontSize:12,fontWeight:700,color:'var(--navy)' }}>{item.si}</td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}><input type='date' value={item.date_raised?.slice(0,10)||''} onChange={e=>updateItem(item.id, { date_raised:e.target.value })} style={{ fontSize:12,border:'1px solid var(--grey-border)',borderRadius:4 }} /></td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}><select value={item.section_id||''} onChange={e=>updateItem(item.id, { section_id:e.target.value || null })} style={{ fontSize:12,border:'1px solid var(--grey-border)',borderRadius:4 }}><option value=''>—</option>{lopSections.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}><input defaultValue={item.description||''} onBlur={e=>{ if(e.target.value!==item.description) updateItem(item.id, { description:e.target.value }); }} style={{ width:220,fontSize:12,border:'1px solid var(--grey-border)',borderRadius:4,padding:'3px 6px' }} /></td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8',fontSize:12,color:'var(--grey-text)' }}>{item.raised_by_name||''}</td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}><select value={item.owner||''} onChange={e=>updateItem(item.id, { owner:e.target.value || null })} style={{ fontSize:12,border:'1px solid var(--grey-border)',borderRadius:4 }}><option value=''>—</option>{project.members?.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}><select value={item.impact||'Low'} onChange={e=>updateItem(item.id, { impact:e.target.value })} style={{ fontSize:12,border:`1.5px solid ${IMPACT_COLORS[item.impact]||'var(--grey-border)'}`,borderRadius:4,background:IMPACT_BG[item.impact]||'white',color:IMPACT_COLORS[item.impact],fontWeight:700 }}><option>High</option><option>Medium</option><option>Low</option></select></td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}><select value={item.status||'Open'} onChange={e=>{ const status=e.target.value; const payload={status}; if (status!=='Open') { payload.closed_date=new Date().toISOString().slice(0,10); payload.closed_by=user?.id; } updateItem(item.id, payload); }} style={{ fontSize:12,border:`1.5px solid ${STATUS_COLORS[item.status]||'var(--grey-border)'}`,borderRadius:4,background:STATUS_BG[item.status]||'white',color:STATUS_COLORS[item.status],fontWeight:700 }}><option>Open</option><option>Closed</option><option>Force Closed</option></select></td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}><input type='date' value={item.target_date?.slice(0,10)||''} onChange={e=>updateItem(item.id, { target_date:e.target.value })} style={{ fontSize:12,border:`1px solid ${overdue?'var(--red)':'var(--grey-border)'}`,borderRadius:4,color:overdue?'var(--red)':'inherit' }} /></td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}><input type='date' value={item.closed_date?.slice(0,10)||''} onChange={e=>updateItem(item.id, { closed_date:e.target.value })} style={{ fontSize:12,border:'1px solid var(--grey-border)',borderRadius:4 }} /></td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8',fontSize:12,color:'var(--grey-text)' }}>{item.closed_by_name||''}</td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}><input defaultValue={item.comments||''} onBlur={e=>{ if(e.target.value!==(item.comments||'')) updateItem(item.id, { comments:e.target.value }); }} style={{ width:160,fontSize:12,border:'1px solid var(--grey-border)',borderRadius:4,padding:'3px 6px' }} /></td>
                    <td style={{ padding:6,borderBottom:'1px solid #f0f3f8' }}>{isPM && <button onClick={()=>deleteItem(item.id)} style={{ fontSize:11,padding:'4px 8px',background:'var(--red)',color:'white',border:'none',borderRadius:4,cursor:'pointer' }}>Delete</button>}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Files Tab ─────────────────────────────────────────────────────
function FilesTab({ projectId }) {
  const { data: files=[], isLoading } = useQuery({
    queryKey: ['files', projectId],
    queryFn: () => api.get('/files', { params: { project_id: projectId } }).then(r => r.data),
  });
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('project_id', projectId);
    await api.post('/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(()=>{});
    qc.invalidateQueries(['files', projectId]);
    setUploading(false);
  };

  const ICON = { pdf:'📄', docx:'📝', xlsx:'📊', png:'🖼️', jpg:'🖼️', mp4:'🎬' };
  const ext = name => name.split('.').pop().toLowerCase();

  return (
    <div style={{ background:'white', border:'1px solid var(--grey-border)', borderRadius:10, overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--grey-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--navy)' }}>Files ({files.length})</div>
        <label style={{ padding:'6px 14px', background:'var(--navy)', color:'white', borderRadius:7, fontFamily:'var(--font)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          {uploading ? 'Uploading…' : '+ Upload File'}
          <input type="file" onChange={upload} style={{ display:'none' }} />
        </label>
      </div>
      {isLoading ? <div style={{ padding:32, textAlign:'center', color:'var(--grey-text)' }}>Loading…</div> :
       files.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--grey-text)', fontSize:13 }}>No files uploaded yet.</div> : (
        <div style={{ padding:16, display:'flex', flexWrap:'wrap', gap:10 }}>
          {files.map(f => (
            <div key={f.id} style={{ width:160, border:'1px solid var(--grey-border)', borderRadius:8, padding:12, textAlign:'center' }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{ICON[ext(f.original_name)] || '📎'}</div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.original_name}</div>
              <div style={{ fontSize:11, color:'var(--grey-text)', marginTop:2 }}>{f.uploaded_by_name}</div>
              <a href={`/uploads/${f.stored_name}`} target="_blank" rel="noreferrer"
                style={{ display:'inline-block', marginTop:6, fontSize:11, color:'var(--navy)', fontWeight:700 }}>Download</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
