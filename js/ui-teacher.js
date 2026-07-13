(function(){
  const drawer=document.getElementById('sb');
  const overlay=document.getElementById('sbOverlay');
  const openBtn=document.getElementById('teacherBtn');
  const closeBtn=document.getElementById('teacherClose');

  function openTeacher(){
    overlay.hidden=false;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden','false');
    openBtn?.setAttribute('aria-expanded','true');
    closeBtn?.focus();
  }

  function closeTeacher(){
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden','true');
    openBtn?.setAttribute('aria-expanded','false');
    overlay.hidden=true;
    openBtn?.focus();
  }

  function bindOutput(inputId,outputId,format){
    const input=document.getElementById(inputId);
    const output=document.getElementById(outputId);
    if(!input||!output)return;
    const update=()=>{
      const value=input.type==='range'?Number(input.value):input.value;
      output.textContent=format?format(value):String(value);
    };
    input.addEventListener('input',update);
    update();
  }

  openBtn?.addEventListener('click',openTeacher);
  closeBtn?.addEventListener('click',closeTeacher);
  overlay?.addEventListener('click',closeTeacher);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&drawer.classList.contains('is-open'))closeTeacher();
  });

  bindOutput('rMI','vMI',value=>Number(value).toFixed(1)+'x');
  bindOutput('rIC','vIC');
  bindOutput('rINH4','vINH4');
  bindOutput('rINO3','vINO3');
  bindOutput('rIPf','vIPf');
  bindOutput('rIPb','vIPb');
  bindOutput('rIFe3','vIFe3');
  bindOutput('rIFe2','vIFe2');
  bindOutput('rT','vT',value=>Math.round(value)+'°C');
  bindOutput('rPH','vPH',value=>Number(value).toFixed(1));
  bindOutput('rM','vM',value=>Math.round(value)+'%');
  bindOutput('rLI','vLI',value=>Math.round(value)+'%');
  bindOutput('rUV','vUV',value=>Math.round(value)+'%');
  bindOutput('rTX','vTX',value=>Math.round(value)+'%');

  document.getElementById('selHM')?.addEventListener('change',event=>{
    RizoSimEngine.setHeatmap(event.target.value);
  });

  window.RizoTeacherUI={
    open:openTeacher,
    close:closeTeacher
  };
})();
