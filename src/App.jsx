import { RAW, CENTROS } from "./data.js";
import { useState, useMemo } from "react";

const PERIODS=[
  {key:"LISTO",label:"Disponible",color:"#5B9A6F"},
  {key:"2026-03-E",label:"Mar 1-15",color:"#8B7FB5"},
  {key:"2026-03-L",label:"Mar 16-31",color:"#C4985A"},
  {key:"2026-04",label:"Abril",color:"#C47D5A"},
  {key:"2026-05",label:"Mayo",color:"#D4726A",hasCritico:true},
  {key:"COMPRAR",label:"Por Comprar",color:"#D48A6A",hasCritico:true},
  {key:"CONF",label:"Por Confirmar",color:"#8E99A4",hasCritico:true},
  {key:"DISC",label:"Descont./NA",color:"#7A6B8A",hasCritico:true},
  {key:"HOTEL",label:"Compra Hotel",color:"#6B8A7A",hasCritico:true},
];

function parse(r){return r.map((r,i)=>({id:i,code:r[0],cc:r[1],sup:r[2],ic:r[3],desc:r[4],qty:r[5],fecha:r[6],d2:r[7],ven:r[8],pk:r[9],pl:r[10],rel:r[11]||"0"}));}

const C={bg:"#F4F3EF",cd:"#FFF",ca:"#F9F8F5",bd:"#E8E5DE",bl:"#F0EDE6",tx:"#2D3436",tm:"#828A8F",tl:"#A8AEB3",ac:"#5B9A6F",as:"#E8F0EA",go:"#B8965A",sh:"0 1px 3px rgba(0,0,0,.04)",crit:"#C0392B",ncrit:"#E67E22"};

