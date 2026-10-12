/* ═══ CAMADAS VISUAIS (skins) ═══
   Liga cada guilda ao seu corpo desenhado. O corpo original do motor continua fazendo
   toda a física e a ecologia; a skin só é atualizada depois do passo e desenhada no lugar
   do esqueleto. A semente vem do genoma e da posição de nascimento (nada de Math.random),
   então ligar ou desligar as skins não altera nenhum número da simulação.

   Para desligar todas as skins e voltar ao desenho antigo: RizoSkins.enabled=false
   antes de reiniciar a simulação (ou ?skins=0 na URL). */
(function(root){
  'use strict';
  function hash(){let h=2166136261>>>0;for(const v of arguments){const s=String(Math.round((+v||0)*1000));for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}}return h||1}
  const FUNGI={4:'tricho',10:'sapro',11:'myco',12:'arthro'};
  let enabled=true;
  try{enabled=new URLSearchParams(location.search).get('skins')!=='0'}catch(_e){}
  root.RizoSkins={
    get enabled(){return enabled},
    set enabled(v){enabled=!!v},
    create(org,x,y){
      if(!enabled)return null;
      const g=org.g,gid=g.guild,seed=hash(gid,g.hue,g.sl,g.cs,g.th,x,y);
      if(gid===8&&root.AmoebaBody)return new root.AmoebaBody(x,y,g,seed);
      if(FUNGI[gid]&&root.MyceliumBody)return new root.MyceliumBody(x,y,g,FUNGI[gid],seed);
      // patógeno: indivíduos de morfologia ramificada/tentacular aparecem como Fusarium (só aparência)
      if(gid===6&&(g.mt===2||g.mt===4)&&root.MyceliumBody)return new root.MyceliumBody(x,y,g,'fusa',seed);
      return null;
    }
  };
})(typeof window!=='undefined'?window:globalThis);
