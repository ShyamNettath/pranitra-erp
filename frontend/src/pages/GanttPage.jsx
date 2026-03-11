import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const CELL_W = 28;
const ROW_H = 36;
const LABEL_W = 260;
const STATUS_COLORS = { todo:'#B0BAC8', in_progress:'#B86A00', in_review:'#5A2D8A', done:'#0A7A79' };

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

export default function GanttPage() {
  const { workspace } = useAuthStore();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [flyout, setFlyout] = useState(null);

  const { data: projects=[] } = useQuery({
    queryKey: ['projects', workspace?.id],
    queryFn: () => api.get('/projects', { params: { workspace_id: workspace?.id } }).then(r => r.data),
  });

  const { data: tasks=[] } = useQuery({
    queryKey: ['gantt-tasks', projectId],
    queryFn: () => api.get('/tasks', { params: { project_id: projectId, parent_id: 'null' } }).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: milestones=[] } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => api.get(`/projects/${projectId}/milestones`).then(r => r.data),
    enabled: !!projectId,
  });

  const updateTask = useMutation({
    mutationFn: ({ id, start_date, due_date }) => api.put(`/tasks/${id}`, { start_date, due_date }),
    onSuccess: () => qc.invalidateQueries(['gantt-tasks']),
  });

  const ganttItems = useMemo(() => {
    const taskItems = tasks.filter(t => t.start_date && t.due_date);
    const milestoneItems = milestones.filter(m => m.due_date);
    return [...taskItems.map(t => ({ ...t, _type: 'task' })), ...milestoneItems.map(m => ({ ...m, _type: 'milestone', name: `◆ ${m.name}` }))];
  }, [tasks, milestones]);

  const { minDate, maxDate, numDays } = useMemo(() => {
    if (!ganttItems.length) return { minDate: new Date(), maxDate: addDays(new Date(), 30), numDays: 30 };
    const dates = ganttItems.flatMap(i => [new Date(i.start_date || i.due_date), new Date(i.due_date)]).filter(Boolean);
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 3);
    max.setDate(max.getDate() + 7);
    return { minDate: min, maxDate: max, numDays: daysBetween(min, max) };
  }, [ganttItems]);

  const today = new Date();
  const todayX = LABEL_W + daysBetween(minDate, today) * CELL_W;

  // Generate month headers
  const months = useMemo(() => {
    const result = [];
    let cursor = new Date(minDate);
    cursor.setDate(1);
    while (cursor <= maxDate) {
      const x = LABEL_W + Math.max(0, daysBetween(minDate, cursor)) * CELL_W;
      result.push({ label: cursor.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), x });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return result;
  }, [minDate, maxDate]);

  const svgW = LABEL_W + numDays * CELL_W + 20;
  const svgH = ROW_H * 1.5 + ganttItems.length * ROW_H + 20;

  return (
    <div style={{ padding:28, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:20,fontWeight:700,color:'var(--navy)',marginBottom:3 }}>Gantt Chart</h1>
          <p style={{ fontSize:13,color:'var(--grey-text)' }}>Visual timeline with task bars, milestones, and baseline comparison</p>
        </div>
        <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={{ height:34,border:'1.5px solid var(--grey-border)',borderRadius:7,padding:'0 12px',fontFamily:'var(--font)',fontSize:13,color:'var(--navy)',background:'white',outline:'none',cursor:'pointer',minWidth:240 }}>
          <option value="">Select a project…</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {!projectId && (
        <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--grey-text)',fontSize:14 }}>
          Select a project to view the Gantt chart.
        </div>
      )}

      {projectId && ganttItems.length === 0 && (
        <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--grey-text)',fontSize:14 }}>
          No tasks with start/end dates found. Add dates to tasks to see them on the Gantt.
        </div>
      )}

      {projectId && ganttItems.length > 0 && (
        <div style={{ flex:1,overflow:'auto',background:'white',border:'1px solid var(--grey-border)',borderRadius:10 }}>
          <svg width={svgW} height={svgH} style={{ fontFamily:'var(--font)' }}>
            {/* Month headers */}
            <rect x={0} y={0} width={svgW} height={ROW_H} fill="#F4F6F9"/>
            {months.map((m,i) => (
              <g key={i}>
                <line x1={m.x} y1={0} x2={m.x} y2={svgH} stroke="#D8DDE6" strokeWidth={1}/>
                <text x={m.x+8} y={ROW_H*0.65} fontSize={11} fontWeight={700} fill="#6B7A90">{m.label}</text>
              </g>
            ))}

            {/* Weekend shading */}
            {Array.from({ length: numDays }, (_, i) => {
              const d = addDays(minDate, i);
              const dow = d.getDay();
              if (dow === 0 || dow === 6) {
                return <rect key={i} x={LABEL_W + i*CELL_W} y={ROW_H} width={CELL_W} height={svgH-ROW_H} fill="rgba(0,0,0,0.02)"/>;
              }
              return null;
            })}

            {/* TODAY line */}
            {todayX > LABEL_W && (
              <g>
                <line x1={todayX} y1={0} x2={todayX} y2={svgH} stroke="#E8232A" strokeWidth={2} strokeDasharray="4,4"/>
                <text x={todayX+4} y={ROW_H*0.65} fontSize={10} fontWeight={700} fill="#E8232A">TODAY</text>
              </g>
            )}

            {/* Row backgrounds + labels + bars */}
            {ganttItems.map((item, rowIdx) => {
              const y = ROW_H * 1.5 + rowIdx * ROW_H;
              const startX = LABEL_W + daysBetween(minDate, new Date(item.start_date || item.due_date)) * CELL_W;
              const endX = LABEL_W + daysBetween(minDate, new Date(item.due_date)) * CELL_W + CELL_W;
              const barW = Math.max(8, endX - startX);
              const isMilestone = item._type === 'milestone';
              const barColor = isMilestone ? '#5A2D8A' : (STATUS_COLORS[item.status] || '#003264');
              const pct = parseFloat(item.progress_pct || 0);

              // Baseline bar
              const hasBaseline = item.baseline_due_date && item.baseline_due_date !== item.due_date;
              const baselineEndX = hasBaseline ? LABEL_W + daysBetween(minDate, new Date(item.baseline_due_date)) * CELL_W + CELL_W : null;

              return (
                <g key={item.id} onClick={() => setFlyout(item)} style={{ cursor:'pointer' }}>
                  {/* Row bg */}
                  <rect x={0} y={y} width={svgW} height={ROW_H} fill={rowIdx%2===0?'white':'#FAFBFD'}/>
                  <line x1={0} y1={y+ROW_H} x2={svgW} y2={y+ROW_H} stroke="#F4F6F9" strokeWidth={1}/>

                  {/* Label area */}
                  <rect x={0} y={y} width={LABEL_W} height={ROW_H} fill={rowIdx%2===0?'white':'#FAFBFD'}/>
                  <line x1={LABEL_W} y1={0} x2={LABEL_W} y2={svgH} stroke="#D8DDE6" strokeWidth={1}/>
                  <text x={12} y={y+ROW_H*0.62} fontSize={12} fontWeight={isMilestone?700:400} fill="#003264"
                    style={{ overflow:'hidden' }}>
                    {item.name.slice(0, 30)}{item.name.length > 30 ? '…' : ''}
                  </text>

                  {/* Baseline ghost */}
                  {hasBaseline && (
                    <rect x={startX} y={y+ROW_H*0.3} width={Math.max(4,baselineEndX-startX)} height={ROW_H*0.15}
                      fill="none" stroke="#B0BAC8" strokeWidth={1} strokeDasharray="3,2" rx={2}/>
                  )}

                  {/* Main bar or milestone diamond */}
                  {isMilestone ? (
                    <polygon points={`${startX},${y+ROW_H*0.5} ${startX+8},${y+ROW_H*0.25} ${startX+16},${y+ROW_H*0.5} ${startX+8},${y+ROW_H*0.75}`}
                      fill={item.status==='achieved'?'var(--green)':item.status==='missed'?'var(--red)':'var(--purple)'}/>
                  ) : (
                    <>
                      <rect x={startX} y={y+ROW_H*0.25} width={barW} height={ROW_H*0.5} fill={barColor} rx={3} opacity={0.85}/>
                      {pct > 0 && <rect x={startX} y={y+ROW_H*0.25} width={barW*pct/100} height={ROW_H*0.5} fill={barColor} rx={3}/>}
                      {pct > 0 && <text x={startX+barW+4} y={y+ROW_H*0.65} fontSize={9} fill="#6B7A90">{pct}%</text>}
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Flyout panel */}
      {flyout && (
        <div style={{ position:'fixed',top:0,right:0,bottom:0,width:320,background:'white',boxShadow:'-4px 0 24px rgba(0,0,0,0.12)',zIndex:150,padding:24,overflow:'auto' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
            <span style={{ fontSize:14,fontWeight:700,color:'var(--navy)' }}>{flyout._type==='milestone'?'Milestone':'Task'} Detail</span>
            <button onClick={()=>setFlyout(null)} style={{ background:'none',border:'none',fontSize:18,cursor:'pointer',color:'var(--grey-text)' }}>×</button>
          </div>
          <div style={{ fontSize:15,fontWeight:700,color:'var(--navy)',marginBottom:12 }}>{flyout.name}</div>
          {[
            ['Status', flyout.status?.replace('_',' ')],
            ['Priority', flyout.priority],
            ['Start Date', flyout.start_date ? new Date(flyout.start_date).toLocaleDateString('en-GB') : '—'],
            ['Due Date', flyout.due_date ? new Date(flyout.due_date).toLocaleDateString('en-GB') : '—'],
            ['Baseline Due', flyout.baseline_due_date ? new Date(flyout.baseline_due_date).toLocaleDateString('en-GB') : '—'],
            ['Assignee', flyout.assignee_name || '—'],
            ['Progress', `${flyout.progress_pct || 0}%`],
            ['Baseline Hours', `${flyout.baseline_hours || 0}h`],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--grey-bg)',fontSize:13 }}>
              <span style={{ color:'var(--grey-text)' }}>{k}</span>
              <span style={{ fontWeight:700,color:'var(--navy)' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
