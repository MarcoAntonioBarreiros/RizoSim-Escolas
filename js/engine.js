const C={POP0:80,MAX_POP:280,MIN_POP:12,FOOD_MAX:400,REPRO_E:8500,INIT_E:3200,VIT:4,FRIC:0.92,DRAG:0.75,EAT_R:10,PRED_R:12,
  DIGEST_TICKS:60,    /* ticks mínimos entre refeições */
  REPRO_COOL:300,     /* ticks de exaustão pós-reprodução */
  EXU_ENERGY:550      /* energia por partícula de exsudato */
};
/* Velocidade máxima rígida por tipo biológico (pixels/tick) */
const MAX_SPEED={bact:0.8,fungi:0.5,proto:1.2,nema:0.6};

/* Travas rígidas de tamanho baseadas no v17.2 */
const SIZE_LIMITS = {
  bact: { slMin:1.0, slMax:2.0, thMin:0.5, thMax:1.2, csMin:0.6, csMax:1.4, ndMin:2, ndMax:4 },
  fungi:{ slMin:1.2, slMax:2.2, thMin:0.6, thMax:1.5, csMin:0.8, csMax:1.6, ndMin:3, ndMax:6 },
  proto:{ slMin:1.4, slMax:2.5, thMin:1.0, thMax:1.8, csMin:1.0, csMax:1.8, ndMin:2, ndMax:5 },
  nema: { slMin:2.0, slMax:3.5, thMin:0.6, thMax:1.4, csMin:0.8, csMax:1.6, ndMin:5, ndMax:8 }
};
/* Hue fixo por guilda PGPB para identidade visual */
const PGPB_HUE={0:174,1:25,2:210,3:330,4:280,5:48,12:165};
const rng=(a,b)=>Math.random()*(b-a)+a,rI=(a,b)=>Math.floor(rng(a,b+1)),cl=(v,a,b)=>{var r=Math.max(a,Math.min(b,v));return r===r?r:a};
const hs=(h,s,l,a)=>`hsla(${h},${s}%,${l}%,${a})`,dst=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
function mm(Vmax,S,Km){return(Vmax*S)/(Km+S)}

let soil={organicC:800,NH4:45,NO3:35,PO4free:25,PO4bound:60,Fe3:60,Fe2:15,O2:75};
function resetSoil(){soil={organicC:800,NH4:45,NO3:35,PO4free:25,PO4bound:60,Fe3:60,Fe2:15,O2:75}}

/* ═══ GRADE ESPACIAL 2D — Nutrientes com difusão ═══ */
const GCELL=40; /* pixels por célula */
let gCols=15,gRows=10,grid=[],gridX0=0;
const SOIL_INIT={organicC:800,NH4:45,NO3:35,PO4free:25,PO4bound:60,Fe3:60,Fe2:15,O2:75};
/* Coeficientes de difusão (0-1): refletem mobilidade real no solo */
const DIFF={
  NH4:0.06,    /* adsorve em argilas, mobilidade média */
  NO3:0.22,    /* ânion livre, alta mobilidade (mass flow) */
  PO4free:0.006, /* quase imóvel! zona depleção ~1-2mm real */
  PO4bound:0.0,  /* fixado em partículas, não difunde */
  Fe2:0.035,   /* solúvel mas reativo */
  Fe3:0.01,    /* precipitado, quase imóvel */
  organicC:0.012, /* macromoléculas, difusão lenta */
  O2:0.18      /* gás dissolve rápido */
};
let showHeatmap='off'; /* 'off','NH4','NO3','PO4free','Fe2','organicC' */

function initGrid(){
  gCols=Math.ceil(worldWidth/GCELL);
  gRows=Math.ceil(worldDepth/GCELL);
  gridX0=wCx-worldWidth/2;
  grid=[];
  for(let c=0;c<gCols;c++){grid[c]=[];for(let r=0;r<gRows;r++){grid[c][r]={...SOIL_INIT}}}
}
function gcAt(wx,wy){
  /* Coordenadas mundo → célula da grade (clamped) */
  const col=cl(Math.floor((wx-gridX0)/GCELL),0,gCols-1);
  const row=cl(Math.floor((wy-gY)/GCELL),0,gRows-1);
  return grid[col][row];
}
function diffuseGrid(){
  /* Laplaciano discreto: cada célula equaliza com vizinhos */
  const tmp=grid.map(col=>col.map(cell=>({...cell})));
  for(let c=0;c<gCols;c++){for(let r=0;r<gRows;r++){
    const me=tmp[c][r];const nb=[];
    if(c>0)nb.push(tmp[c-1][r]);if(c<gCols-1)nb.push(tmp[c+1][r]);
    if(r>0)nb.push(tmp[c][r-1]);if(r<gRows-1)nb.push(tmp[c][r+1]);
    const nn=nb.length;
    for(const k in DIFF){
      if(DIFF[k]===0)continue;
      let avg=0;for(const n of nb)avg+=n[k];avg/=nn;
      grid[c][r][k]=Math.max(0,me[k]+DIFF[k]*(avg-me[k]));
    }
  }}
}
function syncSoilFromGrid(){
  /* Média espacial → soil global para UI */
  const n=gCols*gRows;
  for(const k in SOIL_INIT)soil[k]=0;
  for(let c=0;c<gCols;c++)for(let r=0;r<gRows;r++)for(const k in SOIL_INIT)soil[k]+=grid[c][r][k];
  for(const k in SOIL_INIT)soil[k]/=n;
}
/* Mapa de presença radicular (recalculado cada tick) */
let rootCells=[];
function calcRootCells(growPct){
  rootCells=[];
  const latW=15+growPct*70; /* extensão lateral da rizosfera em px */
  for(let c=0;c<gCols;c++){for(let r=0;r<gRows;r++){
    const cx=gridX0+(c+0.5)*GCELL;
    const cy=gY+(r+0.5)*GCELL;
    if(cy<gY||cy>gY+rootDepth+10)continue;
    const dx=Math.abs(cx-wCx);
    if(dx>latW)continue;
    /* Presença radicular: maior perto do eixo e na superfície */
    const rp=(1-dx/latW)*(1-(cy-gY)/(rootDepth+10)*0.4);
    if(rp>0.01)rootCells.push({c,r,rp});
  }}
}

/* ═══ 13 GUILDAS: PGPBs + Micorriza + Arthrobotrys + Patógeno + Autotrófico + Predador + Herbívoro + Saprófito ═══ */
const GUILDS=[
{id:0,name:"Pseudomonas",fn:"Sideróforo Fe³⁺→Fe²⁺",color:"#20b2aa",ph:[6.0,8.0],tOpt:25,res:0.5,cost:1.2,Vmax_sid:4.0,Km_Fe3:15,gram:'neg',type:'bact',trophic:'chemo'},
{id:1,name:"Bacillus",fn:"Solub. Fosfato",color:"#f97316",ph:[5.0,9.0],tOpt:30,res:2.0,cost:1.5,Vmax_psol:3.5,Km_Pbound:20,gram:'pos',type:'bact',trophic:'chemo'},
{id:2,name:"Azospirillum",fn:"Fixação N₂ + AIA",color:"#4dabf7",ph:[6.0,7.5],tOpt:28,res:0.6,cost:2.0,Vmax_nfix:5.0,Km_Corg:25,Vmax_aia:2.0,Km_aia:10,gram:'neg',type:'bact',trophic:'chemo'},
{id:3,name:"Methylobact.",fn:"Fototrófico AIA",color:"#ff69b4",ph:[5.5,7.5],tOpt:30,res:1.5,cost:1.8,Vmax_aia:1.5,Km_aia:8,gram:'neg',type:'bact',trophic:'mixo'},
{id:4,name:"Trichoderma",fn:"Biocontrole",color:"#9b59b6",ph:[4.5,7.0],tOpt:25,res:1.2,cost:1.4,gram:'fun',type:'fungi',trophic:'pred'},
{id:5,name:"Rhizobium",fn:"Nódulo N₂",color:"#eab308",ph:[6.0,7.0],tOpt:26,res:0.4,cost:2.8,Vmax_nfix:8.0,Km_Corg:15,gram:'neg',type:'bact',trophic:'chemo'},
{id:6,name:"Patógeno",fn:"Oportunista",color:"#ef4444",ph:[4.0,9.0],tOpt:25,res:1.0,cost:0.9,Vmax_atk:3.0,Km_bio:30,gram:'neg',type:'bact',trophic:'para'},
/* ═══ NOVOS ═══ */
{id:7,name:"Cianobactéria",fn:"Fotossíntese + N₂",color:"#a3e635",ph:[6.5,8.5],tOpt:28,res:0.8,cost:1.6,gram:'neg',type:'bact',trophic:'photo',Vmax_photo:6.0,Km_light:30,Vmax_nfix:3.0,Km_Corg:35},
{id:8,name:"Protozoário",fn:"Predador bactérias",color:"#fbbf24",ph:[5.0,8.0],tOpt:25,res:1.0,cost:0.7,gram:'none',type:'proto',trophic:'pred',Vmax_pred:4.0,Km_prey:15},
{id:9,name:"Nematóide",fn:"Herbívoro raízes",color:"#fb923c",ph:[4.5,8.5],tOpt:25,res:1.5,cost:0.5,gram:'none',type:'nema',trophic:'herb',Vmax_herb:3.0,Km_root:20},
{id:10,name:"Saprófito",fn:"Decompositor C org",color:"#a78bfa",ph:[4.0,8.0],tOpt:28,res:1.8,cost:1.0,gram:'none',type:'fungi',trophic:'sapro',Vmax_dec:5.0,Km_Corg:40},
{id:11,name:"Micorriza",fn:"Extensão raízes P",color:"#d4d4d8",ph:[5.0,7.5],tOpt:24,res:1.0,cost:1.6,gram:'none',type:'fungi',trophic:'myco',Vmax_psol:2.0,Km_Pbound:12},
{id:12,name:"Arthrobotrys",fn:"Nematófago (armadilha)",color:"#2dd4bf",ph:[5.0,7.5],tOpt:25,res:1.0,cost:1.3,gram:'none',type:'fungi',trophic:'pred',Vmax_trap:3.5,Km_nema:10}];

/* Configuração de tamanho por tipo biológico — ranges originais ricos */
/*const SIZE_LIMITS = {
  bact: { slMin:1.25, slMax:2.5, thMin:0.5, thMax:1.5, csMin:0.75, csMax:1.75, ndMin:2, ndMax:4 },
  fungi:{ slMin:1.5,  slMax:3.0, thMin:0.6, thMax:1.75, csMin:1.0,  csMax:2.0,  ndMin:2, ndMax:4.5 },
  proto:{ slMin:1.75, slMax:3.5, thMin:1.0, thMax:2.25, csMin:1.25, csMax:2.25, ndMin:2, ndMax:5 },
  nema: { slMin:1.5,  slMax:3.0, thMin:0.5, thMax:1.5, csMin:0.75, csMax:1.75, ndMin:2.5, ndMax:5 }
/*};
/* Morfologias por guilda:
   PGPBs → formas características para identificação visual
   Não-PGPBs → diversidade completa para variedade ecológica
   0=Sinuoso 1=Radial 2=Ramificado 3=Planária 4=Cefalópode 5=Artrópode 6=Ameboide */
/* Ameboide: o custo de manutenção usa o nº médio de pontos que as morfologias antigas do
   protozoário teriam com o mesmo gene nd, e o impulso usa o fator médio delas (planária 1,4;
   cefalópode e artrópode 1,0) — assim a troca de corpo não muda a ecologia. */
const AMO_SPD=1.133;
/* O corpo antigo arrastava ossos e patas (arrasto viscoso extra); o ameboide tem um só ponto
   de massa, então recebe atrito equivalente para manter a velocidade média original. */
const AMO_FRIC=0.76;
/* Na caça o corpo antigo não acelerava (a cadeia de ossos freava a cabeça); o ameboide
   recebe um fator na caça para manter a mesma velocidade média perseguindo presas. */
const AMO_HUNT=0.62;
function amoCostPts(nd){const a=Math.max(3,Math.floor(nd/2));return (nd+6*a-1)/3}
const MORPH_GUILD={
  0:[0],      /* Pseudomonas: bacilo com flagelos */
  1:[0],      /* Bacillus: bacilo com esporo */
  2:[0],      /* Azospirillum: bacilo com flagelos */
  3:[0],      /* Methylobacterium: bacilo pink com flagelos */
  4:[2],      /* Trichoderma: ramificado hifas, púrpura, conídios nas pontas */
  5:[1],      /* Rhizobium: radial nódulo — NÃO MUDE */
  6:[0,1,2,3,4,5],  /* Patógeno: qualquer */
  7:[0,1,2,3],  /* Cianobactéria: filamentosa/colonial */
  8:[6],             /* Protozoário: ameboide (ameba-lite.js) — antes planária/cefalópode/artrópode [3,4,5] */
  9:[0],             /* Nematóide: sinuoso vermiforme */
  10:[2,4],          /* Saprófito: hifas ramif/cefal */
  11:[4],             /* Micorriza: tentáculos = hifas brancas */
  12:[2]              /* Arthrobotrys: ramificado = rede de armadilhas */
};

let env={soil:'loam',temp:25,ph:6.5,moist:60,tox:0,light:70,uv:15,visc:1.0,nutRet:1.0};
let plant={bio:50,n:35,p:30,fe:25,aia:10,stress:0,nodules:[],limitFactor:'—',sig:{flav:0,orgA:0,SA:0}};

function updEnv(){env.temp=+document.getElementById('rT').value;env.ph=+document.getElementById('rPH').value;env.moist=+document.getElementById('rM').value;env.tox=+document.getElementById('rTX').value;env.light=+document.getElementById('rLI').value;env.uv=+document.getElementById('rUV').value;
document.getElementById('vT').textContent=env.temp+'°C';document.getElementById('vPH').textContent=env.ph.toFixed(1);document.getElementById('vM').textContent=env.moist+'%';document.getElementById('vTX').textContent=env.tox+'%';document.getElementById('vLI').textContent=env.light+'%';document.getElementById('vUV').textContent=env.uv+'%';updSoilP()}
function setSoil(t){env.soil=t;['sSandy','sLoam','sClay'].forEach(id=>document.getElementById(id).classList.remove('act'));document.getElementById(t==='sandy'?'sSandy':t==='clay'?'sClay':'sLoam').classList.add('act');updSoilP()}
function updSoilP(){const bv=env.soil==='sandy'?0.8:env.soil==='clay'?1.4:1.0;env.nutRet=env.soil==='sandy'?0.6:env.soil==='clay'?1.3:1.0;env.visc=env.moist<40?bv*(1+(40-env.moist)*0.08):bv}

/* Luz decai exponencialmente com profundidade */
function lightAt(y){const depth=Math.max(0,y-gY);return env.light*Math.exp(-0.012*depth)/100}
function uvAt(y){const depth=Math.max(0,y-gY);return env.uv*Math.exp(-0.025*depth)/100}
function exudateConc(x,y){const dX=Math.abs(x-wCx);const dY=Math.max(0,y-gY);return Math.exp(-0.02*Math.sqrt(dX*dX+dY*0.1*dY))}

class SH{constructor(cs){this.cs=cs;this.g=new Map()}clear(){this.g.clear()}ins(o){const k=`${Math.floor(o.x/this.cs)},${Math.floor(o.y/this.cs)}`;if(!this.g.has(k))this.g.set(k,[]);this.g.get(k).push(o)}qry(x,y){let R=[],ci=Math.floor(x/this.cs),cj=Math.floor(y/this.cs);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const it=this.g.get(`${ci+dx},${cj+dy}`);if(it)R.push(...it)}return R}cnt(x,y){let n=0,ci=Math.floor(x/this.cs),cj=Math.floor(y/this.cs);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const it=this.g.get(`${ci+dx},${cj+dy}`);if(it)n+=it.length}return n}}

class VP{constructor(x,y){this.x=x;this.y=y;this.ox=x+rng(-.15,.15);this.oy=y+rng(-.15,.15)}step(fr){const vx=(this.x-this.ox)*fr,vy=(this.y-this.oy)*fr;this.ox=this.x;this.oy=this.y;this.x+=vx;this.y+=vy}get vx(){return this.x-this.ox}get vy(){return this.y-this.oy}push(ax,ay){this.ox-=ax;this.oy-=ay}}

/* ═══ GENOMA — tamanho limitado por tipo biológico ═══ */
function mkG(fg = -1){
  const weights=[10,9,9,5,5,7,5,7,12,6,7,6,4];
  let guild = 0;
  
  /* Se um ID de guilda foi passado na inoculação, força a criação dele */
  if (fg >= 0 && fg <= 12) {
    guild = fg;
  } else {
    /* Seleção aleatória original para nascimentos normais */
    const total=weights.reduce((a,b)=>a+b,0);
    let r=Math.random()*total;
    for(let i=0;i<weights.length;i++){r-=weights[i];if(r<=0){guild=i;break}}
  }
  
  const gd=GUILDS[guild],tp=gd.type,sz=SIZE_LIMITS[tp];
  const morphs=MORPH_GUILD[guild];
  const mt=morphs[Math.floor(Math.random()*morphs.length)];
  
  const isWild=guild>=6;
  const ndMin=isWild?Math.max(3,sz.ndMin):sz.ndMin;
  const ndMax=isWild?Math.min(12,sz.ndMax+3):sz.ndMax;
  const slMin=isWild?sz.slMin:sz.slMin;
  const slMax=isWild?sz.slMax*1.3:sz.slMax;
  const thMin=sz.thMin;const thMax=isWild?sz.thMax*1.2:sz.thMax;
  const csMin=sz.csMin;const csMax=isWild?sz.csMax*1.2:sz.csMax;
  
  let fi={nfix:rng(0,0.2),psol:rng(0,0.2),sid:rng(0,0.2),aia:rng(0,0.2),bioctl:rng(0,0.15),pathog:rng(0,0.1),photo:0,pred:rng(0,0.1),herb:0,sapro:rng(0,0.15)};
  if(guild===0)fi.sid=rng(0.5,1.0);else if(guild===1)fi.psol=rng(0.5,1.0);else if(guild===2){fi.nfix=rng(0.4,0.8);fi.aia=rng(0.2,0.5)}else if(guild===3)fi.aia=rng(0.4,0.8);else if(guild===4)fi.bioctl=rng(0.5,1.0);else if(guild===5)fi.nfix=rng(0.6,1.0);else if(guild===6)fi.pathog=rng(0.5,1.0);else if(guild===7){fi.photo=rng(0.5,1.0);fi.nfix=rng(0.2,0.5)}else if(guild===8)fi.pred=rng(0.6,1.0);else if(guild===9)fi.herb=rng(0.6,1.0);else if(guild===10)fi.sapro=rng(0.6,1.0);else if(guild===11)fi.psol=rng(0.4,0.8);else if(guild===12)fi.bioctl=rng(0.5,1.0);
  const fiVals=Object.values(fi);const fiTot=fiVals.reduce((a,b)=>a+b,0);if(fiTot>1.5){const s=1.5/fiTot;for(const k in fi)fi[k]*=s}
  
  const isPGPB=guild<=5||guild===11||guild===12;
  /* Micorriza: branco/cinza claro; outros PGPBs: hue fixo; selvagens: aleatório */
  let gHue,gSat,gLit;
  if(guild===11){gHue=rng(0,360);gSat=rng(0,8);gLit=rng(78,92)}
  else if(isPGPB){gHue=(PGPB_HUE[guild]+rng(-12,12)+360)%360;gSat=rng(70,95);gLit=rng(45,65)}
  else{gHue=rng(0,360);gSat=rng(55,95);gLit=rng(40,65)}
  
  return{mt,hue:gHue,sat:gSat,lit:gLit,
    nd:rI(ndMin,ndMax),sl:rng(slMin,slMax),th:rng(thMin,thMax),
    spd:tp==='nema'?rng(0.02,0.05):tp==='proto'?rng(0.03,0.07):rng(0.03,0.10),
    amp:tp==='nema'?rng(1,3):isWild?rng(1.5,5):rng(1.5,4),ps:rng(0.2,1.0),
    sR:tp==='nema'?rng(60,100):tp==='proto'?rng(50,80):rng(30,60),
    sW:rng(0.3,1.0),thr:rng(0.3,0.8),cs:rng(csMin,csMax),
    guild,tox:rng(0,0.35),eff:rng(0.7,1.3),mem:rng(0.3,0.8),fi}
}

