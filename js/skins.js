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
  const BACT={0:'pseudo',1:'bacil',2:'azo',3:'methy',5:'rhizo',6:'pato'};
  let enabled=true;
  try{enabled=new URLSearchParams(location.search).get('skins')!=='0'}catch(_e){}
  root.RizoSkins={
    /* chamado pelo motor depois de desenhar todos os organismos */
    flush(ctx){if(root.MyceliumBody&&root.MyceliumBody.flush)root.MyceliumBody.flush(ctx)},
    get enabled(){return enabled},
    set enabled(v){enabled=!!v},
    create(org,x,y){
      if(!enabled)return null;
      const g=org.g,gid=g.guild,seed=hash(gid,g.hue,g.sl,g.cs,g.th,x,y);
      // organismos da população inicial já aparecem formados; os que nascem ou chegam depois
      // começam pequenos (esporo germinando, nematoide juvenil) e crescem à vista
      const born=typeof tk!=='undefined'&&tk>0;
      if(gid===8){                       // protozoário: ameba, flagelado ou ciliado (protoKind do motor)
        const k=typeof protoKind==='function'?protoKind(g):'ameba';
        if(k!=='ameba'&&root.ProtistBody)return new root.ProtistBody(x,y,g,k,seed);
        if(root.AmoebaBody)return new root.AmoebaBody(x,y,g,seed);
      }
      if(FUNGI[gid]&&root.MyceliumBody)return new root.MyceliumBody(x,y,g,FUNGI[gid],seed,born);
      // patógeno: indivíduos de morfologia ramificada/tentacular aparecem como Fusarium (só aparência)
      if(gid===6&&(g.mt===2||g.mt===4)&&root.MyceliumBody)return new root.MyceliumBody(x,y,g,'fusa',seed,born);
      if(BACT[gid]&&root.BacteriumBody)return new root.BacteriumBody(x,y,g,BACT[gid],seed);
      if(gid===7&&root.CyanoBody)return new root.CyanoBody(x,y,g,seed);
      if(gid===9&&root.NematodeBody)return new root.NematodeBody(x,y,g,seed,born);
      return null;
    }
  };
})(typeof window!=='undefined'?window:globalThis);
