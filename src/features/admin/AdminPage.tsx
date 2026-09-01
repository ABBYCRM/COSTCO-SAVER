import { useEffect, useState } from 'react';
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { adminReports, adminSummary, updateAdminReport, type AdminReport, type AdminStats } from '@services/api/admin';

export function AdminPage():JSX.Element{
  const [stats,setStats]=useState<AdminStats|null>(null);
  const [reports,setReports]=useState<AdminReport[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [busyId,setBusyId]=useState<string|null>(null);

  async function load(){
    setLoading(true);setError(null);
    try{
      const [nextStats,nextReports]=await Promise.all([adminSummary(),adminReports()]);
      setStats(nextStats);setReports(nextReports);
    }catch(err){setError(err instanceof Error?err.message:'Failed to load moderator console');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  async function setStatus(report:AdminReport,status:AdminReport['status']){
    setBusyId(report.id);
    try{
      const updated=await updateAdminReport(report.id,status);
      setReports(rows=>rows.map(row=>row.id===report.id?updated:row));
      setStats(current=>current?{...current,openReports:reports.filter(r=>r.id!==report.id&&['open','reviewing'].includes(r.status)).length+(status==='open'||status==='reviewing'?1:0)}:current);
    }catch(err){setError(err instanceof Error?err.message:'Moderation action failed');}
    finally{setBusyId(null);}
  }

  return(
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Moderator Console</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          {error&&<p role="alert" style={{color:'var(--cs-danger)'}}>{error}</p>}
          {loading&&<div className="cs-card" aria-busy="true">Loading moderation data…</div>}
          {stats&&(
            <section className="cs-card">
              <h2 className="cs-section-title" style={{marginTop:0}}>System status</h2>
              <div className="cs-row" style={{flexWrap:'wrap',gap:'var(--cs-space-5)'}}>
                <Stat label="Products" value={stats.products}/>
                <Stat label="Observations" value={stats.observations}/>
                <Stat label="Users" value={stats.users}/>
                <Stat label="Open reports" value={stats.openReports}/>
                <Stat label="Price conflicts" value={stats.priceConflicts}/>
              </div>
            </section>
          )}
          <section className="cs-card" style={{marginTop:'var(--cs-space-3)'}}>
            <h2 className="cs-section-title" style={{marginTop:0}}>Reports</h2>
            {reports.length===0?<p className="cs-muted">No reports.</p>:(
              <ul className="cs-stack" style={{listStyle:'none',padding:0}}>
                {reports.map(report=>(
                  <li key={report.id} className="cs-card">
                    <div className="cs-row" style={{justifyContent:'space-between'}}>
                      <div>
                        <div className="cs-strong">{report.entity_type} · {report.reason}</div>
                        <div className="cs-muted">{report.reporter_email??'anonymous'} · {new Date(report.created_at).toLocaleString()}</div>
                        {report.details&&<p>{report.details}</p>}
                      </div>
                      <span className="cs-pill">{report.status}</span>
                    </div>
                    <div className="cs-row">
                      {report.status==='open'&&<IonButton size="small" disabled={busyId===report.id} onClick={()=>void setStatus(report,'reviewing')}>Review</IonButton>}
                      {report.status!=='resolved'&&<IonButton size="small" disabled={busyId===report.id} onClick={()=>void setStatus(report,'resolved')}>Resolve</IonButton>}
                      {report.status!=='dismissed'&&<IonButton size="small" fill="outline" disabled={busyId===report.id} onClick={()=>void setStatus(report,'dismissed')}>Dismiss</IonButton>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
function Stat({label,value}:{label:string;value:number}):JSX.Element{
  return <div><div className="cs-strong" style={{fontSize:'var(--cs-font-size-5)'}}>{value.toLocaleString()}</div><div className="cs-muted">{label}</div></div>;
}
