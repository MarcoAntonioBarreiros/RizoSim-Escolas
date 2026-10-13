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
   O professor pode desligar na barra do modo professor ("Imprevistos naturais") e provocar cada
   acontecimento na hora ("Provocar"). */
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
    baseValues={...sc.values};userSet={};
    if(!enabled())return origApply(id);
    const saved=sc.values;sc.values=jitter(saved);
    try{return origApply(id)}finally{sc.values=saved;stopEvent(false);schedule()}
  };
  /* Reiniciar mantém o que o professor escolheu: o tipo de solo (antes voltava sempre para franco)
     e os controles que ele mexeu à mão; o resto é sorteado de novo em torno do cenário. */
  const INPUTS={rT:'temp',rPH:'ph',rM:'moist',rLI:'light',rIC:'organicC',rINH4:'NH4',rINO3:'NO3',rIPf:'PO4free',rIPb:'PO4bound',rIFe3:'Fe3',rIFe2:'Fe2'};
  let userSet={};
  document.addEventListener('input',event=>{const k=INPUTS[event.target&&event.target.id];if(k&&event.isTrusted)userSet[k]=true});
  const origReset=E.reset;
  E.reset=function(){
    stopEvent(true);
    if(enabled()){
      const v=jitter(baseValues),cur=E.state.env;
      for(const id in INPUTS){const k=INPUTS[id];if(userSet[k]){const el=document.getElementById(id);if(el)v[k]=+el.value}}
      v.soil=cur.soil;
      E.configure(v);
    }
    schedule();
    return origReset.apply(this,arguments);
  };

  /* ── 2. acontecimentos espontâneos ── */
  const EVENTS=[
    {id:'seca',w:4,key:'moist',target:(b,soil)=>soil==='sandy'?Math.max(10,b-45):soil==='clay'?Math.max(20,b-30):Math.max(14,b-38),dur:[3000,6000],
     msg:'Veranico: o solo está secando.',title:'Veranico',
     detail:'Alguns dias sem chuva deixam o solo seco. A planta perde vigor, os organismos se movem e se alimentam com mais dificuldade, e os que resistem melhor à seca levam vantagem. Quando a chuva volta, o solo se recupera. O arenoso, de poros grandes, seca mais depressa e mais fundo; o argiloso segura a água por mais tempo.'},
    {id:'chuva',w:3,key:'moist',target:(b,soil)=>soil==='sandy'?rnd(78,84):soil==='clay'?rnd(92,98):rnd(88,96),dur:[1800,3600],
     msg:'Chuva forte: o solo encharcou.',title:'Solo encharcado',
     detail:'Com os poros cheios de água, falta oxigênio para as raízes e para muitos micro-organismos. Patógenos que gostam de umidade (como Pythium) podem ser favorecidos. Quando a água escoa, o solo volta ao normal. O arenoso drena rápido e quase não encharca; o argiloso fica encharcado por mais tempo.'},
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
  function schedule(){nextAt=runTicks+rnd(7000,12500)}  // ~2 a 3,5 min em 1x: dá tempo de ver a resposta e a recuperação
  const ICON={seca:'☀',chuva:'🌧',calor:'🔥',frio:'❄',patogeno:'🦠',nematoide:'🪱'};
  let badge=null,badgeTimer=null;
  function showBadge(text,ms){
    const host=document.getElementById('cw');if(!host)return;
    if(!badge){badge=document.createElement('div');badge.className='event-badge is-hidden';badge.setAttribute('aria-live','polite');host.appendChild(badge)}
    badge.textContent=text;badge.classList.remove('is-hidden');
    clearTimeout(badgeTimer);if(ms)badgeTimer=setTimeout(()=>badge.classList.add('is-hidden'),ms);
  }
  function hideBadge(){if(badge)badge.classList.add('is-hidden')}
  function announce(ev,end){
    const text=end?ev.endMsg:ev.msg;
    if(!end)showBadge(ICON[ev.id]+' '+ev.title,ev.arrive!==undefined?9000:0);else showBadge(ICON[ev.id]+' '+text,6000);
    if(window.RizoSchoolEvents)RizoSchoolEvents.add({priority:4,key:'imprev-'+ev.id+(end?'-fim':''),message:text,title:ev.title,detail:ev.detail});
    if(typeof addEv==='function')addEv('eD','🌦 '+text);
  }
  function pick(){
    const tot=EVENTS.reduce((a,e)=>a+e.w,0);let r=Math.random()*tot;
    for(const e of EVENTS){r-=e.w;if(r<=0)return e}
    return EVENTS[0];
  }
  function startEvent(forced){
    const ev=forced||pick();
    if(ev.arrive!==undefined){
      const g=E.geometry,n=Math.round(rnd(ev.n[0],ev.n[1]));
      const side=Math.random()<0.5?-1:1,x=g.wCx+side*rnd(25,90),y=g.gY+rnd(15,Math.min(110,g.rootDepth+40));
      E.inoculateAt(ev.arrive,x,y,n);
      announce(ev,false);schedule();return;
    }
    const base=E.state.env[ev.key];
    const soil=E.state.env.soil,durK=ev.id==='chuva'?(soil==='clay'?1.5:soil==='sandy'?0.6:1):1;   /* argiloso fica encharcado mais tempo */
    active={ev,base,target:ev.target(base,soil),until:runTicks+rnd(ev.dur[0],ev.dur[1])*durK,returning:false};
    ev.endMsg=ev.id==='seca'?'Voltou a chover: o solo está se recuperando.':ev.id==='chuva'?'A água escoou: o solo voltou a respirar.':'A temperatura do solo está voltando ao normal.';
    announce(ev,false);
  }
  function stopEvent(restore){
    if(active&&restore)E.configure({[active.ev.key]:active.base});
    if(active)hideBadge();
    active=null;
  }
  /* professor provoca um acontecimento: substitui o que estiver em curso */
  function trigger(id){
    const ev=EVENTS.find(e=>e.id===id);if(!ev)return;
    stopEvent(true);startEvent(ev);if(!active)schedule();
    if(E.state.paused)E.setPaused(false);
  }
  function stepEvent(){
    const a=active,key=a.ev.key,cur=E.state.env[key];
    if(!a.returning&&runTicks>=a.until){a.returning=true;announce(a.ev,true)}
    const goal=a.returning?a.base:a.target;
    const diff=goal-cur;                           // muda aos poucos (pelo menos 1 unidade por vez)
    /* o solo decide a velocidade da água: o arenoso seca e drena depressa; o argiloso segura a água
       (seca devagar) e também demora a drenar depois da chuva */
    const soil=E.state.env.soil,drying=key==='moist'&&diff<0&&(a.ev.id==='seca'||a.returning);
    const k=drying?(soil==='sandy'?1.8:soil==='clay'?0.5:1):1;
    const v=Math.abs(diff)<=1?Math.round(goal):Math.round(cur+Math.sign(diff)*Math.max(1,Math.abs(diff)*0.08*k));
    E.configure({[key]:v});
    if(a.returning&&v===Math.round(goal)){active=null;schedule()}
  }
  setInterval(()=>{
    const st=E.state;
    if(lastTick===null||st.tick<lastTick){lastTick=st.tick;if(nextAt===null)schedule();return}
    const dt=st.tick-lastTick;lastTick=st.tick;
    if(st.paused)return;
    /* imprevistos desligados: nada espontâneo, mas o que o professor provocou continua até o fim */
    if(!enabled()){if(active){runTicks+=dt;stepEvent()}return}
    advance(dt);
  },500);
  function advance(dt){
    runTicks+=dt;
    if(active)stepEvent();
    else if(nextAt!==null&&runTicks>=nextAt)startEvent();
  }
  document.addEventListener('change',event=>{if(event.target===box()&&!box().checked)stopEvent(true)});

  /* ── 3. quem sofre e quem tolera ──
     Quando o solo fica quente, frio, seco ou encharcado (por imprevisto, botão "Provocar" ou controle
     mexido à mão) e continua assim por alguns segundos, um aviso diz quais grupos PRESENTES estão com
     dificuldade e quais toleram. Volta a avisar só depois que a condição passar. */
  const COND={
    calor:{test:env=>env.temp>=32,f:'th',icon:'🔥',title:'Calor no solo',tol:[1,6,2,9],
      msg:(a,t)=>`Calor: ${a.s?`${a.s} ${v(a,'está','estão')} com dificuldade`:'quem é sensível ao calor sofre'}${t.s?`; ${t.s} ${v(t,'tolera','toleram')}`:''}.`,
      detail:'Cada organismo funciona bem numa faixa de temperatura. Acima dela, proteínas e membranas sofrem: os sensíveis ficam mais pálidos e lentos, comem e se multiplicam menos e podem morrer. Rizóbio e Pseudomonas são sensíveis ao calor; Bacillus (forma esporos), Azospirillum e muitos patógenos toleram. Com a Pseudomonas enfraquecida, a proteção contra o patógeno diminui. Os predadores sensíveis caçam menos, e as bactérias tolerantes podem até aumentar.'},
    frio:{test:env=>env.temp<=15,f:'th',icon:'❄',title:'Frio no solo',tol:[0,10],
      msg:(a,t)=>`Frio: todos ficam mais lentos${a.s?`; ${a.s} ${v(a,'sente','sentem')} mais`:''}${t.s?`; ${t.s} ${v(t,'tolera','toleram')} melhor`:''}.`,
      detail:'No frio o metabolismo desacelera (mais ou menos pela metade a cada 10 °C): os organismos comem, crescem, caçam e gastam energia mais devagar — ficam quase dormentes, sem morrer de fome. Grupos de regiões quentes, como Bacillus e Azospirillum, sentem mais; Pseudomonas e fungos decompositores toleram bem o frio. A raiz também libera menos exsudatos.'},
    seca:{test:env=>env.moist<35,f:'wa',lim:0.8,icon:'☀',title:'Solo seco',tol:[4,10,11,12],
      msg:(a,t)=>`Solo seco: ${a.s?`${a.s} quase ${v(a,'para','param')}`:'bactérias e nematoides quase param'}, sem água em volta${t.s?`; ${t.s} ${v(t,'tolera','toleram')} (as hifas atravessam os poros com ar)`:''}.`,
      detail:'Bactérias, protozoários e nematoides vivem no filme de água que envolve os grãos do solo. Quando ele seca, eles mal conseguem se mover e se alimentar, e muitos morrem. Protozoários viram cistos. Os fungos atravessam os poros cheios de ar com as hifas e toleram muito melhor a seca. Com predadores encistados, algumas bactérias escapam da predação.'},
    encharcado:{test:env=>env.moist>82,f:'ox',icon:'🌧',title:'Solo encharcado',tol:[2,6],
      msg:(a,t,denit)=>`Solo encharcado, falta oxigênio: ${a.s?`${a.s} ${v(a,'sofre','sofrem')}`:'quem precisa de O₂ sofre'}${t.s?`; ${t.s} ${v(t,'é favorecido','são favorecidos')}`:''}${denit?'. O nitrato está virando gás (desnitrificação)':''}.`,
      detail:'Com os poros cheios de água falta oxigênio. Fungos, nematoides e rizóbio, que precisam de O₂, perdem atividade e podem morrer. Azospirillum prefere pouco oxigênio, e patógenos como o Pythium são favorecidos. Sem O₂, bactérias desnitrificantes respiram nitrato e o nitrogênio escapa para o ar: a planta perde N. No argiloso o efeito é forte, no franco é moderado e no arenoso, que drena rápido, quase não acontece.'}
  };
  const climSince={},climTold={};let lastT=null,lastM=null;
  /* nomes no meio da frase: gêneros como estão; nomes comuns com artigo (e plural quando é o grupo todo) */
  const COMMON={5:['o rizóbio',0],6:['o patógeno',0],7:['as cianobactérias',1],8:['os protozoários',1],9:['os nematoides',1],10:['os saprófitos',1],11:['a micorriza',0]};
  const orgName=g=>{if(COMMON[g])return COMMON[g][0];const c=window.RizoSchoolOrganisms&&RizoSchoolOrganisms.get(g);return c?c.name:'grupo '+g};
  const names=ids=>({s:ids.length<2?ids.map(orgName).join(''):ids.slice(0,-1).map(orgName).join(', ')+' e '+orgName(ids[ids.length-1]),pl:ids.length>1||(ids.length===1&&COMMON[ids[0]]&&COMMON[ids[0]][1]===1)});
  const v=(n,one,many)=>n.pl?many:one;
  function climateNotice(id){
    const c=COND[id],imp=E.climateImpact&&E.climateImpact();if(!imp)return;
    const present=imp.groups.filter(g=>g.count>0);
    const affected=present.filter(g=>g[c.f]<(c.lim||0.7)).sort((a,b)=>a[c.f]-b[c.f]).slice(0,3).map(g=>g.guild);
    const tolerant=c.tol.filter(g=>present.some(p=>p.guild===g&&p[c.f]>=0.9)).slice(0,2);
    let text=c.msg(names(affected),names(tolerant),imp.denit>0.004);text=text.charAt(0).toUpperCase()+text.slice(1);
    showBadge(c.icon+' '+text.replace(/\.$/,''),0);
    clearTimeout(badgeTimer);badgeTimer=setTimeout(()=>{if(active)showBadge(ICON[active.ev.id]+' '+active.ev.title,0);else hideBadge()},10000);
    if(window.RizoSchoolEvents)RizoSchoolEvents.add({priority:4,key:'clima-'+id,message:c.icon+' '+text,title:c.title,detail:c.detail});
  }
  setInterval(()=>{
    const st=E.state;if(st.paused)return;
    const now=Date.now(),steady=lastT!==null&&Math.abs(st.env.temp-lastT)<0.5&&Math.abs(st.env.moist-lastM)<0.5;
    lastT=st.env.temp;lastM=st.env.moist;
    for(const id in COND){
      if(COND[id].test(st.env)){
        if(!climSince[id])climSince[id]=now;
        else if(!climTold[id]&&now-climSince[id]>3500&&(steady||now-climSince[id]>12000)){climTold[id]=true;climateNotice(id)}   /* espera o clima parar de mudar */
      }else{climSince[id]=0;climTold[id]=false}
    }
  },500);

  // começo da sessão: condições já variadas
  window.addEventListener('load',()=>{if(enabled()){E.resetWith(jitter(baseValues));schedule()}});

  window.RizoSchoolImprevistos={jitter,events:EVENTS,get active(){return active?active.ev.id:null},advance,notice:climateNotice,get debug(){return {runTicks,nextAt,active:active&&{id:active.ev.id,base:active.base,target:active.target,until:active.until,returning:active.returning}}},start:startEvent,trigger};
})();