export default function App(){
  const items=useMemo(()=>parse(RAW),[]);
  const [view,setView]=useState("timeline");
  const [drill,setDrill]=useState(null);
  const [periodDrill,setPeriodDrill]=useState(null);
  const [periodCcFilter,setPeriodCcFilter]=useState("ALL");

  const tlData=useMemo(()=>{
    const g=new Map();
    CENTROS.forEach(n=>{
      const gi=items.filter(i=>i.cc===n);
      if(!gi.length)return;
      const b={};let t=0;
      PERIODS.forEach(p=>{
        const pItems=gi.filter(i=>i.pk===p.key);
        const c=pItems.length;
        b[p.key]=c;
        if(p.hasCritico){
          b[p.key+"_C"]=pItems.filter(i=>i.rel==="CRITICO").length;
          b[p.key+"_NC"]=pItems.filter(i=>i.rel==="NO CRITICO").length;
        }
        t+=c;
      });
      b._t=gi.length;b._tr=t;
      g.set(n,b);
    });
    return g;
  },[items]);

  const drillD=useMemo(()=>{
    if(!drill)return null;
    const gi=items.filter(i=>i.cc===drill);
    const m=new Map();
    PERIODS.forEach(p=>{const pi=gi.filter(i=>i.pk===p.key);if(pi.length)m.set(p.key,pi);});
    return m;
  },[items,drill]);

  const Pill=({children,active,onClick})=>(
    <button onClick={onClick} style={{padding:"7px 18px",borderRadius:20,border:"1px solid "+(active?C.ac:C.bd),background:active?C.as:"transparent",color:active?C.ac:C.tm,fontSize:13,fontWeight:active?600:400,cursor:"pointer"}}>{children}</button>
  );

  const NP=PERIODS.length;

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.tx,fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{background:C.cd,borderBottom:"1px solid "+C.bd,padding:"16px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div><div style={{fontSize:11,letterSpacing:5,color:C.tl,fontWeight:500}}>ST. REGIS</div><div style={{fontSize:15,fontWeight:600,marginTop:1}}>OSE Inventory</div></div>
          <div style={{width:1,height:32,background:C.bd}}/>
          <div style={{display:"flex",gap:6}}>
            <Pill active={view==="timeline"} onClick={()=>setView("timeline")}>Linea Temporal</Pill>
            <Pill active={view==="overview"} onClick={()=>setView("overview")}>Resumen</Pill>
          </div>
        </div>
        <div style={{fontSize:12,color:C.tl}}>Pre-apertura 2026 | {items.length} items</div>
      </div>
      <div style={{padding:"20px 32px",maxWidth:1600,margin:"0 auto"}}>
        {view==="timeline"&&(
          <div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {PERIODS.map(p=>{
                const pItems=items.filter(i=>i.pk===p.key);
                const cnt=pItems.length;
                const active=periodDrill===p.key;
                const crit=p.hasCritico?pItems.filter(i=>i.rel==="CRITICO").length:0;
                const ncrit=p.hasCritico?pItems.filter(i=>i.rel==="NO CRITICO").length:0;
                return(
                  <div key={p.key} onClick={()=>{setPeriodDrill(active?null:p.key);setPeriodCcFilter("ALL");}}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:8,background:active?p.color+"18":C.cd,border:"1px solid "+(active?p.color:C.bl),cursor:"pointer",transition:"all .15s"}}>
                    <div style={{width:8,height:8,borderRadius:4,background:p.color}}/>
                    <span style={{fontSize:11,color:active?p.color:C.tm,fontWeight:active?600:500}}>{p.label}</span>
                    <span style={{fontSize:10,color:active?p.color:C.tl,fontWeight:active?600:400}}>({cnt})</span>
                    {p.hasCritico&&crit>0&&<span style={{fontSize:9,color:C.crit,fontWeight:600,background:C.crit+"15",padding:"1px 5px",borderRadius:4}}>C:{crit}</span>}
                    {p.hasCritico&&ncrit>0&&<span style={{fontSize:9,color:C.ncrit,fontWeight:600,background:C.ncrit+"15",padding:"1px 5px",borderRadius:4}}>NC:{ncrit}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{background:C.cd,borderRadius:16,border:"1px solid "+C.bd,boxShadow:C.sh,padding:16,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:600}}>Distribucion de Entregas</span>
                <span style={{fontSize:12,color:C.tl}}>{items.length} items totales</span>
              </div>
              <div style={{display:"flex",height:10,borderRadius:6,overflow:"hidden",background:C.bl,gap:1}}>
                {PERIODS.map(p=>{
                  const cnt=items.filter(i=>i.pk===p.key).length;
                  const pct=cnt/items.length*100;
                  if(pct<.3)return null;
                  return <div key={p.key} title={p.label+": "+cnt} onClick={()=>{setPeriodDrill(periodDrill===p.key?null:p.key);setPeriodCcFilter("ALL");}} style={{width:pct+"%",background:p.color,borderRadius:1,cursor:"pointer",transition:"opacity .15s",opacity:periodDrill&&periodDrill!==p.key?.5:1}}/>;
                })}
              </div>
            </div>
            <div style={{background:C.cd,borderRadius:16,border:"1px solid "+C.bd,boxShadow:C.sh,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"200px 1fr",borderBottom:"1px solid "+C.bd,background:C.ca}}>
                <div style={{padding:"12px 16px",fontSize:12,fontWeight:600,color:C.tm,borderRight:"1px solid "+C.bd}}>Centro de Consumo</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat("+NP+",1fr)"}}>
                  {PERIODS.map(p=>(
                    <div key={p.key} style={{padding:"12px 2px",textAlign:"center",fontSize:9,fontWeight:600,color:p.color,borderRight:"1px solid "+C.bl,lineHeight:1.3}}>
                      {p.label}
                      {p.hasCritico&&<div style={{fontSize:8,color:C.tl,fontWeight:400,marginTop:2}}>C / NC</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{maxHeight:520,overflowY:"auto"}}>
                {[...tlData.entries()].sort((a,b)=>b[1]._t-a[1]._t).map(([name,bk])=>{
                  const mx=Math.max(...PERIODS.map(p=>bk[p.key]||0),1);
                  return(
                    <div key={name} onClick={()=>setDrill(drill===name?null:name)}
                      style={{display:"grid",gridTemplateColumns:"200px 1fr",borderBottom:"1px solid "+C.bl,cursor:"pointer",background:drill===name?"#F0EDE6":"transparent"}}>
                      <div style={{padding:"10px 16px",borderRight:"1px solid "+C.bd,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                        <div style={{fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                        <div style={{fontSize:10,color:C.tl,marginTop:3}}>{bk._t} items</div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat("+NP+",1fr)",alignItems:"end",gap:2,padding:"6px 2px"}}>
                        {PERIODS.map(p=>{
                          const cnt=bk[p.key]||0;
                          const barH=cnt?Math.max(8,Math.min(36,cnt/mx*36)):0;
                          const critC=bk[p.key+"_C"]||0;
                          const critNC=bk[p.key+"_NC"]||0;
                          return(
                            <div key={p.key} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:p.hasCritico?56:44}}>
                              {cnt>0&&(
                                <>
                                  <div style={{fontSize:10,fontWeight:600,color:p.color,marginBottom:2}}>{cnt}</div>
                                  <div style={{width:"55%",height:barH,background:p.color+"30",borderRadius:4,border:"1px solid "+p.color+"50"}}/>
                                  {p.hasCritico&&(critC>0||critNC>0)&&(
                                    <div style={{display:"flex",gap:2,marginTop:2}}>
                                      {critC>0&&<span style={{fontSize:8,color:C.crit,fontWeight:700,background:C.crit+"15",padding:"0 3px",borderRadius:3}}>{critC}</span>}
                                      {critNC>0&&<span style={{fontSize:8,color:C.ncrit,fontWeight:700,background:C.ncrit+"15",padding:"0 3px",borderRadius:3}}>{critNC}</span>}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"200px 1fr",borderTop:"2px solid "+C.bd,background:C.ca}}>
                <div style={{padding:"12px 16px",fontSize:12,fontWeight:700,color:C.go,borderRight:"1px solid "+C.bd}}>TOTAL</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat("+NP+",1fr)"}}>
                  {PERIODS.map(p=>{
                    const pItems=items.filter(i=>i.pk===p.key);
                    const t=pItems.length;
                    const critC=p.hasCritico?pItems.filter(i=>i.rel==="CRITICO").length:0;
                    const critNC=p.hasCritico?pItems.filter(i=>i.rel==="NO CRITICO").length:0;
                    return(
                      <div key={p.key} onClick={()=>{setPeriodDrill(periodDrill===p.key?null:p.key);setPeriodCcFilter("ALL");}}
                        style={{textAlign:"center",padding:"8px 2px",borderRight:"1px solid "+C.bl,cursor:"pointer",background:periodDrill===p.key?p.color+"12":"transparent",transition:"background .15s"}}>
                        <div style={{fontSize:15,fontWeight:700,color:p.color}}>{t}</div>
                        <div style={{fontSize:9,color:C.tl}}>{Math.round(t/items.length*100)}%</div>
                        {p.hasCritico&&(critC>0||critNC>0)&&(
                          <div style={{display:"flex",gap:3,justifyContent:"center",marginTop:3}}>
                            {critC>0&&<span style={{fontSize:9,color:C.crit,fontWeight:700,background:C.crit+"15",padding:"1px 4px",borderRadius:4}}>C:{critC}</span>}
                            {critNC>0&&<span style={{fontSize:9,color:C.ncrit,fontWeight:700,background:C.ncrit+"15",padding:"1px 4px",borderRadius:4}}>NC:{critNC}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {drill&&drillD&&(
              <div style={{background:C.cd,borderRadius:16,border:"1px solid "+C.bd,boxShadow:C.sh,marginTop:16,padding:20}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:11,color:C.tl,letterSpacing:1,fontWeight:500}}>DETALLE</div>
                    <div style={{fontSize:16,fontWeight:600,marginTop:2}}>{drill}</div>
                  </div>
                  <button onClick={()=>setDrill(null)} style={{padding:"6px 16px",background:C.ca,border:"1px solid "+C.bd,borderRadius:8,color:C.tm,fontSize:12,cursor:"pointer"}}>Cerrar</button>
                </div>
                <div style={{maxHeight:360,overflowY:"auto"}}>
                  {[...drillD.entries()].map(([pk,pi])=>{
                    const p=PERIODS.find(x=>x.key===pk);
                    const critItems=p&&p.hasCritico?pi.filter(i=>i.rel==="CRITICO"):[];
                    const ncritItems=p&&p.hasCritico?pi.filter(i=>i.rel==="NO CRITICO"):[];
                    const otherItems=p&&p.hasCritico?pi.filter(i=>i.rel==="0"):pi;
                    return(
                      <div key={pk} style={{marginBottom:16}}>
                        <div style={{fontSize:12,fontWeight:600,color:p?p.color:C.tl,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:8,height:8,borderRadius:4,background:p?p.color:C.bd}}/>
                          {p?p.label:"Sin Info"} ({pi.length})
                        </div>
                        {critItems.length>0&&(
                          <div style={{marginBottom:8}}>
                            <div style={{fontSize:10,fontWeight:700,color:C.crit,marginBottom:4,padding:"2px 8px",background:C.crit+"10",borderRadius:4,display:"inline-block"}}>CRITICO ({critItems.length})</div>
                            {critItems.slice(0,10).map(it=>(
                              <div key={it.id} style={{display:"grid",gridTemplateColumns:"110px 1fr 50px 180px",gap:8,padding:"8px 12px",background:C.crit+"06",borderRadius:8,fontSize:12,alignItems:"center",marginBottom:4,border:"1px solid "+C.crit+"20",borderLeft:"3px solid "+C.crit}}>
                                <span style={{color:C.ac,fontFamily:"monospace",fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.ic}</span>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.desc}</span>
                                <span style={{textAlign:"right",color:C.tm,fontWeight:600}}>x{it.qty}</span>
                                <span style={{color:C.tl,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.fecha}</span>
                              </div>
                            ))}
                            {critItems.length>10&&<div style={{fontSize:11,color:C.tl,padding:"4px 12px"}}>+ {critItems.length-10} mas</div>}
                          </div>
                        )}
                        {ncritItems.length>0&&(
                          <div style={{marginBottom:8}}>
                            <div style={{fontSize:10,fontWeight:700,color:C.ncrit,marginBottom:4,padding:"2px 8px",background:C.ncrit+"10",borderRadius:4,display:"inline-block"}}>NO CRITICO ({ncritItems.length})</div>
                            {ncritItems.slice(0,10).map(it=>(
                              <div key={it.id} style={{display:"grid",gridTemplateColumns:"110px 1fr 50px 180px",gap:8,padding:"8px 12px",background:C.ncrit+"06",borderRadius:8,fontSize:12,alignItems:"center",marginBottom:4,border:"1px solid "+C.ncrit+"20",borderLeft:"3px solid "+C.ncrit}}>
                                <span style={{color:C.ac,fontFamily:"monospace",fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.ic}</span>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.desc}</span>
                                <span style={{textAlign:"right",color:C.tm,fontWeight:600}}>x{it.qty}</span>
                                <span style={{color:C.tl,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.fecha}</span>
                              </div>
                            ))}
                            {ncritItems.length>10&&<div style={{fontSize:11,color:C.tl,padding:"4px 12px"}}>+ {ncritItems.length-10} mas</div>}
                          </div>
                        )}
                        {otherItems.length>0&&(
                          <div>
                            {otherItems.slice(0,10).map(it=>(
                              <div key={it.id} style={{display:"grid",gridTemplateColumns:"110px 1fr 50px 180px",gap:8,padding:"8px 12px",background:C.ca,borderRadius:8,fontSize:12,alignItems:"center",marginBottom:4,border:"1px solid "+C.bl}}>
                                <span style={{color:C.ac,fontFamily:"monospace",fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.ic}</span>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.desc}</span>
                                <span style={{textAlign:"right",color:C.tm,fontWeight:600}}>x{it.qty}</span>
                                <span style={{color:C.tl,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.fecha}</span>
                              </div>
                            ))}
                            {otherItems.length>10&&<div style={{fontSize:11,color:C.tl,padding:"4px 12px"}}>+ {otherItems.length-10} mas</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {periodDrill&&(()=>{
              const p=PERIODS.find(x=>x.key===periodDrill);
              if(!p)return null;
              const allPeriodItems=items.filter(i=>i.pk===periodDrill);
              const ccList=[...new Set(allPeriodItems.map(i=>i.cc))].sort();
              const filtered=periodCcFilter==="ALL"?allPeriodItems:allPeriodItems.filter(i=>i.cc===periodCcFilter);

              // Split by relevancia for hasCritico periods
              const critItems=p.hasCritico?filtered.filter(i=>i.rel==="CRITICO"):[];
              const ncritItems=p.hasCritico?filtered.filter(i=>i.rel==="NO CRITICO"):[];
              const otherItems=p.hasCritico?filtered.filter(i=>i.rel==="0"):filtered;

              const renderGroup=(groupItems,label,color)=>{
                if(!groupItems.length)return null;
                const grouped=new Map();
                groupItems.forEach(it=>{if(!grouped.has(it.cc))grouped.set(it.cc,[]);grouped.get(it.cc).push(it);});
                const sortedGroups=[...grouped.entries()].sort((a,b)=>b[1].length-a[1].length);
                return(
                  <div style={{marginBottom:20}}>
                    {label&&(
                      <div style={{fontSize:11,fontWeight:700,color,marginBottom:8,padding:"4px 10px",background:color+"12",borderRadius:6,display:"inline-block",borderLeft:"3px solid "+color}}>
                        {label} ({groupItems.length})
                      </div>
                    )}
                    {sortedGroups.map(([cc,ccItems])=>(
                      <div key={cc} style={{marginBottom:12}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:6,display:"flex",alignItems:"center",gap:6,padding:"6px 0",borderBottom:"1px solid "+C.bl}}>
                          <span>{cc}</span>
                          <span style={{fontSize:10,color:C.tl,fontWeight:400}}>({ccItems.length})</span>
                        </div>
                        {ccItems.map(it=>(
                          <div key={it.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 50px 120px 150px",gap:8,padding:"8px 12px",background:color?color+"06":C.ca,borderRadius:8,fontSize:12,alignItems:"center",marginBottom:3,border:"1px solid "+(color?color+"20":C.bl),borderLeft:color?"3px solid "+color:"1px solid "+C.bl}}>
                            <span style={{color:C.ac,fontFamily:"monospace",fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.ic}</span>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.desc}</span>
                            <span style={{textAlign:"right",color:C.tm,fontWeight:600}}>x{it.qty}</span>
                            <span style={{color:C.tl,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.sup}</span>
                            <span style={{color:C.tl,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.fecha}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              };

              return(
                <div style={{background:C.cd,borderRadius:16,border:"1px solid "+C.bd,boxShadow:C.sh,marginTop:16,padding:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
                    <div>
                      <div style={{fontSize:11,color:C.tl,letterSpacing:1,fontWeight:500}}>ITEMS POR PERIODO</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                        <div style={{width:10,height:10,borderRadius:5,background:p.color}}/>
                        <span style={{fontSize:16,fontWeight:600,color:p.color}}>{p.label}</span>
                        <span style={{fontSize:13,color:C.tm}}>({filtered.length} items)</span>
                      </div>
                      {p.hasCritico&&(
                        <div style={{display:"flex",gap:8,marginTop:6}}>
                          {critItems.length>0&&<span style={{fontSize:11,color:C.crit,fontWeight:600,background:C.crit+"12",padding:"2px 8px",borderRadius:4}}>Critico: {critItems.length}</span>}
                          {ncritItems.length>0&&<span style={{fontSize:11,color:C.ncrit,fontWeight:600,background:C.ncrit+"12",padding:"2px 8px",borderRadius:4}}>No Critico: {ncritItems.length}</span>}
                          {otherItems.length>0&&<span style={{fontSize:11,color:C.tl,fontWeight:500}}>Otros: {otherItems.length}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <select value={periodCcFilter} onChange={e=>setPeriodCcFilter(e.target.value)}
                        style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+C.bd,background:C.ca,fontSize:12,color:C.tx,cursor:"pointer",minWidth:180}}>
                        <option value="ALL">Todos los centros ({allPeriodItems.length})</option>
                        {ccList.map(cc=>{
                          const ccCnt=allPeriodItems.filter(i=>i.cc===cc).length;
                          return <option key={cc} value={cc}>{cc} ({ccCnt})</option>;
                        })}
                      </select>
                      <button onClick={()=>setPeriodDrill(null)} style={{padding:"6px 16px",background:C.ca,border:"1px solid "+C.bd,borderRadius:8,color:C.tm,fontSize:12,cursor:"pointer"}}>Cerrar</button>
                    </div>
                  </div>
                  <div style={{maxHeight:440,overflowY:"auto"}}>
                    {p.hasCritico?(
                      <>
                        {renderGroup(critItems,"CRITICO",C.crit)}
                        {renderGroup(ncritItems,"NO CRITICO",C.ncrit)}
                        {renderGroup(otherItems,null,null)}
                      </>
                    ):(
                      renderGroup(filtered,null,null)
                    )}
                    {filtered.length===0&&(
                      <div style={{textAlign:"center",padding:"24px 0",color:C.tl,fontSize:13}}>No hay items en este periodo</div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {view==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
            {CENTROS.map(cc=>{
              const ci=items.filter(i=>i.cc===cc);
              const av=ci.filter(i=>i.pk==="LISTO").length;
              const co=ci.filter(i=>i.pk==="COMPRAR").length;
              const cf=ci.filter(i=>i.pk==="CONF").length;
              const di=ci.filter(i=>i.pk==="DISC").length;
              const ho=ci.filter(i=>i.pk==="HOTEL").length;
              const en=ci.length-av-co-cf-di-ho;
              const crit=ci.filter(i=>i.rel==="CRITICO").length;
              return(
                <div key={cc} style={{background:C.cd,borderRadius:16,border:"1px solid "+C.bd,boxShadow:C.sh,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div style={{fontSize:14,fontWeight:600}}>{cc}</div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      {crit>0&&<span style={{fontSize:10,color:C.crit,fontWeight:700,background:C.crit+"12",padding:"2px 6px",borderRadius:4}}>C:{crit}</span>}
                      <span style={{fontSize:12,color:C.tm}}>{ci.length} items</span>
                    </div>
                  </div>
                  <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",background:C.bl,marginTop:14,gap:1}}>
                    {av>0&&<div style={{width:(av/ci.length*100)+"%",background:"#5B9A6F",borderRadius:2}}/>}
                    {en>0&&<div style={{width:(en/ci.length*100)+"%",background:"#6B9BC3",borderRadius:2}}/>}
                    {co>0&&<div style={{width:(co/ci.length*100)+"%",background:"#D48A6A",borderRadius:2}}/>}
                    {cf>0&&<div style={{width:(cf/ci.length*100)+"%",background:"#8E99A4",borderRadius:2}}/>}
                    {di>0&&<div style={{width:(di/ci.length*100)+"%",background:"#7A6B8A",borderRadius:2}}/>}
                    {ho>0&&<div style={{width:(ho/ci.length*100)+"%",background:"#6B8A7A",borderRadius:2}}/>}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,flexWrap:"wrap",gap:4}}>
                    <span style={{color:"#5B9A6F"}}>{av} disp.</span>
                    <span style={{color:"#6B9BC3"}}>{en} en ruta</span>
                    <span style={{color:"#D48A6A"}}>{co} x comprar</span>
                    <span style={{color:"#8E99A4"}}>{cf} x conf.</span>
                    {di>0&&<span style={{color:"#7A6B8A"}}>{di} desc.</span>}
                    {ho>0&&<span style={{color:"#6B8A7A"}}>{ho} hotel</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{padding:"16px 32px",textAlign:"center",fontSize:10,color:C.tl,borderTop:"1px solid "+C.bd,marginTop:20}}>St. Regis Costa Mujeres | OSE Pre-Opening Inventory</div>
    </div>
  );
}
