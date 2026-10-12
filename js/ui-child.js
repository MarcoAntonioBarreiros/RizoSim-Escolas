(function(){
  const categoryTabs=document.getElementById('categoryTabs');
  const organismCards=document.getElementById('organismCards');
  const indicatorHost=document.getElementById('beanIndicators');
  const eventList=document.getElementById('childEventList');
  const scenarioPanel=document.getElementById('scenarioPanel');
  const scenarioBackdrop=document.getElementById('scenarioBackdrop');
  const scenarioList=document.getElementById('scenarioList');
  const selectedBubble=document.getElementById('selectedBubble');
  const selectedName=document.getElementById('selectedName');
  const selectedAction=document.getElementById('selectedAction');
  const selectionRing=document.getElementById('selectionRing');
  const focusShade=document.getElementById('focusShade');
  const textAlternative=document.getElementById('textAlternative');
  const observeLabel=document.getElementById('observeModeLabel');
  const explainDialog=document.getElementById('explainDialog');
  const explainTitle=document.getElementById('explainTitle');
  const explainText=document.getElementById('explainText');
  const explainEyebrow=document.getElementById('explainEyebrow');
  const explainActions=document.getElementById('explainActions');

  let activeCategory=RizoSchoolOrganisms.categories[0].id;
  let currentIndicators=[];
  let selectedOrganism=null;
  let suppressCanvasClickUntil=0;
  let eventItems=[];
  const lastEventByKey=new Map();
  let previousState=null;

  function stateLabel(kind){
    return kind==='bom'?'bom':kind==='medio'?'médio':'baixo';
  }

  function renderExplainActions(actions){
    if(!explainActions)return;
    if(!actions||!actions.length){
      explainActions.hidden=true;
      explainActions.innerHTML='';
      return;
    }
    explainActions.hidden=false;
    explainActions.innerHTML=actions.map(action=>`
      <button type="button" data-action="${action.action}" data-value="${action.value}" aria-pressed="${action.pressed?'true':'false'}">
        ${action.label}
      </button>
    `).join('');
  }

  function openExplanation(title,text,eyebrow,actions){
    explainTitle.textContent=title;
    explainText.textContent=text;
    explainEyebrow.textContent=eyebrow||'Entenda';
    renderExplainActions(actions);
    if(typeof explainDialog.showModal==='function')explainDialog.showModal();
    else explainDialog.setAttribute('open','');
  }

  function waterActions(){
    const current=Math.round(RizoSimEngine.state.env.moist);
    return [
      {action:'water',value:22,label:'Pouca água',pressed:current<45},
      {action:'water',value:60,label:'Água equilibrada',pressed:current>=45&&current<=75},
      {action:'water',value:88,label:'Muita água',pressed:current>75}
    ];
  }

  function syncWaterVisual(state){
    const moist=state.env.moist;
    let tone='balanced';
    if(moist<30)tone='dry';
    else if(moist<45||moist>75)tone='watch';
    if(moist>85)tone='wet';
    document.body.dataset.water=tone;
  }

  function renderIndicators(){
    const state=RizoSimEngine.state;
    syncWaterVisual(state);
    currentIndicators=RizoSchoolPlant.indicators(state);
    indicatorHost.innerHTML=currentIndicators.map(item=>`
      <button class="indicator" type="button" data-indicator="${item.id}" data-state="${item.state}">
        <span class="indicator-icon" style="background:${item.state==='baixo'?'var(--coral)':item.state==='medio'?'var(--amber)':'var(--green)'}">${item.icon}</span>
        <span>
          <strong>${item.label}</strong>
          <small>${item.status||stateLabel(item.state)}</small>
          <span class="simple-bar" aria-hidden="true"><span style="width:${Math.round(item.value)}%"></span></span>
        </span>
      </button>
    `).join('');
    textAlternative.textContent=RizoSchoolPlant.describe(state);
  }

  indicatorHost.addEventListener('click',event=>{
    const button=event.target.closest('[data-indicator]');
    if(!button)return;
    const indicator=currentIndicators.find(item=>item.id===button.dataset.indicator);
    if(!indicator)return;
    const detail=RizoSchoolPlant.explainIndicator?RizoSchoolPlant.explainIndicator(RizoSimEngine.state,indicator.id):indicator.explanation;
    if(indicator.id==='water'){
      openExplanation(indicator.label,detail+' Escolha uma condição para alterar a umidade real do simulador.','Como está o feijão?',waterActions());
      return;
    }
    if(indicator)openExplanation(indicator.label,detail||indicator.explanation,'Como está o feijão?');
  });

  explainActions?.addEventListener('click',event=>{
    const button=event.target.closest('[data-action="water"]');
    if(!button)return;
    const moist=Number(button.dataset.value);
    const label=button.textContent.trim();
    RizoSimEngine.configure({moist});
    renderIndicators();
    renderExplainActions(waterActions());
    const state=RizoSimEngine.state;
    const water=RizoSchoolPlant.indicators(state).find(item=>item.id==='water');
    explainText.textContent='A condição de água foi alterada. Agora ela está '+water.status+'. Observe o tom do solo, o movimento dos organismos e a resposta do feijão nos próximos passos da simulação.';
    addChildEvent({
      priority:4,
      key:'water-control-'+moist,
      message:'A água do solo mudou para: '+label+'.',
      title:'Água do solo',
      detail:'A criança alterou a umidade real do ambiente. O motor recalcula viscosidade, oxigênio e estresse usando esse novo valor.'
    });
  });

  function renderCategories(){
    categoryTabs.innerHTML=RizoSchoolOrganisms.categories.map(category=>`
      <button id="tab-${category.id}" role="tab" type="button" aria-selected="${category.id===activeCategory}" aria-controls="organismCards" tabindex="${category.id===activeCategory?'0':'-1'}" data-category="${category.id}">
        ${category.label}
      </button>
    `).join('');
  }

  function renderCards(){
    setTimeout(markPipetteButtons,0);
    const category=RizoSchoolOrganisms.categories.find(item=>item.id===activeCategory);
    organismCards.setAttribute('role','tabpanel');
    organismCards.setAttribute('aria-labelledby','tab-'+category.id);
    organismCards.innerHTML=category.guilds.map(guildId=>{
      const item=RizoSchoolOrganisms.get(guildId);
      return `
        <article class="organism-card" data-guild="${guildId}">
          <span class="org-icon morph-${item.morph}" data-initial="${item.initial}" style="--org-color:${item.color}" aria-hidden="true"></span>
          <h3>${item.name}</h3>
          <p>${item.short}</p>
          <div class="card-actions">
            <button type="button" data-observe="${guildId}">Observar</button>
            <button type="button" data-add="${guildId}">Adicionar</button>
          </div>
        </article>
      `;
    }).join('');
  }

  categoryTabs.addEventListener('click',event=>{
    const tab=event.target.closest('[data-category]');
    if(!tab)return;
    activeCategory=tab.dataset.category;
    renderCategories();
    renderCards();
  });

  categoryTabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const categories=RizoSchoolOrganisms.categories;
    const current=categories.findIndex(item=>item.id===activeCategory);
    let next=current;
    if(event.key==='ArrowLeft')next=(current-1+categories.length)%categories.length;
    if(event.key==='ArrowRight')next=(current+1)%categories.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=categories.length-1;
    activeCategory=categories[next].id;
    renderCategories();
    renderCards();
    document.getElementById('tab-'+activeCategory)?.focus();
    event.preventDefault();
  });

  /* ── Pipeta: "Adicionar" escolhe o organismo; cada toque no solo coloca 3 indivíduos ali,
     como a inoculação por clique do RizoSim original. "Concluir" ou Esc encerra. ── */
  let pipette=null;
  function markPipetteButtons(){
    organismCards.querySelectorAll('[data-add]').forEach(button=>{
      const on=pipette!==null&&Number(button.dataset.add)===pipette;
      button.classList.toggle('is-active',on);
      button.setAttribute('aria-pressed',on?'true':'false');
      button.textContent=on?'Concluir':'Adicionar';
    });
  }
  function startPipette(guildId){
    clearSelection();
    pipette=guildId;
    RizoSimEngine.addMode(guildId);
    document.getElementById('cw')?.classList.add('is-pipette');
    markPipetteButtons();
    observeLabel.textContent='Toque no solo para colocar '+RizoSchoolOrganisms.get(guildId).name+'. Esc ou "Concluir" para terminar.';
  }
  function endPipette(){
    if(pipette===null)return;
    pipette=null;
    RizoSimEngine.selectMode();
    document.getElementById('cw')?.classList.remove('is-pipette');
    markPipetteButtons();
    observeLabel.textContent='Toque em um organismo para observar.';
  }
  document.addEventListener('keydown',event=>{if(event.key==='Escape')endPipette()});

  function findBiocontrolTarget(guildId){
    const preyGuild=guildId===4?6:guildId===12?9:null;
    if(preyGuild===null)return null;
    const geo=RizoSimEngine.geometry;
    const options=RizoSimEngine.raw.sw.filter(item=>item.alive&&item.g.guild===preyGuild);
    options.sort((a,b)=>{
      const ar=Math.abs(a.x-geo.wCx)+(a.y>geo.gY&&a.y<geo.gY+geo.rootDepth+32?0:200);
      const br=Math.abs(b.x-geo.wCx)+(b.y>geo.gY&&b.y<geo.gY+geo.rootDepth+32?0:200);
      return ar-br;
    });
    return options[0]||null;
  }

  function inoculateFromCard(guildId){
    const target=findBiocontrolTarget(guildId);
    const count=(guildId===4||guildId===12)?5:3;
    if(target){
      const x=target.x+(Math.random()*18-9);
      const y=target.y+(Math.random()*18-9);
      return {made:RizoSimEngine.inoculateAt(guildId,x,y,count),target};
    }
    return {made:RizoSimEngine.inoculateNearRoot(guildId,count),target:null};
  }

  organismCards.addEventListener('click',event=>{
    const observe=event.target.closest('[data-observe]');
    const add=event.target.closest('[data-add]');
    if(observe){
      endPipette();
      const guildId=Number(observe.dataset.observe);
      RizoSimEngine.selectMode();
      observeGuild(guildId);
    }
    if(add&&event.detail!==0){          // clique com mouse/toque: pipeta — toque no solo para colocar
      const guildId=Number(add.dataset.add);
      if(pipette===guildId)endPipette();else startPipette(guildId);
      return;
    }
    if(add){                             // teclado: adiciona perto da raiz, como antes
      const guildId=Number(add.dataset.add);
      const placement=inoculateFromCard(guildId);
      const made=placement.made;
      RizoSimEngine.selectMode();
      RizoSimEngine.setPaused(false);
      if(made[0])selectOrganism(made[0]);
      const data=RizoSchoolOrganisms.get(guildId);
      addChildEvent({
        priority:3,
        key:'card-add-'+guildId,
        message:data.name+' foi adicionado perto da raiz.',
        title:data.name,
        detail:data.science+(placement.target?' Nesta versão escolar, a adição foi posicionada perto do desafio observado para que a interação ecológica possa acontecer na simulação.':'')
      });
    }
  });

  function observeGuild(guildId){
    const geo=RizoSimEngine.geometry;
    const rootTargetY=geo.gY+Math.min(90,Math.max(24,geo.rootDepth*.5));
    const candidates=RizoSimEngine.raw.sw
      .filter(item=>item.alive&&item.g.guild===guildId)
      .sort((a,b)=>{
        const aOutsideRoot=a.y<geo.gY||a.y>geo.gY+geo.rootDepth+32?400:0;
        const bOutsideRoot=b.y<geo.gY||b.y>geo.gY+geo.rootDepth+32?400:0;
        return aOutsideRoot+Math.hypot(a.x-geo.wCx,a.y-rootTargetY)-bOutsideRoot-Math.hypot(b.x-geo.wCx,b.y-rootTargetY);
      });
    const found=candidates[0];
    const data=RizoSchoolOrganisms.get(guildId);
    if(found){
      const zoom=Math.max(6,Math.min(geo.zoom,10));   // aproxima o suficiente para ver o corpo do organismo
      RizoSimEngine.followOrganism(found,zoom,.58,.48);
      selectOrganism(found,true);
      addChildEvent({
        priority:2,
        key:'observe-'+guildId,
        message:'Observando '+data.name+'.',
        title:data.name,
        detail:data.simple
      });
    }else{
      addChildEvent({
        priority:2,
        key:'observe-empty-'+guildId,
        message:'Ainda não vejo '+data.name+' nesta simulação.',
        title:data.name,
        detail:'Você pode adicionar este organismo ou continuar observando a comunidade atual.'
      });
    }
  }

  function translateEngineEvent(cls,txt){
    const raw=String(txt||'');
    if(raw.includes('Inoculado:')){
      const name=raw.split('Inoculado:').pop().trim();
      return {key:'inoc-'+name,message:name+' entrou na rizosfera.',title:'Organismo adicionado',detail:'O organismo foi inserido no motor real da simulação, perto do ponto escolhido.'};
    }
    if(raw.includes('Rhizobium'))return {key:'nodulo',message:'A raiz começou a formar um nódulo.',title:'Nódulo em formação',detail:'No motor, rizóbios próximos da raiz podem nodular. A chance aumenta quando o nitrogênio da planta está baixo.'};
    if(raw.includes('Micorriza'))return {key:'micorriza-p',message:'A rede da micorriza alcançou uma nova região do solo.',title:'Micorriza e fósforo',detail:'A micorriza usa hifas para explorar células vizinhas da grade e pode transferir fósforo para a planta.'};
    if(raw.includes('Bacillus'))return {key:'bacillus-p',message:'O fósforo disponível aumentou perto das raízes.',title:'Fósforo liberado',detail:'Bacillus pode solubilizar fósforo ligado. O efeito depende de pH, fósforo ligado e proximidade da raiz.'};
    if(raw.includes('Pseudo'))return {key:'ferro',message:'O ferro solúvel aumentou perto da raiz.',title:'Ferro disponível',detail:'Pseudomonas pode converter Fe3+ em Fe2+, uma forma simulada como mais disponível.'};
    if(raw.includes('Proto'))return {key:'proto-pred',message:'Um protozoário se alimentou de microrganismos.',title:'Predação',detail:'Protozoários controlam populações abundantes e reciclam parte dos nutrientes ao predar.'};
    if(raw.includes('Trichoderma'))return {key:'trichoderma-control',message:'Trichoderma controlou um patógeno.',title:'Controle biológico',detail:'O Trichoderma encontrou um patógeno, reduziu essa população e aliviou parte da pressão sobre a raiz.'};
    if(raw.includes('Arthrobotrys'))return {key:'arthro',message:'Uma armadilha capturou um nematoide.',title:'Arthrobotrys',detail:'Arthrobotrys é representado como fungo nematófago; ao capturar nematoides, reduz a pressão sobre a raiz e recicla nutrientes.'};
    if(raw.includes('Nematóide: raiz dano'))return {key:'raiz-dano',message:'Um nematoide causou dano à raiz.',title:'Dano radicular',detail:'Um nematoide chegou perto da raiz, aumentou o estresse e reduziu parte da biomassa da planta no simulador.'};
    if(raw.includes('Patógeno↑stress'))return {key:'patogeno',message:'Um patógeno aumentou o estresse da raiz.',title:'Patógenos',detail:'Um patógeno oportunista chegou perto da raiz e causou pressão nas condições atuais.'};
    if(raw.includes('Sapr'))return {key:'reciclagem',message:'Restos estão sendo reciclados no solo.',title:'Reciclagem',detail:'Saprófitos decompõem carbono orgânico e liberam nutrientes como NH4+ e fósforo livre.'};
    return null;
  }

  function addChildEvent(item){
    const now=Date.now();
    const key=item.key||item.message;
    const minGap=item.priority>=4?1200:6500;
    if(lastEventByKey.has(key)&&now-lastEventByKey.get(key)<minGap)return;
    lastEventByKey.set(key,now);
    eventItems.unshift({
      title:item.title||'Acontecimento',
      message:item.message,
      detail:item.detail||item.message,
      priority:item.priority||1,
      at:now
    });
    eventItems=eventItems
      .sort((a,b)=>(b.at+b.priority*6000)-(a.at+a.priority*6000))
      .slice(0,5);
    renderEvents();
  }

  function renderEvents(){
    eventList.innerHTML=eventItems.map((item,index)=>`
      <li>
        <p>${item.message}</p>
        <button class="understand-btn" type="button" data-event-index="${index}">Entenda</button>
      </li>
    `).join('');
  }

  eventList.addEventListener('click',event=>{
    const button=event.target.closest('[data-event-index]');
    if(!button)return;
    const item=eventItems[Number(button.dataset.eventIndex)];
    if(item)openExplanation(item.title,item.detail,'Entenda');
  });

  if(typeof addEv==='function'){
    const originalAddEv=addEv;
    addEv=function(cls,txt){
      originalAddEv(cls,txt);
      const translated=translateEngineEvent(cls,txt);
      if(translated)addChildEvent({...translated,priority:3});
    };
  }

  window.RizoSchoolEvents={
    add:addChildEvent,
    translate:translateEngineEvent,
    fromEngine(cls,txt){
      const translated=translateEngineEvent(cls,txt);
      if(translated)addChildEvent({...translated,priority:3});
    }
  };

  function explainOrganism(org){
    const gid=org.g.guild;
    const data=RizoSchoolOrganisms.get(gid);
    const nearRoot=Math.abs(org.x-wCx)<35&&org.y>gY&&org.y<gY+rootDepth+22;
    const local=gcAt(org.x,Math.max(org.y,gY));
    const nearby=RizoSimEngine.raw.sw.filter(other=>other!==org&&other.alive&&Math.hypot(other.x-org.x,other.y-org.y)<34);
    const nearbyBacteria=nearby.filter(other=>GUILDS[other.g.guild].type==='bact').length;
    const nearbyPathogens=nearby.filter(other=>other.g.guild===6).length;
    const nearbyNematodes=nearby.filter(other=>other.g.guild===9).length;
    const state=RizoSimEngine.state;

    if(gid===5){
      if(org.nodulated)return 'Este rizóbio já está ligado à raiz em um nódulo e pode ajudar na fixação de nitrogênio.';
      if(nearRoot&&state.plant.n<45)return 'Este rizóbio está perto da raiz. Como o nitrogênio está baixo, ele tem mais chance de formar nódulo e ajudar na fixação de N.';
      if(nearRoot)return 'Este rizóbio vive livre perto da raiz, comendo exsudatos. Formar nódulo leva tempo, e a planta limita quantos nódulos faz, conforme o tamanho e o nitrogênio que já tem.';
      return 'Este rizóbio está se movendo pelo solo em busca de sinais da raiz para uma parceria de nitrogênio.';
    }
    if(gid===11){
      if(org.skin&&org.skin.arbs&&org.skin.arbs.length)return 'Esta micorriza já entrou na raiz e formou arbúsculos, onde troca fósforo do solo por carbono do feijão.';
      if(nearRoot)return 'Esta micorriza está perto da raiz e pode ampliar a região explorada para fósforo.';
      return 'Esta micorriza está estendendo hifas pelo solo, procurando regiões úteis para a planta.';
    }
    if(gid===8){
      const b=org.skin;
      if(org.cyst)return 'Com o solo seco (ou sem presas por muito tempo), este protozoário virou cisto: uma parede grossa o protege, ele para de se mover e de comer e espera a umidade voltar.';
      if(b&&b.kind==='flag'){
        if(b.food.length)return 'Este flagelado engoliu uma bactéria e a está digerindo num vacúolo. Flagelados são os protozoários mais numerosos do solo e comem as bactérias soltas na água entre os grãos.';
        return 'Este flagelado euglenoide (parente da Euglena que come bactérias) desliza com o flagelo apontado para a frente, batendo só a ponta, e muda de forma enquanto anda (metabolia).';
      }
      if(b&&b.kind==='cil'){
        if(b.food.length)return 'Os cílios levam as bactérias até o sulco oral deste ciliado; dentro da célula, os vacúolos digestivos circulam enquanto a presa é digerida.';
        return 'Este ciliado nada rápido girando em torno do próprio eixo, movido por milhares de cílios que batem em onda. Quando esbarra em algo, recua e muda de direção. Precisa de bastante água.';
      }
      if(b&&b.food.some(f=>f.t<=f.catchT+f.pullT))return 'Esta ameba esticou um pseudópode, envolveu uma presa e está levando-a para dentro da célula (fagocitose).';
      if(b&&b.food.length)return 'Esta ameba está digerindo uma presa dentro de um vacúolo digestivo. Parte dos nutrientes volta para o solo.';
      if(nearbyBacteria>0)return 'Esta ameba está perto de bactérias: os pseudópodes crescem na direção delas para capturá-las.';
      return 'Esta ameba está explorando o solo com pseudópodes, procurando microrganismos para se alimentar.';
    }
    if(gid===9){
      if(org.skin&&org.skin.feed>0.3)return 'Este nematoide encostou a cabeça na raiz e está perfurando as células com o estilete para se alimentar.';
      if(nearRoot)return 'Este nematoide está perto da raiz e pode estar causando dano.';
      return 'Este nematoide está se movendo pelo solo e procurando alimento.';
    }
    if(gid===4){
      if(org.skin&&org.skin.events&&org.skin.events.length)return 'Este Trichoderma alcançou um patógeno e está se enrolando nele (micoparasitismo).';
      if(org.skin&&org.skin.arbs&&org.skin.arbs.some(a=>a.type==='endo'))return 'Este Trichoderma entrou na raiz e cresce entre as células da superfície (endofítico). Assim ele ocupa o espaço antes dos patógenos e estimula as defesas da planta.';
      if(nearbyPathogens>0)return 'Este Trichoderma está perto de patógenos e pode competir ou predar.';
      return 'Este Trichoderma está explorando o solo e pode ajudar no equilíbrio da comunidade.';
    }
    if(gid===12){
      if(org.skin&&org.skin.events&&org.skin.events.length)return 'Este Arthrobotrys acabou de prender um nematoide numa alça pegajosa das hifas.';
      if(nearbyNematodes>0)return 'Este Arthrobotrys está perto de nematoides e pode capturá-los.';
      return 'Este Arthrobotrys está formando uma rede que pode funcionar como armadilha.';
    }
    if(gid===6){
      if(org.skin&&org.skin.arbs&&org.skin.arbs.length)return 'Este patógeno é um fungo (tipo Fusarium): uma hifa penetrou a raiz e o tecido está escurecendo.';
      if(org.skin&&org.skin.rootF>0)return 'Este patógeno é um fungo (tipo Fusarium): substâncias liberadas pela raiz atraem suas hifas.';
      if(nearRoot)return 'Este patógeno está perto da raiz e pode aumentar o estresse do feijão.';
      return 'Este patógeno está no solo e ainda não está em contato forte com a raiz.';
    }
    if(gid===1&&org.skin&&org.skin.spore>0.3)return 'Este Bacillus está com pouca energia e formou um endósporo, uma estrutura de resistência.';
    if(org.skin&&org.skin.split>0.4)return 'Esta bactéria está se dividindo em duas (divisão binária).';
    if(gid===1){
      if(nearRoot&&local.PO4bound>local.PO4free)return 'Este Bacillus está perto da raiz, onde pode liberar fósforo preso no solo.';
      return 'Este Bacillus está consumindo recursos e pode atuar quando encontra a rizosfera.';
    }
    if(gid===0){
      if(state.plant.fe<35&&nearRoot)return 'O ferro ainda está baixo, mas esta Pseudomonas já está perto da raiz e pode torná-lo mais disponível. A resposta da planta não é imediata: continue a simulação e acompanhe o indicador.';
      if(state.plant.fe<35)return 'O ferro está baixo. Esta Pseudomonas ainda precisa chegar perto da raiz para atuar onde a planta absorve nutrientes.';
      if(nearbyPathogens>0||((state.guildCounts[6]||0)>0&&state.soil.Fe2<8))return 'Esta Pseudomonas está perto de uma disputa por ferro. No modelo, isso pode reduzir o dano causado por alguns patógenos.';
      if(nearRoot&&local.Fe3>local.Fe2)return 'Esta Pseudomonas está perto da raiz e pode tornar parte do ferro mais disponível.';
      return 'Esta Pseudomonas está se movendo e competindo por recursos; ela aparece mais quando ferro ou patógenos viram parte do problema.';
    }
    if(gid===10)return 'Este saprófito está ajudando a reciclar matéria orgânica no solo.';
    if(gid===7)return 'Esta cianobactéria usa luz perto da superfície e pode contribuir com nitrogênio.';
    if(gid===2)return 'Este Azospirillum pode contribuir com nitrogênio e sinais de crescimento perto da raiz.';
    if(gid===3)return 'Este Methylobacterium pode produzir sinais de crescimento quando há recursos.';
    return data.simple;
  }

  function selectOrganism(org,followedByCamera){
    selectedOrganism=org;
    if(!followedByCamera)RizoSimEngine.stopFollowing();
    observeLabel.textContent=(followedByCamera?'Acompanhando ':'Observando ')+GUILDS[org.g.guild].name+'.';
    selectedBubble.hidden=false;
    document.querySelector('.disclaimer')?.classList.add('is-faded');
    focusShade.classList.add('is-active');
    selectionRing.classList.add('is-active');
    updateSelectedOrganism();
  }

  function clearSelection(){
    RizoSimEngine.stopFollowing();
    selectedOrganism=null;
    selectedBubble.hidden=true;
    focusShade.classList.remove('is-active');
    selectionRing.classList.remove('is-active');
    observeLabel.textContent='Toque em um organismo para observar.';
  }

  function updateSelectedOrganism(){
    if(!selectedOrganism||!selectedOrganism.alive){
      clearSelection();
      return;
    }
    const vp=selectedOrganism.vpos?selectedOrganism.vpos():selectedOrganism;const point=RizoSimEngine.worldToScreen(vp.x,vp.y);
    observeLabel.textContent=(RizoSimEngine.geometry.following?'Acompanhando ':'Observando ')+GUILDS[selectedOrganism.g.guild].name+'.';
    selectionRing.style.left=point.x+'px';
    selectionRing.style.top=point.y+'px';
    focusShade.style.setProperty('--focus-x',point.x+'px');
    focusShade.style.setProperty('--focus-y',point.y+'px');
    const data=RizoSchoolOrganisms.get(selectedOrganism.g.guild);
    selectedName.textContent=data.name;
    selectedAction.textContent=explainOrganism(selectedOrganism);
  }

  function suppressCanvasClick(){
    suppressCanvasClickUntil=performance.now()+350;
  }

  selectedBubble?.addEventListener('pointerdown',event=>event.stopPropagation());
  selectedBubble?.addEventListener('pointerup',event=>event.stopPropagation());
  selectedBubble?.addEventListener('click',event=>event.stopPropagation());
  document.getElementById('closeSelectionBtn')?.addEventListener('pointerdown',event=>{
    suppressCanvasClick();
    event.stopPropagation();
  });
  document.getElementById('closeSelectionBtn')?.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    suppressCanvasClick();
    clearSelection();
  });

  document.getElementById('cw')?.addEventListener('click',event=>{
    if(performance.now()<suppressCanvasClickUntil)return;
    if(event.target.closest('.selected-bubble'))return;
    const sel=document.getElementById('selInoc');
    if(sel&&Number(sel.value)>=0){         // pipeta: o motor já colocou os organismos no ponto tocado
      if(pipette!==null){
        RizoSimEngine.setPaused(false);
        const data=RizoSchoolOrganisms.get(pipette);
        addChildEvent({priority:3,key:'pipette-'+pipette,message:data.name+' foi colocado onde você tocou.',title:data.name,detail:data.science});
      }
      return;
    }
    const rect=document.getElementById('pond').getBoundingClientRect();
    const org=RizoSimEngine.findOrganismAtScreen(event.clientX-rect.left,event.clientY-rect.top,34);
    if(org)selectOrganism(org);
  });

  function renderScenarios(){
    scenarioList.innerHTML=RizoSchoolEnvironment.scenarios.map(item=>`
      <button class="scenario-item" type="button" data-scenario="${item.id}">
        <strong>${item.name}</strong>
        <span>${item.phrase}</span>
      </button>
    `).join('');
  }

  scenarioList.addEventListener('click',event=>{
    const button=event.target.closest('[data-scenario]');
    if(!button)return;
    const scenario=RizoSchoolEnvironment.applyScenario(button.dataset.scenario);
    closeScenarioPanel();
    clearSelection();
    addChildEvent({
      priority:3,
      key:'scenario-observe-'+scenario.id,
      message:scenario.observe,
      title:scenario.name,
      detail:scenario.phrase+' '+scenario.observe
    });
  });

  function openScenarioPanel(){
    scenarioPanel.hidden=false;
    scenarioBackdrop.hidden=false;
    document.getElementById('scenarioBtn')?.setAttribute('aria-expanded','true');
    document.querySelector('[data-close-panel="scenarioPanel"]')?.focus({preventScroll:true});
  }

  function closeScenarioPanel(){
    const wasOpen=!scenarioPanel.hidden;
    scenarioPanel.hidden=true;
    scenarioBackdrop.hidden=true;
    document.getElementById('scenarioBtn')?.setAttribute('aria-expanded','false');
    if(wasOpen)document.getElementById('scenarioBtn')?.focus({preventScroll:true});
  }

  document.getElementById('scenarioBtn')?.addEventListener('click',()=>{
    if(scenarioPanel.hidden)openScenarioPanel();
    else closeScenarioPanel();
  });

  document.querySelectorAll('[data-close-panel]').forEach(button=>{
    button.addEventListener('click',()=>{
      if(button.dataset.closePanel==='scenarioPanel')closeScenarioPanel();
      else document.getElementById(button.dataset.closePanel).hidden=true;
    });
  });
  scenarioBackdrop?.addEventListener('click',closeScenarioPanel);

  document.getElementById('playBtn')?.addEventListener('click',()=>RizoSimEngine.togglePause());
  document.getElementById('resetBtn')?.addEventListener('click',()=>{
    RizoSimEngine.reset();
    RizoSimEngine.setPaused(false);
    clearSelection();
    addChildEvent({
      priority:4,
      key:'reset',
      message:'A simulação foi reiniciada.',
      title:'Reinício',
      detail:'O motor foi reiniciado usando os valores técnicos atuais do modo professor.'
    });
  });

  document.querySelectorAll('[data-speed]').forEach(button=>{
    button.addEventListener('click',()=>RizoSimEngine.setSpeed(Number(button.dataset.speed)));
  });

  document.getElementById('fullscreenBtn')?.addEventListener('click',()=>{
    if(document.fullscreenElement)document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });

  function monitorState(){
    const state=RizoSimEngine.state;
    const pseudomonas=state.guildCounts[0]||0;
    if(state.plant.n<24)addChildEvent({priority:2,key:'low-n',message:'A planta está com pouco nitrogênio.',title:'Nitrogênio baixo',detail:'No motor, o crescimento fica limitado quando o nitrogênio interno da planta cai.'});
    if(state.plant.p<24)addChildEvent({priority:2,key:'low-p',message:'A planta está com pouco fósforo.',title:'Fósforo baixo',detail:'O fósforo livre no solo é pouco móvel. Alguns organismos podem aumentar sua disponibilidade quando estão perto da raiz.'});
    if(state.plant.fe<24)addChildEvent({priority:2,key:'low-fe',message:'A planta está com pouco ferro disponível.',title:'Ferro baixo',detail:pseudomonas>0?'Há Pseudomonas na comunidade. Sua ação depende de chegar perto da raiz, e a resposta da planta aparece gradualmente enquanto a simulação avança.':'Pseudomonas pode ajudar perto da raiz ao transformar Fe3+ em Fe2+, forma que o motor trata como mais disponível.'});
    if(state.env.moist<30)addChildEvent({priority:2,key:'dry-soil',message:'O solo ficou mais seco.',title:'Período seco',detail:'Menos água aumenta a viscosidade do solo e pode elevar o estresse da planta.'});
    if(state.plant.stress>36)addChildEvent({priority:2,key:'stress-high',message:'A raiz está sob estresse.',title:'Estresse',detail:'O estresse resume efeitos de ambiente, nutrição e interações com organismos como patógenos e nematoides.'});
    if((state.guildCounts[6]||0)>0&&state.soil.Fe2<8)addChildEvent({priority:2,key:'pseudo-pathogen-help',message:pseudomonas>0?'Pseudomonas está participando da disputa por ferro.':'Pseudomonas pode ajudar na disputa por ferro.',title:'Pseudomonas e patógenos',detail:pseudomonas>0?'Há Pseudomonas na comunidade, mas o resultado depende do encontro com os patógenos e da proximidade da raiz. Continue observando a simulação.':'No motor, patógenos próximos da raiz causam mais dano quando há pouco Fe2 local. Pseudomonas pode aumentar Fe2 perto da raiz e mudar essa interação.'});
    if(previousState){
      if(previousState.plant.nodules===0&&state.plant.nodules>0)addChildEvent({priority:4,key:'new-nodule',message:'A raiz começou a formar um nódulo.',title:'Nodulação',detail:'Rizóbios nodulados podem transferir nitrogênio para a planta quando há carbono disponível.'});
      if(previousState.plant.stress-state.plant.stress>8)addChildEvent({priority:3,key:'recovering',message:'A planta começou a se recuperar.',title:'Recuperação gradual',detail:'Quando nutrientes e ambiente melhoram, o motor reduz o estresse por homeostase.'});
      const prevMicrobes=previousState.population;
      if(prevMicrobes-state.population>18)addChildEvent({priority:2,key:'community-drop',message:'A comunidade de microrganismos diminuiu.',title:'Mudança na comunidade',detail:'Populações podem cair por predação, competição, falta de energia ou senescência.'});
    }
    previousState=state;
  }

  function handleKeyboard(event){
    const tag=(event.target.tagName||'').toLowerCase();
    if(['input','select','textarea','button'].includes(tag)||explainDialog.open)return;
    if(event.code==='Space'){
      event.preventDefault();
      RizoSimEngine.togglePause();
    }
    if(event.key==='1')RizoSimEngine.setSpeed(1);
    if(event.key==='2')RizoSimEngine.setSpeed(2);
    if(event.key==='3')RizoSimEngine.setSpeed(4);
    if(event.key.toLowerCase()==='r'){
      RizoSimEngine.reset();
      RizoSimEngine.setPaused(false);
    }
    if(event.key==='Escape'){
      closeScenarioPanel();
      clearSelection();
    }
  }

  function handleCanvasKeys(event){
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_'].includes(event.key))RizoSimEngine.stopFollowing();
    if(event.key==='ArrowLeft'){px+=32;event.preventDefault()}
    if(event.key==='ArrowRight'){px-=32;event.preventDefault()}
    if(event.key==='ArrowUp'){py+=32;event.preventDefault()}
    if(event.key==='ArrowDown'){py-=32;event.preventDefault()}
    if(event.key==='+'||event.key==='='){zm=cl(zm*1.12,.3,15);updZI();event.preventDefault()}
    if(event.key==='-'||event.key==='_'){zm=cl(zm/1.12,.3,15);updZI();event.preventDefault()}
  }

  document.addEventListener('keydown',handleKeyboard);
  document.getElementById('cw')?.addEventListener('keydown',handleCanvasKeys);

  function applyReducedMotionPreference(){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      document.body.classList.add('motion-reduced');
      RizoSimEngine.setSpeed(1);
      RizoSimEngine.setPaused(true);
      addChildEvent({
        priority:4,
        key:'reduced-motion',
        message:'Movimento reduzido ativado.',
        title:'Movimento reduzido',
        detail:'A simulação começa pausada para reduzir movimento. Use Iniciar quando quiser avançar e Pausar novamente a qualquer momento.'
      });
    }
  }

  function tickUI(){
    renderIndicators();
    updateSelectedOrganism();
  }

  renderCategories();
  renderCards();
  renderScenarios();
  setTimeout(()=>document.querySelector('.disclaimer')?.classList.add('is-faded'),10000);
  renderIndicators();
  addChildEvent({
    priority:1,
    key:'welcome',
    message:'A simulação da rizosfera está rodando.',
    title:'Bem-vindo',
    detail:'Observe os organismos perto das raízes e acompanhe como o feijão responde às mudanças no solo.'
  });
  applyReducedMotionPreference();
  setInterval(tickUI,500);
  setInterval(monitorState,2500);
})();
