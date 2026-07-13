(function(){
  function clamp(value,min,max){
    return Math.max(min,Math.min(max,value));
  }

  function level(value){
    if(value<35)return 'baixo';
    if(value<68)return 'medio';
    return 'bom';
  }

  function waterComfort(moist){
    const value=clamp(moist,0,100);
    if(value<30)return clamp(value/30*34,0,34);
    if(value<45)return 35+(value-30)/15*32;
    if(value<=75)return clamp(100-Math.abs(value-60)*.9,68,100);
    if(value<=85)return 67-(value-75)*1.8;
    return clamp(50-(value-85)*1.4,22,50);
  }

  function waterStatus(moist){
    const value=clamp(moist,0,100);
    if(value<30)return 'pouca';
    if(value<45)return 'média';
    if(value<=75)return 'bom';
    if(value<=85)return 'média';
    return 'excesso';
  }

  function guildCount(state,id){
    return (state.guildCounts&&state.guildCounts[id])||0;
  }

  function sentenceList(items){
    if(!items.length)return '';
    return items.join(' ');
  }

  function withHelps(base,helps){
    return base+(helps.length?' '+sentenceList(helps):'');
  }

  function add(list,condition,text){
    if(condition)list.push(text);
  }

  function rootHealth(state){
    const counts=state.guildCounts||{};
    const total=Math.max(1,state.population||1);
    const nematodes=counts[9]||0;
    const pathogens=counts[6]||0;
    const pressure=((nematodes+pathogens)/total)*100;
    return clamp(100-state.plant.stress*.75-pressure*.65,0,100);
  }

  function explainIndicator(state,id){
    const plant=state.plant||{};
    const env=state.env||{};
    const soil=state.soil||{};
    const roots=rootHealth(state);
    const water=waterComfort(env.moist);
    const pathogens=guildCount(state,6);
    const nematodes=guildCount(state,9);
    const trichoderma=guildCount(state,4);
    const arthrobotrys=guildCount(state,12);
    const rhizobium=guildCount(state,5);
    const bacillus=guildCount(state,1);
    const pseudomonas=guildCount(state,0);
    const mycorrhiza=guildCount(state,11);
    const azospirillum=guildCount(state,2);
    const causes=[];
    const helps=[];

    if(id==='growth'){
      const nBlocked=plant.n<35||plant.limitFactor==='N';
      const pBlocked=plant.p<35||plant.limitFactor==='P';
      const feBlocked=plant.fe<35||plant.limitFactor==='Fe';
      add(causes,nBlocked,'O nitrogênio está limitando o crescimento.');
      add(causes,pBlocked,'O fósforo está limitando o crescimento.');
      add(causes,feBlocked,'O ferro está limitando o crescimento; neste caso Pseudomonas pode ser importante porque aumenta Fe2+ perto da raiz.');
      add(causes,plant.stress>30,'A planta está gastando energia para lidar com estresse.');
      add(causes,water<68,'A água não está em uma faixa confortável para a planta.');
      add(causes,env.temp<15||env.temp>34,'A temperatura está fora da faixa mais favorável.');
      add(causes,env.tox>0,'Agroquímicos estão aumentando a pressão sobre a planta.');
      add(causes,plant.aia>60,'Há AIA demais, que no motor pode virar sinal de estresse.');
      add(helps,!nBlocked&&!pBlocked&&!feBlocked&&plant.n>=50&&plant.p>=50&&plant.fe>=40,'Os principais nutrientes internos estão bons.');
      add(helps,plant.stress<18,'O estresse está baixo.');
      add(helps,water>=68,'A água está confortável.');
      add(helps,plant.nodules>0,'Há nódulo(s) de rizóbio ligados à fixação de nitrogênio.');
      add(helps,mycorrhiza>0,'Há micorriza explorando mais solo para fósforo.');
      return 'O crescimento depende da biomassa simulada, dos nutrientes mais limitantes e do estresse. '+withHelps(causes.length?'Agora: '+sentenceList(causes):'Agora o crescimento não tem uma trava forte visível.',helps);
    }

    if(id==='nitrogen'){
      add(causes,plant.n<35,'O nitrogênio interno da planta está baixo.');
      add(causes,(soil.NH4||0)+(soil.NO3||0)<45,'Há pouco NH4+ e NO3- disponíveis no solo médio.');
      add(causes,rhizobium===0&&plant.n<45,'Ainda há pouco rizóbio para formar nódulos.');
      add(helps,plant.nodules>0,'Rizóbios nodulados podem transferir nitrogênio para a planta.');
      add(helps,azospirillum>0,'Azospirillum pode contribuir com fixação de nitrogênio perto da raiz.');
      add(helps,guildCount(state,7)>0,'Cianobactérias perto da luz também podem contribuir com nitrogênio.');
      return 'Nitrogênio é um dos nutrientes que mais seguram o crescimento do feijão. '+withHelps(causes.length?'Agora: '+sentenceList(causes):'Agora o nitrogênio está em faixa boa para a planta.',helps);
    }

    if(id==='phosphorus'){
      add(causes,plant.p<35,'O fósforo interno da planta está baixo.');
      add(causes,(soil.PO4free||0)<12,'Há pouco fósforo livre no solo médio.');
      add(causes,mycorrhiza===0&&bacillus===0&&plant.p<45,'Ainda há pouca ajuda microbiana para explorar ou soltar fósforo.');
      add(helps,mycorrhiza>0,'Micorriza amplia a região explorada pela raiz.');
      add(helps,bacillus>0,'Bacillus pode solubilizar parte do fósforo preso.');
      add(helps,(soil.PO4free||0)>=18,'O fósforo livre médio está em condição razoável.');
      return 'Fósforo se move pouco no solo, então proximidade e parcerias importam. '+withHelps(causes.length?'Agora: '+sentenceList(causes):'Agora o fósforo não parece ser a principal trava.',helps);
    }

    if(id==='water'){
      add(causes,env.moist<30,'Há pouca água: o solo fica mais resistente ao movimento e a planta pode ganhar estresse.');
      add(causes,env.moist>85,'Há água em excesso: o oxigênio do solo cai e algumas interações mudam.');
      add(causes,env.moist>=30&&env.moist<45,'A água ainda está abaixo da faixa mais confortável.');
      add(causes,env.moist>75&&env.moist<=85,'A água está acima do ideal, mas ainda não é encharcamento forte.');
      add(helps,env.moist>=45&&env.moist<=75,'A umidade está equilibrada para a simulação.');
      return 'Este indicador mostra conforto hídrico, não simplesmente “quanto maior melhor”. Umidade atual: '+Math.round(env.moist)+'%. Oxigênio médio do solo: '+Math.round(soil.O2||0)+'%. '+sentenceList(causes.concat(helps));
    }

    if(id==='roots'){
      add(causes,plant.stress>30,'O estresse geral da planta está alto.');
      add(causes,pathogens>0,'Há patógenos na comunidade.');
      add(causes,nematodes>0,'Há nematoides que podem ferir raízes.');
      add(causes,env.moist<30,'A seca aumenta a pressão sobre a raiz.');
      add(causes,env.moist>85,'Excesso de água reduz oxigênio no solo.');
      add(causes,plant.n<25||plant.p<25||plant.fe<25,'Deficiência nutricional também aparece como raiz menos saudável.');
      add(helps,trichoderma>0,'Trichoderma pode reduzir patógenos quando encontra o alvo.');
      add(helps,arthrobotrys>0,'Arthrobotrys pode capturar nematoides quando encontra o alvo.');
      add(helps,pathogens===0&&nematodes===0,'Não há pressão forte de patógenos ou nematoides visível agora.');
      return 'Saúde da raiz combina estresse da planta e pressão de organismos que podem causar dano. Valor pedagógico atual: '+Math.round(roots)+'%. '+withHelps(causes.length?'Agora: '+sentenceList(causes):'Agora a raiz está sem uma causa forte de dano.',helps);
    }

    return '';
  }

  function indicators(state){
    const growth=clamp(((state.plant.bio-20)/130)*100,0,100);
    const nitrogen=clamp(state.plant.n,0,100);
    const phosphorus=clamp(state.plant.p,0,100);
    const waterRaw=clamp(state.env.moist,0,100);
    const water=waterComfort(waterRaw);
    const roots=rootHealth(state);

    return [
      {
        id:'growth',
        label:'Crescimento',
        icon:'↗',
        value:growth,
        state:level(growth),
        explanation:'Mostra a biomassa simulada do feijão. Ela aumenta quando os nutrientes limitantes, a água e o estresse permitem crescimento.'
      },
      {
        id:'nitrogen',
        label:'Nitrogênio',
        icon:'N',
        value:nitrogen,
        state:level(nitrogen),
        explanation:'Representa o nitrogênio disponível para a planta. No motor, NH4+ e NO3- podem ser absorvidos pela raiz, e algumas guildas também contribuem com fixação de nitrogênio.'
      },
      {
        id:'phosphorus',
        label:'Fósforo',
        icon:'P',
        value:phosphorus,
        state:level(phosphorus),
        explanation:'Mostra o fósforo interno da planta. Bacillus e micorriza podem aumentar a disponibilidade de fósforo, mas o processo depende do solo e da proximidade da raiz.'
      },
      {
        id:'water',
        label:'Água',
        icon:'H₂O',
        value:water,
        state:level(water),
        status:waterStatus(waterRaw),
        explanation:'Mostra se a umidade está confortável para o feijão. Seca e encharcamento prejudicam por caminhos diferentes.'
      },
      {
        id:'roots',
        label:'Saúde da raiz',
        icon:'R',
        value:roots,
        state:level(roots),
        explanation:'Resume o estresse da planta e a pressão de organismos que podem ferir a raiz. É uma leitura pedagógica derivada do estado real da simulação.'
      }
    ];
  }

  function describe(state){
    const parts=[];
    const ind=indicators(state);
    const low=ind.filter(item=>item.state==='baixo').map(item=>item.label.toLowerCase());
    if(low.length){
      parts.push('O feijão precisa de atenção em '+low.join(', ')+'.');
    }else{
      parts.push('O feijão está mantendo bons sinais gerais.');
    }
    parts.push('Há '+state.population+' organismos visíveis na rizosfera.');
    if(state.plant.nodules>0)parts.push('A raiz tem '+state.plant.nodules+' nódulo(s) em formação.');
    if(state.plant.limitFactor&&state.plant.limitFactor!=='—')parts.push('O fator mais limitante agora é '+state.plant.limitFactor+'.');
    return parts.join(' ');
  }

  window.RizoSchoolPlant={
    indicators,
    describe,
    explainIndicator,
    waterComfort,
    rootHealth
  };
})();
