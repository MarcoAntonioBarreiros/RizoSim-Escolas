(function(){
  function wait(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
  }

  async function waitForEngine(target){
    for(let i=0;i<80;i++){
      if(target.RizoSimEngine&&target.RizoSchoolEnvironment&&target.RizoSchoolPlant&&target.RizoSchoolEvents)return;
      await wait(100);
    }
    throw new Error('RizoSimEngine não ficou disponível.');
  }

  function result(name,pass,details){
    return {name,pass:Boolean(pass),details:details||''};
  }

  async function run(targetWindow){
    const target=targetWindow||window;
    await waitForEngine(target);
    const engine=target.RizoSimEngine;
    const defaults=target.RizoSchoolEnvironment.defaults;
    const results=[];

    function closeToRoot(guild,count){
      const geo=engine.geometry;
      return engine.inoculateAt(guild,geo.wCx,geo.gY+28,count||10);
    }

    engine.setPaused(true);

    results.push(result(
      'As 13 guildas originais continuam presentes',
      engine.guilds.length===13&&engine.guilds.some(g=>g.name==='Rhizobium')&&engine.guilds.some(g=>g.name==='Micorriza'),
      'Total de guildas: '+engine.guilds.length
    ));

    const trichodermaEvent=target.RizoSchoolEvents.translate('eP','🛡 Trichoderma→Patógeno');
    const arthrobotrysEvent=target.RizoSchoolEvents.translate('eP','🪤 Arthrobotrys→Nematóide');
    results.push(result(
      'Eventos de biocontrole são traduzidos como resultados positivos',
      trichodermaEvent&&trichodermaEvent.key==='trichoderma-control'&&arthrobotrysEvent&&arthrobotrysEvent.key==='arthro',
      (trichodermaEvent?trichodermaEvent.message:'sem Trichoderma')+' | '+(arthrobotrysEvent?arthrobotrysEvent.message:'sem Arthrobotrys')
    ));

    engine.resetWith({...defaults,microbeMult:0});
    const baseState=engine.state;
    const blockedState={...baseState,plant:{...baseState.plant,bio:140,n:8,p:90,fe:90,stress:0},env:{...baseState.env,moist:60,temp:25,tox:0}};
    const favorableState={...baseState,plant:{...baseState.plant,bio:30,n:60,p:60,fe:60,stress:0},env:{...baseState.env,moist:60,temp:25,tox:0}};
    const blockedGrowth=target.RizoSchoolPlant.indicators(blockedState).find(item=>item.id==='growth');
    const favorableGrowth=target.RizoSchoolPlant.indicators(favorableState).find(item=>item.id==='growth');
    results.push(result(
      'Crescimento representa condições atuais, não tamanho acumulado',
      blockedGrowth.state==='baixo'&&favorableGrowth.state==='bom',
      'Planta grande limitada: '+blockedGrowth.state+'; planta jovem favorecida: '+favorableGrowth.state
    ));

    const relativeFactorState={
      ...baseState,
      plant:{...baseState.plant,n:74,p:82,fe:90,stress:0,limitFactor:'N'},
      env:{...baseState.env,moist:60,temp:25,tox:0}
    };
    const relativeFactorText=target.RizoSchoolPlant.explainIndicator(relativeFactorState,'growth');
    results.push(result(
      'Crescimento não chama um nutriente bom de deficiência',
      !relativeFactorText.includes('nitrogênio está limitando'),
      relativeFactorText
    ));

    engine.resetWith({...defaults,microbeMult:0,NH4:2,NO3:2,organicC:950});
    engine.raw.plant.n=5;
    closeToRoot(5,18);
    engine.step(700);
    const rhizoNodulated=engine.raw.sw.some(org=>org.g.guild===5&&org.nodulated);
    results.push(result(
      'Rizóbio continua capaz de formar nódulos',
      rhizoNodulated,
      'Nódulos registrados: '+engine.state.plant.nodules
    ));

    engine.resetWith({...defaults,microbeMult:0,PO4free:1,PO4bound:170,organicC:1000});
    engine.raw.plant.p=1;
    closeToRoot(11,16);
    engine.step(900);
    results.push(result(
      'Micorriza continua relacionada ao fósforo',
      engine.state.plant.p>1.2||engine.state.soil.PO4free>1.2,
      'P planta: '+engine.state.plant.p.toFixed(2)+'; PO4 livre médio: '+engine.state.soil.PO4free.toFixed(2)
    ));

    engine.resetWith({...defaults,microbeMult:0,organicC:1200,NH4:10,PO4free:5});
    const nh4Before=engine.state.soil.NH4;
    closeToRoot(10,12);
    engine.step(600);
    results.push(result(
      'Decompositores continuam reciclando nutrientes',
      engine.state.soil.NH4>nh4Before,
      'NH4 antes/depois: '+nh4Before.toFixed(2)+' -> '+engine.state.soil.NH4.toFixed(2)
    ));

    engine.resetWith({...defaults,microbeMult:0,organicC:850});
    const bioBefore=engine.state.plant.bio;
    const stressBefore=engine.state.plant.stress;
    closeToRoot(9,14);
    closeToRoot(6,10);
    engine.step(600);
    results.push(result(
      'Patógenos e nematoides continuam afetando raízes',
      engine.state.plant.stress>stressBefore||engine.state.plant.bio<bioBefore,
      'Estresse: '+stressBefore.toFixed(2)+' -> '+engine.state.plant.stress.toFixed(2)+'; biomassa: '+bioBefore.toFixed(2)+' -> '+engine.state.plant.bio.toFixed(2)
    ));

    engine.resetWith({...defaults,microbeMult:0});
    closeToRoot(8,8);
    closeToRoot(1,16);
    const popBefore=engine.state.population;
    engine.step(900);
    results.push(result(
      'Populações continuam interagindo por predação/competição',
      engine.state.population!==popBefore||engine.state.deaths>0,
      'População antes/depois: '+popBefore+' -> '+engine.state.population+'; mortes: '+engine.state.deaths
    ));

    engine.resetWith({...defaults,microbeMult:0});
    const amoebae=closeToRoot(8,8);
    closeToRoot(1,30);
    const bacteriaBefore=engine.state.guildCounts[1]||0;
    let phagocytosis=false,maxShape=0;
    for(let k=0;k<9;k++){
      engine.step(100);
      for(const org of engine.raw.sw){
        if(!org.alive||!org.skin||!org.skin.food)continue;
        if(org.skin.food.length>0)phagocytosis=true;
        const r=org.skin.r;maxShape=Math.max(maxShape,Math.max(...r)/Math.min(...r));
      }
    }
    const bacteriaAfter=engine.state.guildCounts[1]||0;
    const withBody=amoebae.filter(org=>org.skin&&org.skin.food).length;
    results.push(result(
      'Protozoário aparece como ameba e continua predando bactérias, com pseudópodes e fagocitose',
      withBody===amoebae.length&&phagocytosis&&maxShape>1.4,   /* preda, mas o biofilme na raiz protege parte das bactérias: o número pode subir */
      'Amebas: '+withBody+'/'+amoebae.length+'; Bacillus: '+bacteriaBefore+' -> '+bacteriaAfter+'; vacúolos digestivos: '+(phagocytosis?'sim':'não')+'; maior alongamento: '+maxShape.toFixed(2)
    ));

    engine.resetWith({...defaults,microbeMult:0,organicC:1000});
    const fungiMade=[4,10,11,12].flatMap(id=>closeToRoot(id,3));
    engine.step(500);
    const fungiAlive=fungiMade.filter(org=>org.alive);
    const withMycelium=fungiAlive.filter(org=>org.skin&&org.skin.segs);
    const hyphae=withMycelium.map(org=>org.skin.segs.length);
    const growingTips=withMycelium.reduce((n,org)=>n+org.skin.tips.length,0);
    results.push(result(
      'Fungos aparecem como micélio que cresce pela ponta',
      fungiAlive.length>0&&withMycelium.length===fungiAlive.length&&Math.min(...hyphae)>=10&&growingTips>0,
      'Fungos vivos com micélio: '+withMycelium.length+'/'+fungiAlive.length+'; segmentos de hifa por colônia: '+(hyphae.length?Math.min(...hyphae)+'–'+Math.max(...hyphae):'-')+'; pontas: '+growingTips
    ));

    engine.resetWith({...defaults,microbeMult:0});
    const others=[0,1,2,3,5,7,9].flatMap(id=>closeToRoot(id,2));
    engine.step(200);
    const kinds={};
    for(const org of others){if(org.alive&&org.skin)kinds[org.g.guild]=org.skin.label}
    const missing=[0,1,2,3,5,7,9].filter(id=>others.some(org=>org.alive&&org.g.guild===id)&&!kinds[id]);
    results.push(result(
      'Bactérias, cianobactérias e nematoides aparecem com o corpo novo',
      missing.length===0&&Object.keys(kinds).length>=5,
      Object.entries(kinds).map(([k,v])=>k+': '+v).join(' | ')+(missing.length?' — sem corpo: '+missing.join(','):'')
    ));

    engine.resetWith({...defaults,microbeMult:0,Fe2:1,Fe3:130,NH4:45,NO3:35,PO4free:25});
    engine.raw.plant.fe=8;
    const feBefore=engine.state.plant.fe;
    closeToRoot(0,14);
    engine.step(900);
    results.push(result(
      'Pseudomonas continua útil quando ferro limita',
      engine.state.plant.fe>feBefore||engine.state.soil.Fe2>1.2,
      'Fe planta: '+feBefore.toFixed(2)+' -> '+engine.state.plant.fe.toFixed(2)+'; Fe2 solo: '+engine.state.soil.Fe2.toFixed(2)
    ));

    engine.resetWith({...defaults,microbeMult:0,Fe2:1,Fe3:130});
    engine.raw.plant.fe=12;
    closeToRoot(0,4);
    const pseudomonasText=target.RizoSchoolPlant.explainIndicator(engine.state,'growth');
    results.push(result(
      'Explicação reconhece Pseudomonas já atuando perto da raiz',
      pseudomonasText.includes('Pseudomonas perto da raiz atuando')&&pseudomonasText.includes('gradualmente'),
      pseudomonasText
    ));

    engine.resetWith({...defaults,microbeMult:0,organicC:900,Fe2:4,Fe3:95});
    closeToRoot(6,8);
    closeToRoot(9,6);
    const pathogensBefore=engine.state.guildCounts[6]||0;
    const nematodesBefore=engine.state.guildCounts[9]||0;
    closeToRoot(4,14);
    closeToRoot(12,14);
    engine.step(1100);
    const pathogensAfter=engine.state.guildCounts[6]||0;
    const nematodesAfter=engine.state.guildCounts[9]||0;
    results.push(result(
      'Biocontrole continua reduzindo patógenos ou nematoides quando encontra o alvo',
      pathogensAfter<pathogensBefore||nematodesAfter<nematodesBefore,
      'Patógenos: '+pathogensBefore+' -> '+pathogensAfter+'; nematoides: '+nematodesBefore+' -> '+nematodesAfter
    ));

    engine.configure({moist:60});
    const waterBalanced=target.RizoSchoolPlant.indicators(engine.state).find(item=>item.id==='water');
    engine.configure({moist:88});
    const waterExcess=target.RizoSchoolPlant.indicators(engine.state).find(item=>item.id==='water');
    results.push(result(
      'Indicador de água mede conforto hídrico, não volume bruto',
      waterBalanced.state==='bom'&&waterBalanced.status==='equilibrada'&&waterExcess.state!=='bom'&&waterExcess.status==='excesso',
      '60%: '+waterBalanced.status+'/'+waterBalanced.state+'; 88%: '+waterExcess.status+'/'+waterExcess.state
    ));

    engine.configure({moist:22,temp:31,ph:6.1,tox:5});
    results.push(result(
      'Controles técnicos continuam funcionando',
      engine.state.env.moist===22&&engine.state.env.temp===31&&Number(engine.state.env.ph.toFixed(1))===6.1&&engine.state.env.tox===5,
      JSON.stringify(engine.state.env)
    ));

    engine.resetWith({...defaults,microbeMult:0,organicC:1200});
    const observed=closeToRoot(2,1)[0];
    const otherOrganism=closeToRoot(1,1)[0];
    const observedBefore={x:observed.x,y:observed.y};
    const otherBefore={x:otherOrganism.x,y:otherOrganism.y};
    engine.setSpeed(4);
    engine.setPaused(false);
    const observeButton=target.document.querySelector('[data-observe="2"]');
    if(observeButton)observeButton.click();
    await wait(30);
    engine.step(12);
    const focusedGeo=engine.geometry;
    const observedView=observed.vpos?observed.vpos():observed;   // a câmera centraliza o que está desenhado
    const focusedPoint=engine.worldToScreen(observedView.x,observedView.y);
    const ring=target.document.getElementById('selectionRing');
    const bubble=target.document.getElementById('selectedBubble');
    const focusedX=Number.parseFloat(ring.style.left);
    const focusedY=Number.parseFloat(ring.style.top);
    const observedMoved=Math.hypot(observed.x-observedBefore.x,observed.y-observedBefore.y);
    const otherMoved=Math.hypot(otherOrganism.x-otherBefore.x,otherOrganism.y-otherBefore.y);
    const keptRunning=!engine.state.paused&&engine.state.speed===4;
    results.push(result(
      'Observar acompanha sem pausar ou reduzir a comunidade',
      Boolean(observeButton)&&keptRunning&&focusedGeo.following&&focusedGeo.zoom>=3.2&&!bubble.hidden&&target.document.getElementById('selectedName').textContent==='Azospirillum'&&observedMoved>.01&&otherMoved>.01&&Math.abs(focusedPoint.x-focusedGeo.cW*.58)<3&&Math.abs(focusedPoint.y-focusedGeo.cH*.48)<3&&Math.abs(focusedX-focusedGeo.cW*.58)<3&&Math.abs(focusedY-focusedGeo.cH*.48)<3,
      'Zoom: '+focusedGeo.zoom.toFixed(1)+'; observado moveu '+observedMoved.toFixed(2)+'; outro organismo moveu '+otherMoved.toFixed(2)
    ));
    target.document.getElementById('closeSelectionBtn')?.click();
    engine.setPaused(true);

    return {
      ok:results.every(item=>item.pass),
      generatedAt:new Date().toISOString(),
      results
    };
  }

  window.RizoSchoolRegression={run};
})();
