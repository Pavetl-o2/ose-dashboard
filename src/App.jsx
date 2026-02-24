import { RAW, CENTROS } from "./data.js";
import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import InventoryManager from "./InventoryManager.jsx";

const PERIODS=[
  {key:"LISTO",label:"Disponible",color:"#5B9A6F"},
  {key:"2026-02-L",label:"Feb 15-28",color:"#8B7FB5"},
  {key:"2026-03-E",label:"Mar 1-15",color:"#C4985A"},
  {key:"2026-03-L",label:"Mar 16-31",color:"#C47D5A"},
  {key:"2026-04",label:"Abril",color:"#BF6B6B"},
  {key:"2026-05",label:"Mayo",color:"#D4726A"},
  {key:"COMPRAR",label:"Por Comprar",color:"#D48A6A"},
  {key:"CONF",label:"Por Confirmar",color:"#8E99A4"},
];

function parse(r){return r.map((r,i)=>({id:i,code:r[0],cc:r[1],sup:r[2],ic:r[3],desc:r[4],qty:r[5],fecha:r[6],d2:r[7],ven:r[8],pk:r[9],pl:r[10]}));}

const C={bg:"#F4F3EF",cd:"#FFF",ca:"#F9F8F5",bd:"#E8E5DE",bl:"#F0EDE6",tx:"#2D3436",tm:"#828A8F",tl:"#A8AEB3",ac:"#5B9A6F",as:"#E8F0EA",go:"#B8965A",sh:"0 1px 3px rgba(0,0,0,.04)"};

