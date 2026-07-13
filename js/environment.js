(function(){
  const defaults={
    soil:'loam',
    temp:25,
    ph:6.5,
    moist:60,
    tox:0,
    light:70,
    uv:15,
    microbeMult:1,
    organicC:800,
    NH4:45,
    NO3:35,
    PO4free:25,
    PO4bound:60,
    Fe3:60,
    Fe2:15
  };

  const scenarios=[
    {
      id:'equilibrado',
      name:'Solo equilibrado',
      phrase:'O feijão começa em um solo com água e nutrientes moderados.',
      observe:'Observe como a comunidade muda sem uma pressão forte no início.',
      values:{...defaults}
    },
    {
      id:'baixo-n',
      name:'Pouco nitrogênio',
      phrase:'O feijão está crescendo devagar.',
      observe:'Observe quem se aproxima da raiz quando o nitrogênio está baixo.',
      values:{...defaults,NH4:6,NO3:6,organicC:850}
    },
    {
      id:'baixo-p',
      name:'Pouco fósforo disponível',
      phrase:'Há fósforo no solo, mas pouco está livre para a raiz.',
      observe:'Observe o que muda perto das raízes e no fósforo disponível.',
      values:{...defaults,PO4free:3,PO4bound:120,ph:6.7}
    },
    {
      id:'baixo-fe',
      name:'Pouco ferro disponível',
      phrase:'Há ferro no solo, mas pouco está em forma fácil para a raiz.',
      observe:'Observe quando Pseudomonas pode ajudar a transformar o ferro perto da raiz.',
      values:{...defaults,Fe2:1,Fe3:130,PO4free:24,NH4:42,NO3:34},
      afterReset(){
        RizoSimEngine.raw.plant.fe=8;
      }
    },
    {
      id:'seco',
      name:'Período seco',
      phrase:'O solo está com pouca água.',
      observe:'Observe o vigor da planta e a movimentação dos organismos.',
      values:{...defaults,moist:22,soil:'sandy',light:80,temp:31}
    },
    {
      id:'ataque-raiz',
      name:'Ataque às raízes',
      phrase:'Alguns organismos que podem causar dano começam perto da raiz.',
      observe:'Observe se a raiz sofre dano e quais organismos conseguem reduzir a pressão.',
      values:{...defaults,microbeMult:.35,organicC:900,NH4:34,NO3:28,PO4free:20,Fe2:4,Fe3:95},
      afterReset(){
        RizoSimEngine.inoculateNearRoot(6,6);
        RizoSimEngine.inoculateNearRoot(9,5);
      }
    },
    {
      id:'baixa-diversidade',
      name:'Comunidade pouco diversa',
      phrase:'O solo começa com poucos tipos de organismos.',
      observe:'Observe como uma comunidade simples se comporta quando novas escolhas entram.',
      values:{...defaults,microbeMult:0,organicC:760,NH4:35,NO3:25,PO4free:20},
      afterReset(){
        RizoSimEngine.inoculateNearRoot(1,5);
        RizoSimEngine.inoculateNearRoot(10,4);
      }
    }
  ];

  function applyScenario(id){
    const scenario=scenarios.find(item=>item.id===id)||scenarios[0];
    RizoSimEngine.resetWith(scenario.values);
    if(typeof scenario.afterReset==='function')scenario.afterReset();
    RizoSimEngine.setSpeed(1);
    RizoSimEngine.setPaused(false);
    if(window.RizoSchoolEvents){
      RizoSchoolEvents.add({
        priority:4,
        key:'scenario-'+scenario.id,
        message:scenario.phrase,
        detail:scenario.observe,
        title:scenario.name
      });
    }
    return scenario;
  }

  window.RizoSchoolEnvironment={
    defaults,
    scenarios,
    applyScenario
  };
})();
