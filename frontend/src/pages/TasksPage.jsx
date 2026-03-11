import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const STATUS_COLS = ['todo','in_progress','in_review','done'];
const STATUS_LABELS = { todo:'To Do', in_progress:'In Progress', in_review:'In Review', done:'Done' };
const STATUS_COLORS = { todo:'#B0BAC8', in_progress:'var(--amber)', in_review:'var(--purple)', done:'var(--green)' };
const PRIORITY_COLORS = { low:'#B0BAC8', medium:'var(--amber)', high:'var(--red)', critical:'#8B0000' };

function TaskCard({ task, onStatusChange, canApprove }) {
  return (
    <div style={{ background:'white', border:'1px solid var(--grey-border)', borderRadius:9, padding:'12px 14px', marginBottom:8, cursor:'default' }}>
      <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)', marginBottom:6 }}>{task.name}</div>
      {task.assignee_name && <div style={{ fontSize:11, color:'var(--grey-text)', marginBottom:4 }}>→ {task.assignee_name}</div>}
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:10, background:`${PRIORITY_COLORS[task.priority]||'#999'}22`, color:PRIORITY_COLORS[task.priority]||'#999' }}>{task.priority}</span>
        {task.due_date && <span style={{ fontSize:10, color: new Date(task.due_date) < new Date() && task.status!=='done' ? 'var(--red)' : 'var(--grey-text)' }}>Due: {new Date(task.due_date).toLocaleDateString('en-GB')}</span>}
        {task.subtask_count > 0 && <span style={{ fontSize:10, color:'var(--grey-text)' }}>{task.subtask_count} subtasks</span>}
        {task.baseline_hours > 0 && <span style={{ fontSize:10, color:'var(--grey-text)' }}>{task.baseline_hours}h</span>}
      </div>
      {task.progress_pct > 0 && (
        <div style={{ marginTop:8, height:4, background:'var(--grey-bg)', borderRadius:2 }}>
          <div style={{ width:`${task.progress_pct}%`, height:'100%', background:'var(--navy)', borderRadius:2 }}/>
        </div>
      )}
      {/* Quick status change */}
      <div style={{ display:'flex', gap:4, marginTop:8 }}>
        {STATUS_COLS.filter(s => s !== task.status).map(s => (
          <button key={s} onClick={() => {
            if (s === 'done' && !canApprove) return;
            onStatusChange(task.id, s);
          }} style={{ flex:1, padding:'3px 0', background:'var(--grey-bg)', border:'none', borderRadius:4, fontSize:10, color:'var(--grey-text)', cursor:'pointer', fontFamily:'var(--font)' }}>
            → {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateTaskModal({ onClose, projects }) {
  const qc = useQueryClient();
  const { workspace } = useAuthStore();
  const [form, setForm] = useState({ project_id:'', name:'', description:'', priority:'medium', assignee_id:'', due_date:'', baseline_hours:'' });
  const [err, setErr] = useState('');

  const { data: members=[] } = useQuery({
    queryKey: ['project-members', form.project_id],
    queryFn: () => api.get(`/projects/${form.project_id}`).then(r => r.data.members || []),
    enabled: !!form.project_id,
  });

  const create = useMutation({
    mutationFn: data => api.post('/tasks', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['tasks']); onClose(); },
    onError: e => setErr(e.response?.data?.error || 'Failed'),
  });

  const lbl = { display:'block', fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'var(--grey-text)', marginBottom:5 };
  const inp = { width:'100%', height:36, border:'1.5px solid var(--grey-border)', borderRadius:6, padding:'0 10px', fontFamily:'var(--font)', fontSize:13, color:'var(--navy)', background:'var(--grey-bg)', outline:'none' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
      <div style={{ background:'white', borderRadius:12, width:500, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--grey-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--navy)' }}>New Task</span>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--grey-text)' }}>×</button>
        </div>
        <div style={{ padding:22, display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={lbl}>Project *</label>
            <select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})} style={{...inp,cursor:'pointer'}}>
              <option value="">Select project…</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Task Name *</label>
            <input style={inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Model front bumper geometry"/>
          </div>
          <div>
            <label style={lbl}>Description</label>
            <textarea style={{...inp,height:60,padding:'8px 10px',resize:'vertical'}} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={lbl}>Priority</label>
              <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={{...inp,cursor:'pointer'}}>
                {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Assignee</label>
              <select value={form.assignee_id} onChange={e=>setForm({...form,assignee_id:e.target.value})} style={{...inp,cursor:'pointer'}}>
                <option value="">Unassigned</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={lbl}>Due Date</label>
              <input type="date" style={inp} value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/>
            </div>
            <div>
              <label style={lbl}>Baseline Hours</label>
              <input type="number" style={inp} value={form.baseline_hours} onChange={e=>setForm({...form,baseline_hours:e.target.value})} placeholder="0"/>
            </div>
          </div>
          {err && <div style={{ fontSize:13,color:'var(--red)',padding:'6px 10px',background:'rgba(232,35,42,0.08)',borderRadius:5 }}>{err}</div>}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
            <button onClick={onClose} style={{ padding:'8px 16px',background:'white',border:'1.5px solid var(--grey-border)',borderRadius:7,fontFamily:'var(--font)',fontSize:13,cursor:'pointer' }}>Cancel</button>
            <button onClick={()=>create.mutate({...form,baseline_hours:form.baseline_hours||0})} disabled={!form.project_id||!form.name||create.isPending} style={{ padding:'8px 16px',background:'var(--navy)',color:'white',border:'none',borderRadius:7,fontFamily:'var(--font)',fontSize:13,fontWeight:700,cursor:'pointer' }}>
              {create.isPending?'Creating…':'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { workspace, user } = useAuthStore();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [view, setView] = useState('board');

  const isAdmin = user?.roles?.some(r=>['admin','project_manager','director'].includes(r));

  const { data: projects=[] } = useQuery({
    queryKey: ['projects', workspace?.id],
    queryFn: () => api.get('/projects', { params: { workspace_id: workspace?.id } }).then(r => r.data),
  });

  const { data: tasks=[], isLoading } = useQuery({
    queryKey: ['tasks', workspace?.id, projectFilter, assigneeFilter],
    queryFn: () => api.get('/tasks', { params: {
      project_id: projectFilter || undefined,
      assignee_id: assigneeFilter || (isAdmin ? undefined : user?.id),
      parent_id: 'null',
    }}).then(r => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries(['tasks']),
  });

  const canApprove = user?.roles?.some(r=>['project_manager','admin'].includes(r));

  const tasksByStatus = STATUS_COLS.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  return (
    <div style={{ padding:28, height:'100%', display:'flex', flexDirection:'column' }}>
      {showCreate && <CreateTaskModal onClose={()=>setShowCreate(false)} projects={projects}/>}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:20,fontWeight:700,color:'var(--navy)',marginBottom:3 }}>Tasks</h1>
          <p style={{ fontSize:13,color:'var(--grey-text)' }}>{tasks.length} tasks</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={projectFilter} onChange={e=>setProjectFilter(e.target.value)} style={{ height:32,border:'1.5px solid var(--grey-border)',borderRadius:6,padding:'0 10px',fontFamily:'var(--font)',fontSize:12,background:'white',outline:'none',cursor:'pointer' }}>
            <option value="">All Projects</option>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{ display:'flex', border:'1.5px solid var(--grey-border)', borderRadius:6, overflow:'hidden' }}>
            {['board','list'].map(v=><button key={v} onClick={()=>setView(v)} style={{ padding:'6px 12px',background:view===v?'var(--navy)':'white',color:view===v?'white':'var(--grey-text)',border:'none',fontFamily:'var(--font)',fontSize:12,cursor:'pointer' }}>{v}</button>)}
          </div>
          <button onClick={()=>setShowCreate(true)} style={{ padding:'6px 14px',background:'var(--navy)',color:'white',border:'none',borderRadius:6,fontFamily:'var(--font)',fontSize:12,fontWeight:700,cursor:'pointer' }}>+ New Task</button>
        </div>
      </div>

      {isLoading ? <div style={{ color:'var(--grey-text)',fontSize:13 }}>Loading tasks…</div> : (
        view==='board' ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, flex:1, overflow:'auto' }}>
            {STATUS_COLS.map(status => (
              <div key={status}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:10,height:10,borderRadius:'50%',background:STATUS_COLORS[status] }}/>
                  <span style={{ fontSize:12,fontWeight:700,color:'var(--navy)',textTransform:'uppercase',letterSpacing:0.8 }}>{STATUS_LABELS[status]}</span>
                  <span style={{ marginLeft:'auto',background:'var(--grey-border)',color:'var(--grey-text)',fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:10 }}>{tasksByStatus[status].length}</span>
                </div>
                <div style={{ minHeight:100 }}>
                  {tasksByStatus[status].map(t => (
                    <TaskCard key={t.id} task={t} canApprove={canApprove}
                      onStatusChange={(id,s) => updateStatus.mutate({id,status:s})}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background:'white', border:'1px solid var(--grey-border)', borderRadius:10, overflow:'hidden' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Task','Project','Status','Priority','Assignee','Due Date','Hours'].map(h=>(
                  <th key={h} style={{ padding:'8px 12px',fontSize:10.5,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',textAlign:'left',background:'var(--grey-bg)',borderBottom:'1.5px solid var(--grey-border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {tasks.map(t=>(
                  <tr key={t.id}>
                    <td style={{ padding:'9px 12px',fontWeight:700,color:'var(--navy)',borderBottom:'1px solid var(--grey-bg)' }}>{t.name}</td>
                    <td style={{ padding:'9px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{projects.find(p=>p.id===t.project_id)?.name||'—'}</td>
                    <td style={{ padding:'9px 12px',borderBottom:'1px solid var(--grey-bg)' }}><span style={{ fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:10,background:`${STATUS_COLORS[t.status]}22`,color:STATUS_COLORS[t.status] }}>{STATUS_LABELS[t.status]}</span></td>
                    <td style={{ padding:'9px 12px',borderBottom:'1px solid var(--grey-bg)' }}><span style={{ fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:10,background:`${PRIORITY_COLORS[t.priority]||'#999'}22`,color:PRIORITY_COLORS[t.priority]||'#999' }}>{t.priority}</span></td>
                    <td style={{ padding:'9px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{t.assignee_name||'—'}</td>
                    <td style={{ padding:'9px 12px',fontSize:12,color: t.due_date&&new Date(t.due_date)<new Date()&&t.status!=='done'?'var(--red)':'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{t.due_date?new Date(t.due_date).toLocaleDateString('en-GB'):'—'}</td>
                    <td style={{ padding:'9px 12px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{t.baseline_hours||0}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
