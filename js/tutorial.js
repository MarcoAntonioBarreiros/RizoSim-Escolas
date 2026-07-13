(function(){
  const steps=[
    {
      title:'Este é o feijão.',
      text:'A parte de cima mostra o crescimento da planta enquanto o solo mostra as raízes.',
      target:'#cw'
    },
    {
      title:'Estas são suas raízes.',
      text:'Elas crescem dentro do solo e absorvem água e nutrientes.',
      target:'#cw'
    },
    {
      title:'A região ao redor da raiz é a rizosfera.',
      text:'A raiz libera substâncias nessa região. Ali, os organismos podem cooperar, competir, alimentar-se ou causar dano.',
      target:'#cw'
    },
    {
      title:'Muitos organismos vivem e interagem aqui.',
      text:'Eles continuam se movendo e respondendo ao ambiente enquanto você observa.',
      target:'#cw'
    },
    {
      title:'Toque em um organismo para conhecê-lo.',
      text:'A velocidade diminui, o organismo fica destacado e você descobre o que ele está fazendo.',
      target:'#observeModeLabel'
    },
    {
      title:'Escolha um organismo para adicionar.',
      text:'Use os cartões por categoria. O botão Adicionar coloca esses organismos perto da raiz.',
      target:'.organisms-region'
    },
    {
      title:'Observe o que muda na planta e no solo.',
      text:'Os cinco indicadores mostram como o feijão está respondendo ao que acontece no solo.',
      target:'.bean-region'
    },
    {
      title:'Nem toda mudança acontece imediatamente.',
      text:'Use a velocidade de aula quando precisar avançar o tempo da simulação sem mudar as regras ecológicas.',
      target:'.events-region'
    }
  ];

  const overlay=document.getElementById('tutorialOverlay');
  const title=document.getElementById('tutorialTitle');
  const text=document.getElementById('tutorialText');
  const nextBtn=document.getElementById('tutorialNextBtn');
  const skipBtn=document.getElementById('tutorialSkipBtn');
  const restartBtn=document.getElementById('tutorialRestartBtn');
  let index=0;
  let currentTarget=null;
  let returnFocus=null;

  function clearTarget(){
    if(currentTarget)currentTarget.classList.remove('tutorial-focus');
    document.querySelectorAll('.tutorial-focus').forEach(item=>item.classList.remove('tutorial-focus'));
    currentTarget=null;
  }

  function showStep(){
    const step=steps[index];
    title.textContent=step.title;
    text.textContent=step.text;
    nextBtn.textContent=index===steps.length-1?'Explorar':'Continuar';
    clearTarget();
    currentTarget=document.querySelector(step.target);
    if(currentTarget){
      currentTarget.classList.add('tutorial-focus');
      currentTarget.scrollIntoView({block:'nearest',inline:'nearest'});
    }
  }

  function start(){
    if(overlay.hidden)returnFocus=document.activeElement;
    index=0;
    overlay.hidden=false;
    showStep();
    nextBtn?.focus({preventScroll:true});
  }

  function close(markSeen){
    clearTarget();
    overlay.hidden=true;
    if(markSeen){
      try{localStorage.setItem('rizosim-escolas-tutorial','seen')}catch(_err){}
    }
    if(returnFocus&&returnFocus!==document.body)returnFocus.focus?.({preventScroll:true});
    returnFocus=null;
  }

  function next(){
    if(index<steps.length-1){
      index++;
      showStep();
    }else{
      close(true);
    }
  }

  nextBtn?.addEventListener('click',next);
  skipBtn?.addEventListener('click',()=>close(true));
  restartBtn?.addEventListener('click',start);
  document.getElementById('helpBtn')?.addEventListener('click',start);
  overlay?.addEventListener('keydown',event=>{
    if(event.key==='Escape')close(true);
  });

  window.RizoSchoolTutorial={start,close,restart:start};

  window.addEventListener('load',()=>{
    let seen=false;
    try{seen=localStorage.getItem('rizosim-escolas-tutorial')==='seen'}catch(_err){}
    if(!seen)setTimeout(start,600);
  });
})();
