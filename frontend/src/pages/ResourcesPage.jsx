import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const LEVEL_COLORS = { strong:'var(--green)', proficient:'var(--navy)', learning:'var(--amber)' };

const cardStyle = { background:'white', border:'1px solid var(--grey-border)', borderRadius:10, padding:'16px 20px' };
const widgetTitle = { fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'var(--grey-text)', marginBottom:12 };
const statBox = { background:'var(--grey-bg)', borderRadius:8, padding:'10px 14px', textAlign:'center' };
const statValue = { fontSize:20, fontWeight:700, color:'var(--navy)' };
const statLabel = { fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', color:'var(--grey-text)', marginTop:4 };

function ProgressBar({ pct }) {
  const p = Math.min(100, Math.max(0, pct || 0));
  const c = p > 90 ? 'var(--red)' : p > 70 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ flex:1, height:8, background:'var(--grey-bg)', borderRadius:4 }}>
        <div style={{ width:`${p}%`, height:'100%', background:c, borderRadius:4 }} />
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:c, minWidth:36 }}>{p.toFixed(0)}%</span>
    </div>
  );
}

function ServerStorageWidget() {
  const { data } = useQuery({ queryKey:['it-storage'], queryFn:()=>api.get('/admin/storage-usage').then(r=>r.data) });
  if (!data) return null;
  return (
    <div style={cardStyle}>
      <div style={widgetTitle}>Server Storage</div>
      <ProgressBar pct={data.disk_usage_percent} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginTop:12 }}>
        <div style={statBox}><div style={statValue}>{data.total_disk_gb}</div><div style={statLabel}>Total GB</div></div>
        <div style={statBox}><div style={statValue}>{data.used_disk_gb}</div><div style={statLabel}>Used GB</div></div>
        <div style={statBox}><div style={statValue}>{data.free_disk_gb}</div><div style={statLabel}>Free GB</div></div>
        <div style={statBox}><div style={statValue}>{data.uploads_total_mb.toFixed(1)}</div><div style={statLabel}>Uploads MB</div></div>
      </div>
    </div>
  );
}

function ActiveUsersWidget() {
  const { data } = useQuery({ queryKey:['it-users-summary'], queryFn:()=>api.get('/admin/users-summary').then(r=>r.data) });
  if (!data) return null;
  return (
    <div style={cardStyle}>
      <div style={widgetTitle}>Active Users</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        <div style={statBox}><div style={statValue}>{data.total_users}</div><div style={statLabel}>Total</div></div>
        <div style={statBox}><div style={statValue}>{data.active_today}</div><div style={statLabel}>Today</div></div>
        <div style={statBox}><div style={statValue}>{data.active_this_week}</div><div style={statLabel}>This Week</div></div>
        <div style={statBox}><div style={{...statValue, color:data.never_logged_in>0?'var(--amber)':'var(--navy)'}}>{data.never_logged_in}</div><div style={statLabel}>Never Logged In</div></div>
      </div>
    </div>
  );
}

function SystemHealthWidget() {
  const { data } = useQuery({ queryKey:['it-system-health'], queryFn:()=>api.get('/admin/system-health').then(r=>r.data) });
  if (!data) return null;
  const days = Math.floor(data.uptime_seconds / 86400);
  const hours = Math.floor((data.uptime_seconds % 86400) / 3600);
  const cpuPct = Math.min(100, Math.round((data.cpu_load / data.cpu_cores) * 100));
  return (
    <div style={cardStyle}>
      <div style={widgetTitle}>System Health</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <div style={statBox}><div style={statValue}>{days}d {hours}h</div><div style={statLabel}>Uptime</div></div>
        <div style={statBox}><div style={statValue}>{data.cpu_load}</div><div style={statLabel}>CPU Load ({data.cpu_cores} cores)</div></div>
      </div>
      <div style={{ marginBottom:6, fontSize:12, color:'var(--grey-text)' }}>Memory: {data.memory_used_mb} / {data.memory_total_mb} MB</div>
      <ProgressBar pct={data.memory_percent} />
      <div style={{ marginTop:10, marginBottom:6, fontSize:12, color:'var(--grey-text)' }}>CPU Utilisation</div>
      <ProgressBar pct={cpuPct} />
    </div>
  );
}

