import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

const LEVEL_COLORS = { strong:'var(--green)', proficient:'var(--navy)', learning:'var(--amber)' };

function ServerStorageWidget() {
  const { data } = useQuery({
    queryKey: ['server-storage'],
    queryFn: () => api.get('/admin/storage-usage').then(r => r.data),
  });
  if (!data) return null;
  const pct = data.disk_usage_percent || 0;
  const barColor = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ background:'white', border:'1px solid var(--grey-border)', borderRadius:10, padding:'16px 20px', marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'var(--grey-text)', marginBottom:12 }}>Server Storage</div>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ height:8, background:'var(--grey-bg)', borderRadius:4 }}>
            <div style={{ width:`${Math.min(100, pct)}%`, height:'100%', background:barColor, borderRadius:4 }} />
          </div>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:barColor, minWidth:40 }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ display:'flex', gap:20, fontSize:12, color:'var(--grey-text)' }}>
        <span>Total: <strong style={{ color:'var(--navy)' }}>{data.total_disk_gb} GB</strong></span>
        <span>Used: <strong style={{ color:'var(--navy)' }}>{data.used_disk_gb} GB</strong></span>
        <span>Free: <strong style={{ color:'var(--navy)' }}>{data.free_disk_gb} GB</strong></span>
        <span>Uploads: <strong style={{ color:'var(--navy)' }}>{data.uploads_total_mb.toFixed(1)} MB</strong></span>
      </div>
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
      {isItWorkspace && <ServerStorageWidget />}
      <div style={{ display:'flex', gap:20, flex:1, overflow:'hidden' }}>
      {/* List */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:20,fontWeight:700,color:'var(--navy)',marginBottom:3 }}>Resource Pool</h1>
            <p style={{ fontSize:13,color:'var(--grey-text)' }}>{profiles.length} associates</p>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search associates…"
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
            <button onClick={()=>setSelected(null)} style={{ position:'absolute',top:12,right:12,background:'rgba(255,255,255,0.1)',border:'none',color:'white',cursor:'pointer',borderRadius:5,padding:'2px 8px',fontFamily:'var(--font)',fontSize:13 }}>×</button>
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
