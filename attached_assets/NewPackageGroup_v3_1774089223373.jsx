import { useState, useRef, useEffect } from "react";

/* ─── DATA ───────────────────────────────────────────────────── */
const COUNTRIES = [
  {code:"AU",flag:"🇦🇺",label:"Australia", currency:"AUD",symbol:"A$"},
  {code:"PH",flag:"🇵🇭",label:"Philippines",currency:"PHP",symbol:"₱"},
  {code:"SG",flag:"🇸🇬",label:"Singapore",  currency:"SGD",symbol:"S$"},
  {code:"TH",flag:"🇹🇭",label:"Thailand",   currency:"THB",symbol:"฿"},
  {code:"KR",flag:"🇰🇷",label:"South Korea",currency:"KRW",symbol:"₩"},
  {code:"JP",flag:"🇯🇵",label:"Japan",      currency:"JPY",symbol:"¥"},
  {code:"US",flag:"🇺🇸",label:"USA",        currency:"USD",symbol:"$"},
  {code:"GB",flag:"🇬🇧",label:"United Kingdom",currency:"GBP",symbol:"£"},
  {code:"NZ",flag:"🇳🇿",label:"New Zealand",currency:"NZD",symbol:"NZ$"},
  {code:"CA",flag:"🇨🇦",label:"Canada",     currency:"CAD",symbol:"CA$"},
];

const CUR = [
  {key:"priceAud",label:"AUD",symbol:"A$", flag:"🇦🇺"},
  {key:"pricePhp",label:"PHP",symbol:"₱",  flag:"🇵🇭"},
  {key:"priceSgd",label:"SGD",symbol:"S$", flag:"🇸🇬"},
  {key:"priceThb",label:"THB",symbol:"฿",  flag:"🇹🇭"},
  {key:"priceKrw",label:"KRW",symbol:"₩",  flag:"🇰🇷"},
  {key:"priceJpy",label:"JPY",symbol:"¥",  flag:"🇯🇵"},
  {key:"priceUsd",label:"USD",symbol:"$",  flag:"🇺🇸"},
  {key:"priceGbp",label:"GBP",symbol:"£",  flag:"🇬🇧"},
];

const AGE_GROUPS = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","Age 6-8","Age 9-11","Age 12-14","Age 15-17","Age 18+","Adult","All Ages"];

const EP = {
  name:"Package A", durationNights:"", durationDays:"",
  maxParticipants:"", descriptionEn:"",
  includesAccommodation:false, includesTransport:false, includesTours:false,
  priceAud:"",pricePhp:"",priceSgd:"",priceThb:"",priceKrw:"",priceJpy:"",priceUsd:"",priceGbp:""
};

const EF = {
  nameEn:"", nameKo:"", nameJa:"", nameTh:"",
  descriptionEn:"",
  location:"", countryCode:"AU",
  minAge:"", maxAge:"",
  startDate:"", endDate:"",
  duration:"",
  inclusions:[], exclusions:[],
  coordinator:{ name:"", email:"", company:"" },
  status:"draft", sortOrder:0, landingPageOrder:"",
  thumbnailUrl:"",
  packages:[{...EP}],
  enrollmentSpots:[],
  interviewRequired:false, interviewFormat:"online", interviewDuration:30, interviewNotes:"",
};

/* ─── AI SYSTEM PROMPT ───────────────────────────────────────── */
const SYS = `You are an expert data extractor for educational camp programs.
Analyze a camp program URL and extract ALL information into a precise JSON object.

RULES:
1. Return ONLY raw JSON — no markdown, no backticks, no explanation
2. Detect source language. ALWAYS write nameEn and descriptionEn in English (translate if needed)
3. Leave nameKo, nameJa, nameTh as empty string "" — they will be translated separately
4. Duration format: "14 nights 15 days" (always English)
5. Inclusions: array of strings listing what is included (flights, meals, accommodation, etc.)
6. Exclusions: array of strings listing what is NOT included
7. Extract ALL package tiers with multi-currency pricing
8. For pricing: if only one currency listed, approximate others (1USD=1.55AUD, 1GBP=2AUD, 1000KRW=1.1AUD)
9. Enrollment spots: extract grade/age groups with capacities. Infer if not stated.
10. startDate and endDate: ISO format YYYY-MM-DD. If only season mentioned (e.g. "Summer 2025"), use approximate dates.

Required JSON structure:
{
  "detectedLang": "en",
  "nameEn": "Program name in English",
  "nameKo": "", "nameJa": "", "nameTh": "",
  "descriptionEn": "2-3 sentence description in English",
  "location": "City, Country",
  "countryCode": "AU",
  "minAge": 12,
  "maxAge": 17,
  "startDate": "2025-07-01",
  "endDate": "2025-08-31",
  "duration": "14 nights 15 days",
  "inclusions": ["International flights", "Airport transfers", "Accommodation", "Meals"],
  "exclusions": ["Personal expenses", "Travel insurance", "Visa fees"],
  "coordinator": { "name": "", "email": "", "company": "" },
  "thumbnailUrl": "",
  "packages": [
    {
      "name": "Package A",
      "durationNights": 14, "durationDays": 15,
      "maxParticipants": 20,
      "descriptionEn": "2-week intensive English program",
      "includesAccommodation": true, "includesTransport": false, "includesTours": true,
      "priceAud": 3200, "priceUsd": 2100, "priceKrw": 2800000,
      "priceJpy": 320000, "priceThb": 75000, "pricePhp": 120000,
      "priceSgd": 2800, "priceGbp": 1600
    }
  ],
  "enrollmentSpots": [
    { "gradeLabel": "Grade 7", "totalSpots": 15, "filledSpots": 0 },
    { "gradeLabel": "Grade 8", "totalSpots": 15, "filledSpots": 0 }
  ],
  "interviewRequired": false,
  "interviewFormat": "online",
  "interviewDuration": 30,
  "interviewNotes": "",
  "confidence": {
    "name": "high", "description": "high", "packages": "medium",
    "pricing": "medium", "location": "high", "dates": "medium", "enrollment": "low"
  }
}`;