function DbStatsWidget() {
  const { data } = useQuery({ queryKey:['it-db-stats'], queryFn:()=>api.get('/admin/db-stats').then(r=>r.data) });
  if (!data) return null;
  return (
    <div style={cardStyle}>
      <div style={widgetTitle}>Database</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <div style={statBox}><div style={statValue}>{data.db_size}</div><div style={statLabel}>Total Size</div></div>
        <div style={statBox}><div style={statValue}>{data.table_count}</div><div style={statLabel}>Tables</div></div>
      </div>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', color:'var(--grey-text)', marginBottom:6 }}>Largest Tables</div>
      {(data.largest_tables||[]).map(t=>(
        <div key={t.name} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--grey-bg)', fontSize:12 }}>
          <span style={{ color:'var(--navy)', fontWeight:700 }}>{t.name}</span>
          <span style={{ color:'var(--grey-text)' }}>{t.size}</span>
        </div>
      ))}
    </div>
  );
}

function FileStorageWidget() {
  const { data } = useQuery({ queryKey:['it-storage'], queryFn:()=>api.get('/admin/storage-usage').then(r=>r.data) });
  if (!data) return null;
  const categories = [
    { label:'Project Files', mb:data.project_files_mb },
    { label:'Logos & Branding', mb:data.logos_mb },
    { label:'User Avatars', mb:data.user_avatars_mb },
    { label:'HR Files', mb:data.hr_files_mb },
  ];
  const totalMb = data.uploads_total_mb || 1;
  return (
    <div style={cardStyle}>
      <div style={widgetTitle}>File Storage Breakdown</div>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--navy)', marginBottom:12 }}>Total: {totalMb.toFixed(1)} MB</div>
      {categories.map(c=>{
        const pct = Math.round((c.mb / totalMb) * 100);
        return (
          <div key={c.label} style={{ marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
              <span style={{ color:'var(--navy)', fontWeight:700 }}>{c.label}</span>
              <span style={{ color:'var(--grey-text)' }}>{c.mb.toFixed(1)} MB ({pct}%)</span>
            </div>
            <div style={{ height:6, background:'var(--grey-bg)', borderRadius:3 }}>
              <div style={{ width:`${pct}%`, height:'100%', background:'var(--navy)', borderRadius:3 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeamUtilisationWidget() {
  const { data: profiles=[] } = useQuery({ queryKey:['eng-resources'], queryFn:()=>api.get('/resources').then(r=>r.data) });
  const total = profiles.length;
  const overloaded = profiles.filter(p => parseFloat(p.utilisation_pct||0) > 90).length;
  const optimal = profiles.filter(p => { const u=parseFloat(p.utilisation_pct||0); return u>=70&&u<=90; }).length;
  const available = profiles.filter(p => parseFloat(p.utilisation_pct||0) < 70).length;
  return (
    <div style={cardStyle}>
      <div style={widgetTitle}>Team Utilisation</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        <div style={statBox}><div style={statValue}>{total}</div><div style={statLabel}>Total</div></div>
        <div style={statBox}><div style={{...statValue, color:'var(--red)'}}>{overloaded}</div><div style={statLabel}>Overloaded</div></div>
        <div style={statBox}><div style={{...statValue, color:'var(--amber)'}}>{optimal}</div><div style={statLabel}>Optimal</div></div>
        <div style={statBox}><div style={{...statValue, color:'var(--green)'}}>{available}</div><div style={statLabel}>Available</div></div>
      </div>
    </div>
  );
}

function SkillsGapWidget() {
  const { data } = useQuery({ queryKey:['eng-skills-summary'], queryFn:()=>api.get('/admin/skills-summary').then(r=>r.data) });
  if (!data) return null;
  const top5 = (data.top_skills||[]).slice(0,5);
  const maxCount = top5.length > 0 ? top5[0].count : 1;
  return (
    <div style={cardStyle}>
      <div style={widgetTitle}>Skills Gap Analysis</div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:12, color:'var(--grey-text)' }}>Total skills tracked: <strong style={{ color:'var(--navy)' }}>{data.total_skills}</strong></span>
      </div>
      {top5.map(s=>(
        <div key={s.name} style={{ marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
            <span style={{ color:'var(--navy)', fontWeight:700 }}>{s.name}</span>
            <span style={{ color:'var(--grey-text)' }}>{s.count} associates</span>
          </div>
          <div style={{ height:6, background:'var(--grey-bg)', borderRadius:3 }}>
            <div style={{ width:`${Math.round((s.count/maxCount)*100)}%`, height:'100%', background:'var(--navy)', borderRadius:3 }} />
          </div>
        </div>
      ))}
      {top5.length===0&&<div style={{ fontSize:12, color:'var(--grey-text)' }}>No skills data available.</div>}
    </div>
  );
}

function ProjectAllocationWidget() {
  const { workspace } = useAuthStore();
  const { data: projects=[] } = useQuery({
    queryKey:['eng-active-projects', workspace?.id],
    queryFn:()=>api.get('/projects', { params:{ workspace_id:workspace?.id, status:'active' } }).then(r=>r.data),
    enabled:!!workspace?.id,
  });
  return (
    <div style={cardStyle}>
      <div style={widgetTitle}>Active Project Assignments</div>
      {projects.length===0 ? (
        <div style={{ fontSize:12, color:'var(--grey-text)' }}>No active projects.</div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Project','Members','Project Manager'].map(h=>(
              <th key={h} style={{ padding:'6px 8px', fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:'uppercase', color:'var(--grey-text)', textAlign:'left', borderBottom:'1.5px solid var(--grey-border)' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {projects.map(p=>(
              <tr key={p.id}>
                <td style={{ padding:'7px 8px', fontSize:12, fontWeight:700, color:'var(--navy)', borderBottom:'1px solid var(--grey-bg)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:p.color||'var(--navy)', flexShrink:0 }} />
                    {p.name}
                  </div>
                </td>
                <td style={{ padding:'7px 8px', fontSize:12, color:'var(--grey-text)', borderBottom:'1px solid var(--grey-bg)' }}>{p.member_count||0}</td>
                <td style={{ padding:'7px 8px', fontSize:12, color:'var(--grey-text)', borderBottom:'1px solid var(--grey-bg)' }}>{p.pm_name||'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EngineeringDashboard() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
      <TeamUtilisationWidget />
      <SkillsGapWidget />
      <div style={{ gridColumn:'span 2' }}><ProjectAllocationWidget /></div>
    </div>
  );
}

function ITDashboard() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
      <ServerStorageWidget />
      <ActiveUsersWidget />
      <SystemHealthWidget />
      <DbStatsWidget />
      <FileStorageWidget />
    </div>
  );
}

function UtilBar({ pct }) {
  const p = Math.min(100, Math.max(0, parseFloat(pct||0)));
  const color = p > 90 ? 'var(--red)' : p > 70 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'var(--grey-bg)', borderRadius:3 }}>
        <div style={{ width:`${p}%`, height:'100%', background:color, borderRadius:3 }}/>
      </div>
      <span style={{ fontSize:11, fontWeight:700, color, minWidth:32 }}>{p.toFixed(0)}%</span>
    </div>
  );
}

export default function ResourcesPage() {
  const { user, workspace } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const isAdmin = user?.roles?.includes('admin');
  const isItWorkspace = workspace?.slug === 'it';
  const isEngWorkspace = workspace?.slug === 'engineering';

  const { data: profiles=[], isLoading } = useQuery({
    queryKey: ['resources', search],
    queryFn: () => api.get('/resources', { params: { search: search || undefined } }).then(r => r.data),
  });

  const { data: profile } = useQuery({
    queryKey: ['resource', selected],
    queryFn: () => api.get(`/resources/${selected}`).then(r => r.data),
    enabled: !!selected,
  });

  return (
    <div style={{ padding:28, display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {isItWorkspace && <ITDashboard />}
      {isEngWorkspace && <EngineeringDashboard />}
      <div style={{ display:'flex', gap:20, flex:1, overflow:'hidden' }}>
      {/* List */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:20,fontWeight:700,color:'var(--navy)',marginBottom:3 }}>Resource Pool</h1>
            <p style={{ fontSize:13,color:'var(--grey-text)' }}>{profiles.length} associates</p>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search associates…" title="Search associates by name"
            style={{ height:34,border:'1.5px solid var(--grey-border)',borderRadius:7,padding:'0 12px',fontFamily:'var(--font)',fontSize:13,color:'var(--navy)',background:'white',outline:'none',width:220 }}/>
        </div>

        <div style={{ flex:1, background:'white', border:'1px solid var(--grey-border)', borderRadius:10, overflow:'auto' }}>
          {isLoading ? <div style={{ padding:40,textAlign:'center',color:'var(--grey-text)',fontSize:14 }}>Loading…</div> : (
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Associate','Department','Skills','Active Projects','Utilisation',''].map(h=>(
                  <th key={h} style={{ padding:'8px 14px',fontSize:10.5,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase',color:'var(--grey-text)',textAlign:'left',background:'var(--grey-bg)',borderBottom:'1.5px solid var(--grey-border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {profiles.map(p=>(
                  <tr key={p.id} onClick={()=>setSelected(p.user_id)} style={{ cursor:'pointer', background:selected===p.user_id?'var(--navy-xlight)':'white' }}>
                    <td style={{ padding:'11px 14px',borderBottom:'1px solid var(--grey-bg)' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        <div style={{ width:32,height:32,borderRadius:'50%',background:'var(--navy)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white',flexShrink:0 }}>{(p.name||'?').slice(0,2).toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize:13,fontWeight:700,color:'var(--navy)' }}>{p.name}</div>
                          <div style={{ fontSize:11,color:'var(--grey-text)' }}>{p.job_title||p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'11px 14px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{p.department||'—'}</td>
                    <td style={{ padding:'11px 14px',borderBottom:'1px solid var(--grey-bg)' }}>
                      <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
                        {(p.skills||[]).slice(0,3).map(s=>(
                          <span key={s.id} style={{ fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:10,background:`${LEVEL_COLORS[s.level]||'var(--navy)'}22`,color:LEVEL_COLORS[s.level]||'var(--navy)' }}>{s.name}</span>
                        ))}
                        {(p.skills||[]).length>3&&<span style={{ fontSize:10,color:'var(--grey-text)' }}>+{p.skills.length-3}</span>}
                      </div>
                    </td>
                    <td style={{ padding:'11px 14px',fontSize:12,color:'var(--grey-text)',borderBottom:'1px solid var(--grey-bg)' }}>{(p.active_projects||[]).length}</td>
                    <td style={{ padding:'11px 14px',borderBottom:'1px solid var(--grey-bg)',width:140 }}><UtilBar pct={p.utilisation_pct}/></td>
                    <td style={{ padding:'11px 14px',borderBottom:'1px solid var(--grey-bg)' }}><span style={{ fontSize:16,color:'var(--grey-text)' }}>›</span></td>
                  </tr>
                ))}
                {profiles.length===0&&<tr><td colSpan={6} style={{ padding:'40px 14px',textAlign:'center',color:'var(--grey-text)',fontSize:13 }}>No associates found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail flyout */}
      {selected && profile && (
        <div style={{ width:340,flexShrink:0,background:'white',border:'1px solid var(--grey-border)',borderRadius:10,overflow:'auto',display:'flex',flexDirection:'column' }}>
          {/* Header */}
          <div style={{ background:'var(--navy)',padding:'18px 18px 14px',position:'relative' }}>
            <button onClick={()=>setSelected(null)} title="Close panel" style={{ position:'absolute',top:12,right:12,background:'rgba(255,255,255,0.1)',border:'none',color:'white',cursor:'pointer',borderRadius:5,padding:'2px 8px',fontFamily:'var(--font)',fontSize:13 }}>×</button>
            <div style={{ width:48,height:48,borderRadius:'50%',background:'var(--red)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'white',marginBottom:10 }}>{(profile.name||'?').slice(0,2).toUpperCase()}</div>
            <div style={{ fontSize:16,fontWeight:700,color:'white' }}>{profile.name}</div>
            <div style={{ fontSize:12,color:'rgba(255,255,255,0.7)' }}>{profile.job_title||'—'} · {profile.department||'—'}</div>
          </div>

          <div style={{ padding:16, flex:1 }}>
            {/* Skills */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--grey-text)',marginBottom:8 }}>Skills Profile</div>
              {[['strong','Strong'],['proficient','Proficient'],['learning','Learning']].map(([level,label])=>{
                const sk = (profile.skills||[]).filter(s=>s.level===level);
                if (!sk.length) return null;
                return (
                  <div key={level} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:11,color:LEVEL_COLORS[level],fontWeight:700,marginBottom:4 }}>{label}</div>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                      {sk.map(s=><span key={s.id} style={{ fontSize:11,padding:'2px 8px',borderRadius:10,background:`${LEVEL_COLORS[level]}22`,color:LEVEL_COLORS[level],fontWeight:700 }}>{s.name}</span>)}
                    </div>
                  </div>
                );
              })}
              {(!profile.skills||!profile.skills.length)&&<p style={{ fontSize:12,color:'var(--grey-text)' }}>No skills recorded.</p>}
            </div>

            {/* Active projects */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--grey-text)',marginBottom:8 }}>Active Projects</div>
              {(profile.projects||[]).filter(p=>['active','pending_approval'].includes(p.status)).map(p=>(
                <div key={p.id} style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--grey-bg)',fontSize:12 }}>
                  <span style={{ color:'var(--navy)',fontWeight:700 }}>{p.name}</span>
                  <span style={{ color:'var(--grey-text)' }}>{p.allocation_pct||0}%</span>
                </div>
              ))}
              {!(profile.projects||[]).filter(p=>['active','pending_approval'].includes(p.status)).length&&<p style={{ fontSize:12,color:'var(--grey-text)' }}>No active projects.</p>}
            </div>

            {/* Weekly utilisation */}
            {(profile.weekly_utilisation||[]).length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--grey-text)',marginBottom:8 }}>Weekly Utilisation (8w)</div>
                {(profile.weekly_utilisation||[]).slice(-8).map((w,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                    <span style={{ fontSize:10,color:'var(--grey-text)',width:52,flexShrink:0 }}>{new Date(w.week).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
                    <div style={{ flex:1,height:6,background:'var(--grey-bg)',borderRadius:3 }}>
                      <div style={{ width:`${Math.min(100,Math.round(parseFloat(w.total_hours||0)/40*100))}%`,height:'100%',background:'var(--navy)',borderRadius:3 }}/>
                    </div>
                    <span style={{ fontSize:10,fontWeight:700,color:'var(--navy)',width:28 }}>{parseFloat(w.total_hours||0).toFixed(0)}h</span>
                  </div>
                ))}
              </div>
            )}

            {/* Costing — admin only */}
            {isAdmin && profile.hourly_rate && (
              <div style={{ background:'var(--grey-bg)',borderRadius:8,padding:12 }}>
                <div style={{ fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--grey-text)',marginBottom:6 }}>Costing (Admin Only)</div>
                <div style={{ fontSize:14,fontWeight:700,color:'var(--navy)' }}>{profile.currency||'INR'} {parseFloat(profile.hourly_rate).toFixed(2)}/h</div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
