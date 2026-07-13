(function(){
  function clamp(value,min,max){
    return Math.max(min,Math.min(max,value));
  }

  function level(value){
    if(value<35)return 'baixo';
    if(value<68)return 'medio';
    return 'bom';
  }

  function rootHealth(state){
    const counts=state.guildCounts||{};
    const total=Math.max(1,state.population||1);
    const nematodes=counts[9]||0;
    const pathogens=counts[6]||0;
    const pressure=((nematodes+pathogens)/total)*100;
    return clamp(100-state.plant.stress*.75-pressure*.65,0,100);
  }

  function indicators(state){
    const growth=clamp(((state.plant.bio-20)/130)*100,0,100);
    const nitrogen=clamp(state.plant.n,0,100);
    const phosphorus=clamp(state.plant.p,0,100);
    const water=clamp(state.env.moist,0,100);
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
        explanation:'Mostra a umidade configurada no ambiente. Seca ou encharcamento mudam a viscosidade do solo, o oxigênio e o estresse do feijão.'
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
    rootHealth
  };
})();