export default function App(){
  const items=useMemo(()=>parse(RAW),[]);
  const [view,setView]=useState("timeline");
  const [drill,setDrill]=useState(null);
  const [entries,setEntries]=useState([]);

  const fetchEntries=useCallback(async()=>{
    if(!isSupabaseConfigured())return;
    try{
      const{data}=await supabase.from("inventory_entries").select("*");
      setEntries(data||[]);
    }catch(e){console.error(e);}
  },[]);
  useEffect(()=>{fetchEntries();},[fetchEntries]);
  // Re-fetch when switching to inventory view
  useEffect(()=>{if(view==="inventario")fetchEntries();},[view,fetchEntries]);

  // Build received map: "item_code|centro" -> total received
  const receivedMap=useMemo(()=>{
    const m={};
    entries.forEach(e=>{const k=e.item_code+"|"+e.centro_consumo;m[k]=(m[k]||0)+e.quantity_received;});
    return m;
  },[entries]);

  const tlData=useMemo(()=>{
    const g=new Map();
    CENTROS.forEach(n=>{
      const gi=items.filter(i=>i.cc===n);
      if(!gi.length)return;
      const b={};let t=0;
      PERIODS.forEach(p=>{const c=gi.filter(i=>i.pk===p.key).length;b[p.key]=c;t+=c;});
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
            <Pill active={view==="inventario"} onClick={()=>setView("inventario")}>Inventario</Pill>
          </div>
        </div>
        <div style={{fontSize:12,color:C.tl}}>Pre-apertura Feb 2026 | {items.length} items</div>
      </div>
      <div style={{padding:"20px 32px",maxWidth:1480,margin:"0 auto"}}>
        {view==="timeline"&&(
          <div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {PERIODS.map(p=>{
                const cnt=items.filter(i=>i.pk===p.key).length;
                return(
                  <div key={p.key} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:8,background:C.cd,border:"1px solid "+C.bl}}>
                    <div style={{width:8,height:8,borderRadius:4,background:p.color}}/>
                    <span style={{fontSize:11,color:C.tm,fontWeight:500}}>{p.label}</span>
                    <span style={{fontSize:10,color:C.tl}}>({cnt})</span>
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
                  return <div key={p.key} title={p.label+": "+cnt} style={{width:pct+"%",background:p.color,borderRadius:1}}/>;
                })}
              </div>
            </div>
            <div style={{background:C.cd,borderRadius:16,border:"1px solid "+C.bd,boxShadow:C.sh,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"210px 1fr",borderBottom:"1px solid "+C.bd,background:C.ca}}>
                <div style={{padding:"12px 20px",fontSize:12,fontWeight:600,color:C.tm,borderRight:"1px solid "+C.bd}}>Centro de Consumo</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat("+NP+",1fr)"}}>
                  {PERIODS.map(p=>(
                    <div key={p.key} style={{padding:"12px 4px",textAlign:"center",fontSize:10,fontWeight:600,color:p.color,borderRight:"1px solid "+C.bl}}>{p.label}</div>
                  ))}
                </div>
              </div>
              <div style={{maxHeight:520,overflowY:"auto"}}>
                {[...tlData.entries()].sort((a,b)=>b[1]._t-a[1]._t).map(([name,bk])=>{
                  const mx=Math.max(...PERIODS.map(p=>bk[p.key]||0),1);
                  return(
                    <div key={name} onClick={()=>setDrill(drill===name?null:name)}
                      style={{display:"grid",gridTemplateColumns:"210px 1fr",borderBottom:"1px solid "+C.bl,cursor:"pointer",background:drill===name?"#F0EDE6":"transparent"}}>
                      <div style={{padding:"12px 20px",borderRight:"1px solid "+C.bd,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                        <div style={{fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                        <div style={{fontSize:10,color:C.tl,marginTop:4}}>{bk._t} items</div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat("+NP+",1fr)",alignItems:"end",gap:2,padding:"8px 4px"}}>
                        {PERIODS.map(p=>{
                          const cnt=bk[p.key]||0;
                          const barH=cnt?Math.max(8,Math.min(36,cnt/mx*36)):0;
                          return(
                            <div key={p.key} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:44}}>
                              {cnt>0&&(
                                <>
                                  <div style={{fontSize:10,fontWeight:600,color:p.color,marginBottom:2}}>{cnt}</div>
                                  <div style={{width:"55%",height:barH,background:p.color+"30",borderRadius:4,border:"1px solid "+p.color+"50"}}/>
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
              <div style={{display:"grid",gridTemplateColumns:"210px 1fr",borderTop:"2px solid "+C.bd,background:C.ca}}>
                <div style={{padding:"12px 20px",fontSize:12,fontWeight:700,color:C.go,borderRight:"1px solid "+C.bd}}>TOTAL</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat("+NP+",1fr)"}}>
                  {PERIODS.map(p=>{
                    const t=items.filter(i=>i.pk===p.key).length;
                    return(
                      <div key={p.key} style={{textAlign:"center",padding:"10px 4px",borderRight:"1px solid "+C.bl}}>
                        <div style={{fontSize:15,fontWeight:700,color:p.color}}>{t}</div>
                        <div style={{fontSize:9,color:C.tl}}>{Math.round(t/items.length*100)}%</div>
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
                    return(
                      <div key={pk} style={{marginBottom:16}}>
                        <div style={{fontSize:12,fontWeight:600,color:p?p.color:C.tl,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:8,height:8,borderRadius:4,background:p?p.color:C.bd}}/>
                          {p?p.label:"Sin Info"} ({pi.length})
                        </div>
                        {pi.slice(0,10).map(it=>(
                          <div key={it.id} style={{display:"grid",gridTemplateColumns:"110px 1fr 50px 180px",gap:8,padding:"8px 12px",background:C.ca,borderRadius:8,fontSize:12,alignItems:"center",marginBottom:4,border:"1px solid "+C.bl}}>
                            <span style={{color:C.ac,fontFamily:"monospace",fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.ic}</span>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.desc}</span>
                            <span style={{textAlign:"right",color:C.tm,fontWeight:600}}>x{it.qty}</span>
                            <span style={{color:C.tl,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.fecha}</span>
                          </div>
                        ))}
                        {pi.length>10&&<div style={{fontSize:11,color:C.tl,padding:"4px 12px"}}>+ {pi.length-10} mas</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {view==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
            {CENTROS.map(cc=>{
              const ci=items.filter(i=>i.cc===cc);
              const av=ci.filter(i=>i.pk==="LISTO").length;
              const co=ci.filter(i=>i.pk==="COMPRAR").length;
              const cf=ci.filter(i=>i.pk==="CONF").length;
              const en=ci.length-av-co-cf;
              const totalQty=ci.reduce((s,i)=>s+i.qty,0);
              const recQty=ci.reduce((s,i)=>s+(receivedMap[i.ic+"|"+i.cc]||0),0);
              const recPct=totalQty>0?Math.round(recQty/totalQty*100):0;
              return(
                <div key={cc} style={{background:C.cd,borderRadius:16,border:"1px solid "+C.bd,boxShadow:C.sh,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div style={{fontSize:14,fontWeight:600}}>{cc}</div>
                    <div style={{fontSize:12,color:C.tm}}>{ci.length} items</div>
                  </div>
                  <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",background:C.bl,marginTop:14,gap:1}}>
                    {av>0&&<div style={{width:(av/ci.length*100)+"%",background:"#5B9A6F",borderRadius:2}}/>}
                    {en>0&&<div style={{width:(en/ci.length*100)+"%",background:"#6B9BC3",borderRadius:2}}/>}
                    {co>0&&<div style={{width:(co/ci.length*100)+"%",background:"#D48A6A",borderRadius:2}}/>}
                    {cf>0&&<div style={{width:(cf/ci.length*100)+"%",background:"#8E99A4",borderRadius:2}}/>}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11}}>
                    <span style={{color:"#5B9A6F"}}>{av} disp.</span>
                    <span style={{color:"#6B9BC3"}}>{en} en ruta</span>
                    <span style={{color:"#D48A6A"}}>{co} x comprar</span>
                    <span style={{color:"#8E99A4"}}>{cf} x conf.</span>
                  </div>
                  {entries.length>0&&(
                    <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid "+C.bl}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6}}>
                        <span style={{color:C.tm,fontWeight:500}}>Recepcion fisica</span>
                        <span style={{color:recPct>=100?C.ac:"#B8965A",fontWeight:600}}>{recPct}%</span>
                      </div>
                      <div style={{height:4,borderRadius:2,background:C.bl,overflow:"hidden"}}>
                        <div style={{width:recPct+"%",height:"100%",borderRadius:2,background:recPct>=100?"#5B9A6F":"#B8965A",transition:"width 0.3s"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10,color:C.tl}}>
                        <span>{recQty.toLocaleString()} recibidas</span>
                        <span>{(totalQty-recQty).toLocaleString()} pendientes</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {view==="inventario"&&(
          <InventoryManager items={items} centros={CENTROS}/>
        )}
      </div>
      <div style={{padding:"16px 32px",textAlign:"center",fontSize:10,color:C.tl,borderTop:"1px solid "+C.bd,marginTop:20}}>St. Regis Costa Mujeres | OSE Pre-Opening Inventory</div>
    </div>
  );
}
