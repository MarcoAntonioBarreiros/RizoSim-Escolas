(function(){
  function wait(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
  }

  async function waitForEngine(target){
    for(let i=0;i<80;i++){
      if(target.RizoSimEngine&&target.RizoSchoolEnvironment)return;
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

    engine.configure({moist:22,temp:31,ph:6.1,tox:5});
    results.push(result(
      'Controles técnicos continuam funcionando',
      engine.state.env.moist===22&&engine.state.env.temp===31&&Number(engine.state.env.ph.toFixed(1))===6.1&&engine.state.env.tox===5,
      JSON.stringify(engine.state.env)
    ));

    return {
      ok:results.every(item=>item.pass),
      generatedAt:new Date().toISOString(),
      results
    };
  }

  window.RizoSchoolRegression={run};
})();