/* ─── API ────────────────────────────────────────────────────── */
async function callAI(msg, sys) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:3000,
      system: sys || SYS,
      messages:[{role:"user", content:msg}]
    })
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return (await r.json()).content[0].text;
}
function pj(raw) {
  let s = raw.trim().replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
  const a=s.indexOf("{"), b=s.lastIndexOf("}");
  if (a!==-1&&b!==-1) s=s.slice(a,b+1);
  return JSON.parse(s);
}

/* ─── MAIN ───────────────────────────────────────────────────── */
export default function App() {
  const [url,setUrl]     = useState("");
  const [form,setForm]   = useState({...EF, packages:[{...EP}], inclusions:[], exclusions:[], enrollmentSpots:[], coordinator:{name:"",email:"",company:""}});
  const [tab,setTab]     = useState("general");
  const [ais,setAis]     = useState("idle");
  const [logs,setLogs]   = useState([]);
  const [saved,setSaved] = useState(false);
  const [xlat,setXlat]   = useState(null);
  const [conf,setConf]   = useState({});
  const [toast,setToast] = useState("");
  const [diff,setDiff]   = useState(null);
  const [newInc,setNewInc] = useState("");
  const [newExc,setNewExc] = useState("");
  const lr = useRef(null);

  useEffect(()=>{ lr.current?.scrollTo(0,9999); },[logs]);

  const log = (m,t="i") => setLogs(p=>[...p,{m,t,ts:new Date().toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}]);
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const updC = (k,v) => setForm(p=>({...p, coordinator:{...p.coordinator,[k]:v}}));
  const updP = (i,k,v) => setForm(p=>({...p, packages:p.packages.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const showT = m => { setToast(m); setTimeout(()=>setToast(""),3000); };

  /* AI Extract */
  const doExtract = async () => {
    if (!url.trim()||ais==="loading") return;
    setAis("loading"); setLogs([]); setDiff(null);
    log("Analyzing URL...");
    log("Extracting program data...");
    try {
      const raw = await callAI(
        `Analyze this camp program URL and extract ALL data including packages, pricing in all currencies, inclusions, exclusions, enrollment spots, and dates.\nURL: ${url}`
      );
      const d = pj(raw);
      const ex = {
        lang: (d.detectedLang||"en").toUpperCase(),
        pkgs: d.packages?.length||0,
        spots: d.enrollmentSpots?.length||0,
        incs: d.inclusions?.length||0,
        prices: d.packages?.filter(p=>p.priceAud||p.priceUsd).length||0,
      };
      setDiff(ex);
      log(`Language detected: ${ex.lang}`, "s");
      log(`Packages found: ${ex.pkgs} (${ex.prices} with pricing)`, "s");
      log(`Inclusions: ${ex.incs} items · Spots: ${ex.spots} groups`, "s");
      if (d.confidence) setConf(d.confidence);
      setForm(p=>({
        ...p, ...d,
        packages: d.packages?.length>0
          ? d.packages.map((x,i)=>({...EP,...x, name:x.name||`Package ${String.fromCharCode(65+i)}`}))
          : p.packages,
        inclusions: d.inclusions||[],
        exclusions: d.exclusions||[],
        enrollmentSpots: d.enrollmentSpots||[],
        coordinator: d.coordinator||p.coordinator,
      }));
      setAis("done");
      log("All fields auto-filled. Review and save.", "s");
    } catch(e) { setAis("error"); log(`Error: ${e.message}`, "e"); }
  };

  /* Translate */
  const doXlat = async (tl) => {
    setXlat(tl);
    const ln = {ko:"Korean",ja:"Japanese",th:"Thai"}[tl];
    log(`Translating to ${ln}...`);
    try {
      const raw = await callAI(
        `Translate to ${ln}. Return ONLY raw JSON.\n{"name":"${(form.nameEn||"").replace(/"/g,"'")}","description":"${(form.descriptionEn||"").replace(/"/g,"'")}"}`,
        `Translate educational program content to ${ln}. Return ONLY {"name":"...","description":"..."} raw JSON, no markdown.`
      );
      const tr = pj(raw);
      const sf = {ko:"Ko",ja:"Ja",th:"Th"}[tl];
      setForm(p=>({...p,[`name${sf}`]:tr.name||p[`name${sf}`],[`description${sf}`]:tr.description||p[`description${sf}`]}));
      log(`${ln} translation complete.`, "s");
    } catch(e) { log(`Translation error: ${e.message}`, "e"); }
    finally { setXlat(null); }
  };

  const cc = COUNTRIES.find(c=>c.code===form.countryCode)||COUNTRIES[0];
  const totalSpots = (form.enrollmentSpots||[]).reduce((s,x)=>s+(Number(x.totalSpots)||0),0);

  /* Styles */
  const inp = {width:"100%",height:36,padding:"0 10px",border:"1px solid #E2E0DC",borderRadius:6,fontSize:13,color:"#1C1917",outline:"none",boxSizing:"border-box",background:"#fff"};
  const ta  = {...inp,height:"auto",padding:"9px 10px",resize:"vertical"};
  const sec = {background:"#fff",border:"1px solid #E8E6E2",borderRadius:10,padding:"20px 24px",marginBottom:16};
  const sHead = {fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"#57534E",marginBottom:16};
  const row  = {display:"grid",gridTemplateColumns:"130px 1fr",alignItems:"center",paddingBottom:10,marginBottom:10,borderBottom:"1px solid #F4F3F1"};
  const rowLast = {display:"grid",gridTemplateColumns:"130px 1fr",alignItems:"center"};
  const lbl  = {fontSize:12,color:"#78716C"};

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#F5F4F1",minHeight:"100vh"}}>

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:14,right:14,background:"#1C1917",color:"#fff",padding:"9px 16px",borderRadius:8,fontSize:13,fontWeight:500,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>{toast}</div>}

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div style={{background:"#fff",borderBottom:"1px solid #E8E6E2",padding:"0 24px",position:"sticky",top:0,zIndex:10}}>
        <div style={{paddingTop:14,paddingBottom:4}}>
          <div style={{fontSize:12,color:"#A8A29E",marginBottom:4,cursor:"pointer"}}>← Package Groups</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                <span style={{fontSize:20,fontWeight:700,color:"#1C1917"}}>{form.nameEn||"New Package Group"}</span>
                <span style={{fontSize:11,padding:"2px 8px",background:form.status==="active"?"#DCFCE7":"#F4F3F1",color:form.status==="active"?"#16A34A":"#78716C",borderRadius:999,fontWeight:600}}>{form.status}</span>
              </div>
              <div style={{fontSize:12,color:"#78716C"}}>{[form.location,form.countryCode].filter(Boolean).join(" · ")||"Location · Country"}</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",paddingTop:4}}>
              {saved&&<span style={{fontSize:12,color:"#16A34A",fontWeight:500}}>✓ Saved</span>}
              <select value={form.status} onChange={e=>upd("status",e.target.value)} style={{height:34,padding:"0 10px",border:"1px solid #E8E6E2",borderRadius:7,fontSize:12,color:"#57534E",background:"#fff"}}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button onClick={()=>{setSaved(true);showT("Saved successfully! Use the Translate buttons to add other languages.");}} style={{height:34,padding:"0 18px",background:"#F5821F",color:"#fff",border:"none",borderRadius:7,fontSize:13,fontWeight:600,cursor:"pointer"}}>Save</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginTop:8}}>
          {["general","packages","enrollment","interview","products"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"9px 16px",border:"none",borderBottom:`2px solid ${tab===t?"#F5821F":"transparent"}`,background:"transparent",fontSize:13,fontWeight:tab===t?600:400,color:tab===t?"#F5821F":"#57534E",cursor:"pointer",textTransform:"capitalize",whiteSpace:"nowrap"}}>
              {t==="enrollment"?"Enrollment Spots":t==="general"?"General":t.charAt(0).toUpperCase()+t.slice(1)}
              {t==="packages"&&form.packages.length>0&&<span style={{fontSize:10,marginLeft:5,padding:"1px 5px",background:"#F4F3F1",borderRadius:999,color:"#78716C"}}>{form.packages.length}</span>}
              {t==="enrollment"&&totalSpots>0&&<span style={{fontSize:10,marginLeft:5,padding:"1px 5px",background:"#F4F3F1",borderRadius:999,color:"#78716C"}}>{totalSpots}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Strip ──────────────────────────────────────────────── */}
      <div style={{background:"linear-gradient(135deg,#1C1917 0%,#292524 100%)",padding:"14px 24px",borderBottom:"1px solid #000"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:13}}>✨</span>
            <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>AI Auto-fill</span>
            <span style={{fontSize:10,padding:"2px 8px",background:"rgba(245,130,31,0.25)",color:"#FDBA74",borderRadius:999,fontWeight:600}}>Gemini 2.5 Flash</span>
            <span style={{fontSize:11,color:"#78716C",marginLeft:4}}>Paste a program URL → all fields auto-filled including packages, pricing, inclusions & enrollment</span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doExtract()} placeholder="https://campsite.com/program-page" style={{flex:1,height:38,padding:"0 14px",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,color:"#fff",fontSize:13,outline:"none"}}/>
            <button onClick={doExtract} disabled={!url.trim()||ais==="loading"} style={{height:38,padding:"0 20px",background:ais==="loading"?"#7C2D12":"#F5821F",color:"#fff",border:"none",borderRadius:7,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
              {ais==="loading"?"Analyzing...":"Auto-fill from URL"}
            </button>
          </div>

          {/* Log + Diff */}
          {logs.length>0&&(
            <div ref={lr} style={{marginTop:10,background:"rgba(0,0,0,0.35)",borderRadius:6,padding:"7px 11px",maxHeight:72,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
              {logs.map((e,i)=>(
                <span key={i} style={{fontSize:10,color:e.t==="s"?"#86EFAC":e.t==="e"?"#FCA5A5":"#A8A29E"}}>
                  <span style={{opacity:0.5,marginRight:6}}>{e.ts}</span>{e.m}
                </span>
              ))}
            </div>
          )}
          {diff&&(
            <div style={{marginTop:8,display:"flex",gap:5,flexWrap:"wrap"}}>
              {[`🌐 ${diff.lang}`,`📦 ${diff.pkgs} packages`,`💰 ${diff.prices} priced`,`✓ ${diff.incs} inclusions`,`👥 ${diff.spots} spot groups`].map(b=>(
                <span key={b} style={{fontSize:10,padding:"2px 8px",background:"rgba(255,255,255,0.1)",color:"#E7E5E4",borderRadius:999}}>{b}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"20px 24px"}}>

        {/* ── GENERAL TAB ────────────────────────────────────────── */}
        {tab==="general"&&(
          <div>
            {/* Row 1: Basic Info + Settings */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

              {/* Basic Info */}
              <div style={sec}>
                <div style={sHead}>Basic Info</div>

                <div style={row}><span style={lbl}>Name (EN)</span><input value={form.nameEn} onChange={e=>upd("nameEn",e.target.value)} placeholder="Program name in English" style={inp}/></div>

                {/* KO / JA / TH with translate buttons */}
                {[{field:"Ko",lang:"ko",label:"Name (KO)",ph:"Korean name"},{field:"Ja",lang:"ja",label:"Name (JA)",ph:"Japanese name"},{field:"Th",lang:"th",label:"Name (TH)",ph:"Thai name"}].map(l=>(
                  <div key={l.field} style={row}>
                    <span style={lbl}>{l.label}</span>
                    <div style={{display:"flex",gap:6}}>
                      <input value={form[`name${l.field}`]} onChange={e=>upd(`name${l.field}`,e.target.value)} placeholder={saved?"":l.ph} style={{...inp,flex:1}}/>
                      {saved&&(
                        <button onClick={()=>doXlat(l.lang)} disabled={!!xlat} style={{height:36,padding:"0 10px",border:"1px solid #FDBA74",borderRadius:6,background:xlat===l.lang?"#F5821F":"#FEF0E3",color:xlat===l.lang?"#fff":"#92400E",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                          {xlat===l.lang?"...":"Translate"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div style={row}><span style={lbl}>Location</span><input value={form.location} onChange={e=>upd("location",e.target.value)} placeholder="Sydney, Australia" style={inp}/></div>
                <div style={row}>
                  <span style={lbl}>Country Code</span>
                  <select value={form.countryCode} onChange={e=>upd("countryCode",e.target.value)} style={inp}>
                    {COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code} — {c.label}</option>)}
                  </select>
                </div>
                <div style={row}><span style={lbl}>Min Age</span><input type="number" value={form.minAge} onChange={e=>upd("minAge",e.target.value)} placeholder="—" style={inp}/></div>
                <div style={row}><span style={lbl}>Max Age</span><input type="number" value={form.maxAge} onChange={e=>upd("maxAge",e.target.value)} placeholder="—" style={inp}/></div>
                <div style={row}><span style={lbl}>Start Date</span><input type="date" value={form.startDate} onChange={e=>upd("startDate",e.target.value)} style={inp}/></div>
                <div style={rowLast}><span style={lbl}>End Date</span><input type="date" value={form.endDate} onChange={e=>upd("endDate",e.target.value)} style={inp}/></div>
              </div>

              {/* Settings */}
              <div style={sec}>
                <div style={sHead}>Settings</div>
                <div style={row}>
                  <span style={lbl}>Status</span>
                  <select value={form.status} onChange={e=>upd("status",e.target.value)} style={{...inp,width:"auto"}}>
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
                <div style={row}><span style={lbl}>Sort Order</span><input type="number" value={form.sortOrder} onChange={e=>upd("sortOrder",e.target.value)} style={{...inp,width:80}}/></div>
                <div style={row}>
                  <span style={lbl}>Landing Page Order</span>
                  <span style={{fontSize:13,color:"#A8A29E"}}>{form.landingPageOrder||"Not shown on landing page"}</span>
                </div>

                {/* Thumbnail */}
                <div style={{marginTop:4}}>
                  <div style={{fontSize:12,color:"#78716C",marginBottom:8}}>Thumbnail</div>
                  {form.thumbnailUrl?(
                    <div style={{position:"relative"}}>
                      <img src={form.thumbnailUrl} alt="" style={{width:"100%",height:140,objectFit:"cover",borderRadius:8,border:"1px solid #E8E6E2",display:"block"}} onError={e=>{e.target.style.display="none";}}/>
                      <button onClick={()=>upd("thumbnailUrl","")} style={{position:"absolute",top:6,right:6,width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",cursor:"pointer",fontSize:12}}>×</button>
                    </div>
                  ):(
                    <div style={{border:"1.5px dashed #E2E0DC",borderRadius:8,height:140,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,background:"#FAFAF9",cursor:"pointer"}}>
                      <div style={{fontSize:28,opacity:0.3}}>🖼</div>
                      <span style={{fontSize:12,color:"#A8A29E"}}>Click to upload image</span>
                    </div>
                  )}
                  <input value={form.thumbnailUrl} onChange={e=>upd("thumbnailUrl",e.target.value)} placeholder="or paste image URL" style={{...inp,marginTop:8,fontSize:11}}/>
                  <div style={{fontSize:10,color:"#A8A29E",marginTop:4}}>Recommended: 1280×720px (16:9) · JPG/PNG/WebP · Max 10MB</div>
                </div>
              </div>
            </div>

            {/* Description (EN) */}
            <div style={sec}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={sHead}>Description (EN)</div>
                {conf.description&&<CB v={conf.description}/>}
              </div>
              <textarea value={form.descriptionEn} onChange={e=>upd("descriptionEn",e.target.value)} placeholder="An immersive English language program in Sydney. Students live with host families, attend local schools, and explore iconic Australian landmarks." rows={4} style={{...ta,fontSize:14,lineHeight:1.6}}/>
            </div>

            {/* Duration */}
            <div style={sec}>
              <div style={sHead}>Duration</div>
              <div style={{display:"grid",gridTemplateColumns:"130px 1fr",alignItems:"center"}}>
                <span style={lbl}>Duration</span>
                <input value={form.duration} onChange={e=>upd("duration",e.target.value)} placeholder="14 nights 15 days" style={inp}/>
              </div>
            </div>

            {/* Inclusions */}
            <div style={sec}>
              <div style={sHead}>Inclusions</div>
              {(form.inclusions||[]).length===0&&<p style={{fontSize:13,color:"#A8A29E",marginBottom:12}}>No inclusions added yet.</p>}
              <div style={{marginBottom:12}}>
                {(form.inclusions||[]).map((item,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #F4F3F1"}}>
                    <span style={{color:"#16A34A",fontWeight:700,fontSize:14}}>✓</span>
                    <span style={{flex:1,fontSize:13,color:"#1C1917"}}>{item}</span>
                    <button onClick={()=>upd("inclusions",form.inclusions.filter((_,j)=>j!==i))} style={{color:"#A8A29E",background:"none",border:"none",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <input value={newInc} onChange={e=>setNewInc(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newInc.trim()){upd("inclusions",[...(form.inclusions||[]),newInc.trim()]);setNewInc("");}}} placeholder="Add inclusion (press Enter)" style={{...inp,flex:1}}/>
                <button onClick={()=>{if(newInc.trim()){upd("inclusions",[...(form.inclusions||[]),newInc.trim()]);setNewInc("");}}} style={{height:36,padding:"0 14px",background:"#fff",border:"1px solid #E8E6E2",borderRadius:6,fontSize:13,cursor:"pointer",color:"#57534E"}}>Add</button>
              </div>
            </div>

            {/* Exclusions */}
            <div style={sec}>
              <div style={sHead}>Exclusions</div>
              {(form.exclusions||[]).length===0&&<p style={{fontSize:13,color:"#A8A29E",marginBottom:12}}>No exclusions added yet.</p>}
              <div style={{marginBottom:12}}>
                {(form.exclusions||[]).map((item,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #F4F3F1"}}>
                    <span style={{color:"#DC2626",fontWeight:700,fontSize:14}}>✕</span>
                    <span style={{flex:1,fontSize:13,color:"#1C1917"}}>{item}</span>
                    <button onClick={()=>upd("exclusions",form.exclusions.filter((_,j)=>j!==i))} style={{color:"#A8A29E",background:"none",border:"none",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <input value={newExc} onChange={e=>setNewExc(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newExc.trim()){upd("exclusions",[...(form.exclusions||[]),newExc.trim()]);setNewExc("");}}} placeholder="Add exclusion (press Enter)" style={{...inp,flex:1}}/>
                <button onClick={()=>{if(newExc.trim()){upd("exclusions",[...(form.exclusions||[]),newExc.trim()]);setNewExc("");}}} style={{height:36,padding:"0 14px",background:"#fff",border:"1px solid #E8E6E2",borderRadius:6,fontSize:13,cursor:"pointer",color:"#57534E"}}>Add</button>
              </div>
            </div>

            {/* Camp Coordinator */}
            <div style={sec}>
              <div style={sHead}>Camp Coordinator</div>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"#FEF0E3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🧑</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,flex:1}}>
                  <div>
                    <div style={{fontSize:10,color:"#A8A29E",marginBottom:4,fontWeight:500}}>NAME</div>
                    <input value={form.coordinator?.name||""} onChange={e=>updC("name",e.target.value)} placeholder="Camp Coordinator" style={inp}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#A8A29E",marginBottom:4,fontWeight:500}}>EMAIL</div>
                    <input type="email" value={form.coordinator?.email||""} onChange={e=>updC("email",e.target.value)} placeholder="coordinator@edubee.com" style={inp}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#A8A29E",marginBottom:4,fontWeight:500}}>COMPANY</div>
                    <input value={form.coordinator?.company||""} onChange={e=>updC("company",e.target.value)} placeholder="Dream Camp Co." style={inp}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PACKAGES TAB ───────────────────────────────────────── */}
        {tab==="packages"&&(
          <div>
            {conf.packages&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"8px 12px",background:"#E6F1FB",borderRadius:8,border:"1px solid #B5D4F4"}}><CB v={conf.packages}/><span style={{fontSize:12,color:"#185FA5"}}>AI-extracted packages — verify pricing before saving</span></div>}

            {form.packages.map((pkg,idx)=>(
              <div key={idx} style={{...sec,marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{width:32,height:32,borderRadius:"50%",background:"#FEF0E3",color:"#F5821F",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{String.fromCharCode(65+idx)}</span>
                    <input value={pkg.name} onChange={e=>updP(idx,"name",e.target.value)} style={{border:"none",outline:"none",fontSize:16,fontWeight:700,color:"#1C1917",background:"transparent"}}/>
                  </div>
                  {form.packages.length>1&&(
                    <button onClick={()=>setForm(p=>({...p,packages:p.packages.filter((_,i)=>i!==idx)}))} style={{fontSize:12,color:"#DC2626",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Remove</button>
                  )}
                </div>

                <div style={{display:"grid",gridTemplateColumns:"130px 1fr",alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:"1px solid #F4F3F1"}}>
                  <span style={lbl}>Description</span>
                  <input value={pkg.descriptionEn||""} onChange={e=>updP(idx,"descriptionEn",e.target.value)} placeholder="Brief package description" style={inp}/>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
                  <div><div style={{fontSize:11,color:"#78716C",marginBottom:4,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>Nights</div><input type="number" value={pkg.durationNights||""} onChange={e=>updP(idx,"durationNights",e.target.value)} placeholder="14" style={inp}/></div>
                  <div><div style={{fontSize:11,color:"#78716C",marginBottom:4,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>Days</div><input type="number" value={pkg.durationDays||""} onChange={e=>updP(idx,"durationDays",e.target.value)} placeholder="15" style={inp}/></div>
                  <div><div style={{fontSize:11,color:"#78716C",marginBottom:4,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>Max Participants</div><input type="number" value={pkg.maxParticipants||""} onChange={e=>updP(idx,"maxParticipants",e.target.value)} placeholder="20" style={inp}/></div>
                </div>

                <div style={{display:"flex",gap:8,marginBottom:16}}>
                  {[{k:"includesAccommodation",l:"Accommodation"},{k:"includesTransport",l:"Transport"},{k:"includesTours",l:"Day Tours"}].map(t=>(
                    <button key={t.k} onClick={()=>updP(idx,t.k,!pkg[t.k])} style={{padding:"5px 12px",border:`1px solid ${pkg[t.k]?"#F5821F":"#E8E6E2"}`,borderRadius:999,background:pkg[t.k]?"#FEF0E3":"#fff",color:pkg[t.k]?"#F5821F":"#57534E",fontSize:12,fontWeight:pkg[t.k]?600:400,cursor:"pointer"}}>
                      {pkg[t.k]?"✓ ":""}{t.l}
                    </button>
                  ))}
                </div>

                {/* Pricing */}
                <div style={{borderTop:"1px solid #F4F3F1",paddingTop:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#78716C"}}>Pricing</span>
                    {conf.pricing&&<CB v={conf.pricing}/>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                    {CUR.map(cur=>{
                      const ip = cc.currency===cur.label;
                      return (
                        <div key={cur.key} style={{border:`${ip?"2px":"1px"} solid ${ip?"#F5821F":"#E8E6E2"}`,borderRadius:8,padding:"8px 10px",background:ip?"#FEF0E3":"#fff",position:"relative"}}>
                          {ip&&<span style={{position:"absolute",top:-8,left:8,fontSize:9,background:"#F5821F",color:"#fff",padding:"1px 6px",borderRadius:999,fontWeight:700}}>Default</span>}
                          <div style={{fontSize:10,color:ip?"#D96A0A":"#A8A29E",marginBottom:4}}>{cur.flag} {cur.label}</div>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <span style={{fontSize:11,color:"#78716C",flexShrink:0}}>{cur.symbol}</span>
                            <input type="number" value={pkg[cur.key]||""} onChange={e=>updP(idx,cur.key,e.target.value)} placeholder="0" style={{width:"100%",border:"none",outline:"none",fontSize:ip?14:13,fontWeight:ip?700:400,color:"#1C1917",background:"transparent"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={()=>setForm(p=>({...p,packages:[...p.packages,{...EP,name:`Package ${String.fromCharCode(65+p.packages.length)}`}]}))} style={{width:"100%",padding:12,border:"2px dashed #E8E6E2",borderRadius:10,background:"#fff",color:"#57534E",fontSize:13,cursor:"pointer",fontWeight:500}}>
              + Add Package
            </button>
          </div>
        )}

        {/* ── ENROLLMENT SPOTS TAB ───────────────────────────────── */}
        {tab==="enrollment"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <p style={{fontSize:15,fontWeight:600,color:"#1C1917"}}>Enrollment Spots</p>
                <p style={{fontSize:12,color:"#78716C",marginTop:2}}>Total capacity: <strong>{totalSpots}</strong> spots across {form.enrollmentSpots.length} groups</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>upd("enrollmentSpots",[...(form.enrollmentSpots||[]),{gradeLabel:"",totalSpots:15,filledSpots:0}])} style={{padding:"7px 14px",background:"#F5821F",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Add Group</button>
                <button onClick={()=>upd("enrollmentSpots",["Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"].map(g=>({gradeLabel:g,totalSpots:15,filledSpots:0})))} style={{padding:"7px 14px",background:"#fff",border:"1px solid #E8E6E2",color:"#57534E",borderRadius:7,fontSize:12,cursor:"pointer"}}>Quick Setup (G7-12)</button>
              </div>
            </div>

            {conf.enrollment&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"8px 12px",background:"#FEF9C3",borderRadius:8,border:"1px solid #FDE047"}}><CB v={conf.enrollment}/><span style={{fontSize:12,color:"#78350F"}}>AI-estimated enrollment — update with actual capacity</span></div>}

            {(!form.enrollmentSpots||form.enrollmentSpots.length===0)?(
              <div style={{...sec,textAlign:"center",padding:"48px 24px"}}>
                <div style={{fontSize:40,marginBottom:12}}>📊</div>
                <p style={{fontSize:14,fontWeight:600,color:"#1C1917",marginBottom:6}}>No enrollment spots configured</p>
                <p style={{fontSize:12,color:"#78716C",marginBottom:20}}>Set capacity limits per grade or age group</p>
                <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                  <button onClick={()=>upd("enrollmentSpots",[{gradeLabel:"Grade 7",totalSpots:15,filledSpots:0}])} style={{padding:"9px 18px",background:"#F5821F",color:"#fff",border:"none",borderRadius:7,fontSize:13,cursor:"pointer"}}>+ Add Group</button>
                  <button onClick={()=>upd("enrollmentSpots",["Grade 7","Grade 8","Grade 9","Grade 10"].map(g=>({gradeLabel:g,totalSpots:15,filledSpots:0})))} style={{padding:"9px 18px",background:"#fff",border:"1px solid #E8E6E2",color:"#57534E",borderRadius:7,fontSize:13,cursor:"pointer"}}>Grade 7–10 Default</button>
                </div>
              </div>
            ):(
              <div style={sec}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 44px",gap:10,marginBottom:10,padding:"0 4px"}}>
                  {["Grade / Age Group","Total Spots","Filled",""].map((h,i)=>(
                    <div key={i} style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",color:"#A8A29E",textAlign:i===1||i===2?"center":undefined}}>{h}</div>
                  ))}
                </div>

                {(form.enrollmentSpots||[]).map((sp,i)=>{
                  const pct = sp.totalSpots>0 ? Math.min(100,Math.round((sp.filledSpots||0)/sp.totalSpots*100)) : 0;
                  return (
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 44px",gap:10,marginBottom:10,alignItems:"start"}}>
                      <div>
                        <input list={`ag-${i}`} value={sp.gradeLabel} onChange={e=>{const u=[...form.enrollmentSpots];u[i]={...u[i],gradeLabel:e.target.value};upd("enrollmentSpots",u);}} placeholder="Grade 7" style={inp}/>
                        <datalist id={`ag-${i}`}>{AGE_GROUPS.map(g=><option key={g} value={g}/>)}</datalist>
                      </div>
                      <input type="number" value={sp.totalSpots} onChange={e=>{const u=[...form.enrollmentSpots];u[i]={...u[i],totalSpots:Number(e.target.value)};upd("enrollmentSpots",u);}} style={{...inp,textAlign:"center"}}/>
                      <div>
                        <input type="number" value={sp.filledSpots||""} onChange={e=>{const u=[...form.enrollmentSpots];u[i]={...u[i],filledSpots:Number(e.target.value)};upd("enrollmentSpots",u);}} placeholder="0" style={{...inp,textAlign:"center",borderColor:pct>=90?"#DC2626":pct>=60?"#F5821F":"#E2E0DC"}}/>
                        <div style={{height:3,background:"#F0EFED",borderRadius:999,marginTop:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:pct>=90?"#DC2626":pct>=60?"#F5821F":"#16A34A",transition:"width 0.3s",borderRadius:999}}/>
                        </div>
                      </div>
                      <button onClick={()=>upd("enrollmentSpots",form.enrollmentSpots.filter((_,j)=>j!==i))} style={{width:40,height:36,background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA",borderRadius:7,cursor:"pointer",fontSize:16}}>×</button>
                    </div>
                  );
                })}

                <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #F4F3F1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"#78716C"}}>{form.enrollmentSpots.length} groups</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#1C1917"}}>Total: {totalSpots} spots</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── INTERVIEW TAB ──────────────────────────────────────── */}
        {tab==="interview"&&(
          <div style={sec}>
            <div style={sHead}>Interview Settings</div>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,paddingBottom:20,borderBottom:"1px solid #F4F3F1"}}>
              <span style={{fontSize:13,color:"#57534E"}}>Interview required</span>
              <button onClick={()=>upd("interviewRequired",!form.interviewRequired)} style={{width:44,height:24,borderRadius:999,border:"none",cursor:"pointer",background:form.interviewRequired?"#F5821F":"#D4D4D0",position:"relative",transition:"background 200ms"}}>
                <span style={{position:"absolute",top:2,left:form.interviewRequired?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 200ms",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
              </button>
              <span style={{fontSize:13,color:form.interviewRequired?"#F5821F":"#A8A29E",fontWeight:500}}>{form.interviewRequired?"Yes":"No"}</span>
            </div>

            {form.interviewRequired&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div>
                  <div style={{fontSize:11,color:"#78716C",marginBottom:6,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>Format</div>
                  <select value={form.interviewFormat} onChange={e=>upd("interviewFormat",e.target.value)} style={inp}>
                    <option value="online">Online (Zoom/Teams)</option>
                    <option value="video">Video Call</option>
                    <option value="phone">Phone</option>
                    <option value="in_person">In Person</option>
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#78716C",marginBottom:6,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>Duration (minutes)</div>
                  <input type="number" value={form.interviewDuration} onChange={e=>upd("interviewDuration",e.target.value)} style={inp}/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <div style={{fontSize:11,color:"#78716C",marginBottom:6,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>Notes for Applicants</div>
                  <textarea value={form.interviewNotes} onChange={e=>upd("interviewNotes",e.target.value)} rows={4} placeholder="Interview preparation notes..." style={ta}/>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS TAB ──────────────────────────────────────── */}
        {tab==="products"&&(
          <div style={{...sec,textAlign:"center",padding:"56px 24px"}}>
            <div style={{fontSize:40,marginBottom:14}}>📦</div>
            <p style={{fontSize:15,fontWeight:600,color:"#1C1917",marginBottom:6}}>Products</p>
            <p style={{fontSize:13,color:"#78716C"}}>Save the package group first, then add products here.</p>
          </div>
        )}

        {/* AI Confidence Footer */}
        {Object.keys(conf).length>0&&(
          <div style={{background:"#fff",border:"1px solid #E8E6E2",borderRadius:10,padding:"14px 20px",marginTop:4}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"#A8A29E",marginBottom:10}}>AI Extraction Confidence</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {Object.entries(conf).map(([k,v])=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"#FAFAF9",borderRadius:6,border:"1px solid #F0EFED"}}>
                  <span style={{fontSize:12,color:"#57534E"}}>{k}</span>
                  <CB v={v}/>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function CB({v}) {
  const m={high:{bg:"#DCFCE7",c:"#16A34A",t:"High"},medium:{bg:"#FEF9C3",c:"#CA8A04",t:"Medium"},low:{bg:"#FEF2F2",c:"#DC2626",t:"Low"}};
  const s=m[v]||m.low;
  return <span style={{fontSize:10,padding:"2px 7px",borderRadius:999,fontWeight:600,background:s.bg,color:s.c}}>{s.t}</span>;
}
