/* ═══ IMPREVISTOS NATURAIS ═══
   Na natureza, nem sempre os benéficos e as boas condições vencem. Este módulo traz dois
   tipos de variação, sem mexer nas regras ecológicas do motor:

   1. Começo variado: ao escolher um cenário ou reiniciar, as condições do solo (temperatura,
      pH, umidade, nutrientes, C orgânico, ferro, luz) são sorteadas em torno dos valores do
      cenário. O que define o cenário (ex.: pouco nitrogênio, solo seco) varia pouco.
   2. Acontecimentos espontâneos durante a simulação: veranico, chuva forte (encharcamento),
      onda de calor, frente fria, chegada de patógenos ou de nematoides (água, sementes,
      ferramentas). O clima muda aos poucos e depois volta ao que era.

   Só conta o tempo com a simulação rodando (pausada ou nos testes com step(), nada acontece).
   O professor pode desligar no painel do modo professor ("Imprevistos naturais"). */
(function(){
  'use strict';
  const E=window.RizoSimEngine,ENV=window.RizoSchoolEnvironment;
  if(!E||!ENV)return;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const box=()=>document.getElementById('rImprev');
  const enabled=()=>{const b=box();return b?b.checked:true};

  /* ── 1. começo variado ── */
  const SPREAD={temp:4,ph:0.5,moist:12,organicC:200,NH4:15,NO3:12,PO4free:10,PO4bound:25,Fe3:25,Fe2:6,light:10};
  const LIMITS={temp:[5,45],ph:[4,9],moist:[10,100],organicC:[0,1500],NH4:[0,150],NO3:[0,150],PO4free:[0,100],PO4bound:[0,200],Fe3:[0,150],Fe2:[0,100],light:[0,100]};
  function jitter(values){
    const out={...values},D=ENV.defaults;
    for(const k in SPREAD){
      if(out[k]===undefined)continue;
      const d=SPREAD[k],special=Math.abs(out[k]-D[k])>d;     // valor que caracteriza o cenário: varia pouco
      let v=out[k]+rnd(-1,1)*d*(special?0.3:1);
      v=Math.min(LIMITS[k][1],Math.max(LIMITS[k][0],v));
      out[k]=k==='ph'?Math.round(v*10)/10:Math.round(v);
    }
    return out;
  }
  let baseValues={...ENV.defaults};
  const origApply=ENV.applyScenario;
  ENV.applyScenario=function(id){
    const sc=ENV.scenarios.find(s=>s.id===id)||ENV.scenarios[0];
    baseValues={...sc.values};
    if(!enabled())return origApply(id);
    const saved=sc.values;sc.values=jitter(saved);
    try{return origApply(id)}finally{sc.values=saved;stopEvent(false);schedule()}
  };
  const origReset=E.reset;
  E.reset=function(){
    if(enabled())E.configure(jitter(baseValues));
    stopEvent(false);schedule();
    return origReset.apply(this,arguments);
  };

  /* ── 2. acontecimentos espontâneos ── */
  const EVENTS=[
    {id:'seca',w:4,key:'moist',target:b=>Math.max(14,b-38),dur:[3000,6000],
     msg:'Veranico: o solo está secando.',title:'Veranico',
     detail:'Alguns dias sem chuva deixam o solo seco. A planta perde vigor, os organismos se movem e se alimentam com mais dificuldade, e os que resistem melhor à seca levam vantagem. Quando a chuva volta, o solo se recupera.'},
    {id:'chuva',w:3,key:'moist',target:()=>rnd(88,96),dur:[1800,3600],
     msg:'Chuva forte: o solo encharcou.',title:'Solo encharcado',
     detail:'Com os poros cheios de água, falta oxigênio para as raízes e para muitos micro-organismos. Patógenos que gostam de umidade (como Pythium) podem ser favorecidos. Quando a água escoa, o solo volta ao normal.'},
    {id:'calor',w:2,key:'temp',target:()=>rnd(34,37),dur:[2400,4800],
     msg:'Onda de calor: o solo esquentou.',title:'Onda de calor',
     detail:'Temperaturas altas estressam a planta e mudam quem cresce melhor no solo: cada organismo tem uma faixa de temperatura em que funciona bem.'},
    {id:'frio',w:1,key:'temp',target:()=>rnd(10,14),dur:[2400,4800],
     msg:'Frente fria: o solo esfriou.',title:'Frente fria',
     detail:'No frio, o metabolismo dos organismos e o crescimento da planta ficam mais lentos.'},
    {id:'patogeno',w:2,arrive:6,n:[4,7],
     msg:'Chegaram patógenos ao solo.',title:'Chegada de patógenos',
     detail:'Patógenos chegam com a água da chuva ou da irrigação, com sementes, ferramentas e restos de cultura. Se a raiz já estiver colonizada por bactérias benéficas, eles encontram menos espaço e mais antibióticos; se não, podem causar doença.'},
    {id:'nematoide',w:1,arrive:9,n:[3,5],
     msg:'Chegaram nematoides ao solo.',title:'Chegada de nematoides',
     detail:'Nematoides chegam com solo e mudas contaminados ou com a água. Fungos como Arthrobotrys podem capturá-los; sem inimigos naturais, eles danificam a raiz.'}
  ];
  let runTicks=0,lastTick=null,nextAt=null,active=null;
  function schedule(){nextAt=runTicks+rnd(2500,6000)}   // ~40 s a 1,7 min em 1x
  function announce(ev,end){
    const text=end?ev.endMsg:ev.msg;
    if(window.RizoSchoolEvents)RizoSchoolEvents.add({priority:4,key:'imprev-'+ev.id+(end?'-fim':''),message:text,title:ev.title,detail:ev.detail});
    if(typeof addEv==='function')addEv('eD','🌦 '+text);
  }
  function pick(){
    const tot=EVENTS.reduce((a,e)=>a+e.w,0);let r=Math.random()*tot;
    for(const e of EVENTS){r-=e.w;if(r<=0)return e}
    return EVENTS[0];
  }
  function startEvent(){
    const ev=pick();
    if(ev.arrive!==undefined){
      const g=E.geometry,n=Math.round(rnd(ev.n[0],ev.n[1]));
      const side=Math.random()<0.5?-1:1,x=g.wCx+side*rnd(25,90),y=g.gY+rnd(15,Math.min(110,g.rootDepth+40));
      E.inoculateAt(ev.arrive,x,y,n);
      announce(ev,false);schedule();return;
    }
    const base=E.state.env[ev.key];
    active={ev,base,target:ev.target(base),until:runTicks+rnd(ev.dur[0],ev.dur[1]),returning:false};
    ev.endMsg=ev.id==='seca'?'Voltou a chover: o solo está se recuperando.':ev.id==='chuva'?'A água escoou: o solo voltou a respirar.':'A temperatura do solo está voltando ao normal.';
    announce(ev,false);
  }
  function stopEvent(restore){
    if(active&&restore)E.configure({[active.ev.key]:active.base});
    active=null;
  }
  function stepEvent(){
    const a=active,key=a.ev.key,cur=E.state.env[key];
    if(!a.returning&&runTicks>=a.until){a.returning=true;announce(a.ev,true)}
    const goal=a.returning?a.base:a.target;
    const diff=goal-cur;                           // muda aos poucos (pelo menos 1 unidade por vez)
    const v=Math.abs(diff)<=1?Math.round(goal):Math.round(cur+Math.sign(diff)*Math.max(1,Math.abs(diff)*0.08));
    E.configure({[key]:v});
    if(a.returning&&v===Math.round(goal)){active=null;schedule()}
  }
  setInterval(()=>{
    const st=E.state;
    if(lastTick===null||st.tick<lastTick){lastTick=st.tick;if(nextAt===null)schedule();return}
    const dt=st.tick-lastTick;lastTick=st.tick;
    if(st.paused||!enabled()){return}
    advance(dt);
  },500);
  function advance(dt){
    runTicks+=dt;
    if(active)stepEvent();
    else if(nextAt!==null&&runTicks>=nextAt)startEvent();
  }
  document.addEventListener('change',event=>{if(event.target===box()&&!box().checked)stopEvent(true)});

  // começo da sessão: condições já variadas
  window.addEventListener('load',()=>{if(enabled()){E.resetWith(jitter(baseValues));schedule()}});

  window.RizoSchoolImprevistos={jitter,events:EVENTS,get active(){return active?active.ev.id:null},advance,get debug(){return {runTicks,nextAt,active:active&&{id:active.ev.id,base:active.base,target:active.target,until:active.until,returning:active.returning}}},start:startEvent};
})();
