(function(){
  const categories=[
    {
      id:'parcerias',
      label:'Parcerias com a planta',
      guilds:[5,11,2]
    },
    {
      id:'nutrientes',
      label:'Nutrientes e crescimento',
      guilds:[0,1,3,7]
    },
    {
      id:'reciclagem',
      label:'Reciclagem',
      guilds:[10]
    },
    {
      id:'protecao',
      label:'Proteção e competição',
      guilds:[4,12,6]
    },
    {
      id:'desafios',
      label:'Predadores e desafios',
      guilds:[8,9]
    }
  ];

  const cards={
    0:{
      name:'Pseudomonas',
      short:'Ajuda a obter ferro',
      initial:'Ps',
      morph:'bact',
      color:'#20b2aa',
      pattern:'pontos',
      simple:'Pode transformar ferro pouco disponível em uma forma mais fácil para a planta usar.',
      science:'Pseudomonas representa PGPBs produtoras de sideróforos. No motor preservado, perto da raiz ela converte Fe3+ em Fe2+ e pode melhorar o ferro da planta.'
    },
    1:{
      name:'Bacillus',
      short:'Libera fósforo preso',
      initial:'Ba',
      morph:'bact',
      color:'#f97316',
      pattern:'listras',
      simple:'Pode soltar parte do fósforo que estava preso no solo.',
      science:'Bacillus usa a função de solubilização de fosfato. A taxa depende de PO4 ligado, pH, proximidade da raiz e investimento funcional sorteado no genoma.'
    },
    2:{
      name:'Azospirillum',
      short:'Ajuda com nitrogênio',
      initial:'Az',
      morph:'bact',
      color:'#4dabf7',
      pattern:'ondas',
      simple:'Pode contribuir com nitrogênio e sinais de crescimento.',
      science:'Azospirillum mantém as regras originais de fixação de N2 e produção de AIA perto da rizosfera, com custos energéticos e feedback do estado da planta.'
    },
    3:{
      name:'Methylobacterium',
      short:'Produz sinal de crescimento',
      initial:'Me',
      morph:'bact',
      color:'#ff69b4',
      pattern:'pontos',
      simple:'Pode produzir AIA, um sinal ligado ao crescimento.',
      science:'Methylobacterium atua como guilda mixotrófica associada a AIA no motor original. A produção diminui quando o AIA da planta já está alto.'
    },
    4:{
      name:'Trichoderma',
      short:'Compete com patógenos',
      initial:'Tr',
      morph:'fungi',
      color:'#9b59b6',
      pattern:'ramos',
      simple:'Pode ajudar no equilíbrio ao atacar patógenos.',
      science:'Trichoderma conserva a regra de biocontrole: procura patógenos, ganha energia ao predá-los e reduz uma pressão biótica sobre a raiz.'
    },
    5:{
      name:'Rizóbio',
      short:'Pode formar nódulos',
      initial:'Ri',
      morph:'bact',
      color:'#eab308',
      pattern:'anel',
      simple:'Quando encontra a raiz, pode formar nódulos ligados ao nitrogênio.',
      science:'Rhizobium preserva a morfologia radial e a regra de nodulação. A chance de nodular aumenta quando o nitrogênio da planta está baixo.'
    },
    6:{
      name:'Patógeno',
      short:'Pode estressar raízes',
      initial:'Pa',
      morph:'bact',
      color:'#ef4444',
      pattern:'alerta',
      simple:'Pode causar estresse quando chega muito perto da raiz.',
      science:'A guilda patogênica mantém ataque oportunista perto da raiz. O dano aumenta estresse e reduz biomassa, com resposta modulada pelo ferro solúvel local.'
    },
    7:{
      name:'Cianobactéria',
      short:'Usa luz e nitrogênio',
      initial:'Ci',
      morph:'bact',
      color:'#84cc16',
      pattern:'luz',
      simple:'Usa luz perto da superfície e pode contribuir com nitrogênio.',
      science:'Cianobactéria preserva fotossíntese, produção de O2/carbono e fixação de N em função da luz local e do investimento funcional.'
    },
    8:{
      name:'Protozoário',
      short:'Come bactérias e fungos',
      initial:'Pr',
      morph:'proto',
      color:'#fbbf24',
      pattern:'olhos',
      simple:'Pode controlar populações ao se alimentar de microrganismos.',
      science:'Protozoários mantêm predação frequência-dependente, preferindo presas abundantes e reciclando parte dos nutrientes para o solo.'
    },
    9:{
      name:'Nematoide',
      short:'Pode ferir raízes',
      initial:'Ne',
      morph:'nema',
      color:'#fb923c',
      pattern:'ondas',
      simple:'Pode machucar raízes quando se aproxima delas.',
      science:'Nematoides mantêm herbivoria radicular, predação oportunista e efeitos sobre estresse e biomassa da planta.'
    },
    10:{
      name:'Saprófito',
      short:'Recicla matéria orgânica',
      initial:'Sa',
      morph:'fungi',
      color:'#a78bfa',
      pattern:'ramos',
      simple:'Ajuda a transformar restos em nutrientes disponíveis.',
      science:'Saprófitos decompõem carbono orgânico em qualquer parte do solo, liberando NH4+ e PO4 livre conforme a cinética original.'
    },
    11:{
      name:'Micorriza',
      short:'Explora mais solo',
      initial:'Mi',
      morph:'fungi',
      color:'#d4d4d8',
      pattern:'hifas',
      simple:'Amplia a região explorada pela raiz, especialmente para fósforo.',
      science:'Micorriza preserva a regra de rede hifal: consome carbono da planta/exsudatos e mobiliza fósforo em células vizinhas da grade.'
    },
    12:{
      name:'Arthrobotrys',
      short:'Captura nematoides',
      initial:'Ar',
      morph:'fungi',
      color:'#2dd4bf',
      pattern:'rede',
      simple:'Pode capturar nematoides com armadilhas.',
      science:'Arthrobotrys conserva a função de fungo nematófago. Ao capturar nematoides, recicla N e P para o solo.'
    }
  };

  window.RizoSchoolOrganisms={
    categories,
    cards,
    listByCategory(categoryId){
      const category=categories.find(item=>item.id===categoryId)||categories[0];
      return category.guilds.map(id=>cards[id]).filter(Boolean);
    },
    get(id){
      return cards[id];
    }
  };
})();
