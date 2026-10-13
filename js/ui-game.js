/* ═══ MODO TELA CHEIA (celular e tablet) ═══
   No celular a página empilhava simulação, indicadores, acontecimentos e cartões, e era preciso rolar
   para cima e para baixo o tempo todo. Neste modo a simulação ocupa a tela inteira e o resto vira um
   menu de pausa, como em um jogo: ☰ pausa e abre o menu; "Continuar" fecha e retoma.

   Liga sozinho em telas estreitas (até 900 px) ou baixas com toque (celular deitado). Não muda nada no
   computador. Quem preferir a página pode escolher "Ver como página" no menu (fica lembrado neste
   aparelho). Para testar no computador: ?modo=jogo; para forçar a página: ?modo=pagina.

   Os painéis originais (cartões, indicadores, acontecimentos, barra do professor) são MOVIDOS para dentro
   do menu, não copiados: continuam com os mesmos botões e o mesmo comportamento. */
(function(){
  'use strict';
  const root=document.documentElement;
  const KEY='rizosim-modo';
  function savePref(v){try{localStorage.setItem(KEY,v)}catch(_e){}}

  /* em modo página no celular: botão discreto para voltar à tela cheia */
  if(!root.classList.contains('game-mode')){
    if(root.classList.contains('game-optout')){
      const back=document.createElement('button');
      back.type='button';back.className='game-return';back.textContent='⛶ Tela cheia';
      back.addEventListener('click',()=>{savePref('jogo');location.replace(location.pathname)});
      document.body.appendChild(back);
    }
    return;
  }

  const E=window.RizoSimEngine;
  const $=id=>document.getElementById(id);

  /* ── HUD sobre a simulação ── */
  const hud=document.createElement('div');
  hud.className='game-hud';
  hud.innerHTML=`
    <button type="button" class="hud-btn hud-menu" id="gmMenuBtn" aria-label="Menu (pausa a simulação)">☰</button>
    <button type="button" class="hud-btn" id="gmPlayBtn" aria-label="Pausar">⏸</button>
    <button type="button" class="hud-btn hud-speed" id="gmSpeedBtn" aria-label="Velocidade">1x</button>`;
  const pip=document.createElement('div');
  pip.className='game-pipette';pip.hidden=true;
  pip.innerHTML='<span id="gmPipText">Toque no solo para colocar</span><button type="button" id="gmPipDone">Concluir</button>';
  const ticker=document.createElement('button');
  ticker.type='button';ticker.className='game-ticker';ticker.hidden=true;
  const cw=$('cw');
  cw.appendChild(hud);cw.appendChild(pip);cw.appendChild(ticker);
  /* cliques nos controles não chegam ao solo (não selecionam organismo nem colocam pipeta) */
  [hud,pip].forEach(el=>el.addEventListener('click',e=>e.stopPropagation()));

  /* ── menu de pausa ── */
  const menu=document.createElement('section');
  menu.className='game-menu';menu.id='gameMenu';menu.hidden=true;
  menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-label','Menu da simulação');
  menu.innerHTML=`
    <header class="gm-head">
      <div class="gm-title"><strong>RizoSim Escolas</strong><span>Simulação pausada</span></div>
      <button type="button" class="gm-continue" id="gmContinue">Continuar ▶</button>
    </header>
    <nav class="gm-tabs" role="tablist">
      <button type="button" role="tab" data-gm-tab="org" aria-selected="true">Organismos</button>
      <button type="button" role="tab" data-gm-tab="feijao" aria-selected="false">Feijão</button>
      <button type="button" role="tab" data-gm-tab="eventos" aria-selected="false">Acontecimentos</button>
      <button type="button" role="tab" data-gm-tab="prof" aria-selected="false">Professor</button>
      <button type="button" role="tab" data-gm-tab="mais" aria-selected="false">Mais</button>
    </nav>
    <div class="gm-body">
      <div class="gm-pane" data-gm-pane="org"></div>
      <div class="gm-pane" data-gm-pane="feijao" hidden></div>
      <div class="gm-pane" data-gm-pane="eventos" hidden></div>
      <div class="gm-pane" data-gm-pane="prof" hidden>
        <button type="button" class="gm-action" id="gmTeacherToggle">Ativar modo professor</button>
        <p class="gm-note" id="gmTeacherNote">Mapas de nutrientes e oxigênio, tipo de solo, provocar acontecimentos, gráficos e controles técnicos.</p>
      </div>
      <div class="gm-pane gm-more" data-gm-pane="mais" hidden>
        <button type="button" class="gm-action" data-gm-do="cenarios">Cenários</button>
        <button type="button" class="gm-action" data-gm-do="reiniciar">Reiniciar</button>
        <button type="button" class="gm-action" data-gm-do="ajuda">Ajuda (tutorial)</button>
        <button type="button" class="gm-action" data-gm-do="telacheia">Tela cheia do aparelho</button>
        <button type="button" class="gm-action gm-quiet" data-gm-do="pagina">Ver como página (layout antigo)</button>
        <p class="gm-note">Esta é uma simulação educativa. Na natureza, os resultados dependem do solo, da planta, do ambiente e das linhagens dos organismos.</p>
      </div>
    </div>`;
  document.body.appendChild(menu);
  const pane=id=>menu.querySelector(`[data-gm-pane="${id}"]`);

  /* move os painéis existentes para o menu (mesmos elementos, mesmos eventos) */
  pane('org').appendChild(document.querySelector('.organisms-region'));
  pane('feijao').appendChild(document.querySelector('.bean-region'));
  pane('eventos').appendChild(document.querySelector('.events-region'));
  const tBar=$('teacherBar');if(tBar)pane('prof').insertBefore(tBar,$('gmTeacherNote'));

  let wasPaused=false,open=false;
  function selectTab(id){
    menu.querySelectorAll('[data-gm-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.gmTab===id?'true':'false'));
    menu.querySelectorAll('[data-gm-pane]').forEach(p=>{p.hidden=p.dataset.gmPane!==id});
  }
  function openMenu(tab){
    if(!open){wasPaused=E.state.paused;E.setPaused(true)}
    open=true;menu.hidden=false;root.classList.add('game-menu-open');
    if(tab)selectTab(tab);
    $('gmContinue').focus({preventScroll:true});
  }
  function closeMenu(resume){
    if(!open)return;
    open=false;menu.hidden=true;root.classList.remove('game-menu-open');
    if(resume!==false&&!wasPaused)E.setPaused(false);
  }
  menu.querySelector('.gm-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-gm-tab]');if(b)selectTab(b.dataset.gmTab)});
  $('gmContinue').addEventListener('click',()=>closeMenu());
  $('gmMenuBtn').addEventListener('click',()=>openMenu());
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)closeMenu()});

  /* cartões: Observar e Adicionar levam de volta à simulação (a ação acontece no solo) */
  pane('org').addEventListener('click',e=>{
    const obs=e.target.closest('[data-observe]'),add=e.target.closest('[data-add]');
    if(obs)setTimeout(()=>closeMenu(),0);
    if(add)setTimeout(()=>closeMenu(),0);
  });
  /* "Entenda" abre a explicação por cima do menu (diálogo do próprio app): nada a fazer */

  /* modo professor */
  function syncTeacher(){
    const on=document.body.classList.contains('teacher-on');
    $('gmTeacherToggle').textContent=on?'Sair do modo professor':'Ativar modo professor';
  }
  $('gmTeacherToggle').addEventListener('click',()=>{$('teacherBtn')?.click();syncTeacher()});
  syncTeacher();
  /* "Gráficos e controles" abre a gaveta técnica: fecha o menu para ela ficar por cima */
  $('teacherPanelBtn')?.addEventListener('click',()=>closeMenu(false),true);
  $('selHM')?.addEventListener('change',()=>{if($('selHM').value!=='off')closeMenu()});
  tBar?.addEventListener('click',e=>{if(e.target.closest('[data-event]'))closeMenu()});

  /* Mais */
  pane('mais').addEventListener('click',e=>{
    const b=e.target.closest('[data-gm-do]');if(!b)return;
    const what=b.dataset.gmDo;
    if(what==='cenarios'){closeMenu(false);$('scenarioBtn')?.click()}
    else if(what==='reiniciar'){closeMenu(false);$('resetBtn')?.click()}
    else if(what==='ajuda'){closeMenu(false);$('helpBtn')?.click()}
    else if(what==='telacheia'){
      if(document.fullscreenElement)document.exitFullscreen?.();else root.requestFullscreen?.().catch(()=>{});
      closeMenu();
    }
    else if(what==='pagina'){savePref('pagina');location.replace(location.pathname)}
  });

  /* ── botões do HUD ── */
  const speeds=[1,2,4],speedLabel={1:'1x',2:'2x',4:'Aula'};
  $('gmPlayBtn').addEventListener('click',()=>E.togglePause());
  $('gmSpeedBtn').addEventListener('click',()=>{
    const i=speeds.indexOf(E.state.speed);E.setSpeed(speeds[(i+1)%speeds.length]);syncHud();
  });
  function syncHud(){
    const st=E.state;
    const pb=$('gmPlayBtn');pb.textContent=st.paused?'▶':'⏸';pb.setAttribute('aria-label',st.paused?'Continuar':'Pausar');
    $('gmSpeedBtn').textContent=speedLabel[st.speed]||st.speed+'x';
    /* pipeta ativa: mostra a instrução e o "Concluir" (os cartões estão dentro do menu) */
    const active=document.querySelector('.organism-cards [data-add].is-active');
    pip.hidden=!active;
    if(active){const card=active.closest('.organism-card');$('gmPipText').textContent='Toque no solo para colocar '+(card?.querySelector('h3')?.textContent||'')}
  }
  $('gmPipDone').addEventListener('click',()=>{
    const active=document.querySelector('.organism-cards [data-add].is-active');
    /* detail:1 = toque/clique (detail 0 seria teclado, que adiciona perto da raiz) */
    active?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
    syncHud();
  });
  setInterval(syncHud,300);syncHud();

  /* ── último acontecimento em uma faixa sobre o solo; tocar abre a explicação ── */
  const list=$('childEventList');let tickTimer=null,lastText='';
  function showTicker(){
    const first=list?.querySelector('li');if(!first)return;
    const text=first.querySelector('p')?.textContent||'';
    if(!text||text===lastText)return;
    lastText=text;ticker.textContent=text;ticker.hidden=false;ticker.classList.remove('is-out');
    clearTimeout(tickTimer);tickTimer=setTimeout(()=>ticker.classList.add('is-out'),7000);
  }
  if(list)new MutationObserver(showTicker).observe(list,{childList:true});
  ticker.addEventListener('click',e=>{
    e.stopPropagation();
    const btn=list?.querySelector('li [data-event-index="0"]');
    if(btn)btn.click();else openMenu('eventos');
  });

  /* tutorial: no celular cartões, indicadores e acontecimentos ficam no menu */
  const tText=$('tutorialText');
  if(tText)new MutationObserver(()=>{
    const t=tText.textContent;
    if(/cartões|indicadores|velocidade de aula/.test(t)&&!/menu ☰/.test(t))tText.textContent=t+' No celular, isso fica no menu ☰.';
  }).observe(tText,{childList:true,characterData:true,subtree:true});

  window.RizoGameMode={open:openMenu,close:closeMenu,tab:selectTab};
})();