/* ═══ SWIMMER ═══ */
/* ═══ SWIMMER — CONSTRUÇÃO E RENDERIZAÇÃO ORIGINAIS RICAS ═══ */
class Sw{
constructor(x,y,gn,gen=1){this.g=gn;this.e=C.INIT_E;this.gen=gen;this.age=0;this.alive=true;this.pts=[];this.bones=[];this.muscles=[];this.tentacles=[];this.core=null;this.spineCount=0;this.nodulated=false;this.nodOff={x:0,y:0};this.lastAte=0;this.reproCool=0;this._mk(x,y)}
_mk(x,y){const g=this.g;
if(g.mt===0){for(let i=0;i<g.nd;i++)this.pts.push(new VP(x-i*g.sl,y));this.core=this.pts[0];for(let i=0;i<g.nd-1;i++)this.bones.push({a:this.pts[i],b:this.pts[i+1],l:g.sl});for(let i=0;i<g.nd-2;i++)this.muscles.push({a:this.pts[i],b:this.pts[i+2],bl:g.sl*1.85,ph:i*g.ps})}
else if(g.mt===1){this.core=new VP(x,y);this.pts.push(this.core);const n=Math.max(4,g.nd),as=Math.PI*2/n;for(let i=0;i<n;i++)this.pts.push(new VP(x+Math.cos(i*as)*g.sl*1.8,y+Math.sin(i*as)*g.sl*1.8));for(let i=1;i<=n;i++){const nx=i===n?1:i+1;this.bones.push({a:this.pts[i],b:this.pts[nx],l:Math.hypot(this.pts[i].x-this.pts[nx].x,this.pts[i].y-this.pts[nx].y)})}for(let i=1;i<=n;i++)this.muscles.push({a:this.core,b:this.pts[i],bl:g.sl*1.8,ph:i*g.ps*0.5})}
else if(g.mt===2){this.core=new VP(x,y);this.pts.push(this.core);const nL=cl(Math.floor(g.nd/2),2,5),lL=cl(Math.floor(g.nd/nL),2,4),bases=[];for(let li=0;li<nL;li++){const ba=(li/nL)*Math.PI*2+rng(-.2,.2);let prev=this.core;for(let j=0;j<lL;j++){const pt=new VP(prev.x+Math.cos(ba)*g.sl,prev.y+Math.sin(ba)*g.sl);this.pts.push(pt);this.bones.push({a:prev,b:pt,l:g.sl});if(j>0)this.muscles.push({a:this.pts[this.pts.length-2],b:pt,bl:g.sl,ph:li*g.ps+j*.5});prev=pt}bases.push(this.pts[1+li*lL])}for(let i=0;i<bases.length;i++){const nx=bases[(i+1)%bases.length];const d=Math.hypot(bases[i].x-nx.x,bases[i].y-nx.y);if(d>0)this.bones.push({a:bases[i],b:nx,l:d})}}
else if(g.mt===3){const dN=g.sl*0.7;for(let i=0;i<g.nd;i++)this.pts.push(new VP(x-i*dN,y));this.core=this.pts[0];for(let i=0;i<g.nd-1;i++)this.bones.push({a:this.pts[i],b:this.pts[i+1],l:dN});for(let i=0;i<g.nd-2;i++)this.muscles.push({a:this.pts[i],b:this.pts[i+2],bl:dN*1.9,ph:-i*g.ps})}
else if(g.mt===4){this.core=new VP(x,y);this.pts.push(this.core);const nA=Math.max(3,Math.floor(g.nd/2)),aS=Math.PI*2/nA;for(let i=0;i<nA;i++){const arm=[];let prev=this.core;const a=i*aS,aL=g.sl*rng(0.7,1.3);for(let j=0;j<3;j++){const pt=new VP(prev.x+Math.cos(a)*aL,prev.y+Math.sin(a)*aL);this.pts.push(pt);arm.push(pt);this.muscles.push({a:prev,b:pt,bl:aL,ph:i*g.ps+j*0.3});prev=pt}this.tentacles.push(arm)}for(let i=0;i<this.tentacles.length;i++){const b1=this.tentacles[i][0],b2=this.tentacles[(i+1)%this.tentacles.length][0];this.bones.push({a:b1,b:b2,l:dst(b1,b2)})}}
else if(g.mt===6){this.core=new VP(x,y);this.pts.push(this.core);this.costPts=amoCostPts(g.nd);this.body=(typeof AmoebaBody!=='undefined')?new AmoebaBody(x,y,g):null}
else if(g.mt===5){this.spineCount=Math.max(3,Math.floor(g.nd/2));const sL=g.sl*0.8;for(let i=0;i<this.spineCount;i++)this.pts.push(new VP(x-i*sL,y));this.core=this.pts[0];for(let i=0;i<this.spineCount-1;i++)this.bones.push({a:this.pts[i],b:this.pts[i+1],l:sL});for(let i=0;i<this.spineCount-2;i++)this.muscles.push({a:this.pts[i],b:this.pts[i+2],bl:sL*1.9,ph:i*g.ps*0.3});const legL=g.sl*1.4;for(let i=0;i<this.spineCount-1;i++){const sp=this.pts[i],spN=this.pts[i+1];const dx=spN.x-sp.x,dy=spN.y-sp.y,a=Math.atan2(dy,dx);const pL=new VP(sp.x+Math.cos(a-Math.PI/2)*legL,sp.y+Math.sin(a-Math.PI/2)*legL);const pR=new VP(sp.x+Math.cos(a+Math.PI/2)*legL,sp.y+Math.sin(a+Math.PI/2)*legL);this.pts.push(pL,pR);this.bones.push({a:sp,b:pL,l:legL},{a:sp,b:pR,l:legL});this.muscles.push({a:pL,b:spN,bl:dst(pL,spN),ph:i*g.ps},{a:pR,b:spN,bl:dst(pR,spN),ph:i*g.ps+Math.PI})}}}
get x(){return this.core?this.core.x:0}get y(){return this.core?this.core.y:0}
hdg(){if(this.body)return this.body.heading;if(this.pts.length<2)return 0;if(this.g.mt===1||this.g.mt===4){const t=this.pts[Math.min(Math.floor(this.pts.length/2),this.pts.length-1)];return Math.atan2(this.core.y-t.y,this.core.x-t.x)}return Math.atan2(this.pts[0].y-this.pts[1].y,this.pts[0].x-this.pts[1].x)}

behave(fH, sH) {
  if (this.nodulated) return;
  if (this.reproCool > 0) this.reproCool--;
  const g = this.g, h = this.core;
  const gd = GUILDS[g.guild];

  /* Heading baseado em velocidade real (evita tremedeira) */
  const vx = h.x - h.ox, vy = h.y - h.oy;
  const hd = (vx*vx + vy*vy > 0.0001) ? Math.atan2(vy, vx) : this.hdg();

  /* ═══ FIX #1: Sensores com alcance REAL usando gene sR ═══ */
  const sD = Math.max(8, g.sR * 0.5);
  const lx = h.x + Math.cos(hd - 0.6) * sD, ly = h.y + Math.sin(hd - 0.6) * sD;
  const rx = h.x + Math.cos(hd + 0.6) * sD, ry = h.y + Math.sin(hd + 0.6) * sD;

  let lSmell = 0, rSmell = 0;
  const rootBottom = gY + rootDepth;
  const closestRY = cl(h.y, gY, rootBottom);
  const isPGPB = gid => (gid >= 0 && gid <= 5) || gid === 11 || gid === 12;

  if (gd.trophic === 'pred' || g.guild === 4 || g.guild === 12) {
    const near = sH.qry(h.x, h.y);
    for (const s of near) {
        if (!s.ref || s.ref === this || !s.ref.alive) continue;
        const prey = s.ref;
        const isP = g.guild === 4 ? (prey.g.guild === 6) : g.guild === 12 ? (prey.g.guild === 9) : (GUILDS[prey.g.guild].type === 'bact');
        if (isP) {
            lSmell += 6 / (Math.hypot(lx - prey.x, ly - prey.y) + 1);
            rSmell += 6 / (Math.hypot(rx - prey.x, ry - prey.y) + 1);
        }
    }
  } else if (g.guild === 6 || g.guild === 5 || g.guild === 9) {
    /* Patógeno, Rhizobium, Nematóide: atração forte pela raiz */
    const rootPull = g.guild === 9 ? 8 : 12;
    lSmell += rootPull / (Math.hypot(lx - wCx, ly - closestRY) + 1);
    rSmell += rootPull / (Math.hypot(rx - wCx, ry - closestRY) + 1);
  } else {
    /* Quimiotaxia por exsudatos */
    const nf = fH.qry(h.x, h.y);
    for (const f of nf) {
        lSmell += 3 / (Math.hypot(lx - f.x, ly - f.y) + 1);
        rSmell += 3 / (Math.hypot(rx - f.x, ry - f.y) + 1);
    }
    /* ═══ FIX #2: Sinal da planta PROPORCIONAL à deficiência — recrutamento específico de PGPBs ═══ */
    var _sb=0;
    if(g.guild===5)_sb=plant.sig.flav*14;        /* Rhizobium: N baixo → flavonoides */
    else if(g.guild===2)_sb=plant.sig.flav*10;    /* Azospirillum: N baixo → também responde */
    else if(g.guild===1)_sb=plant.sig.orgA*12;    /* Bacillus: P baixo → ácidos orgânicos */
    else if(g.guild===0)_sb=cl((100-plant.fe)/100,0,1)*10; /* Pseudomonas: Fe baixo → fitosideróforos */
    else if(g.guild===4)_sb=plant.sig.SA*15;      /* Trichoderma: patógenos → ác. salicílico */
    else if(g.guild===12)_sb=plant.sig.SA*12;     /* Arthrobotrys: nematóides → ác. salicílico */
    else if(g.guild===3)_sb=cl(plant.aia<20?(20-plant.aia)/20:0,0,1)*8; /* Methylo: AIA baixo */
    else if(g.guild===11)_sb=plant.sig.orgA*13;   /* Micorriza: P baixo → ácidos orgânicos (como Bacillus) */
    const rootSignal=(isPGPB(g.guild)?10:4)+_sb;
    const exG = exudateConc(h.x, h.y);
    lSmell += rootSignal * exG / (Math.hypot(lx - wCx, ly - closestRY) + 2);
    rSmell += rootSignal * exG / (Math.hypot(rx - wCx, ry - closestRY) + 2);
  }

  const viscMult = 1 / (env.visc || 1);
  const sM = viscMult * (gd.type === 'nema' ? 0.6 : gd.type === 'proto' ? 0.8 : gd.trophic === 'photo' ? 0.4 : 1.0);

  let steer = (lSmell - rSmell) * g.sW;
  steer = cl(steer, -0.4, 0.4);
  let moveAngle = hd - steer; 

  const totalSmell = lSmell + rSmell;
  const spdMult = (g.mt === 0 || g.mt === 3) ? 1.4 : g.mt === 6 ? AMO_SPD * (this.body ? this.body.drive : 1) : 1.0;

  /* Decisão: Caça vs Passeio */
  if (totalSmell > 0.05) {
      const brake = Math.max(0.4, 1 - (totalSmell * 0.08)); 
      const thrust = g.thr * 0.5 * sM * spdMult * brake * (this.body ? AMO_HUNT : 1); 
      h.ox -= Math.cos(moveAngle) * thrust;
      h.oy -= Math.sin(moveAngle) * thrust;
      h.ox -= Math.cos(moveAngle + Math.PI/2) * steer * 0.15 * brake;
      h.oy -= Math.sin(moveAngle + Math.PI/2) * steer * 0.15 * brake;
  } else {
      const w = hd + Math.sin(this.age * 0.02) * 0.5;
      h.ox -= Math.cos(w) * g.thr * 0.15 * sM * spdMult;
      h.oy -= Math.sin(w) * g.thr * 0.15 * sM * spdMult;
  }

  if (this.body) this.body.update(h, moveAngle, totalSmell > 0.05);

  /* Blindagem Verlet nos Músculos */
  for (const m of this.muscles) {
      const osc = Math.sin(this.age * g.spd * (0.5 + env.temp/50) + m.ph);
      const amp = (g.mt === 2) ? g.amp * 0.7 : g.amp;
      const tL = Math.max(m.bl * 0.2, m.bl + (osc * amp));
      const dx = m.b.x - m.a.x, dy = m.b.y - m.a.y, d = Math.hypot(dx, dy);
      if (d > .001) {
          const diff = cl((tL - d) / d * 0.5, -0.25, 0.25); 
          m.a.x -= dx * diff; m.a.y -= dy * diff;
          m.b.x += dx * diff; m.b.y += dy * diff;
      }
  }
}

physics() {
  if (this.nodulated) {
    const tx = wCx + this.nodOff.x, ty = gY + this.nodOff.y * (plant.bio / 100);
    const dx = tx - this.pts[0].x, dy = ty - this.pts[0].y;
    this.pts.forEach(p => { p.x += dx; p.y += dy; p.ox = p.x; p.oy = p.y; });
    this.age++; this.e += 12; return;
  }
  
  for (const p of this.pts) p.step(C.FRIC * (1 - ((env.visc - 1) * 0.1)) * (this.body ? AMO_FRIC : 1));
  const dV = (this.g.mt === 1 || this.g.mt === 4) ? 0.2 : C.DRAG;
  
  for (const b of this.bones) {
    const dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, len = Math.hypot(dx, dy);
    if (len < .001) continue;
    const nx = -dy / len, ny = dx / len;
    const vx = ((b.a.x - b.a.ox) + (b.b.x - b.b.ox)) * 0.5;
    const vy = ((b.a.y - b.a.oy) + (b.b.y - b.b.oy)) * 0.5;
    const dot = vx * nx + vy * ny;
    b.a.x -= nx * dot * dV; b.a.y -= ny * dot * dV;
    b.b.x -= nx * dot * dV; b.b.y -= ny * dot * dV;
  }
  
  for (let it = 0; it < C.VIT; it++) {
    for (const b of this.bones) {
      const dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, d = Math.hypot(dx, dy);
      if (d < .001) continue;
      const diff = cl((b.l - d) / d * 0.5, -0.25, 0.25); /* Trava Verlet Óssea */
      b.a.x -= dx * diff; b.a.y -= dy * diff;
      b.b.x += dx * diff; b.b.y += dy * diff;
    }
  }
  
  /* Borda suave e elástica — confinada ao worldWidth x worldDepth */
  const pad = this.g.cs + 2;
  const xMin = wCx - worldWidth/2 + pad, xMax = wCx + worldWidth/2 - pad;
  for (const p of this.pts) {
    if (p.x < xMin) { p.ox += (p.x - xMin)*0.5; p.x = xMin; }
    if (p.x > xMax) { p.ox += (p.x - xMax)*0.5; p.x = xMax; }
    if (p.y < gY + pad) { p.ox += (p.y - (gY + pad))*0.5; p.y = gY + pad; }
    if (p.y > gY + worldDepth) { p.ox += (p.y - (gY + worldDepth))*0.5; p.y = gY + worldDepth; }
  }
  
  this.age++;
  /* ═══ FIX #3: Velocidade máxima rígida por tipo biológico ═══ */
  const maxV = MAX_SPEED[GUILDS[this.g.guild].type] || 0.8;
  for (const p of this.pts) {
    const pvx = p.x - p.ox, pvy = p.y - p.oy;
    const spd = Math.hypot(pvx, pvy);
    if (spd > maxV) { const s = maxV / spd; p.ox = p.x - pvx * s; p.oy = p.y - pvy * s; }
  }
  const gd = GUILDS[this.g.guild];
  const tempStr = Math.abs(env.temp - gd.tOpt);
  let phStr = 0;
  if (env.ph < gd.ph[0]) phStr = gd.ph[0] - env.ph;
  if (env.ph > gd.ph[1]) phStr = env.ph - gd.ph[1];
  const uvDmg = uvAt(this.core.y) * (gd.trophic === 'photo' ? 1.5 : 1.0) * 2; /* ciano na superfície = mais UV */
  
  const envMult = 1 + ((tempStr * 0.06) + Math.pow(phStr, 1.4) + (env.tox * 0.003) + uvDmg) / gd.res;
  const fi = this.g.fi;
  const fiTot = Object.values(fi).reduce((a, b) => a + b, 0);
  const fiPen = fiTot > 1.2 ? 1 + (fiTot - 1.2) * 0.6 : 1;
  
  const baseCost = 0.25 + ((this.costPts || this.pts.length) * 0.012) + (this.g.spd * 1.2) + (this.age * 0.0001);
  const localDens = sHh.cnt(this.core.x, this.core.y);
  const compPen = localDens > 10 ? 1 + (localDens - 10) * 0.012 : 1;
  this.e -= (baseCost * gd.cost * envMult * fiPen * compPen);
}

draw(ctx,t){const g=this.g,gd=GUILDS[g.guild];const al=cl(this.e/1500,.2,.95);
const gc=gd.color;const col=hs(g.hue,g.sat,g.lit,al),colB=hs(g.hue,g.sat,g.lit+15,al);
ctx.lineCap="round";ctx.lineJoin="round";
if(g.mt===6&&this.body)this.body.draw(ctx,g,al,gc);
if(g.mt===0){const P=this.pts;if(P.length<2)return;for(let pass=0;pass<2;pass++){ctx.beginPath();ctx.moveTo(P[0].x,P[0].y);for(let i=0;i<P.length-1;i++){const xc=(P[i].x+P[i+1].x)/2,yc=(P[i].y+P[i+1].y)/2;ctx.quadraticCurveTo(P[i].x,P[i].y,xc,yc)}ctx.lineTo(P[P.length-1].x,P[P.length-1].y);ctx.strokeStyle=pass===0?gc:colB;ctx.lineWidth=pass===0?g.th:g.th*.35;ctx.globalAlpha=al;ctx.stroke()}ctx.beginPath();ctx.arc(P[0].x,P[0].y,g.cs,0,Math.PI*2);ctx.fillStyle=colB;ctx.globalAlpha=al;ctx.fill();const ea=this.hdg();ctx.beginPath();ctx.arc(P[0].x+Math.cos(ea)*g.cs*.5,P[0].y+Math.sin(ea)*g.cs*.5,cl(g.cs*.3,.5,1.8),0,Math.PI*2);ctx.fillStyle=`rgba(10,10,10,${al*.9})`;ctx.fill()}
else if(g.mt===1){const ring=this.pts.slice(1);if(ring.length<3)return;ctx.beginPath();ctx.moveTo(ring[0].x,ring[0].y);for(let i=0;i<ring.length;i++){const nx=ring[(i+1)%ring.length];ctx.quadraticCurveTo(ring[i].x,ring[i].y,(ring[i].x+nx.x)/2,(ring[i].y+nx.y)/2)}ctx.closePath();ctx.fillStyle=hs(g.hue,g.sat,g.lit,al*.3);ctx.globalAlpha=al;ctx.fill();ctx.strokeStyle=gc;ctx.lineWidth=g.th*.6;ctx.stroke();ctx.strokeStyle=hs(g.hue,g.sat,g.lit+10,al*.15);ctx.lineWidth=.5;for(const r of ring){ctx.beginPath();ctx.moveTo(this.core.x,this.core.y);ctx.lineTo(r.x,r.y);ctx.stroke()}const pulse=1+.2*Math.sin(t*.004+this.age*g.spd);ctx.beginPath();ctx.arc(this.core.x,this.core.y,g.cs*pulse,0,Math.PI*2);ctx.fillStyle=colB;ctx.fill();if(gd.trophic==='photo'){const gr=ctx.createRadialGradient(this.core.x,this.core.y,0,this.core.x,this.core.y,g.sl*2.5);gr.addColorStop(0,`hsla(120,80%,50%,${al*.1})`);gr.addColorStop(1,`hsla(120,80%,50%,0)`);ctx.fillStyle=gr;ctx.beginPath();ctx.arc(this.core.x,this.core.y,g.sl*2.5,0,Math.PI*2);ctx.fill()}}
else if(g.mt===2){for(const b of this.bones){const isC=b.a===this.core;ctx.beginPath();ctx.moveTo(b.a.x,b.a.y);ctx.lineTo(b.b.x,b.b.y);ctx.strokeStyle=isC?colB:gc;ctx.lineWidth=isC?g.th*1.2:g.th*.7;ctx.globalAlpha=al;ctx.stroke()}ctx.fillStyle=hs(g.hue,g.sat,g.lit+10,al*.6);for(const p of this.pts){if(p===this.core)continue;ctx.beginPath();ctx.arc(p.x,p.y,g.th*.35,0,Math.PI*2);ctx.fill()}ctx.beginPath();ctx.arc(this.core.x,this.core.y,g.cs*1.2,0,Math.PI*2);ctx.fillStyle=colB;ctx.globalAlpha=al;ctx.fill();if(gd.trophic==='pred'||g.guild===6){ctx.beginPath();ctx.arc(this.core.x,this.core.y,g.cs*.5,0,Math.PI*2);ctx.fillStyle=`hsla(0,70%,45%,${al*.7})`;ctx.fill()}}
else if(g.mt===3){const P=this.pts;if(P.length<2)return;for(let i=P.length-1;i>=0;i--){const pt=P[i],ref=(i===0)?P[1]:P[i-1];const angle=Math.atan2(ref.y-pt.y,ref.x-pt.x)+(i===0?Math.PI:0);const p=1-(i/P.length);const wX=Math.max(.5,(g.th*1.8)*(0.3+0.7*p)),wY=Math.max(.5,(g.th*1.1)*(0.3+0.7*p));ctx.beginPath();ctx.fillStyle=hs(g.hue,g.sat,25+30*p,al*.85);ctx.strokeStyle=gc;ctx.lineWidth=.8;ctx.globalAlpha=al;ctx.ellipse(pt.x,pt.y,wX,wY,angle,0,Math.PI*2);ctx.fill();ctx.stroke();if(i===0){const eOff=wX*0.5;ctx.fillStyle=gd.trophic==='photo'?"#34d399":gd.trophic==='pred'?"#ff4444":"#ffffff";ctx.beginPath();ctx.arc(pt.x+Math.cos(angle-0.5)*eOff,pt.y+Math.sin(angle-0.5)*eOff,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(pt.x+Math.cos(angle+0.5)*eOff,pt.y+Math.sin(angle+0.5)*eOff,1.5,0,Math.PI*2);ctx.fill()}}}
else if(g.mt===4){ctx.strokeStyle=gc;ctx.globalAlpha=al;for(const arm of this.tentacles){ctx.beginPath();ctx.lineWidth=Math.max(.5,g.guild===11?g.th*.4:g.th*.6);ctx.moveTo(this.core.x,this.core.y);for(let i=0;i<arm.length-1;i++){ctx.quadraticCurveTo(arm[i].x,arm[i].y,(arm[i].x+arm[i+1].x)/2,(arm[i].y+arm[i+1].y)/2)}ctx.lineTo(arm[arm.length-1].x,arm[arm.length-1].y);ctx.stroke();ctx.beginPath();ctx.arc(arm[arm.length-1].x,arm[arm.length-1].y,g.th*.15,0,Math.PI*2);ctx.fillStyle=gc;ctx.fill()}const mSz=g.guild===11?g.cs*0.8:g.cs*1.5;ctx.beginPath();ctx.arc(this.core.x,this.core.y,mSz,0,Math.PI*2);ctx.fillStyle=hs(g.hue,g.sat,g.lit,al*.6);ctx.fill();ctx.strokeStyle=colB;ctx.lineWidth=.8;ctx.stroke();if(g.guild!==11){const ea=this.hdg();ctx.fillStyle=gd.trophic==='pred'?"#ff4444":"#ffffff";ctx.beginPath();ctx.arc(this.core.x+Math.cos(ea)*mSz*.4,this.core.y+Math.sin(ea)*mSz*.4,Math.max(1,mSz*.25),0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(this.core.x+Math.cos(ea)*mSz*.4,this.core.y+Math.sin(ea)*mSz*.4,Math.max(.5,mSz*.12),0,Math.PI*2);ctx.fillStyle=`rgba(10,10,10,${al})`;ctx.fill()}}
else if(g.mt===5){const sc=this.spineCount;if(sc<2)return;for(let i=0;i<sc-1;i++){const p0=this.pts[i],p1=this.pts[i+1];const taper=1-(i/(sc-1))*0.5;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.strokeStyle=colB;ctx.lineWidth=g.th*1.3*taper;ctx.globalAlpha=al;ctx.stroke()}for(let i=0;i<sc;i++){const pt=this.pts[i];const ref=i<sc-1?this.pts[i+1]:this.pts[i-1];const angle=Math.atan2(ref.y-pt.y,ref.x-pt.x)+(i>=sc-1?Math.PI:0);const taper=1-(i/sc)*0.4;const wX=g.th*1.1*taper,wY=g.th*0.7*taper;ctx.beginPath();ctx.fillStyle=hs(g.hue,g.sat,30+20*(1-i/sc),al*.7);ctx.strokeStyle=gc;ctx.lineWidth=.6;ctx.globalAlpha=al;ctx.ellipse(pt.x,pt.y,wX,wY,angle,0,Math.PI*2);ctx.fill();ctx.stroke()}const legStart=sc;for(let i=0;i<sc-1;i++){const sp=this.pts[i];const pL=this.pts[legStart+i*2],pR=this.pts[legStart+i*2+1];if(!pL||!pR)continue;ctx.strokeStyle=hs(g.hue,g.sat,g.lit+10,al*.8);ctx.lineWidth=Math.max(.5,g.th*.35);ctx.globalAlpha=al;ctx.beginPath();ctx.moveTo(sp.x,sp.y);ctx.lineTo(pL.x,pL.y);ctx.stroke();ctx.beginPath();ctx.moveTo(sp.x,sp.y);ctx.lineTo(pR.x,pR.y);ctx.stroke();ctx.fillStyle=gc;ctx.beginPath();ctx.arc(pL.x,pL.y,g.th*.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(pR.x,pR.y,g.th*.2,0,Math.PI*2);ctx.fill()}ctx.beginPath();ctx.arc(this.pts[0].x,this.pts[0].y,g.cs*1.1,0,Math.PI*2);ctx.fillStyle=colB;ctx.globalAlpha=al;ctx.fill();const ea=this.hdg(),eOff=g.cs*0.6;ctx.fillStyle=gd.trophic==='pred'?"#ff4444":gd.trophic==='photo'?"#34d399":"#ffffff";ctx.beginPath();ctx.arc(this.pts[0].x+Math.cos(ea-0.6)*eOff,this.pts[0].y+Math.sin(ea-0.6)*eOff,Math.max(.8,g.cs*.28),0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(this.pts[0].x+Math.cos(ea+0.6)*eOff,this.pts[0].y+Math.sin(ea+0.6)*eOff,Math.max(.8,g.cs*.28),0,Math.PI*2);ctx.fill();const aLen=g.sl*1.2;ctx.strokeStyle=hs(g.hue,g.sat,g.lit+20,al*.6);ctx.lineWidth=.4;ctx.globalAlpha=al;ctx.beginPath();ctx.moveTo(this.pts[0].x,this.pts[0].y);ctx.lineTo(this.pts[0].x+Math.cos(ea-0.4)*aLen,this.pts[0].y+Math.sin(ea-0.4)*aLen);ctx.stroke();ctx.beginPath();ctx.moveTo(this.pts[0].x,this.pts[0].y);ctx.lineTo(this.pts[0].x+Math.cos(ea+0.4)*aLen,this.pts[0].y+Math.sin(ea+0.4)*aLen);ctx.stroke()}
/* ═══ GUILD-SPECIFIC OVERLAYS ═══ */
const gid_d=g.guild;
/* Flagelos para bacilos móveis: Pseudomonas(0), Azospirillum(2), Methylobact.(3) */
if((gid_d===0||gid_d===2||gid_d===3)&&g.mt===0&&this.pts.length>=2){
  const P=this.pts;const tail=P[P.length-1];const pre=P[P.length-2];
  const ta=Math.atan2(tail.y-pre.y,tail.x-pre.x);
  const nFlag=gid_d===2?3:gid_d===0?2:1; /* Azo=peritríqueo, Pseudo=polar, Methylo=1 */
  const flagLen=g.sl*3.5;
  ctx.lineWidth=0.4;ctx.globalAlpha=al*0.7;
  for(let fi=0;fi<nFlag;fi++){
    const spread=(fi-(nFlag-1)/2)*0.5;
    const baseA=ta+spread;
    ctx.beginPath();ctx.moveTo(tail.x,tail.y);
    const segs=8;
    for(let si=1;si<=segs;si++){
      const frac=si/segs;
      const wave=Math.sin(frac*Math.PI*3+t*0.012+fi*1.5)*2.5*frac;
      const fx=tail.x+Math.cos(baseA)*flagLen*frac+Math.cos(baseA+Math.PI/2)*wave;
      const fy=tail.y+Math.sin(baseA)*flagLen*frac+Math.sin(baseA+Math.PI/2)*wave;
      ctx.lineTo(fx,fy);
    }
    ctx.strokeStyle=gc;ctx.stroke();
  }
}
/* Endosporo para Bacillus(1) */
if(gid_d===1&&g.mt===0&&this.pts.length>=2){
  const P=this.pts;const midI=Math.floor(P.length/2);
  const mp=P[midI];
  const spR=g.th*0.55;
  ctx.beginPath();ctx.arc(mp.x,mp.y,spR,0,Math.PI*2);
  ctx.fillStyle=`rgba(255,255,240,${al*0.6})`;ctx.globalAlpha=al;ctx.fill();
  ctx.strokeStyle=`rgba(180,140,60,${al*0.8})`;ctx.lineWidth=0.4;ctx.stroke();
}
/* Trichoderma(4): conídios nas pontas (esferas maiores) */
if(gid_d===4&&g.mt===2){
  ctx.globalAlpha=al*0.85;
  for(const p of this.pts){
    if(p===this.core)continue;
    /* Conídio: esfera grande na ponta */
    ctx.beginPath();ctx.arc(p.x,p.y,g.th*0.8,0,Math.PI*2);
    ctx.fillStyle=`rgba(180,100,220,${al*0.7})`;ctx.fill();
    ctx.strokeStyle=`rgba(220,160,255,${al*0.5})`;ctx.lineWidth=0.3;ctx.stroke();
  }
}
/* Nematóide(9): corpo segmentado semi-transparente + cutícula */
if(gid_d===9&&g.mt===0&&this.pts.length>=2){
  const P=this.pts;
  /* Cutícula: linha grossa translúcida sobre o corpo */
  ctx.beginPath();ctx.moveTo(P[0].x,P[0].y);
  for(let i=0;i<P.length-1;i++){const xc=(P[i].x+P[i+1].x)/2,yc=(P[i].y+P[i+1].y)/2;ctx.quadraticCurveTo(P[i].x,P[i].y,xc,yc)}
  ctx.lineTo(P[P.length-1].x,P[P.length-1].y);
  ctx.strokeStyle=`rgba(255,235,200,${al*0.2})`;ctx.lineWidth=g.th*1.6;ctx.stroke();
  /* Anéis corporais */
  for(let i=1;i<P.length-1;i++){
    const perp=Math.atan2(P[i+1].y-P[i-1].y,P[i+1].x-P[i-1].x)+Math.PI/2;
    ctx.beginPath();
    ctx.moveTo(P[i].x+Math.cos(perp)*g.th*0.5,P[i].y+Math.sin(perp)*g.th*0.5);
    ctx.lineTo(P[i].x-Math.cos(perp)*g.th*0.5,P[i].y-Math.sin(perp)*g.th*0.5);
    ctx.strokeStyle=`rgba(200,180,140,${al*0.3})`;ctx.lineWidth=0.3;ctx.stroke();
  }
}
/* Micorriza(11): hifas brancas com pontas brilhantes e halo sutil */
if(gid_d===11&&g.mt===4&&this.tentacles){
  ctx.globalAlpha=al*0.5;
  /* Halo de absorção ao redor da rede hifal */
  const haloR=g.sl*3;
  const haloGr=ctx.createRadialGradient(this.core.x,this.core.y,0,this.core.x,this.core.y,haloR);
  haloGr.addColorStop(0,`rgba(220,220,240,${al*0.06})`);
  haloGr.addColorStop(1,`rgba(220,220,240,0)`);
  ctx.fillStyle=haloGr;ctx.beginPath();ctx.arc(this.core.x,this.core.y,haloR,0,Math.PI*2);ctx.fill();
  /* Pontas brilhantes nas hifas */
  for(const arm of this.tentacles){
    const tip=arm[arm.length-1];
    ctx.beginPath();ctx.arc(tip.x,tip.y,g.th*0.35,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${al*0.7})`;ctx.fill();
  }
}
const eP=cl(this.e/C.REPRO_E,0,1),hd=this.core,bY=hd.y-(g.mt===1?g.sl*2.5:g.mt===4?g.cs*2:g.mt===5?g.cs+7:g.cs+5);ctx.fillStyle="rgba(255,255,255,0.08)";ctx.globalAlpha=1;ctx.fillRect(hd.x-6,bY,2,0.2);ctx.fillStyle=hs(eP>.5?120:eP>.25?50:0,80,50,.55);ctx.fillRect(hd.x-6,bY,2*eP,0.2);
if(this.nodulated){ctx.beginPath();ctx.arc(this.core.x,this.core.y,4,0,Math.PI*2);ctx.fillStyle="rgba(234,179,8,0.45)";ctx.globalAlpha=1;ctx.fill();ctx.strokeStyle="#eab308";ctx.lineWidth=0.7;ctx.stroke()}
ctx.globalAlpha=1.0}}

/* ═══ GLOBALS ═══ */
const cv=document.getElementById('pond'),ctx=cv.getContext('2d');
let wCx,gY,cW,cH,rootDepth=50,worldDepth=400,worldWidth=600;
let sw=[],fd=[],fx=[],nB=0,nD=0,mG=1,tk=0,fH=new SH(30),sHh=new SH(30),seeds=[],babyPlants=[];
let paused=false,spd=1,pH=[],zm=1,px=0,py=0,drg=false,dsx=0,dsy=0,psx=0,psy=0,dragMoved=false,evLog=[],cameraFollow=null;

function spF(){const side=Math.random()<0.5?1:-1;const distOff=-Math.log(Math.random()+0.01)*20;const sx=cl(wCx+distOff*side,wCx-worldWidth/2+5,wCx+worldWidth/2-5);return{x:sx,y:gY+rng(10,rootDepth),sz:0.5+Math.random()*0.7,hue:50+Math.random()*25,ph:Math.random()*Math.PI*2,age:0}}
function addEv(cls,txt){evLog.unshift(`<span class="${cls}">${txt}</span>`);if(evLog.length>8)evLog.pop();document.getElementById('evl').innerHTML=evLog.join('<br>')}
function spawnParticles(x, y, color, count) {
  for(let i=0; i<count; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 0.03 + Math.random() * 0.06;
    fx.push({
      x: x + rng(-2,2), y: y + rng(-2,2),
      vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      life: 80, type: 'part', color: color,
      sz: 0.1 + Math.random()*0.15
    });
  }
}
/* ═══ MUTAÇÃO GENÔMICA ═══ */
function mg(v,a,b){return Math.random()<0.12?cl(v+rng(-.12,.12)*(b-a),a,b):v}
function mutFI(fi){var r={};for(var k in fi)r[k]=mg(fi[k],0,1.0);var tot=Object.values(r).reduce(function(a,b){return a+b},0);if(tot>1.5){var s=1.5/tot;for(var k in r)r[k]*=s}return r}
function mutG(g){var gd=GUILDS[g.guild],tp=gd.type,sz=SIZE_LIMITS[tp];var morphs=MORPH_GUILD[g.guild];
var isWild=g.guild>=6;
var ndMin=isWild?Math.max(3,sz.ndMin):sz.ndMin,ndMax=isWild?Math.min(12,sz.ndMax+3):sz.ndMax;
var slMin=sz.slMin,slMax=isWild?sz.slMax*1.3:sz.slMax;
var thMin=sz.thMin,thMax=isWild?sz.thMax*1.2:sz.thMax;
var csMin=sz.csMin,csMax=isWild?sz.csMax*1.2:sz.csMax;
var isPGPBm=g.guild<=5||g.guild===12;
return{mt:Math.random()<.03?morphs[Math.floor(Math.random()*morphs.length)]:g.mt,
hue:isPGPBm?(PGPB_HUE[g.guild]+rng(-12,12)+360)%360:(g.hue+rng(-20,20)+360)%360,
sat:isPGPBm?mg(g.sat,70,95):mg(g.sat,55,95),lit:isPGPBm?mg(g.lit,45,65):mg(g.lit,40,65),
nd:Math.random()<.08?cl(g.nd+(Math.random()<.5?-1:1),ndMin,ndMax):g.nd,
sl:cl(mg(g.sl,slMin,slMax),slMin,slMax),th:cl(mg(g.th,thMin,thMax),thMin,thMax),
spd:mg(g.spd,.02,.10),amp:mg(g.amp,1,isWild?5:4),ps:mg(g.ps,.2,1.0),sR:mg(g.sR,30,100),
sW:mg(g.sW,0.2,1.2),thr:mg(g.thr,.3,.8),cs:cl(mg(g.cs,csMin,csMax),csMin,csMax),
guild:g.guild,tox:mg(g.tox,0,.35),eff:mg(g.eff,.7,1.3),mem:mg(g.mem,.3,.8),fi:mutFI(g.fi)}}

function resize(){const wr=document.getElementById('cw').getBoundingClientRect();cW=wr.width;cH=wr.height;cv.width=cW;cv.height=cH;wCx=cW/2;gY=cH*0.32;gridX0=wCx-worldWidth/2;
/* On portrait mobile, adjust gY for full-height canvas */
if(window.innerWidth<=600){gY=cH*0.28}}
function readInitSliders(){
  return {
    organicC: parseFloat(document.getElementById('rIC')?.value||800),
    NH4: parseFloat(document.getElementById('rINH4')?.value||45),
    NO3: parseFloat(document.getElementById('rINO3')?.value||35),
    PO4free: parseFloat(document.getElementById('rIPf')?.value||25),
    PO4bound: parseFloat(document.getElementById('rIPb')?.value||60),
    Fe3: parseFloat(document.getElementById('rIFe3')?.value||60),
    Fe2: parseFloat(document.getElementById('rIFe2')?.value||15),
    O2: 75
  };
}
function getMicrobeMult(){return parseFloat(document.getElementById('rMI')?.value||1)}
function initW(){resize();sw=[];fd=[];fx=[];nB=0;nD=0;mG=1;tk=0;pH=[];evLog=[];seeds=[];babyPlants=[];cameraFollow=null;
/* Zoom inicial adaptado ao dispositivo */
const isMob=window.innerWidth<=900;const isPort=window.innerWidth<=600;
if(isPort){zm=1.6;px=cW/2-wCx*zm;py=cH*0.25-gY*zm}
else if(isMob){zm=2.0;px=cW/2-wCx*zm;py=cH*0.32-gY*zm}
else{zm=2.3;px=cW/2-wCx*zm;py=cH*0.35-gY*zm}
/* Ler condições iniciais dos sliders */
const initNut=readInitSliders();
SOIL_INIT.organicC=initNut.organicC;SOIL_INIT.NH4=initNut.NH4;SOIL_INIT.NO3=initNut.NO3;
SOIL_INIT.PO4free=initNut.PO4free;SOIL_INIT.PO4bound=initNut.PO4bound;
SOIL_INIT.Fe3=initNut.Fe3;SOIL_INIT.Fe2=initNut.Fe2;SOIL_INIT.O2=initNut.O2;
soil={...initNut};
updZI();document.getElementById('evl').innerHTML='';document.getElementById('selP').style.display='none';plant={bio:50,n:35,p:30,fe:25,aia:10,stress:0,nodules:[],limitFactor:'—',sig:{flav:0,orgA:0,SA:0}};rootDepth=50;worldDepth=400;initGrid();
const micMult=getMicrobeMult();
const popInit=Math.round(C.POP0*micMult);
for(let i=0;i<popInit;i++){const g=mkG();const gd=GUILDS[g.guild];
/* Spawn dentro da nova área reduzida (worldWidth x worldDepth) */
const xL=wCx-worldWidth/2+20, xR=wCx+worldWidth/2-20;
let sx,sy;if(gd.type==='nema'){sx=rng(xL,xR);sy=rng(gY+40,gY+Math.min(250,worldDepth*0.6))}else if(gd.trophic==='photo'){sx=rng(xL,xR);sy=rng(gY+3,gY+30)}else if(gd.trophic==='pred'&&gd.type==='proto'){sx=rng(xL,xR);sy=Math.random()<0.4?rng(gY+3,gY+40):rng(gY+10,gY+Math.min(200,worldDepth*0.5))}else{sx=rng(xL,xR);sy=rng(gY+10,gY+Math.min(200,worldDepth*0.5))}
sw.push(new Sw(sx,sy,g))}for(let i=0;i<80;i++)fd.push(spF());
/* Detritos iniciais espalhados pelo solo */
{const xL=wCx-worldWidth/2+15, xR=wCx+worldWidth/2-15;
for(let di=0;di<40;di++){fd.push({x:rng(xL,xR),y:gY+rng(5,Math.min(worldDepth*0.8,320)),sz:0.25+Math.random()*0.3,hue:20+Math.random()*18,ph:Math.random()*Math.PI*2,age:Math.floor(Math.random()*300),det:true})}}}
function resetW(){initW()}function toggleP(){paused=!paused;document.getElementById('btnP').textContent=paused?'▶':'⏸'}
function setSpd(v){spd=v;document.querySelectorAll('.srow button').forEach(b=>b.classList.remove('act'));const el=document.getElementById('sp'+v);if(el)el.classList.add('act')}
function bottleneck(){if(sw.length<12)return;const kill=Math.floor(sw.length*0.8);for(let i=0;i<kill;i++){const idx=Math.floor(Math.random()*sw.length);if(sw[idx])sw[idx].alive=false}sw=sw.filter(s=>s.alive);nD+=kill;addEv('eB','☠ GARGALO! '+kill+' eliminados')}
const ziEl=document.getElementById('zi');function updZI(){ziEl.textContent=`🔍 ${Math.round(zm*100)}%`}
function stopCameraFollow(){cameraFollow=null}
function updateCameraFollow(){
  if(!cameraFollow)return false;
  const item=cameraFollow.item;
  if(!item||!item.alive){cameraFollow=null;return false}
  px=cW*cameraFollow.anchorX-item.x*zm;
  py=cH*cameraFollow.anchorY-item.y*zm;
  return true;
}
function startCameraFollow(item,zoom,anchorX,anchorY){
  if(!item||!item.alive)return false;
  zm=cl(Number.isFinite(zoom)?zoom:zm,.3,15);
  cameraFollow={
    item,
    anchorX:cl(Number.isFinite(anchorX)?anchorX:.5,0,1),
    anchorY:cl(Number.isFinite(anchorY)?anchorY:.5,0,1)
  };
  updZI();
  updateCameraFollow();
  return true;
}
document.getElementById('cw').addEventListener('wheel',e=>{e.preventDefault();stopCameraFollow();const rect=cv.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;const oz=zm;zm=cl(zm*(e.deltaY<0?1.1:1/1.1),.3,15);const r=zm/oz;px=mx-r*(mx-px);py=my-r*(my-py);updZI()},{passive:false});
cv.addEventListener('mousedown',e=>{if(e.button!==0)return;stopCameraFollow();drg=true;dragMoved=false;dsx=e.clientX;dsy=e.clientY;psx=px;psy=py;cv.classList.add('drag');e.preventDefault()});window.addEventListener('mousemove',e=>{if(!drg)return;if(Math.abs(e.clientX-dsx)+Math.abs(e.clientY-dsy)>3)dragMoved=true;px=psx+(e.clientX-dsx);py=psy+(e.clientY-dsy)});window.addEventListener('mouseup',()=>{drg=false;cv.classList.remove('drag')});document.getElementById('cw').addEventListener('dblclick',()=>{stopCameraFollow();zm=1;px=0;py=0;updZI()});
function s2w(sx,sy){return{x:(sx-px)/zm,y:(sy-py)/zm}}

/* ═══ UPDATE ═══ */
function updateW(){
tk++;
/* Abióticos do Solo — PROCESSAMENTO POR CÉLULA DA GRADE */
/* Cada célula tem sua própria concentração local */
const nCells=gCols*gRows;
for(let _gc=0;_gc<gCols;_gc++){for(let _gr=0;_gr<gRows;_gr++){
  const gc=grid[_gc][_gr];
  /* Nitrificação: NH4→NO3 (bactérias nitrificantes implícitas) */
  if(gc.O2>20){const nitr=mm(0.15,gc.NH4,25)*0.012;gc.NH4-=nitr;gc.NO3+=nitr}
  /* Oxidação Fe2→Fe3 (abiótica em solo aeróbio) */
  if(gc.O2>30){const feOx=0.004*gc.Fe2;gc.Fe2-=feOx;gc.Fe3+=feOx}
  /* Mineralização: C orgânico → NH4 (decomposição microbiana implícita) */
  var minerRate=mm(0.12,gc.organicC,180)*(env.temp/28)*(env.moist/80)*0.008;
  gc.organicC-=minerRate;gc.NH4+=minerRate*0.35;gc.PO4free+=minerRate*0.08;
  /* Lixiviação (depende do tipo de solo) */
  const leach=env.soil==='sandy'?0.002:env.soil==='clay'?0.0003:0.0008;
  gc.NO3*=(1-leach);gc.PO4free*=(1-leach*0.2);
  /* Reposição — inputs naturais (distribuídos por célula) */
  gc.organicC+=0.12/nCells;  /* liteira, resíduos */
  gc.PO4bound+=0.015/nCells; /* intemperismo mineral */
  gc.Fe3+=0.02/nCells;       /* intemperismo Fe */
  /* Deposição atmosférica — só na camada superficial */
  if(_gr===0){gc.NH4+=0.008*gCols/nCells;gc.NO3+=0.005*gCols/nCells}
  /* Dessorção PO4bound→PO4free */
  if(gc.PO4free<gc.PO4bound*0.4){
    var desorp=0.003*(gc.PO4bound*0.4-gc.PO4free);gc.PO4bound-=desorp;gc.PO4free+=desorp;
  }
  /* pH e O2 */
  gc.O2=cl(80-env.moist*0.6+(env.soil==='sandy'?15:env.soil==='clay'?-10:0),5,95);
  if(env.ph>7.5){gc.PO4free*=(1-0.004*(env.ph-7.5))}
  if(env.ph<5.5){gc.PO4free*=(1-0.003*(5.5-env.ph))}
  for(const k in gc)gc[k]=cl(gc[k],0,k==='organicC'?1500:k==='PO4bound'?200:150);
}}
/* Difusão a cada 2 ticks (performance) */
if(tk%2===0)diffuseGrid();
/* Sincronizar média da grade → soil para UI */
syncSoilFromGrid();

/* Planta — HOMEOSTASE DE ESTRESSE v5 */

/* ═══ PRIMEIRO: Calcular rootSA ANTES de usá-la (FIX CRÍTICO!) ═══ */
var prevGrowPct=cl((plant.bio-20)/130,0,1);
rootDepth=20+prevGrowPct*Math.min(280,worldDepth*0.7);
var rootSA=1+Math.min(10,Math.floor(prevGrowPct*12))*0.1+(prevGrowPct>0.25?Math.min(30,Math.floor((prevGrowPct-0.2)*45)):0)*0.04;

/* ═══ Fontes de estresse ambiental (apenas quando realmente estressante) ═══ */
var _sG=0;
if(env.moist<30)_sG+=0.03*(1-env.moist/30);
if(env.moist>85)_sG+=0.01*((env.moist-85)/15); /* encharcamento */
if(env.temp>35)_sG+=0.03*((env.temp-35)/10);
if(env.temp<12)_sG+=0.025*((12-env.temp)/10);
if(env.tox>0)_sG+=env.tox*0.002;

/* ═══ Saúde nutricional — fator de recuperação robusto ═══ */
var _hF=cl(((plant.n||0)+(plant.p||0)+(plant.fe||0))/300,0,1);
/* Recuperação PROPORCIONAL à saúde: planta saudável se recupera muito mais rápido */
var stressRecovery = _hF * 0.04 + 0.008; /* base 0.008 + até 0.04 extra */

/* ═══ Homeostase: estresse tende a um equilíbrio, não acumula infinitamente ═══ */
/* O estresse decai proporcionalmente ao seu próprio nível (feedback negativo) */
var homeostasisDecay = plant.stress * 0.0008; /* quanto maior o estresse, mais a planta tenta corrigir */
plant.stress += _sG - stressRecovery - homeostasisDecay;

/* ═══ Absorção radicular — GRADE ESPACIAL (só de células com raiz!) ═══ */
calcRootCells(prevGrowPct);
let totalRP=0;for(const rc of rootCells)totalRP+=rc.rp;
let _absNtotal=0,_absPtotal=0,_absFetotal=0;
if(totalRP>0){
  for(const rc of rootCells){
    const gc=grid[rc.c][rc.r];
    const w=rc.rp/totalRP; /* peso desta célula na absorção */
    const localAbsN=mm(0.06,gc.NH4+gc.NO3,25)*rootSA*w;
    const localAbsP=mm(0.04,gc.PO4free,18)*rootSA*w;
    const localAbsFe=mm(0.03,gc.Fe2,12)*rootSA*w;
    plant.n+=localAbsN*0.3;plant.p+=localAbsP*0.3;plant.fe+=localAbsFe*0.3;
    gc.NH4=Math.max(0,gc.NH4-localAbsN*0.15);
    gc.NO3=Math.max(0,gc.NO3-localAbsN*0.15);
    gc.PO4free=Math.max(0,gc.PO4free-localAbsP*0.3);
    gc.Fe2=Math.max(0,gc.Fe2-localAbsFe*0.3);
    _absNtotal+=localAbsN;_absPtotal+=localAbsP;_absFetotal+=localAbsFe;
  }
}

/* ═══ Liebig + Crescimento ═══ */
const limN=plant.n/100,limP=plant.p/100,limFe=plant.fe/100,liebig=Math.min(limN,limP,limFe);
plant.limitFactor=limN<=limP&&limN<=limFe?'N':limP<=limFe?'P':'Fe';
if(liebig>0.1){
  plant.bio+=0.04*liebig*env.nutRet;
  plant.stress-=0.04*liebig; /* recuperação proporcional ao liebig */
  plant.n-=0.008;plant.p-=0.008;plant.fe-=0.002;
} else if(liebig>0.03){
  /* zona intermediária: crescimento lento, estresse leve */
  plant.bio+=0.01*liebig*env.nutRet;
  plant.stress+=0.005;
  plant.n-=0.004;plant.p-=0.004;plant.fe-=0.001;
} else {
  plant.bio-=0.005;
  plant.stress+=0.012; /* muito menos que antes (era 0.02) */
}
/* Auxina: janela ótima 20-60, excesso é fitotóxico (epinastia) */
if(plant.aia>=20&&plant.aia<=60)plant.bio+=0.012;
else if(plant.aia>60){var aiaExcess=(plant.aia-60)/40;plant.stress+=aiaExcess*0.08;plant.bio-=aiaExcess*0.003}
plant.fe=Math.max(0,plant.fe-0.002);plant.aia=Math.max(0,plant.aia-0.004-plant.aia*0.003); /* IAA-oxidase: degradação proporcional */
plant.stress=cl(plant.stress||0,0,100);plant.bio=cl(plant.bio||20,20,150);plant.n=cl(plant.n,0,100);plant.p=cl(plant.p,0,100);plant.fe=cl(plant.fe,0,100);plant.aia=cl(plant.aia,0,100);
/* Atualizar growPct/rootDepth com bio atualizada */
const growPct=cl((plant.bio-20)/130,0,1);rootDepth=20+growPct*Math.min(280,worldDepth*0.7);

/* ═══ Sinais da planta — FEEDBACK PROPORCIONAL À SAÚDE ═══ */
var _nA=sw.filter(function(o){return o.alive}).length||1;var _pR2=sw.filter(function(o){return o.alive&&o.g.guild===6}).length/_nA;var _nemaR=sw.filter(function(o){return o.alive&&o.g.guild===9}).length/_nA;
/* Sinais específicos proporcionais à deficiência */
plant.sig.flav=cl(plant.n<50?(50-plant.n)/50:0,0,1);     /* Flavonoides: N baixo → atrai Rhizobium */
plant.sig.orgA=cl(plant.p<50?(50-plant.p)/50:0,0,1);      /* Ác. Orgânicos: P baixo → atrai Bacillus */
plant.sig.SA=cl(Math.max(_pR2*10,_nemaR*8,plant.stress>30?0.3:0),0,1); /* Ác. Salicílico: patógenos/nematóides ou estresse → biocontrole */

/* ═══ Exsudatos — planta saudável produz MAIS e MELHOR exsudato ═══ */
/* Conceito: plantas com boa biomassa investem mais C no recrutamento microbiano */
let healthMult = cl(plant.bio / 80, 0.3, 1.5); /* planta grande produz mais */
let stressExuMod = 1 + (plant.stress / 100) * 0.5; /* estresse moderado aumenta exsudação (cry for help) */
if (plant.stress > 70) stressExuMod *= 0.6; /* mas estresse severo reduz capacidade */
let moistF=1-Math.abs(env.moist-70)/70,tempF=1-Math.min(1,Math.abs(env.temp-25)/25);
let exR=Math.max(0.08, healthMult * stressExuMod * 0.45 * moistF * tempF * Math.sqrt(rootSA));
while(fd.length<C.FOOD_MAX&&Math.random()<exR)fd.push(spF());

/* ═══ DETRITOS DO BULK SOIL — liteira, raízes mortas, matéria orgânica ═══ */
/* Inputs contínuos de matéria orgânica em todo o solo (não só rizosfera) */
if(tk%8===0 && fd.length<C.FOOD_MAX-5) { /* a cada 8 ticks */
  const xL=wCx-worldWidth/2+10, xR=wCx+worldWidth/2-10;
  /* Liteira caindo da superfície */
  if(Math.random()<0.15*growPct){fd.push({x:rng(xL,xR),y:gY+rng(2,15),sz:0.3+Math.random()*0.3,hue:25+Math.random()*15,ph:Math.random()*Math.PI*2,age:0,det:true})}
  /* Raízes mortas e matéria orgânica no solo */
  if(Math.random()<0.08){fd.push({x:rng(xL,xR),y:gY+rng(15,Math.min(worldDepth*0.8,300)),sz:0.25+Math.random()*0.25,hue:20+Math.random()*15,ph:Math.random()*Math.PI*2,age:0,det:true})}
}
/* ═══ Difusão + Decaimento do exsudato ═══ */
fd.forEach(f=>{ f.age++;
  if(Math.random()<0.12){
    f.x+=rng(-1.5,1.5);  /* difusão lateral forte */
    f.y+=rng(-0.2,0.5);  /* leve tendência para baixo (gravidade), mas menos que antes */
  }
  /* Decaimento por distância: longe da raiz perde tamanho */
  const dRoot=Math.hypot(f.x-wCx, f.y-(gY+rootDepth*0.5));
  if(dRoot>rootDepth*1.2) f.sz*=0.997; /* encolhe longe da raiz */
});
/* Remover exsudatos velhos ou minúsculos */
const exuMaxAge = 1200; /* ~40s de vida */
fd = fd.filter(f => f.age < exuMaxAge && f.sz > 0.15 && f.y < gY + worldDepth);

fH.clear();sHh.clear();for(const f of fd)fH.ins(f);for(const s of sw)if(s.alive)sHh.ins({x:s.x,y:s.y,ref:s});plant.nodules=[];const nb=[];

for(const s of sw){if(!s.alive)continue;s.behave(fH,sHh);s.physics();const hd=s.core,gid=s.g.guild,gd=GUILDS[gid];
const lc=hd.y>gY?gcAt(hd.x,hd.y):gcAt(hd.x,gY); /* célula local do micróbio */
const dRootX=Math.abs(hd.x-wCx);const isNearRoot=dRootX<35&&hd.y>gY&&hd.y<gY+rootDepth+20;
const fi=s.g.fi;const exConc=exudateConc(hd.x,hd.y);const localLight=lightAt(hd.y);
    var _cn=sHh.qry(hd.x,hd.y),_sc2=0,_dc2=0,_guildCounts={};
    for(var _ci=0;_ci<_cn.length;_ci++){
      if(_cn[_ci].ref===s)continue;
      var _ngid=_cn[_ci].ref.g.guild;
      _guildCounts[_ngid]=(_guildCounts[_ngid]||0)+1;
      if(_ngid===gid)_sc2++;else _dc2++;
    }
    /* ═══ COMPETIÇÃO ECOLÓGICA REALISTA ═══ */
    /* Princípio da exclusão competitiva: mesma guilda = competição forte por mesmo nicho */
    var intraComp = _sc2 * 0.08; /* dobrado: mesma guilda compete muito mais */
    /* Inter-guilda: competição fraca (nichos diferentes) */
    var interComp = _dc2 * 0.005;
    /* Perto da raiz: rizosfera é rica, menos competição geral */
    var compZone = isNearRoot ? 0.25 : 1.0;
    /* PGPBs diferentes têm nichos complementares: quase zero competição entre si */
    if(isNearRoot && gid>=0 && gid<=5) interComp *= 0.2;
    s.e -= (intraComp + interComp) * compZone;

/* ═══ GUILDAS FUNCIONAIS ═══ */

/* ═══ ECOSSISTEMA DO BULK SOIL — energia basal da matéria orgânica dissolvida ═══ */
/* Todo heterotrofo no solo obtém energia mínima do carbono orgânico dissolvido (DOC) */
/* Na rizosfera isso é suplementado pelos exsudatos; no bulk soil é a fonte principal */
{
  const gdType = GUILDS[gid].trophic;
  if(gdType !== 'photo' && hd.y > gY) {
    /* DOC (dissolved organic carbon) disponível em todo o solo */
    const docEnergy = mm(0.3, lc.organicC, 120) * 1.8;
    /* Bulk soil: organismos obtêm energia basal do DOC */
    if(!isNearRoot) {
      s.e += docEnergy * (gid === 10 ? 0.5 : 0.35); /* saprófitos já têm metabolismo próprio, bonus menor */
      lc.organicC -= docEnergy * 0.0004;
    }
  }
}

if(gid===4){/* Trichoderma biocontrole */
  if(s.age-s.lastAte>=C.DIGEST_TICKS){const nS=sHh.qry(hd.x,hd.y);for(const prey of nS){if(!prey.ref||prey.ref===s||!prey.ref.alive||prey.ref.g.guild!==6)continue;if(dst(hd,prey.ref.core)<C.PRED_R+4){s.e+=1900*fi.bioctl;s.lastAte=s.age;prey.ref.alive=false;nD++;plant.stress=Math.max(0,plant.stress-0.8);fx.push({x:prey.ref.x,y:prey.ref.y,life:25,type:'pred'});addEv('eP','🛡 Trichoderma→Patógeno');break}}}
  if(Math.random()<0.04){s.e+=mm(0.5,lc.organicC,50)*fi.bioctl*15;lc.organicC-=0.5}}

else if(gid===6){/* Patógeno */
  if(isNearRoot&&dRootX<15){const atkRate=mm(GUILDS[6].Vmax_atk,plant.bio,GUILDS[6].Km_bio)*fi.pathog;if(lc.Fe2>6){s.e-=60*exConc;fx.push({x:hd.x,y:hd.y,life:12,type:'shield'})}else{plant.stress+=atkRate*0.12;plant.bio-=atkRate*0.004;s.e+=atkRate*8;if(tk%200===0)addEv('eD','🦠 Patógeno↑stress')}}}

else if(gid===5){/* Rhizobium */
  let nodProb=plant.n>80?0.05:plant.n>60?0.3:1.0;if(isNearRoot&&dRootX<8&&!s.nodulated&&Math.random()<nodProb){s.nodulated=true;s.nodOff={x:rng(-8,8),y:(hd.y-gY)/(plant.bio/100)};addEv('eN','🟡 Rhizobium nódulo')}
  if(s.nodulated){plant.nodules.push(s);const nfR=mm(GUILDS[5].Vmax_nfix,lc.organicC,GUILDS[5].Km_Corg)*fi.nfix;lc.NH4+=nfR*0.012;plant.n+=nfR*0.02;lc.organicC-=nfR*0.003;s.e+=nfR*1.5}}

else if(gid===7){/* Cianobactéria — fotossíntese + N₂ */
  const photoRate=mm(GUILDS[7].Vmax_photo,localLight*100,GUILDS[7].Km_light)*fi.photo;
  s.e+=photoRate*3;/* Energia da luz — custo maquinaria alto */
  lc.O2+=photoRate*0.002;lc.organicC+=photoRate*0.001;
  if(fi.nfix>0.1){const nfR=mm(GUILDS[7].Vmax_nfix,lc.organicC,GUILDS[7].Km_Corg)*fi.nfix*localLight;lc.NH4+=nfR*0.008;s.e-=nfR*0.3}
  if(tk%400===0&&photoRate>0.5)addEv('eG','🟢 Ciano: fotossíntese v='+photoRate.toFixed(1))}

else if(gid===8){/* Protozoário predador — PREDAÇÃO FREQUÊNCIA-DEPENDENTE */
  if(s.age-s.lastAte>=C.DIGEST_TICKS){const nS=sHh.qry(hd.x,hd.y);
  /* Contar presas por guilda para predação frequência-dependente */
  var preyByGuild={},totalPrey=0;
  for(const p of nS){if(!p.ref||p.ref===s||!p.ref.alive)continue;
    const pg=GUILDS[p.ref.g.guild];if(pg.type!=='bact'&&pg.type!=='fungi')continue;
    var pgid=p.ref.g.guild;preyByGuild[pgid]=(preyByGuild[pgid]||0)+1;totalPrey++;}
  /* Encontrar a guilda mais abundante (alvo preferencial) */
  var mostAbundant=-1,maxCount=0;
  for(var pgk in preyByGuild){if(preyByGuild[pgk]>maxCount){maxCount=preyByGuild[pgk];mostAbundant=+pgk;}}
  /* Predação: prefere a presa mais abundante (controle top-down das populações dominantes) */
  for(const prey of nS){if(!prey.ref||prey.ref===s||!prey.ref.alive)continue;
  const preyGd=GUILDS[prey.ref.g.guild];if(preyGd.type!=='bact'&&preyGd.type!=='fungi')continue;
  if(dst(hd,prey.ref.core)<C.PRED_R+2){
    /* Bônus de captura se for a presa mais abundante (frequência-dependente) */
    var captureBonus = (prey.ref.g.guild===mostAbundant && totalPrey>4) ? 1.5 : 1.0;
    const localPrey=totalPrey;const predRate=mm(GUILDS[8].Vmax_pred,localPrey,GUILDS[8].Km_prey)*fi.pred*captureBonus;
    s.e+=predRate*900;prey.ref.alive=false;nD++;
    if(s.body)s.body.engulf(prey.ref.x,prey.ref.y,preyGd.color,preyGd.type==='fungi'?1.5:1.1);
  /* Nutrient loop: bactéria vira NH4 */
  lc.NH4+=0.5;lc.PO4free+=0.2;
  fx.push({x:prey.ref.x,y:prey.ref.y,life:20,type:'pred'});s.lastAte=s.age;
  if(tk%300===0){var preyName=GUILDS[prey.ref.g.guild].name;addEv('eK','🔶 Proto→'+preyName+' (freq-dep)');}break}}}
  /* Protozoário pode pinocitar exsudato como fonte secundária */
  else if(s.age-s.lastAte>=C.DIGEST_TICKS*2){const nF=fH.qry(hd.x,hd.y);for(const f of nF){if(Math.hypot(hd.x-f.x,hd.y-f.y)<C.EAT_R+5){s.e+=300;s.lastAte=s.age;const idx=fd.indexOf(f);if(idx>-1)fd.splice(idx,1);break}}}}

else if(gid===9){/* Nematóide herbívoro — dano às raízes + bacterívoro/predador oportunista */
  if(isNearRoot&&dRootX<25){const herbRate=mm(GUILDS[9].Vmax_herb,plant.bio,GUILDS[9].Km_root)*fi.herb;plant.stress+=herbRate*0.055;plant.bio-=herbRate*0.002;s.e+=herbRate*15;if(tk%250===0)addEv('eH','🪱 Nematóide: raiz dano')}
  /* Bacterívoro oportunista — come bactérias e fungos no caminho */
  if(s.age-s.lastAte>=C.DIGEST_TICKS*3){const nS=sHh.qry(hd.x,hd.y);for(const prey of nS){if(!prey.ref||prey.ref===s||!prey.ref.alive)continue;
  const preyGd=GUILDS[prey.ref.g.guild];if(preyGd.type!=='bact'&&preyGd.type!=='fungi')continue;
  if(dst(hd,prey.ref.core)<C.PRED_R+4){s.e+=400;prey.ref.alive=false;nD++;lc.NH4+=0.3;
  fx.push({x:prey.ref.x,y:prey.ref.y,life:20,type:'pred'});s.lastAte=s.age;if(tk%400===0)addEv('eH','🪱 Nematóide→bactéria');break}}}
  /* Predação de protozoários — nematóides predadores (Mononchida) */
  if(s.age-s.lastAte>=C.DIGEST_TICKS*2){const nS=sHh.qry(hd.x,hd.y);for(const prey of nS){if(!prey.ref||prey.ref===s||!prey.ref.alive||prey.ref.g.guild!==8)continue;
  if(dst(hd,prey.ref.core)<C.PRED_R+5){s.e+=1200;prey.ref.alive=false;nD++;lc.NH4+=0.5;lc.PO4free+=0.15;
  fx.push({x:prey.ref.x,y:prey.ref.y,life:22,type:'pred'});s.lastAte=s.age;if(tk%300===0)addEv('eH','🪱 Nematóide→Protozoário');break}}}}

else if(gid===10){/* Saprófito — decompõe C orgânico EM QUALQUER LUGAR DO SOLO */
  /* Saprófitos não dependem de exsudatos — usam matéria orgânica do solo */
  const soilOMFactor = isNearRoot ? 1.0 + exConc * 0.5 : 0.7; /* ligeiramente melhor na rizosfera */
  const decRate=mm(GUILDS[10].Vmax_dec,lc.organicC,GUILDS[10].Km_Corg)*fi.sapro*soilOMFactor;
  lc.organicC-=decRate*0.01;lc.NH4+=decRate*0.004;lc.PO4free+=decRate*0.002;
  s.e+=decRate*8; /* energia adequada de decomposição */if(tk%400===0&&decRate>0.5)addEv('eK','🟣 Saprófito: C→NH₄⁺')}

else if(gid===11){/* Micorriza — rede hifal que absorve P de área estendida e transfere à planta */
  /* Micorrizas se alimentam de exsudatos radiculares (C da planta) */
  if(s.age-s.lastAte>=C.DIGEST_TICKS){
    const nF=fH.qry(hd.x,hd.y);for(const f of nF){if(Math.hypot(hd.x-f.x,hd.y-f.y)<C.EAT_R){
      const foodEff=f.det?0.3:1.0;s.e+=C.EXU_ENERGY*s.g.eff*Math.max(0.15,exConc)*foodEff;s.lastAte=s.age;
      const idx=fd.indexOf(f);if(idx>-1)fd.splice(idx,1);break}}}
  /* Função principal: absorve PO4 das células vizinhas (rede hifal estendida) e transfere à planta */
  if(isNearRoot){
    s.e+=exConc*2.0; /* C do hospedeiro */
    /* Absorve P não apenas da própria célula mas de 8 vizinhas (hifas longas!) */
    const myC=Math.floor((hd.x-gridX0)/GCELL),myR=Math.floor((hd.y-gY)/GCELL);
    let pAbsorbed=0;
    for(let dc=-1;dc<=1;dc++){for(let dr=-1;dr<=1;dr++){
      const nc=cl(myC+dc,0,gCols-1),nr=cl(myR+dr,0,gRows-1);
      const nc_cell=grid[nc][nr];
      const pR=mm(GUILDS[11].Vmax_psol,nc_cell.PO4bound,GUILDS[11].Km_Pbound)*fi.psol*0.5;
      nc_cell.PO4bound-=pR*0.004;nc_cell.PO4free+=pR*0.002;
      pAbsorbed+=pR*0.002;
    }}
    plant.p+=pAbsorbed*0.06;s.e-=pAbsorbed*0.3;
    if(tk%400===0&&pAbsorbed>0.1)addEv('eS','🤍 Micorriza:PO₄→planta');
  }}

else if(gid===12){/* Arthrobotrys — fungo nematófago com armadilhas adesivas */
  /* Alimentação saprofítica base (sobrevive em matéria orgânica) */
  if(s.age-s.lastAte>=C.DIGEST_TICKS){
    const nF=fH.qry(hd.x,hd.y);for(const f of nF){if(Math.hypot(hd.x-f.x,hd.y-f.y)<C.EAT_R){
      const foodEff=f.det?0.3:1.0;s.e+=C.EXU_ENERGY*s.g.eff*Math.max(0.15,exConc)*foodEff;s.lastAte=s.age;
      const idx=fd.indexOf(f);if(idx>-1)fd.splice(idx,1);break}}}
  /* Função principal: captura nematóides com rede adesiva */
  if(s.age-s.lastAte>=C.DIGEST_TICKS*0.5){const nS=sHh.qry(hd.x,hd.y);for(const prey of nS){
    if(!prey.ref||prey.ref===s||!prey.ref.alive||prey.ref.g.guild!==9)continue;
    if(dst(hd,prey.ref.core)<C.PRED_R+8){
      const trapRate=mm(GUILDS[12].Vmax_trap,1,GUILDS[12].Km_nema)*fi.bioctl;
      s.e+=trapRate*2200;s.lastAte=s.age;prey.ref.alive=false;nD++;
      plant.stress=Math.max(0,plant.stress-1.0);
      lc.NH4+=0.8;lc.PO4free+=0.3; /* nematóide digerido libera nutrientes */
      fx.push({x:prey.ref.x,y:prey.ref.y,life:30,type:'pred'});
      addEv('eP','🪤 Arthrobotrys→Nematóide');break}}}
  /* Saprófito secundário */
  if(Math.random()<0.03){s.e+=mm(0.3,lc.organicC,50)*fi.bioctl*10;lc.organicC-=0.3}}

else{/* PGPBs restantes: comem exsudato e detritos */
  /* ═══ FIX #4: Digestão — só come se cooldown permitir ═══ */
  if(s.age-s.lastAte>=C.DIGEST_TICKS){
    const nF=fH.qry(hd.x,hd.y);for(const f of nF){if(Math.hypot(hd.x-f.x,hd.y-f.y)<C.EAT_R){
      /* Detritos dão menos energia que exsudatos para PGPBs */
      const foodEff = f.det ? 0.4 : 1.0;
      s.e+=C.EXU_ENERGY*s.g.eff*Math.max(0.15,exConc)*foodEff;s.lastAte=s.age;
      spawnParticles(f.x, f.y, gd.color, 7);const idx=fd.indexOf(f);if(idx>-1)fd.splice(idx,1);break}}}
  /* ═══ FIX #5: Bônus rizosfera — PGPBs ganham energia passiva perto da raiz (exsudato contínuo) ═══ */
  if(isNearRoot){
    const rizoBonus=exConc*2.5;s.e+=rizoBonus;
    /* ═══ FIX #6: Funções com custo reduzido e contribuições 3-5× maiores ═══ */
    if(gid===0){const r=mm(GUILDS[0].Vmax_sid,lc.Fe3,GUILDS[0].Km_Fe3)*fi.sid*exConc;lc.Fe3-=r*0.008;lc.Fe2+=r*0.008;plant.fe+=r*0.035;s.e-=r*0.1;if(tk%300===0&&r>0.3)addEv('eS','🔵 Pseudo:Fe³⁺→Fe²⁺')}
    if(gid===1){const r=mm(GUILDS[1].Vmax_psol,lc.PO4bound,GUILDS[1].Km_Pbound)*fi.psol*exConc;let phE=1;if(env.ph>8)phE=0.3;else if(env.ph<5.5)phE=0.5;else if(env.ph>=6&&env.ph<=7.5)phE=1.2;const eP=r*phE;lc.PO4bound-=eP*0.006;lc.PO4free+=eP*0.006;plant.p+=eP*0.04;s.e-=r*0.08;if(tk%300===0&&eP>0.2)addEv('eE','🟠 Bacillus:PO₄→livre')}
    if(gid===2){const nR=mm(GUILDS[2].Vmax_nfix,lc.organicC,GUILDS[2].Km_Corg)*fi.nfix*exConc;lc.NH4+=nR*0.01;plant.n+=nR*0.015;s.e-=nR*0.25;
      const aiaFeedback=Math.max(0,1-plant.aia/70); /* feedback: para de produzir quando AIA≥70 */
      const aR=mm(GUILDS[2].Vmax_aia,lc.organicC,GUILDS[2].Km_aia)*fi.aia*exConc*aiaFeedback;plant.aia+=aR*0.02;plant.bio+=aR*0.004;if(tk%400===0&&nR>0.3)addEv('eR','🔷 Azospirillum:N₂→NH₄⁺')}
    if(gid===3){const aiaFb3=Math.max(0,1-plant.aia/70);
      const aR=mm(GUILDS[3].Vmax_aia,lc.organicC,GUILDS[3].Km_aia)*fi.aia*exConc*aiaFb3;plant.aia+=aR*0.015;s.e+=aR*0.5;if(tk%400===0&&aR>0.2)addEv('eE','🩷 Methylo:AIA')}}}

if(s.e<=0){s.alive=false;nD++;fx.push({x:hd.x,y:hd.y,life:15,type:'die'});
  /* Reciclagem: organismo morto → detritos (food) + nutrientes ao solo */
  lc.organicC+=0.8;lc.NH4+=0.15;lc.PO4free+=0.05;
  if(fd.length<C.FOOD_MAX-3){for(let di=0;di<3;di++){fd.push({x:hd.x+rng(-12,12),y:hd.y+rng(-12,12),sz:0.4+Math.random()*0.3,hue:30+Math.random()*15,ph:Math.random()*Math.PI*2,age:0,det:true})}}
  continue}
if(s.age>14000+Math.random()*6000){s.alive=false;nD++;
  /* Senescência: matéria retorna ao solo */
  lc.organicC+=0.5;lc.NH4+=0.1;
  if(fd.length<C.FOOD_MAX-2){fd.push({x:hd.x+rng(-8,8),y:hd.y+rng(-8,8),sz:0.3+Math.random()*0.2,hue:25+Math.random()*10,ph:Math.random()*Math.PI*2,age:0,det:true})}
  continue}
if(s.e>C.REPRO_E&&sw.length+nb.length<C.MAX_POP&&!s.nodulated&&s.reproCool<=0){s.e*=.4;s.reproCool=C.REPRO_COOL;const ch=new Sw(hd.x+rng(-18,18),hd.y+rng(-18,18),mutG(s.g),s.gen+1);ch.e=C.INIT_E*.5;ch.reproCool=C.REPRO_COOL;nb.push(ch);nB++;if(ch.gen>mG)mG=ch.gen;fx.push({x:hd.x,y:hd.y,life:20,type:'rep'})}
}/* end for */

sw=sw.filter(s=>s.alive);for(const c of nb)sw.push(c);
while(getMicrobeMult()>0&&sw.length<C.MIN_POP){const xL2=wCx-worldWidth/2+20,xR2=wCx+worldWidth/2-20;sw.push(new Sw(rng(xL2,xR2),rng(gY+20,gY+Math.min(200,worldDepth*0.5)),mkG()))}
/* Sync final: microbes modificaram células locais → atualizar soil para UI */
/* ═══ SEMENTES — dispersão quando planta extremamente saudável ═══ */
const _sgp=cl((plant.bio-20)/130,0,1);
if(_sgp>0.92 && plant.stress<10 && plant.n>60 && plant.p>60 && plant.fe>40 && babyPlants.length<4 && seeds.length<6){
  if(tk%120===0 && Math.random()<0.12){
    const nPods=Math.min(6,Math.floor((_sgp-0.65)*16));
    if(nPods>0){
      const podIdx=Math.floor(Math.random()*nPods);
      const podFrac=(Math.floor(10*0.15)+podIdx+1)/(10+1);
      const podH=_sgp*200*podFrac;
      const side=(podIdx%2===0)?-1:1;
      const sx=wCx+side*(3+8)+rng(-3,3);
      const sy=gY-podH+rng(-5,5);
      const dir=side*0.7+rng(-0.2,0.2);
      seeds.push({x:sx,y:sy,vx:dir*(0.5+Math.random()*0.8),vy:-0.3-Math.random()*0.5,
        age:0,state:'falling',sz:1.8+Math.random()*0.6,hue:45+Math.random()*15,
        bounce:0,restAge:0});
      addEv('eN','🌱 Semente liberada!');
    }
  }
}
for(let si=seeds.length-1;si>=0;si--){
  const sd=seeds[si]; sd.age++;
  if(sd.state==='falling'){
    sd.vy+=0.08;sd.x+=sd.vx;sd.y+=sd.vy;
    if(sd.y>=gY-1){sd.y=gY-1;sd.vy*=-0.3;sd.vx*=0.85;sd.bounce++;
      if(sd.bounce>=3||Math.abs(sd.vy)<0.1){sd.state='rolling';sd.vy=0}}
  }else if(sd.state==='rolling'){
    sd.vx*=0.96;sd.x+=sd.vx;
    sd.x=cl(sd.x,wCx-worldWidth/2+10,wCx+worldWidth/2-10);
    if(Math.abs(sd.vx)<0.02){sd.state='resting';sd.restAge=0}
  }else if(sd.state==='resting'){
    sd.restAge++;
    if(sd.restAge>200 && env.moist>25 && env.temp>12 && env.temp<40){
      const distMother=Math.abs(sd.x-wCx);
      const tooClose=babyPlants.some(bp=>Math.abs(bp.x-sd.x)<35);
      if(distMother>30 && !tooClose){
        babyPlants.push({x:sd.x,y:gY,bio:20,age:0,stress:0});
        seeds.splice(si,1);addEv('eN','🌿 Semente germinou!');continue;
      }
    }
    if(sd.restAge>1500){seeds.splice(si,1);continue}
  }
  if(sd.y>gY+worldDepth||sd.age>3000){seeds.splice(si,1)}
}
for(const bp of babyPlants){bp.age++;
  if(bp.bio<150 && env.moist>20){
    const bpc=gcAt(bp.x,gY+5);
    if(bpc){
      const bpGP=cl((bp.bio-20)/130,0,1);
      const bpLieb=Math.min(cl(bpc.NH4/5,0,1),cl(bpc.PO4free/2,0,1));
      let bpGr=0.025*bpLieb*cl(env.temp/28,0.2,1.2)*(1+bpGP*0.3);
      if(bpc.organicC>50)bpGr*=1.15;
      bp.bio=cl(bp.bio+bpGr,20,150);
      bpc.NH4=Math.max(0,bpc.NH4-bpGr*0.08);
      bpc.PO4free=Math.max(0,bpc.PO4free-bpGr*0.03);
      bpc.organicC=Math.max(0,bpc.organicC-bpGr*0.05);
    }
  }
}
plant.stress=cl(plant.stress||0,0,100);plant.bio=cl(plant.bio||20,20,150);plant.n=cl(plant.n,0,100);plant.p=cl(plant.p,0,100);plant.fe=cl(plant.fe,0,100);plant.aia=cl(plant.aia,0,100);
syncSoilFromGrid();
fx=fx.filter(p=>{
  if(p.type === 'part') {
    p.vx = p.vx*0.97 + (wCx-p.x)*0.001;
    p.vy = p.vy*0.97 + ((gY+rootDepth*0.5)-p.y)*0.001;
    p.x += p.vx; p.y += p.vy;
    if(p.sz)p.sz*=0.997;
  }
  p.life--;
  return p.life>0;
})}

/* ═══ RENDER ═══ */
function render(now){
ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cW,cH);
ctx.setTransform(zm,0,0,zm,px,py);
const bgL=-cW*5,bgW=cW*10;

/* CÉU — luminosidade afetada por env.light */
const skyBright=0.3+env.light*0.007;
const skyGrad=ctx.createLinearGradient(0,-cH,0,gY);
skyGrad.addColorStop(0,`rgba(${Math.round(10*skyBright)},${Math.round(22*skyBright)},${Math.round(50*skyBright)},1)`);
skyGrad.addColorStop(0.5,`rgba(${Math.round(60*skyBright)},${Math.round(130*skyBright)},${Math.round(200*skyBright)},1)`);
skyGrad.addColorStop(1,`rgba(${Math.round(135*skyBright)},${Math.round(206*skyBright)},${Math.round(235*skyBright)},1)`);
ctx.fillStyle=skyGrad;ctx.fillRect(bgL,-cH*5,bgW,gY+cH*5);

/* Sol / UV indicator */
if(env.light>30){const sunX=wCx+cW*0.35,sunY=gY*0.2;ctx.fillStyle=`rgba(255,220,50,${env.light*0.006})`;ctx.beginPath();ctx.arc(sunX,sunY,15+env.light*0.1,0,Math.PI*2);ctx.fill();if(env.uv>20){ctx.strokeStyle=`rgba(168,85,247,${env.uv*0.005})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(sunX,sunY,25+env.light*0.1,0,Math.PI*2);ctx.stroke()}}

/* Nuvens */
ctx.fillStyle=`rgba(255,255,255,${0.04+(100-env.light)*0.0005})`;
for(let i=0;i<4;i++){const cx=wCx+Math.sin(i*2.1+now*0.00002)*cW*0.5,cy=gY*0.3+Math.cos(i*1.3)*gY*0.12;ctx.beginPath();ctx.ellipse(cx,cy,50+i*12,10+i*2,0,0,Math.PI*2);ctx.fill()}

/* ═══ SOLO BEM ESCURO ═══ */
const dryPct=1-(env.moist/100);
const darkBase=env.soil==='sandy'?[45,35,25]:env.soil==='clay'?[30,18,12]:[35,25,18];
ctx.fillStyle=`rgb(${darkBase[0]+dryPct*8},${darkBase[1]+dryPct*5},${darkBase[2]+dryPct*3})`;
ctx.fillRect(bgL,gY,bgW,cH*10);

/* Camadas do solo escurecendo */
const soilGrad=ctx.createLinearGradient(0,gY,0,gY+cH*1.5);
soilGrad.addColorStop(0,`rgba(${darkBase[0]+10},${darkBase[1]+8},${darkBase[2]+5},0.3)`);
soilGrad.addColorStop(0.1,"rgba(20,12,8,0.2)");
soilGrad.addColorStop(0.5,"rgba(10,6,4,0.5)");
soilGrad.addColorStop(1,"rgba(4,2,1,0.7)");
ctx.fillStyle=soilGrad;ctx.fillRect(bgL,gY,bgW,cH*10);

/* ═══ HEATMAP DE NUTRIENTES — overlay da grade espacial ═══ */
if(showHeatmap!=='off'&&grid.length>0){
  const hmKey=showHeatmap;
  /* Determinar range para normalização */
  let hmMax=0.01;
  for(let c=0;c<gCols;c++)for(let r=0;r<gRows;r++){const v=grid[c][r][hmKey]||0;if(v>hmMax)hmMax=v}
  /* Paleta por nutriente */
  const hmPal={NH4:[50,180,255],NO3:[100,255,100],PO4free:[255,140,50],Fe2:[80,200,200],Fe3:[200,100,50],organicC:[200,150,255],O2:[255,255,150]};
  const rgb=hmPal[hmKey]||[255,255,255];
  for(let c=0;c<gCols;c++){for(let r=0;r<gRows;r++){
    const v=grid[c][r][hmKey]||0;
    const norm=cl(v/hmMax,0,1);
    if(norm<0.02)continue;
    const wx=gridX0+c*GCELL,wy=gY+r*GCELL;
    ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${norm*0.45})`;
    ctx.fillRect(wx,wy,GCELL,GCELL);
  }}
  /* Contorno das células com raiz */
  if(rootCells.length>0){
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=0.5;
    for(const rc of rootCells){
      ctx.strokeRect(gridX0+rc.c*GCELL,gY+rc.r*GCELL,GCELL,GCELL);
    }
  }
  /* Legenda */
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  const lgX=cW-160,lgY2=50;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(lgX-5,lgY2-15,155,50);
  ctx.font='11px monospace';ctx.fillStyle=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  ctx.fillText('🗺 '+hmKey,lgX,lgY2);
  /* Gradient bar */
  for(let i=0;i<120;i++){const t=i/120;ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${t*0.7})`;ctx.fillRect(lgX+i,lgY2+8,1,10)}
  ctx.fillStyle='#8fa';ctx.font='9px monospace';
  ctx.fillText('0',lgX,lgY2+30);ctx.fillText(hmMax.toFixed(0),lgX+100,lgY2+30);
  ctx.restore();
}

/* Linha da superfície */
ctx.fillStyle=`rgb(${40+dryPct*40},${80-dryPct*40},20)`;ctx.fillRect(bgL,gY-2,bgW,4);

/* Textura sutil do solo */
ctx.fillStyle="rgba(255,255,255,0.015)";
for(let i=0;i<25;i++){const sx=wCx+Math.sin(i*7.3)*cW*0.9,sy=gY+15+i*14+Math.cos(i*3.1)*8;ctx.beginPath();ctx.ellipse(sx,sy,rng(1.5,4),rng(0.8,2),i*0.5,0,Math.PI*2);ctx.fill()}

/* ═══ RENDER ALL PLANTS (mãe + filhas) ═══ */
const _allPlants=[{x:wCx,bio:plant.bio,str:plant.stress,nods:plant.nodules}];
for(const bp of babyPlants){if(bp.bio>21)_allPlants.push({x:bp.x,bio:bp.bio,str:0,nods:[]})}
for(let _pi=0;_pi<_allPlants.length;_pi++){
const _pp=_allPlants[_pi],_pcx=_pp.x;
const growPct=cl((_pp.bio-20)/130,0,1),strPct=_pp.str/100;
var _s=strPct||0;
const _pRootD=20+growPct*Math.min(280,worldDepth*0.7);

/* ═══ PALETA ═══ */
const leafG = Math.round(180 - _s*100);
const leafR = Math.round(55 + _s*140);
const leafB = Math.round(40 - _s*20);
const stemR = Math.round(60 + _s*40);
const stemG = Math.round(130 - _s*35);
const stemB = Math.round(45 - _s*20);
var _rR=Math.round(150+_s*80),_rG=Math.round(120-_s*50),_rB=Math.round(80-_s*40);

const shootH = growPct * 200;
/* ═══ LARGURA no colo — FINA (proporcional soja) ═══ */
const collarW = 1.8 + growPct * 2.2; /* max ~4px — caule fino como soja */

if(shootH > 3){
  const stemTopW = 0.7 + growPct * 0.5;
  
  /* ═══ Pontos do caule — partem de _pcx exato ═══ */
  const stemPts = [];
  const nSeg = 20;
  for(let i=0; i<=nSeg; i++){
    const t = i/nSeg;
    /* Sinuosidade sutil — zero na base para alinhar com raiz */
    const sway = Math.sin(t*2.5 + growPct*1.2) * 2.5 * growPct * t;
    stemPts.push({
      x: _pcx + sway,
      y: gY - shootH * t,
      w: collarW*(1-t) + stemTopW*t
    });
  }
  
  /* ═══ CAULE — polígono contínuo ═══ */
  const leftEdge = [], rightEdge = [];
  for(let i=0; i<stemPts.length; i++){
    const p = stemPts[i];
    const next = stemPts[Math.min(i+1, stemPts.length-1)];
    const prev = stemPts[Math.max(i-1, 0)];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    const nx = -dy/len, ny = dx/len;
    leftEdge.push({ x: p.x + nx*p.w, y: p.y + ny*p.w });
    rightEdge.push({ x: p.x - nx*p.w, y: p.y - ny*p.w });
  }
  
  const stemGrad = ctx.createLinearGradient(_pcx, gY, _pcx, gY - shootH);
  stemGrad.addColorStop(0, `rgb(${stemR+10},${stemG-10},${stemB})`);
  stemGrad.addColorStop(0.4, `rgb(${stemR-5},${stemG+10},${stemB+5})`);
  stemGrad.addColorStop(1, `rgb(${stemR-15},${stemG+30},${stemB+10})`);
  
  ctx.fillStyle = stemGrad;
  ctx.beginPath();
  ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
  for(let i=1; i<leftEdge.length; i++) ctx.lineTo(leftEdge[i].x, leftEdge[i].y);
  for(let i=rightEdge.length-1; i>=0; i--) ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
  ctx.closePath();
  ctx.fill();
  
  /* Highlight mediano */
  ctx.strokeStyle = `rgba(${stemR+40},${stemG+45},${stemB+25},0.12)`;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(stemPts[0].x, stemPts[0].y);
  for(const sp of stemPts) ctx.lineTo(sp.x, sp.y);
  ctx.stroke();
  
  var nLeaves = Math.min(10, Math.floor(growPct * 11));
  
  /* ═══ FOLHAS OVADAS (tipo soja — base larga, ponta afilada) ═══ */
  for(var li=0; li<nLeaves; li++){
    const leafFrac = (li+1)/(nLeaves+1);
    const leafAge = cl((growPct - li*0.06)*3.5, 0, 1);
    if(leafAge < 0.1) continue;
    
    const segIdx = Math.min(stemPts.length-2, Math.floor(leafFrac * (stemPts.length-1)));
    const segT = (leafFrac * (stemPts.length-1)) - segIdx;
    const attachX = stemPts[segIdx].x*(1-segT) + stemPts[segIdx+1].x*segT;
    const attachY = stemPts[segIdx].y*(1-segT) + stemPts[segIdx+1].y*segT;
    const attachW = stemPts[segIdx].w*(1-segT) + stemPts[segIdx+1].w*segT;
    
    /* Nó */
    ctx.fillStyle = `rgba(${stemR-10},${stemG-5},${stemB},0.35)`;
    ctx.beginPath(); ctx.ellipse(attachX, attachY, attachW+0.3, 0.8, 0, 0, Math.PI*2); ctx.fill();
    
    const side = (li % 2 === 0) ? -1 : 1;
    /* FOLHAS GRANDES — proporção soja */
    const leafLen = (25 + leafAge * 40) * (1 - leafFrac*0.2);
    const leafW = leafLen * 0.36; /* mais larga que antes (ovada) */
    const pecLen = 4 + leafAge * 7;
    
    /* Ângulo filotáxico — folhas saem ~45° para fora e levemente para cima */
    const nodeAngle = -0.65 + leafFrac*0.1;
    const pecEndX = attachX + side * (attachW + pecLen * Math.cos(nodeAngle));
    const pecEndY = attachY + pecLen * Math.sin(nodeAngle);
    
    /* Pecíolo */
    ctx.strokeStyle = `rgb(${stemR+5},${stemG+8},${stemB})`;
    ctx.lineWidth = 0.7 + leafAge * 0.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(attachX + side*attachW, attachY);
    ctx.lineTo(pecEndX, pecEndY);
    ctx.stroke();
    
    /* Ângulo da lâmina */
    const bladeAngle = Math.atan2(-0.5, side) + (1-leafAge)*0.15*side;
    const tipX = pecEndX + Math.cos(bladeAngle) * leafLen;
    const tipY = pecEndY + Math.sin(bladeAngle) * leafLen;
    
    /* Cores */
    const lR = leafR + Math.round((1-leafAge)*30);
    const lG = leafG + Math.round(leafAge*12 - leafFrac*20);
    const lB = leafB + Math.round(leafAge*6);
    
    const lgrd = ctx.createLinearGradient(pecEndX,pecEndY,tipX,tipY);
    lgrd.addColorStop(0, `rgba(${lR+15},${lG+10},${lB+3},${0.88*leafAge})`);
    lgrd.addColorStop(0.35, `rgba(${lR},${lG},${lB},${0.92*leafAge})`);
    lgrd.addColorStop(1, `rgba(${lR-12},${lG-18},${lB},${0.78*leafAge})`);
    ctx.fillStyle = lgrd;
    
    /* Forma OVADA: base larga arredondada, maior largura no 1/3 inferior, ponta afilada */
    const perpX = Math.cos(bladeAngle + Math.PI/2);
    const perpY = Math.sin(bladeAngle + Math.PI/2);
    
    ctx.beginPath();
    ctx.moveTo(pecEndX, pecEndY);
    /* Lado A — base larga, alargamento rápido, afinamento gradual até ponta */
    ctx.bezierCurveTo(
      pecEndX + (tipX-pecEndX)*0.12 + perpX*leafW*0.85,  /* cp1: abre rápido */
      pecEndY + (tipY-pecEndY)*0.12 + perpY*leafW*0.85,
      pecEndX + (tipX-pecEndX)*0.45 + perpX*leafW*1.05,  /* cp2: max largura ~35% */
      pecEndY + (tipY-pecEndY)*0.45 + perpY*leafW*1.05,
      tipX, tipY
    );
    /* Lado B — espelho */
    ctx.bezierCurveTo(
      pecEndX + (tipX-pecEndX)*0.45 - perpX*leafW*1.05,
      pecEndY + (tipY-pecEndY)*0.45 - perpY*leafW*1.05,
      pecEndX + (tipX-pecEndX)*0.12 - perpX*leafW*0.85,
      pecEndY + (tipY-pecEndY)*0.12 - perpY*leafW*0.85,
      pecEndX, pecEndY
    );
    ctx.closePath();
    ctx.fill();
    
    /* Nervura central */
    ctx.strokeStyle = `rgba(${lR-8},${lG+22},${lB+8},${0.4*leafAge})`;
    ctx.lineWidth = 0.4 + leafAge*0.3;
    ctx.beginPath(); ctx.moveTo(pecEndX, pecEndY); ctx.lineTo(tipX, tipY); ctx.stroke();
    
    /* Nervuras laterais penadas */
    if(leafAge > 0.3 && leafLen > 16){
      const nVeins = Math.min(7, Math.floor(leafLen/5));
      ctx.strokeStyle = `rgba(${lR-3},${lG+16},${lB+4},${0.15*leafAge})`;
      ctx.lineWidth = 0.2;
      for(let vi=0; vi<nVeins; vi++){
        const vf = (vi+1)/(nVeins+1);
        const vx = pecEndX + (tipX-pecEndX)*vf;
        const vy = pecEndY + (tipY-pecEndY)*vf;
        /* Largura ovada: max no 1/3 inferior */
        const ovateProfile = Math.sin(Math.pow(vf,0.6) * Math.PI);
        const localW = leafW * ovateProfile * 0.9;
        const vBaseAngle = bladeAngle + Math.PI/2;
        const vTilt = 0.3 + vf*0.15;
        ctx.beginPath(); ctx.moveTo(vx,vy);
        ctx.quadraticCurveTo(
          vx + Math.cos(vBaseAngle+vTilt)*localW*0.5,
          vy + Math.sin(vBaseAngle+vTilt)*localW*0.5,
          vx + Math.cos(vBaseAngle+vTilt*1.4)*localW*0.85,
          vy + Math.sin(vBaseAngle+vTilt*1.4)*localW*0.85
        ); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(vx,vy);
        ctx.quadraticCurveTo(
          vx - Math.cos(vBaseAngle-vTilt)*localW*0.5,
          vy - Math.sin(vBaseAngle-vTilt)*localW*0.5,
          vx - Math.cos(vBaseAngle-vTilt*1.4)*localW*0.85,
          vy - Math.sin(vBaseAngle-vTilt*1.4)*localW*0.85
        ); ctx.stroke();
      }
    }
  }
  
  /* ═══ FLORES — maiores, com pedúnculo ═══ */
  if(growPct > 0.55){
    const nFlowers = Math.min(4, Math.floor((growPct-0.5)*10));
    for(let fi2=0; fi2<nFlowers; fi2++){
      const fIdx = nLeaves - 1 - fi2;
      if(fIdx < 1) continue;
      const fFrac = (fIdx+1)/(nLeaves+1);
      const fSeg = Math.min(stemPts.length-2, Math.floor(fFrac*(stemPts.length-1)));
      const fT = (fFrac*(stemPts.length-1))-fSeg;
      const fX = stemPts[fSeg].x*(1-fT) + stemPts[fSeg+1].x*fT;
      const fY = stemPts[fSeg].y*(1-fT) + stemPts[fSeg+1].y*fT;
      const fW = stemPts[fSeg].w*(1-fT) + stemPts[fSeg+1].w*fT;
      const fSide = (fIdx%2===0) ? -1 : 1;
      const fAge = cl((growPct-0.55-fi2*0.05)*5, 0, 1);
      if(fAge < 0.1) continue;
      
      /* Pedúnculo */
      const pedLen = 10 + fAge*8;
      const pedAngle = -0.7 + fAge*0.25;
      const fCx = fX + fSide*(fW + pedLen*Math.cos(pedAngle));
      const fCy = fY + pedLen*Math.sin(pedAngle);
      ctx.strokeStyle = `rgb(${stemR+5},${stemG+10},${stemB})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(fX+fSide*fW, fY);
      ctx.quadraticCurveTo(fX+fSide*(fW+5),fY-3,fCx,fCy); ctx.stroke();
      
      /* Pétalas GRANDES — proporção soja */
      const petalR = 5 + fAge*6;
      const baseHue = 50 + fi2*55;
      
      for(let pi=0; pi<5; pi++){
        const pa = pi*Math.PI*2/5 - Math.PI/2 + now*0.00015;
        const pdx = Math.cos(pa), pdy = Math.sin(pa);
        const pTipX = fCx + pdx*petalR*1.4;
        const pTipY = fCy + pdy*petalR*1.4;
        const perpPX = -pdy, perpPY = pdx;
        const pW = petalR*0.5;
        
        ctx.globalAlpha = 0.8*fAge;
        const pGrad = ctx.createRadialGradient(fCx,fCy,petalR*0.2,fCx,fCy,petalR*1.6);
        pGrad.addColorStop(0, `hsl(${baseHue},${70+fAge*15}%,${82-fAge*8}%)`);
        pGrad.addColorStop(1, `hsl(${baseHue+12},${60}%,${72-fAge*5}%)`);
        ctx.fillStyle = pGrad;
        
        ctx.beginPath();
        ctx.moveTo(fCx, fCy);
        ctx.bezierCurveTo(
          fCx + pdx*petalR*0.35 + perpPX*pW, fCy + pdy*petalR*0.35 + perpPY*pW,
          pTipX + perpPX*pW*0.35, pTipY + perpPY*pW*0.35,
          pTipX, pTipY
        );
        ctx.bezierCurveTo(
          pTipX - perpPX*pW*0.35, pTipY - perpPY*pW*0.35,
          fCx + pdx*petalR*0.35 - perpPX*pW, fCy + pdy*petalR*0.35 - perpPY*pW,
          fCx, fCy
        );
        ctx.closePath(); ctx.fill();
      }
      /* Centro */
      ctx.globalAlpha = 0.9*fAge;
      ctx.fillStyle = '#d97706';
      ctx.beginPath(); ctx.arc(fCx, fCy, petalR*0.25, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(fCx, fCy, petalR*0.13, 0, Math.PI*2); ctx.fill();
      /* Sépalas */
      ctx.fillStyle = `rgba(${stemR-10},${stemG+20},${stemB},${0.35*fAge})`;
      for(let si=0; si<5; si++){
        const sa = si*Math.PI*2/5 + Math.PI/5 - Math.PI/2 + now*0.00015;
        ctx.beginPath();
        ctx.moveTo(fCx + Math.cos(sa)*petalR*0.3, fCy + Math.sin(sa)*petalR*0.3);
        ctx.lineTo(fCx + Math.cos(sa-0.12)*petalR*1.5, fCy + Math.sin(sa-0.12)*petalR*1.5);
        ctx.lineTo(fCx + Math.cos(sa+0.12)*petalR*1.5, fCy + Math.sin(sa+0.12)*petalR*1.5);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  
  /* ═══ VAGENS LOBULADAS (forma soja — sementes visíveis) ═══ */
  if(growPct > 0.7){
    const nFruits = Math.min(6, Math.floor((growPct-0.65)*16));
    for(let pi=0; pi<nFruits; pi++){
      const pIdx = Math.floor(nLeaves*0.15)+pi;
      if(pIdx>=nLeaves) continue;
      const pFrac = (pIdx+1)/(nLeaves+1);
      const pSeg = Math.min(stemPts.length-2, Math.floor(pFrac*(stemPts.length-1)));
      const pT = (pFrac*(stemPts.length-1))-pSeg;
      const pX = stemPts[pSeg].x*(1-pT) + stemPts[pSeg+1].x*pT;
      const pY = stemPts[pSeg].y*(1-pT) + stemPts[pSeg+1].y*pT;
      const pW = stemPts[pSeg].w*(1-pT) + stemPts[pSeg+1].w*pT;
      const pSide = (pIdx%2===0) ? -1 : 1;
      const pMat = cl((growPct-0.72-pi*0.02)*4, 0, 1);
      
      /* Pedúnculo */
      const podPedLen = 6 + growPct*5;
      const podHangAngle = 0.4 + pMat*0.6;
      const podBaseX = pX + pSide*(pW + podPedLen*0.6);
      const podBaseY = pY + podPedLen*Math.sin(podHangAngle);
      
      ctx.strokeStyle = `rgb(${stemR},${stemG},${stemB})`;
      ctx.lineWidth = 0.5 + pMat*0.2;
      ctx.beginPath(); ctx.moveTo(pX+pSide*pW, pY);
      ctx.quadraticCurveTo(pX+pSide*(pW+3),pY+2,podBaseX, podBaseY); ctx.stroke();
      
      /* Parâmetros da vagem */
      const podLen = 18 + growPct*22 + pMat*8;
      const podW = 4.5 + pMat*4.5;
      const podAngle = podHangAngle + 0.15*pSide + 0.7;
      const nSeeds = Math.max(2, Math.min(4, Math.floor(podLen/9)));
      
      /* Vetores ao longo e perpendicular à vagem */
      const adx = Math.cos(podAngle), ady = Math.sin(podAngle);
      const ppX = -ady, ppY = adx; /* perpendicular */
      
      /* Cor: verde → amarelo-dourado */
      const frR = Math.round(80 + pMat*140);
      const frG = Math.round(150 - pMat*30);
      const frB = Math.round(40 + pMat*10);
      
      /* ── Gerar pontos do contorno lobulado ── */
      /* Eixo da vagem: de podBase até podTip */
      const nPts = nSeeds * 8 + 2; /* resolução por semente */
      const dorsalPts = [], ventralPts = [];
      
      for(let k=0; k<=nPts; k++){
        const t = k/nPts; /* 0→1 ao longo da vagem */
        const cx = podBaseX + adx*podLen*t;
        const cy = podBaseY + ady*podLen*t;
        
        /* Envelope: afina nas pontas (forma de losango suave) */
        const envelope = Math.sin(t * Math.PI) * (t < 0.15 ? t/0.15 : 1) * (t > 0.9 ? (1-t)/0.1 : 1);
        
        /* Lobulação: oscilação senoidal com pico em cada semente */
        const seedPhase = t * nSeeds;
        const lobe = 0.65 + 0.35 * Math.pow(Math.sin(seedPhase * Math.PI), 2);
        
        /* Largura final neste ponto */
        const w = podW * envelope * lobe;
        
        /* Lado dorsal (mais convexo) e ventral (menos) */
        dorsalPts.push({
          x: cx + ppX * w * 1.1,
          y: cy + ppY * w * 1.1
        });
        ventralPts.push({
          x: cx - ppX * w * 0.7,
          y: cy - ppY * w * 0.7
        });
      }
      
      /* ── Desenhar vagem como polígono suavizado ── */
      const podGrad = ctx.createLinearGradient(podBaseX,podBaseY,
        podBaseX+adx*podLen,podBaseY+ady*podLen);
      podGrad.addColorStop(0, `rgb(${frR-8},${frG+8},${frB})`);
      podGrad.addColorStop(0.5, `rgb(${frR},${frG},${frB})`);
      podGrad.addColorStop(1, `rgb(${frR-12},${frG-8},${frB-3})`);
      ctx.fillStyle = podGrad;
      
      ctx.beginPath();
      ctx.moveTo(dorsalPts[0].x, dorsalPts[0].y);
      /* Lado dorsal → */
      for(let k=1; k<dorsalPts.length; k++){
        /* Suavizar com média entre pontos adjacentes */
        if(k < dorsalPts.length-1){
          const mx = (dorsalPts[k].x + dorsalPts[k+1].x)*0.5;
          const my = (dorsalPts[k].y + dorsalPts[k+1].y)*0.5;
          ctx.quadraticCurveTo(dorsalPts[k].x, dorsalPts[k].y, mx, my);
        } else {
          ctx.lineTo(dorsalPts[k].x, dorsalPts[k].y);
        }
      }
      /* Ponta */
      const podTipX = podBaseX + adx*podLen;
      const podTipY = podBaseY + ady*podLen;
      ctx.lineTo(podTipX, podTipY);
      /* Lado ventral ← (inverso) */
      for(let k=ventralPts.length-1; k>=0; k--){
        if(k > 0){
          const mx = (ventralPts[k].x + ventralPts[k-1].x)*0.5;
          const my = (ventralPts[k].y + ventralPts[k-1].y)*0.5;
          ctx.quadraticCurveTo(ventralPts[k].x, ventralPts[k].y, mx, my);
        } else {
          ctx.lineTo(ventralPts[k].x, ventralPts[k].y);
        }
      }
      ctx.closePath();
      ctx.fill();
      
      /* ── Contorno sutil ── */
      ctx.strokeStyle = `rgba(${frR-30},${frG-20},${frB-5},${0.25+pMat*0.15})`;
      ctx.lineWidth = 0.3;
      ctx.stroke();
      
      /* ── Sutura dorsal (linha de deiscência ao longo do topo) ── */
      ctx.strokeStyle = `rgba(${frR-20},${frG-12},${frB},${0.4+pMat*0.3})`;
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      for(let k=0; k<=nPts; k++){
        const t = k/nPts;
        const cx = podBaseX + adx*podLen*t;
        const cy = podBaseY + ady*podLen*t;
        const envelope = Math.sin(t * Math.PI) * (t < 0.15 ? t/0.15 : 1) * (t > 0.9 ? (1-t)/0.1 : 1);
        const seedPhase = t * nSeeds;
        const lobe = 0.65 + 0.35 * Math.pow(Math.sin(seedPhase * Math.PI), 2);
        const w = podW * envelope * lobe;
        const sx = cx + ppX * w * 0.35;
        const sy = cy + ppY * w * 0.35;
        if(k===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
      }
      ctx.stroke();
      
      /* ── Constrições entre sementes (linhas transversais sutis) ── */
      ctx.strokeStyle = `rgba(${frR-25},${frG-15},${frB},${0.2+pMat*0.2})`;
      ctx.lineWidth = 0.25;
      for(let si=1; si<nSeeds; si++){
        const t = si/nSeeds;
        const cx = podBaseX + adx*podLen*t;
        const cy = podBaseY + ady*podLen*t;
        const envelope = Math.sin(t * Math.PI);
        const w = podW * envelope * 0.65; /* constrição = ponto mínimo */
        ctx.beginPath();
        ctx.moveTo(cx + ppX*w*0.9, cy + ppY*w*0.9);
        ctx.lineTo(cx - ppX*w*0.5, cy - ppY*w*0.5);
        ctx.stroke();
      }
      
      /* ── Highlights nas sementes (brilho circular) ── */
      for(let si=0; si<nSeeds; si++){
        const seedT = (si+0.5)/nSeeds;
        const sx = podBaseX + adx*podLen*seedT;
        const sy = podBaseY + ady*podLen*seedT;
        const seedEnv = Math.sin(seedT * Math.PI);
        const seedR = podW * seedEnv * 0.4;
        /* Highlight deslocado para o dorsal */
        const hx = sx + ppX*seedR*0.6;
        const hy = sy + ppY*seedR*0.6;
        const hGrad = ctx.createRadialGradient(hx,hy,0,hx,hy,seedR*1.2);
        hGrad.addColorStop(0, `rgba(${Math.min(255,frR+40)},${Math.min(255,frG+25)},${frB+15},${0.25*pMat+0.08})`);
        hGrad.addColorStop(1, `rgba(${frR},${frG},${frB},0)`);
        ctx.fillStyle = hGrad;
        ctx.beginPath(); ctx.arc(hx, hy, seedR*1.2, 0, Math.PI*2); ctx.fill();
      }
      
      /* ── Estilete (ponta seca) ── */
      ctx.strokeStyle = `rgba(${frR-10},${frG-15},${frB},0.4)`;
      ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.moveTo(podTipX, podTipY);
      ctx.lineTo(podTipX+adx*4, podTipY+ady*4); ctx.stroke();
      
      /* ── Base (cálice seco) ── */
      ctx.strokeStyle = `rgba(${stemR},${stemG+10},${stemB},0.3)`;
      ctx.lineWidth = 0.3;
      const bx = podBaseX, by = podBaseY;
      ctx.beginPath();
      ctx.moveTo(bx-ppX*1.5-adx*1, by-ppY*1.5-ady*1);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx+ppX*1.5-adx*1, by+ppY*1.5-ady*1);
      ctx.stroke();
    }
  }
  
  /* Gema apical */
  if(growPct < 0.95){
    const apexX = stemPts[stemPts.length-1].x;
    const apexY = stemPts[stemPts.length-1].y;
    ctx.fillStyle = `rgb(${leafR+40},${leafG+50},${leafB+25})`;
    ctx.beginPath();
    ctx.ellipse(apexX-1.2, apexY-2, 1.2, 3.5, -0.15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(apexX+1.2, apexY-2, 1.2, 3.5, 0.15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgb(${leafR+50},${leafG+60},${leafB+30})`;
    ctx.beginPath(); ctx.arc(apexX, apexY-1, 1.2, 0, Math.PI*2); ctx.fill();
  }
}

/* ═══ RAIZ PIVOTANTE — alinhada com caule em _pcx ═══ */
var rootCol='rgb('+_rR+','+_rG+','+_rB+')';
ctx.lineCap="round";

/* Pontos da raiz — partem de _pcx exato (= base do caule) */
const rootPts = [];
const nRSeg = 16;
for(let i=0; i<=nRSeg; i++){
  const t = i/nRSeg;
  /* Sinuosidade suave, zero na base para alinhar com caule */
  const rx = _pcx + Math.sin(i*0.55+0.5)*4*growPct*t;
  const ry = gY + _pRootD*t;
  const rw = collarW * Math.pow(1-t*0.93, 0.65);
  rootPts.push({x:rx, y:ry, w:Math.max(0.3,rw)});
}

/* Polígono contínuo */
const rLeft=[], rRight=[];
for(let i=0; i<rootPts.length; i++){
  const p = rootPts[i];
  const next = rootPts[Math.min(i+1, rootPts.length-1)];
  const prev = rootPts[Math.max(i-1, 0)];
  const dx = next.x-prev.x, dy = next.y-prev.y;
  const len = Math.sqrt(dx*dx+dy*dy)||1;
  const nx = -dy/len, ny = dx/len;
  rLeft.push({x:p.x+nx*p.w, y:p.y+ny*p.w});
  rRight.push({x:p.x-nx*p.w, y:p.y-ny*p.w});
}

const rootGrad = ctx.createLinearGradient(_pcx, gY, _pcx, gY+_pRootD);
rootGrad.addColorStop(0, `rgb(${_rR},${_rG},${_rB})`);
rootGrad.addColorStop(0.5, `rgb(${_rR+8},${_rG-6},${_rB-3})`);
rootGrad.addColorStop(1, `rgb(${_rR+12},${_rG-12},${_rB-8})`);
ctx.fillStyle = rootGrad;
ctx.beginPath();
ctx.moveTo(rLeft[0].x, rLeft[0].y);
for(let i=1; i<rLeft.length; i++) ctx.lineTo(rLeft[i].x, rLeft[i].y);
for(let i=rRight.length-1; i>=0; i--) ctx.lineTo(rRight[i].x, rRight[i].y);
ctx.closePath();
ctx.fill();

/* ═══ RAÍZES LATERAIS — posição calculada da linha central real ═══ */
/* Função helper: encontra x da raiz central em profundidade y */
function rootCenterXAt(yTarget){
  for(let i=0; i<rootPts.length-1; i++){
    if(rootPts[i].y <= yTarget && rootPts[i+1].y >= yTarget){
      const t = (yTarget - rootPts[i].y) / (rootPts[i+1].y - rootPts[i].y + 0.01);
      return rootPts[i].x*(1-t) + rootPts[i+1].x*t;
    }
  }
  return _pcx;
}
function rootWidthAt(yTarget){
  for(let i=0; i<rootPts.length-1; i++){
    if(rootPts[i].y <= yTarget && rootPts[i+1].y >= yTarget){
      const t = (yTarget - rootPts[i].y) / (rootPts[i+1].y - rootPts[i].y + 0.01);
      return rootPts[i].w*(1-t) + rootPts[i+1].w*t;
    }
  }
  return 1;
}

var _LA=[{y:18,s:-1,m:90},{y:35,s:1,m:85},{y:52,s:-1,m:78},{y:72,s:1,m:72},{y:95,s:-1,m:62},{y:120,s:1,m:55},{y:150,s:-1,m:45},{y:185,s:1,m:38},{y:225,s:-1,m:28},{y:260,s:1,m:20}];
_LA.forEach(function(L){
  if(_pRootD<L.y+8)return;
  var len=Math.min(L.m,(_pRootD-L.y)*1.3)*growPct;
  if(len<3)return;
  
  var sy=gY+L.y;
  /* Posição X real da raiz central nesta profundidade */
  var sx=rootCenterXAt(sy);
  var rw=rootWidthAt(sy);
  /* Raiz lateral sai da BORDA da raiz central (não do centro) */
  var startX = sx + L.s * rw;
  
  var ex=startX+len*L.s, ey=sy+len*0.35;
  /* Espessura proporcional — mais fina que raiz central */
  var lw = cl(1.8+growPct*1.5-L.y*0.004,0.6,3);
  ctx.lineWidth=lw; ctx.strokeStyle=rootCol;
  ctx.beginPath();ctx.moveTo(startX,sy);
  ctx.quadraticCurveTo(startX+(len*0.5)*L.s,sy+len*0.1,ex,ey);ctx.stroke();
  
  /* Sub-raízes (secundárias) */
  if(growPct>0.25&&len>15){
    var nS2=Math.min(5,Math.floor((len-10)/12));
    for(var si=1;si<=nS2;si++){
      var fr=si/(nS2+1);
      var mx=startX+(ex-startX)*fr, my=sy+(ey-sy)*fr;
      var sL=len*0.35*(1-fr*0.5);
      /* Sub-raízes saem PARA FORA da lateral (alternando para cima e para baixo) */
      var subAngle = Math.atan2(ey-sy, (ex-startX)) + (si%2===0 ? 0.6 : -0.4);
      var subEx = mx + Math.cos(subAngle)*sL*0.7;
      var subEy = my + Math.sin(subAngle)*sL*0.7;
      
      ctx.lineWidth=cl(0.8+growPct*0.5,0.3,1.4);
      ctx.strokeStyle='rgba('+_rR+','+_rG+','+_rB+',0.65)';
      ctx.beginPath();ctx.moveTo(mx,my);
      ctx.quadraticCurveTo(mx+(subEx-mx)*0.4,my+(subEy-my)*0.3,subEx,subEy);ctx.stroke();
      
      /* Raízes terciárias */
      if(growPct>0.4&&sL>6){
        ctx.lineWidth=0.3;
        ctx.strokeStyle='rgba('+_rR+','+_rG+','+_rB+',0.2)';
        for(var hi=0;hi<Math.min(3,Math.floor(sL/6));hi++){
          var hf=(hi+0.5)/3;
          var hx2=mx+(subEx-mx)*hf, hy2=my+(subEy-my)*hf;
          var hAngle = subAngle + (hi%2?0.5:-0.5);
          ctx.beginPath();ctx.moveTo(hx2,hy2);
          ctx.lineTo(hx2+Math.cos(hAngle)*3,hy2+Math.sin(hAngle)*3);ctx.stroke();
        }
      }
    }
  }
  
  /* Pelos radiculares — apontam PARA FORA da raiz lateral */
  if(growPct>0.35&&len>12){
    ctx.lineWidth=0.3;
    ctx.strokeStyle='rgba('+_rR+','+_rG+','+_rB+',0.18)';
    var latAngle = Math.atan2(ey-sy, ex-startX);
    for(var hp=0;hp<Math.min(7,Math.floor(len/8));hp++){
      var hf3=(hp+0.5)/7;
      var hpx=startX+(ex-startX)*hf3, hpy=sy+(ey-sy)*hf3;
      /* Perpendicular à raiz lateral, apontando para fora */
      var hairAngle = latAngle + (hp%2 ? Math.PI/2 : -Math.PI/2) + (Math.random()-0.5)*0.3;
      ctx.beginPath();ctx.moveTo(hpx,hpy);
      ctx.lineTo(hpx+Math.cos(hairAngle)*2.5,hpy+Math.sin(hairAngle)*2.5);ctx.stroke();
    }
  }
});
_pp.nods.forEach(function(nd){if(!nd.nodOff)return;var nx=_pcx+nd.nodOff.x,ny=gY+nd.nodOff.y*growPct*2.5;if(ny<gY||ny>gY+_pRootD+10)return;
  ctx.fillStyle='rgba(234,179,8,0.7)';ctx.beginPath();ctx.arc(nx,ny,2.5+growPct*2,0,Math.PI*2);ctx.fill()});

/* Gradiente exsudato - sutil */
const exG=ctx.createRadialGradient(_pcx,gY+_pRootD*0.5,3,_pcx,gY+_pRootD*0.5,_pRootD*0.7);
exG.addColorStop(0,'rgba(180,140,50,'+(0.04+(_pp.str||0)*0.0005)+')');exG.addColorStop(1,"rgba(0,0,0,0)");
ctx.fillStyle=exG;ctx.fillRect(_pcx-_pRootD,gY,_pRootD*2,_pRootD+30);

} /* end _allPlants loop */

/* ═══ SEMENTES CAINDO / ROLANDO ═══ */
for(const sd of seeds){
  const pulse=sd.state==='resting'?1+0.15*Math.sin(sd.restAge*0.05):1;
  const al=sd.state==='resting'?0.7+0.3*Math.sin(sd.restAge*0.03):0.9;
  ctx.save();ctx.translate(sd.x,sd.y);
  if(sd.state==='falling'||sd.state==='rolling'){
    ctx.rotate(Math.atan2(sd.vy||0,sd.vx||0.01)+sd.age*0.15);
  }
  /* Semente de soja: oval achatada, amarelo-dourado */
  const sr=sd.sz*pulse;
  const seedGrad=ctx.createRadialGradient(-sr*0.2,-sr*0.2,0,0,0,sr*1.3);
  seedGrad.addColorStop(0,`hsla(${sd.hue},70%,65%,${al})`);
  seedGrad.addColorStop(0.6,`hsla(${sd.hue},60%,50%,${al})`);
  seedGrad.addColorStop(1,`hsla(${sd.hue-10},50%,35%,${al*0.8})`);
  ctx.fillStyle=seedGrad;
  ctx.beginPath();ctx.ellipse(0,0,sr*1.3,sr*0.9,0,0,Math.PI*2);ctx.fill();
  /* Hilo (cicatriz da semente) */
  ctx.strokeStyle=`hsla(30,40%,30%,${al*0.5})`;ctx.lineWidth=0.3;
  ctx.beginPath();ctx.ellipse(sr*0.3,0,sr*0.3,sr*0.15,0.2,0,Math.PI*2);ctx.stroke();
  /* Brilho de germinação */
  if(sd.state==='resting'&&sd.restAge>100){
    const gAl=cl((sd.restAge-100)/100,0,0.4);
    ctx.fillStyle=`rgba(120,255,120,${gAl*Math.abs(Math.sin(sd.restAge*0.04))})`;
    ctx.beginPath();ctx.arc(0,-sr*0.5,sr*0.5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}


/* ═══ Borda visual do mundo (sutil) ═══ */
ctx.strokeStyle='rgba(74,222,128,0.08)';ctx.lineWidth=1;ctx.setLineDash([4,8]);
ctx.strokeRect(wCx-worldWidth/2,gY,worldWidth,worldDepth);ctx.setLineDash([]);

/* Faixa de luz no solo — autótrofos */
if(env.light>20){const lightGrad=ctx.createLinearGradient(0,gY,0,gY+60);lightGrad.addColorStop(0,`rgba(255,255,200,${env.light*0.0005})`);lightGrad.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=lightGrad;ctx.fillRect(bgL,gY,bgW,60)}

/* Exsudatos e Detritos */
fd.forEach(f=>{const p=1+.1*Math.sin(now*.002+f.ph);const eAlpha=cl(0.5*(1-f.age/1200),0.05,0.5);
  if(f.det){/* Detritos: marrom/âmbar, formato irregular */
    ctx.fillStyle=`hsl(${f.hue},45%,35%)`;ctx.globalAlpha=eAlpha*0.7;
    ctx.beginPath();
    const dsz=f.sz*p*1.2;
    ctx.moveTo(f.x-dsz,f.y);ctx.lineTo(f.x-dsz*0.3,f.y-dsz*0.8);ctx.lineTo(f.x+dsz*0.5,f.y-dsz*0.3);ctx.lineTo(f.x+dsz,f.y+dsz*0.2);ctx.lineTo(f.x+dsz*0.2,f.y+dsz*0.7);ctx.closePath();ctx.fill();
  } else {/* Exsudatos: amarelo brilhante, circular */
    ctx.fillStyle='#fcd34d';ctx.globalAlpha=eAlpha;ctx.beginPath();ctx.arc(f.x,f.y,f.sz*p,0,Math.PI*2);ctx.fill();
  }});ctx.globalAlpha=1;

/* Organismos */
for(const s of sw)s.draw(ctx,now);

/* Partículas */
for(const p of fx){
  const a = p.life / 20;
  if (p.type === 'part') {
    var pa = p.life/80;
    ctx.fillStyle = p.color; 
    ctx.globalAlpha = pa*0.7;
    ctx.beginPath(); 
    ctx.arc(p.x, p.y, (p.sz||0.2)*(0.3+pa*0.7), 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = pa*0.15;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (p.sz||0.2)*1.5, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1; 
  } else if (p.type === 'eat') {
    ctx.fillStyle = `hsla(50,80%,65%,${a*.4})`; ctx.beginPath(); ctx.arc(p.x,p.y,1.5*(2-a),0,Math.PI*2); ctx.fill();
  } else if (p.type === 'rep') {
    ctx.strokeStyle = `hsla(200,80%,65%,${a*.4})`; ctx.lineWidth = .4; ctx.beginPath(); ctx.arc(p.x,p.y,3*(2.5-a*2),0,Math.PI*2); ctx.stroke();
  } else if (p.type === 'pred') {
    ctx.fillStyle = `hsla(30,90%,55%,${a*.6})`; ctx.beginPath(); ctx.arc(p.x,p.y,3*(2-a),0,Math.PI*2); ctx.fill();
  } else if (p.type === 'shield') {
    ctx.strokeStyle = `hsla(180,80%,60%,${a*.5})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(p.x,p.y,5*(2-a),0,Math.PI*2); ctx.stroke();
  } else {
    ctx.fillStyle = `hsla(0,80%,50%,${a*.4})`; ctx.beginPath(); ctx.arc(p.x,p.y,2*(2-a),0,Math.PI*2); ctx.fill();
  }
}
}


/* UI */
function updBar(id,val,mx){const bg=document.getElementById('b'+id),tx=document.getElementById('t'+id);if(!bg)return;bg.style.width=cl((val/mx)*100,0,100)+'%';tx.textContent=Math.round(val)}
function updSB(id,val,mx){const bg=document.getElementById('sb'+id),tx=document.getElementById('sv'+id);if(!bg)return;bg.style.width=cl((val/mx)*100,0,100)+'%';tx.textContent=Math.round(val)}
function updUI(){document.getElementById('sPop').textContent=sw.length;document.getElementById('sFd').textContent=fd.length;document.getElementById('sNod').textContent=plant.nodules.length;document.getElementById('sDea').textContent=nD;document.getElementById('sBir').textContent=nB;document.getElementById('sSdl').textContent=seeds.length+'+'+babyPlants.length;
document.getElementById('sLim').textContent=plant.limitFactor;document.getElementById('sLim').style.color=plant.limitFactor==='N'?'#3b82f6':plant.limitFactor==='P'?'#f97316':'#06b6d4';
updBar('Bio',plant.bio,150);updBar('N',plant.n,100);updBar('P',plant.p,100);updBar('Fe',plant.fe,100);updBar('AIA',plant.aia,100);updBar('Str',plant.stress,100);
updSB('Corg',soil.organicC,1500);updSB('NH4',soil.NH4,150);updSB('NO3',soil.NO3,150);updSB('Pfree',soil.PO4free,100);updSB('Pbound',soil.PO4bound,200);updSB('Fe3',soil.Fe3,100);updSB('Fe2',soil.Fe2,100);updSB('O2',soil.O2,100);
const giEl=document.getElementById('gridInfo');if(giEl)giEl.textContent=gCols+'×'+gRows+' ('+GCELL+'px) · '+rootCells.length+' raiz'}

function recH(){const gc=GUILDS.map((_,i)=>sw.filter(s=>s.g.guild===i).length);pH.push({pop:sw.length,...Object.fromEntries(gc.map((c,i)=>['g'+i,c]))});if(pH.length>150)pH=pH.slice(-150);
const svg=document.getElementById('cG'),d=pH;if(d.length<2){svg.innerHTML='<text x="50%" y="50%" text-anchor="middle" fill="#3a5a4a" font-size="9" font-family="monospace">...</text>';return}
const mY=Math.max(...d.map(x=>x.pop),5);svg.setAttribute('viewBox',`0 0 ${d.length} ${mY}`);svg.setAttribute('preserveAspectRatio','none');
let h='';for(let k=0;k<GUILDS.length;k++){const pts=d.map((x,i)=>`${i},${mY-(x['g'+k]||0)}`).join(' ');h+=`<polyline points="${pts}" fill="none" stroke="${GUILDS[k].color}" stroke-width="${mY*.035}" opacity="0.75"/>`}svg.innerHTML=h;
const tot=Math.max(1,sw.length);const morphNames={0:'━rod',1:'✳rad',2:'🜂ram',3:'▬plan',4:'🐙cef',5:'🦐art',6:'🫧ameb'};
const guildMorphOverride={11:'🤍hif',12:'🪤arm'};
document.getElementById('legG').innerHTML=GUILDS.map((g,i)=>{const mId=MORPH_GUILD[i];const mStr=guildMorphOverride[i]||(mId.length===1?morphNames[mId[0]]:'mix');return`<span style="color:${g.color}" title="${g.fn}">●${g.name}(${mStr}) ${Math.round((gc[i]/tot)*100)}%</span>`}).join('')}

const MN=["Sin.","Rad.","Ram.","Plan.","Cef.","Art.","Ameb."];
const MORPH_ICON=["━","✳","🜂","▬","🐙","🦐"]; /* ícones de morfotipo na legenda */
cv.addEventListener('click', e => {
  if (dragMoved) return;
  const rect = cv.getBoundingClientRect();
  const w = s2w(e.clientX - rect.left, e.clientY - rect.top);
  
  const selInoc = document.getElementById('selInoc');
  const inocVal = selInoc ? parseInt(selInoc.value) : -1;

  /* Modo Inoculação (Pipeta) */
  if (inocVal >= 0) {
    const spawnCount = 3; /* Adiciona 3 organismos por clique para efeito imediato */
    for (let i = 0; i < spawnCount; i++) {
      const ox = w.x + rng(-15, 15);
      const oy = w.y + rng(-15, 15);
      const newOrg = new Sw(ox, oy, mkG(inocVal));
      sw.push(newOrg);
    }
    spawnParticles(w.x, w.y, GUILDS[inocVal].color, 20);
    addEv('eB', `💉 Inoculado: ${GUILDS[inocVal].name}`);
    return; /* Interrompe a função para não selecionar nada */
  }

  /* Modo Seleção de Organismos (Original) */
  let best = null, bestD = 20 / zm;
  for (const s of sw) {
    const d = Math.hypot(w.x - s.x, w.y - s.y);
    if (d < bestD) { bestD = d; best = s; }
  }
  
  const panel = document.getElementById('selP'), grid = document.getElementById('selG');
  if (best) {
    panel.style.display = 'block';
    const g = best.g, gd = GUILDS[g.guild], fi = g.fi;
    const fiStr = Object.entries(fi).filter(([k, v]) => v > 0.1).map(([k, v]) => `${k}:${v.toFixed(2)}`).join(' ');
    grid.innerHTML = [['Tipo', gd.type, ''], ['Guilda', gd.name, gd.color], ['Morfo', MN[g.mt] || '?', '#86efac'], ['Função', gd.fn, ''], ['Trófico', gd.trophic, '#a78bfa'], ['Invest.', fiStr, ''], ['Energia', Math.round(best.e), ''], ['Geração', best.gen, '#b484f0']].map(([l, v, c]) => `<span class="l">${l}</span><span${c ? ` style="color:${c}"` : ''}>${v}</span>`).join('');
  } else {
    panel.style.display = 'none';
  }
});

/* INÍCIO DO MOTOR DA SIMULAÇÃO */
window.addEventListener('resize',resize);initW();updEnv();

/* ═══ DIAGNÓSTICO INTELIGENTE ═══ */
function updDiag(){
  var dT=document.getElementById('diagTxt'),dR=document.getElementById('diagRec');
  if(!dT||!dR)return;
  var gc=GUILDS.map(function(_,i){return sw.filter(function(s){return s.g.guild===i}).length});
  var tot=Math.max(1,sw.length);
  var pctPGPB=Math.round((gc[0]+gc[1]+gc[2]+gc[3]+gc[4]+gc[5]+gc[11]+gc[12])/tot*100);
  var pctCiano=Math.round(gc[7]/tot*100);
  var pctPred=Math.round((gc[8]+gc[9])/tot*100);
  var pctPath=Math.round(gc[6]/tot*100);
  var issues=[],recs=[];
  if(plant.n<30){issues.push('⚠ <span style="color:#f87171">N baixo ('+Math.round(plant.n)+')</span>');
    if(gc[2]<5)recs.push({g:2,txt:'💉 <b>Azospirillum</b> — fixa N₂ atmosférico',pri:3});
    if(gc[5]<3)recs.push({g:5,txt:'💉 <b>Rhizobium</b> — fixação simbiótica (nódulo)',pri:2})}
  if(plant.p<30){issues.push('⚠ <span style="color:#fb923c">P baixo ('+Math.round(plant.p)+')</span>');
    if(gc[1]<5)recs.push({g:1,txt:'💉 <b>Bacillus</b> — solubiliza P ligado',pri:3});
    if(gc[11]<3)recs.push({g:11,txt:'💉 <b>Micorriza</b> — rede hifal estende absorção P',pri:2})}
  if(plant.fe<30){issues.push('⚠ <span style="color:#60a5fa">Fe baixo ('+Math.round(plant.fe)+')</span>');
    if(gc[0]<5)recs.push({g:0,txt:'💉 <b>Pseudomonas</b> — sideróforo Fe³⁺→Fe²⁺',pri:3})}
  if(plant.aia<15){issues.push('⚠ <span style="color:#c084fc">AIA baixo ('+Math.round(plant.aia)+')</span>');
    if(gc[2]+gc[3]<5)recs.push({g:2,txt:'💉 <b>Azospirillum</b> ou <b>Methylo</b> — produz AIA',pri:1})}
  if(plant.aia>60){issues.push('🟣 <span style="color:#c084fc">AIA excesso ('+Math.round(plant.aia)+') — fitotóxico!</span>');
    recs.push({g:-1,txt:'⏳ Reduzir produtores de AIA — IAA-oxidase degradará o excesso',pri:2})}
  if(plant.stress>20){
    var stCauses=[];
    if(env.moist<30)stCauses.push('seca (💧'+env.moist+'%)');
    if(env.temp>35)stCauses.push('calor (🌡'+env.temp+'°C)');
    if(env.temp<12)stCauses.push('frio (🌡'+env.temp+'°C)');
    if(env.tox>0)stCauses.push('agroquímico (☣'+env.tox+'%)');
    if(gc[6]>tot*0.05)stCauses.push('patógenos ('+pctPath+'%)');
    if(gc[9]>tot*0.05)stCauses.push('nematóides ('+Math.round(gc[9]/tot*100)+'%)');
    if(plant.n<20)stCauses.push('N deficiente');
    if(plant.p<20)stCauses.push('P deficiente');
    if(plant.fe<20)stCauses.push('Fe deficiente');if(plant.aia>60)stCauses.push('AIA excesso (fitotóxico)');
    if(stCauses.length===0&&plant.stress>5)stCauses.push('residual (homeostase ativa)');
    if(stCauses.length===0)stCauses.push('mínimo');
    issues.push('🔴 <span style="color:#f87171">Estresse '+Math.round(plant.stress)+'%: </span>'+stCauses.join(', '))}
  if(gc[6]>tot*0.1){issues.push('🦠 <span style="color:#f87171">Patógenos: '+pctPath+'%</span>');
    if(gc[4]<5)recs.push({g:4,txt:'💉 <b>Trichoderma</b> — biocontrole antipatógeno',pri:4});
    if(gc[0]<3)recs.push({g:0,txt:'💉 <b>Pseudomonas</b> — compete por Fe com patógeno',pri:2})}
  if(gc[9]>tot*0.08){issues.push('🪱 <span style="color:#fb923c">Nematóides: '+Math.round(gc[9]/tot*100)+'%</span>');
    if(gc[12]<3)recs.push({g:12,txt:'💉 <b>Arthrobotrys</b> — fungo nematófago (armadilha)',pri:4})}
  if(gc[7]>tot*0.5){issues.push('🟢 <span style="color:#a3e635">Cianobactéria dominante: '+pctCiano+'%</span>');
    if(gc[8]<5)recs.push({g:-1,txt:'⏳ Aguarde protozoários (ou ↑UV)',pri:1})}
  if(soil.organicC<15){issues.push('⚠ <span style="color:#a78bfa">C orgânico baixo</span>')}
  if(issues.length===0){
    issues.push('✅ <span style="color:#4ade80">Planta saudável!</span> Bio: '+Math.round(plant.bio));
    if(babyPlants.length>0)issues.push('🌿 '+babyPlants.length+' plântula'+(babyPlants.length>1?'s':'')+' germinando!');
    issues.push('🧬 PGPBs:'+pctPGPB+'% Pred:'+pctPred+'% Ciano:'+pctCiano+'%');
    var _sg=[];if(plant.sig.flav>0.3)_sg.push('Flav↑');if(plant.sig.orgA>0.3)_sg.push('AcOrg↑');if(plant.sig.SA>0.3)_sg.push('SA↑');issues.push('📡 '+(_sg.length?_sg.join(' '):'basal'))}
  dT.innerHTML=issues.join('<br>');
  recs.sort(function(a,b){return b.pri-a.pri});
  if(recs.length>0){dR.style.display='block';dR.innerHTML='<b style="color:#22c55e">Recomendação:</b><br>'+recs.slice(0,2).map(function(r){return r.txt}).join('<br>')}
  else{dR.style.display='none'}
}

function loop(now){requestAnimationFrame(loop);if(!paused)for(let i=0;i<spd;i++)updateW();updateCameraFollow();render(now);if(tk%18===0)updUI();if(tk%50===0)recH();if(tk%80===0){updDiag();updMobileInfo()}}
requestAnimationFrame(loop);

/* ═══ MOBILE SIDEBAR / SHEET TOGGLE ═══ */
let sheetOpen=false;
function isPortrait(){return window.innerWidth<=600}
function toggleSB(){
  /* Landscape mode: slide-in sidebar */
  const sb=document.getElementById('sb'),ov=document.getElementById('sbOverlay');
  sb.classList.toggle('open');ov.classList.toggle('open');
}
function closeSB(){
  const sb=document.getElementById('sb'),ov=document.getElementById('sbOverlay');
  sb.classList.remove('open');ov.classList.remove('open');
  sheetOpen=false;
  document.getElementById('sheetToggle')?.classList.remove('sheet-open');
}
function toggleSheet(){
  /* Portrait mode: bottom sheet */
  const sb=document.getElementById('sb'),ov=document.getElementById('sbOverlay');
  const btn=document.getElementById('sheetToggle');
  sheetOpen=!sheetOpen;
  if(sheetOpen){sb.classList.add('open');ov.classList.add('open');btn.classList.add('sheet-open');btn.textContent='✕'}
  else{sb.classList.remove('open');ov.classList.remove('open');btn.classList.remove('sheet-open');btn.textContent='⚙'}
}
function syncInocMobile(val){
  const sel=document.getElementById('selInoc');if(sel)sel.value=val;
}
/* Sync desktop select → mobile select */
function syncInocDesktop(){
  const dSel=document.getElementById('selInoc');const mSel=document.getElementById('mbInoc');
  if(dSel&&mSel)mSel.value=dSel.value;
}
document.getElementById('selInoc')?.addEventListener('change',syncInocDesktop);

/* ═══ MOBILE: Collapsible panels (portrait only) ═══ */
function initCollapsiblePanels(){
  if(!isPortrait())return;
  document.querySelectorAll('#sb .pnl').forEach((pnl,i)=>{
    const pt=pnl.querySelector('.pt');
    if(!pt)return;
    /* Collapse non-essential panels by default */
    if(i>2)pnl.classList.add('collapsed');
    pt.addEventListener('click',function(e){
      if(!isPortrait())return;
      pnl.classList.toggle('collapsed');
      e.stopPropagation();
    });
  });
}

/* ═══ MOBILE: Info overlay (portrait) ═══ */
function updMobileInfo(){
  const el=document.getElementById('mobileInfo');
  if(!el||!isPortrait())return;
  const tot=sw.length;
  const gc=GUILDS.map((_,i)=>sw.filter(s=>s.g.guild===i).length);
  const pctPGPB=Math.round((gc[0]+gc[1]+gc[2]+gc[3]+gc[4]+gc[5]+gc[11]+gc[12])/Math.max(1,tot)*100);
  el.innerHTML=`🧬 ${tot} · PGPB:${pctPGPB}% · Bio:${Math.round(plant.bio)} · ${plant.limitFactor} · Str:${Math.round(plant.stress)}%`;
}

/* ═══ MOBILE: Adapt zoom on orientation / resize ═══ */
let lastOrientation=null;
function adaptMobileZoom(){
  const isMob=window.innerWidth<=900;
  if(!isMob)return;
  const port=isPortrait();
  if(lastOrientation===port)return;
  lastOrientation=port;
  /* Center and zoom to show the rhizosphere */
  if(port){
    zm=1.6;px=cW/2-wCx*zm;py=cH*0.25-gY*zm;
  }else{
    zm=2.0;px=cW/2-wCx*zm;py=cH*0.32-gY*zm;
  }
  updZI();
}

/* ═══ MOBILE: Speed button sync ═══ */
const origSetSpd=setSpd;
setSpd=function(v){
  spd=v;
  /* Desktop speed buttons */
  document.querySelectorAll('.srow button').forEach(b=>b.classList.remove('act'));
  const el=document.getElementById('sp'+v);if(el)el.classList.add('act');
  /* Mobile speed buttons */
  ['mbSp1','mbSp2','mbSp4'].forEach(id=>{
    const b=document.getElementById(id);if(b)b.classList.remove('act');
  });
  const mb=document.getElementById('mbSp'+v);if(mb)mb.classList.add('act');
};

/* ═══ MOBILE: Play/Pause sync ═══ */
const origToggleP=toggleP;
toggleP=function(){
  paused=!paused;
  const btnD=document.getElementById('btnP');if(btnD)btnD.textContent=paused?'▶':'⏸';
  const btnM=document.getElementById('mbPlay');if(btnM)btnM.textContent=paused?'▶':'⏸';
};

/* ═══ MOBILE: handle resize for bottom sheet position ═══ */
window.addEventListener('resize',function(){
  if(!isPortrait()){
    /* Exiting portrait → close bottom sheet if open */
    const sb=document.getElementById('sb');
    const btn=document.getElementById('sheetToggle');
    if(sheetOpen){sb.classList.remove('open');document.getElementById('sbOverlay').classList.remove('open');sheetOpen=false;btn?.classList.remove('sheet-open');btn&&(btn.textContent='⚙')}
  }
  adaptMobileZoom();
});

/* Init */
setTimeout(()=>{initCollapsiblePanels();adaptMobileZoom()},100);

/* ═══ TOUCH SUPPORT (improved for mobile layouts) ═══ */
let lastTouchDist=0,touchStartX=0,touchStartY=0,touchPanning=false,touchTapTime=0,touchTapX=0,touchTapY=0;
cv.addEventListener('touchstart',e=>{
  /* Don't prevent default if touch is near bottom (mobile bar area) */
  const rect=cv.getBoundingClientRect();
  const ty=e.touches[0].clientY;
  if(ty>rect.bottom-10)return; /* near edge, let browser handle */
  e.preventDefault();
  stopCameraFollow();
  if(e.touches.length===2){
    const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    lastTouchDist=Math.hypot(dx,dy);
  }else if(e.touches.length===1){
    touchPanning=true;dragMoved=false;
    touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;
    touchTapTime=Date.now();touchTapX=touchStartX;touchTapY=touchStartY;
    psx=px;psy=py;
  }
},{passive:false});
cv.addEventListener('touchmove',e=>{
  e.preventDefault();
  if(e.touches.length===2){
    const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    const dist=Math.hypot(dx,dy);
    if(lastTouchDist>0){
      const cx=(e.touches[0].clientX+e.touches[1].clientX)/2,cy=(e.touches[0].clientY+e.touches[1].clientY)/2;
      const rect=cv.getBoundingClientRect();const mx=cx-rect.left,my=cy-rect.top;
      const oz=zm;zm=cl(zm*(dist/lastTouchDist),.3,15);const r=zm/oz;
      px=mx-r*(mx-px);py=my-r*(my-py);updZI();
    }
    lastTouchDist=dist;touchPanning=false;
  }else if(e.touches.length===1&&touchPanning){
    const dx=e.touches[0].clientX-touchStartX,dy=e.touches[0].clientY-touchStartY;
    if(Math.abs(dx)+Math.abs(dy)>5)dragMoved=true;
    px=psx+dx;py=psy+dy;
  }
},{passive:false});
cv.addEventListener('touchend',e=>{
  /* Handle tap (for selection/inoculation) */
  if(!dragMoved&&e.changedTouches.length===1){
    const dt=Date.now()-touchTapTime;
    const ct=e.changedTouches[0];
    const tapDist=Math.hypot(ct.clientX-touchTapX,ct.clientY-touchTapY);
    if(dt<300&&tapDist<12){
      /* Simulate click for selection/inoculation */
      const rect=cv.getBoundingClientRect();
      const w=s2w(ct.clientX-rect.left,ct.clientY-rect.top);
      const selInoc=document.getElementById('selInoc');
      const inocVal=selInoc?parseInt(selInoc.value):-1;
      if(inocVal>=0){
        for(let i=0;i<3;i++){
          const ox=w.x+rng(-15,15),oy=w.y+rng(-15,15);
          sw.push(new Sw(ox,oy,mkG(inocVal)));
        }
        spawnParticles(w.x,w.y,GUILDS[inocVal].color,20);
        addEv('eB',`💉 ${GUILDS[inocVal].name}`);
      }else{
        let best=null,bestD=20/zm;
        for(const s of sw){const d=Math.hypot(w.x-s.x,w.y-s.y);if(d<bestD){bestD=d;best=s}}
        const panel=document.getElementById('selP'),grid=document.getElementById('selG');
        if(best){panel.style.display='block';
          const g=best.g,gd=GUILDS[g.guild],fi=g.fi;
          const fiStr=Object.entries(fi).filter(([k,v])=>v>0.1).map(([k,v])=>`${k}:${v.toFixed(2)}`).join(' ');
          grid.innerHTML=[['Tipo',gd.type,''],['Guilda',gd.name,gd.color],['Morfo',MN[g.mt]||'?','#86efac'],['Função',gd.fn,''],['Trófico',gd.trophic,'#a78bfa'],['Invest.',fiStr,''],['Energia',Math.round(best.e),''],['Geração',best.gen,'#b484f0']].map(([l,v,c])=>`<span class="l">${l}</span><span${c?` style="color:${c}"`:``}>${v}</span>`).join('');
        }else{panel.style.display='none'}
      }
    }
  }
  lastTouchDist=0;touchPanning=false;
},{passive:false});

/* RizoSim Escolas bridge API.
   The ecological rules above are the extracted RizoSim motor. This small
   facade exposes state and actions to the school interface without changing
   guild parameters, plant rules, nutrient kinetics, movement, or rendering. */
(function exposeRizoSimEngine(){
  function countGuilds(){
    const counts={};
    for(const g of GUILDS)counts[g.id]=0;
    for(const item of sw)counts[item.g.guild]=(counts[item.g.guild]||0)+1;
    return counts;
  }

  function syncPauseButtons(){
    const teacher=document.getElementById('btnP');
    if(teacher)teacher.textContent=paused?'Iniciar':'Pausar';
    const child=document.getElementById('playBtn');
    if(child)child.textContent=paused?'Iniciar':'Pausar';
  }

  function syncSpeedButtons(){
    document.querySelectorAll('[data-speed]').forEach(btn=>{
      btn.classList.toggle('is-active', Number(btn.dataset.speed)===spd);
      btn.setAttribute('aria-pressed', Number(btn.dataset.speed)===spd ? 'true' : 'false');
    });
  }

  function setPaused(value){
    paused=Boolean(value);
    syncPauseButtons();
    return paused;
  }

  function setSpeed(value){
    const next=cl(Number(value)||1,1,8);
    setSpd(next);
    syncSpeedButtons();
    return spd;
  }

  function setInput(id,value){
    const el=document.getElementById(id);
    if(!el)return;
    el.value=value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function configure(values){
    if(!values)return;
    if(values.soil)setSoil(values.soil);
    if(values.temp!==undefined)setInput('rT',values.temp);
    if(values.ph!==undefined)setInput('rPH',values.ph);
    if(values.moist!==undefined)setInput('rM',values.moist);
    if(values.tox!==undefined)setInput('rTX',values.tox);
    if(values.light!==undefined)setInput('rLI',values.light);
    if(values.uv!==undefined)setInput('rUV',values.uv);
    if(values.microbeMult!==undefined)setInput('rMI',values.microbeMult);
    if(values.organicC!==undefined)setInput('rIC',values.organicC);
    if(values.NH4!==undefined)setInput('rINH4',values.NH4);
    if(values.NO3!==undefined)setInput('rINO3',values.NO3);
    if(values.PO4free!==undefined)setInput('rIPf',values.PO4free);
    if(values.PO4bound!==undefined)setInput('rIPb',values.PO4bound);
    if(values.Fe3!==undefined)setInput('rIFe3',values.Fe3);
    if(values.Fe2!==undefined)setInput('rIFe2',values.Fe2);
    updEnv();
  }

  function resetWith(values){
    configure(values);
    resetW();
    updEnv();
    syncPauseButtons();
    syncSpeedButtons();
  }

  function inoculateAt(guildId,x,y,count){
    const id=Number(guildId);
    if(id<0||id>=GUILDS.length)return [];
    const made=[];
    const n=Math.max(1,Number(count)||3);
    const wx=Number.isFinite(x)?x:wCx;
    const wy=Number.isFinite(y)?y:gY+Math.max(20,rootDepth*0.45);
    for(let i=0;i<n;i++){
      const org=new Sw(wx+rng(-15,15),wy+rng(-15,15),mkG(id));
      sw.push(org);
      made.push(org);
    }
    spawnParticles(wx,wy,GUILDS[id].color,18);
    addEv('eB','Inoculado: '+GUILDS[id].name);
    return made;
  }

  function inoculateNearRoot(guildId,count){
    const side=Math.random()<0.5?-1:1;
    const x=wCx+side*rng(8,30);
    const y=gY+rng(18,Math.max(28,Math.min(rootDepth+12,95)));
    return inoculateAt(guildId,x,y,count||3);
  }

  function selectMode(){
    const sel=document.getElementById('selInoc');
    if(sel)sel.value='-1';
  }

  function addMode(guildId){
    const sel=document.getElementById('selInoc');
    if(sel)sel.value=String(guildId);
  }

  function worldToScreen(x,y){
    return {x:x*zm+px,y:y*zm+py};
  }

  function focusAtWorld(x,y,zoom,screenX,screenY){
    stopCameraFollow();
    const targetZoom=cl(Number.isFinite(zoom)?zoom:zm,.3,15);
    const targetX=Number.isFinite(screenX)?cl(screenX,0,cW):cW*.5;
    const targetY=Number.isFinite(screenY)?cl(screenY,0,cH):cH*.5;
    zm=targetZoom;
    px=targetX-x*zm;
    py=targetY-y*zm;
    updZI();
    return {zoom:zm,x:targetX,y:targetY};
  }

  function screenToWorld(x,y){
    return s2w(x,y);
  }

  function findOrganismAtWorld(x,y,maxWorld){
    let best=null;
    let bestD=Number.isFinite(maxWorld)?maxWorld:22/Math.max(0.1,zm);
    for(const item of sw){
      const d=Math.hypot(x-item.x,y-item.y);
      if(d<bestD){bestD=d;best=item}
    }
    return best;
  }

  function findOrganismAtScreen(x,y,maxPx){
    const point=screenToWorld(x,y);
    return findOrganismAtWorld(point.x,point.y,(maxPx||28)/Math.max(0.1,zm));
  }

  function organisms(){
    return sw.map((item,index)=>({
      index,
      guild:item.g.guild,
      name:GUILDS[item.g.guild].name,
      x:item.x,
      y:item.y,
      energy:item.e,
      generation:item.gen,
      nodulated:Boolean(item.nodulated),
      alive:Boolean(item.alive)
    }));
  }

  function getState(){
    return {
      tick:tk,
      paused,
      speed:spd,
      plant:{...plant,sig:{...plant.sig},nodules:plant.nodules.length},
      soil:{...soil},
      env:{...env},
      rootDepth,
      population:sw.length,
      exudates:fd.length,
      deaths:nD,
      births:nB,
      seedlings:seeds.length+babyPlants.length,
      guildCounts:countGuilds(),
      zoom:zm
    };
  }

  function step(count){
    const n=Math.max(1,Number(count)||1);
    for(let i=0;i<n;i++)updateW();
    updateCameraFollow();
    render(performance.now());
    updUI();
    return getState();
  }

  window.RizoSimEngine={
    constants:C,
    guilds:GUILDS,
    morphs:MORPH_GUILD,
    get state(){return getState()},
    get geometry(){return {wCx,gY,cW,cH,rootDepth,worldDepth,worldWidth,gridX0,zoom:zm,panX:px,panY:py,following:Boolean(cameraFollow)}},
    get organisms(){return organisms()},
    get raw(){return {plant,soil,env,sw,grid,rootCells}},
    countGuilds,
    setPaused,
    togglePause(){return setPaused(!paused)},
    setSpeed,
    reset:resetW,
    resetWith,
    configure,
    setInput,
    setSoil,
    inoculateAt,
    inoculateNearRoot,
    selectMode,
    addMode,
    worldToScreen,
    focusAtWorld,
    followOrganism:startCameraFollow,
    stopFollowing:stopCameraFollow,
    screenToWorld,
    findOrganismAtWorld,
    findOrganismAtScreen,
    step,
    setHeatmap(key){showHeatmap=key||'off'}
  };

  syncPauseButtons();
  syncSpeedButtons();
})();
