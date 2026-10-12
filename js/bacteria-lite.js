/* ═══ BACTÉRIAS E CIANOBACTÉRIAS — camada visual ═══
   O corpo original do motor (cadeia Verlet) continua fazendo a física; aqui só se desenha
   a bactéria como ela é: célula rígida (bacilo ou víbrio) que NÃO ondula como um verme,
   empurrada por flagelos que giram. Nada aqui consome o Math.random do motor.

   Biologia representada:
   - nado em "corre e cambalhota": correndo, os flagelos ficam num feixe atrás da célula;
     quando ela muda de direção de repente (cambalhota), os flagelos se abrem;
   - arranjo dos flagelos por grupo: polar (Azospirillum, Methylobacterium), tufo polar
     (Pseudomonas), peritríquio (Bacillus, Rhizobium, patógeno);
   - Azospirillum: bastonete curvo (vibrioide);
   - Methylobacterium: rosa, com grânulos de PHB;
   - Bacillus: com pouca energia forma endósporo refringente (esporulação);
   - divisão binária: perto de se reproduzir, a célula alonga e estrangula no meio;
   - Rhizobium dentro do nódulo: bacteroides (formas em Y, inchadas, sem flagelo);
   - Cianobactéria: tricoma (fila de células) que desliza, com heterocistos (células
     maiores, de parede grossa, onde se fixa N2) a cada ~9 células.
*/
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  function prng(seed){let s=seed>>>0||1;return function(){s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const REPRO_E=8500;
  const zoomOf=ctx=>ctx.getTransform().a/(root.devicePixelRatio||1);

  const KINDS={
    pseudo:{label:'Bacilo, tufo polar',flag:'tuft',n:3,curve:0,len:1.0},
    bacil: {label:'Bacilo, flagelos peritríquios',flag:'peri',n:6,curve:0,len:1.25,spore:true},
    azo:   {label:'Víbrio, flagelo polar',flag:'polar',n:1,curve:0.35,len:1.0},
    methy: {label:'Bacilo rosa com PHB',flag:'polar',n:1,curve:0,len:0.9,phb:true},
    rhizo: {label:'Bacilo, flagelos peritríquios',flag:'peri',n:4,curve:0,len:0.95,bacteroid:true},
    pato:  {label:'Bacilo, flagelos peritríquios',flag:'peri',n:5,curve:0,len:1.0}
  };

  class BacteriumBody{
    constructor(x,y,g,kind,seed){
      this.rand=prng(seed);const R=this.rand;
      this.kind=kind;this.K=KINDS[kind];
      this.L=clamp(((g.nd||3)-1)*(g.sl||1.5),2.2,4.6)*this.K.len;
      this.W=clamp(0.55+(g.th||0.8)*0.55,0.7,1.35);
      this.c={x,y};this.heading=R()*TAU;this.turn=0;this.tumble=0;this.ph=R()*TAU;this.sp=0;
      this.spore=0;this.split=0;this.nod=false;
      this.fl=[];for(let i=0;i<this.K.n;i++)this.fl.push({u:R(),side:i%2?1:-1,a:R()*TAU,len:0.8+0.4*R()});
    }
    get label(){return this.nod?'Bacteroide (dentro do nódulo)':this.K.label}

    update(core,aim,hunting,rootX,rootTop,rootBottom,org){
      // centro = média dos pontos do corpo do motor (a cabeça tremia com os "músculos" e
      // fazia o bacilo girar em torno de um ponto); direção = velocidade média suavizada
      let tx=core.x,ty=core.y;
      if(org&&org.pts&&org.pts.length>1){tx=0;ty=0;for(const p of org.pts){tx+=p.x;ty+=p.y}tx/=org.pts.length;ty/=org.pts.length}
      let dx=tx-this.c.x,dy=ty-this.c.y;
      if(dx*dx+dy*dy>400){this.c.x=tx;this.c.y=ty;dx=dy=0;this.vx=this.vy=0}
      const ox=this.c.x,oy=this.c.y;
      this.c.x+=dx*0.15;this.c.y+=dy*0.15;
      // direção só muda com deslocamento LÍQUIDO (últimos ~40 passos): parada ou tremendo no
      // lugar, a célula mantém a orientação em vez de girar em torno de si mesma
      const H=this.hist||(this.hist=[]);H.push(this.c.x,this.c.y);if(H.length>80)H.splice(0,2);
      const ndx=this.c.x-H[0],ndy=this.c.y-H[1],net=Math.hypot(ndx,ndy);
      const sp=net/(H.length/2);
      this.sp+=(sp-this.sp)*0.2;
      if(net>1.2){
        const d=wrap(Math.atan2(ndy,ndx)-this.heading);
        this.heading+=d*0.06;
        if(Math.abs(d)>1.6&&this.tumble<=0)this.tumble=18;          // mudança brusca = cambalhota
      }
      if(this.tumble>0)this.tumble--;
      this.ph+=0.55+this.sp*2;
      if(org){
        const e=org.e;
        this.nod=!!org.nodulated;
        this.split=clamp((e/REPRO_E-0.82)/0.18,0,1);                  // divisão binária
        if(this.K.spore)this.spore=clamp(this.spore+(e<900?0.006:-0.01),0,1);  // esporulação
      }
    }

    draw(ctx,g,al,gc,org){
      const K=this.K,c=this.nod&&org&&org._nodVis?org._nodVis:this.c,h=this.heading,L=this.L*(1+0.25*this.split),W=this.W;
      const zoom=zoomOf(ctx),hx=Math.cos(h),hy=Math.sin(h),nx=-hy,ny=hx;
      const hs=(H,S,Li,A)=>`hsla(${H},${S}%,${Li}%,${A})`;
      ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
      if(this.nod){                     // bacteroides em Y dentro do nódulo
        const k=c.r?clamp(c.r/3.2,0.6,1.3):1;            // cabem dentro do nódulo desenhado na raiz
        ctx.strokeStyle=`rgba(255,245,200,${0.8*al})`;ctx.lineWidth=0.55*k;
        for(let i=0;i<3;i++){const a=h+i*2.1,bx=c.x+Math.cos(a)*1.2*k,by=c.y+Math.sin(a)*1.2*k;
          ctx.beginPath();ctx.moveTo(bx-Math.cos(a)*0.9*k,by-Math.sin(a)*0.9*k);ctx.lineTo(bx,by);
          ctx.lineTo(bx+Math.cos(a+0.6)*0.8*k,by+Math.sin(a+0.6)*0.8*k);ctx.moveTo(bx,by);ctx.lineTo(bx+Math.cos(a-0.6)*0.8*k,by+Math.sin(a-0.6)*0.8*k);ctx.stroke()}
        ctx.restore();return;
      }
      const tailX=c.x-hx*L/2,tailY=c.y-hy*L/2;
      // flagelos
      const wave=(x0,y0,a,len,amp,phase)=>{ctx.moveTo(x0,y0);const ca=Math.cos(a),sa=Math.sin(a);
        for(let i=1;i<=10;i++){const u=i/10,o=Math.sin(u*TAU*1.6-phase)*amp*Math.min(1,u*3);ctx.lineTo(x0+ca*len*u-sa*o,y0+sa*len*u+ca*o)}};
      ctx.beginPath();
      const flen=L*1.6,tum=this.tumble>0;
      if(K.flag==='polar'){wave(tailX,tailY,h+Math.PI+(tum?Math.sin(this.ph*0.3)*1.2:0),flen*1.15,0.32,this.ph)}
      else if(K.flag==='tuft'){for(const f of this.fl){const sp=(f.u-0.5)*(tum?2.2:0.35);wave(tailX,tailY,h+Math.PI+sp,flen*f.len,0.28,this.ph+f.a)}}
      else{
        for(const f of this.fl){
          const bx=c.x+hx*(f.u-0.5)*L*0.8+nx*f.side*W*0.5,by=c.y+hy*(f.u-0.5)*L*0.8+ny*f.side*W*0.5;
          const a=tum?Math.atan2(ny*f.side,nx*f.side)+(f.u-0.5)*1.4+f.a*0.2:h+Math.PI+f.side*0.18;   // feixe atrás ou aberto
          wave(bx,by,a,flen*f.len*(tum?0.8:1),0.26,this.ph+f.a);
        }
      }
      ctx.strokeStyle=hs(g.hue,g.sat*0.6,Math.min(85,g.lit+20),0.55*al);ctx.lineWidth=0.13;ctx.stroke();
      // corpo rígido (bacilo / víbrio); na divisão, duas metades estranguladas
      const bend=K.curve*L;
      const seg=(x0,y0,x1,y1,w,col)=>{ctx.beginPath();ctx.moveTo(x0,y0);
        ctx.quadraticCurveTo((x0+x1)/2+nx*bend,(y0+y1)/2+ny*bend,x1,y1);ctx.lineWidth=w;ctx.strokeStyle=col;ctx.stroke()};
      const ax=c.x-hx*(L/2-W/2),ay=c.y-hy*(L/2-W/2),bx=c.x+hx*(L/2-W/2),by=c.y+hy*(L/2-W/2);
      const outline=hs(g.hue,g.sat,Math.max(15,g.lit-22),0.9*al),fill=hs(g.hue,g.sat,g.lit,0.95*al);
      if(this.split>0.05){
        const gap=W*0.55*this.split,mx=c.x,my=c.y;
        for(const [x0,y0,x1,y1] of [[ax,ay,mx-hx*gap,my-hy*gap],[mx+hx*gap,my+hy*gap,bx,by]]){seg(x0,y0,x1,y1,W+0.28,outline);seg(x0,y0,x1,y1,W,fill)}
      }else{seg(ax,ay,bx,by,W+0.28,outline);seg(ax,ay,bx,by,W,fill)}
      if(zoom>=3){
        // nucleoide
        ctx.strokeStyle=hs(g.hue,g.sat*0.5,Math.min(90,g.lit+25),0.45*al);ctx.lineWidth=W*0.28;
        ctx.beginPath();ctx.moveTo(c.x-hx*L*0.18,c.y-hy*L*0.18);ctx.lineTo(c.x+hx*L*0.18,c.y+hy*L*0.18);ctx.stroke();
        if(K.phb){ctx.fillStyle=`rgba(255,255,255,${0.75*al})`;for(const u of [-0.28,0.25]){ctx.beginPath();ctx.arc(c.x+hx*L*u,c.y+hy*L*u,W*0.2,0,TAU);ctx.fill()}}
      }
      if(this.spore>0.02){              // endósporo subterminal, refringente
        const sx=c.x+hx*L*0.22,sy=c.y+hy*L*0.22,r=W*0.42*this.spore;
        ctx.fillStyle=`rgba(255,255,245,${0.95*al})`;ctx.strokeStyle=`rgba(60,50,30,${0.9*al})`;ctx.lineWidth=0.12;
        ctx.beginPath();ctx.ellipse(sx,sy,r*1.4,r,h,0,TAU);ctx.fill();ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ── Cianobactéria filamentosa (tipo Anabaena/Nostoc) ── */
  class CyanoBody{
    constructor(x,y,g,seed){
      this.rand=prng(seed);const R=this.rand;
      this.n=clamp(8+(g.nd||3)*2,10,24);this.d=clamp(0.9+(g.cs||1)*0.25,0.9,1.4);
      this.het=8+Math.floor(R()*3);this.off=Math.floor(R()*this.het);
      this.hue=150+((g.hue||0)%30);
      this.c={x,y};this.heading=R()*TAU;this.trail=[];this._reset(x,y);
    }
    get label(){return 'Tricoma com heterocistos'}
    _reset(x,y){this.trail=[];const L=this.n*this.d+2;for(let s=L;s>=0;s-=0.5)this.trail.push({x:x-Math.cos(this.heading)*s,y:y-Math.sin(this.heading)*s})}
    update(core,aim,hunting,rootX,rootTop){
      this.surf=rootTop;
      let dx=core.x-this.c.x,dy=core.y-this.c.y;
      if(dx*dx+dy*dy>400){this.c.x=core.x;this.c.y=core.y;this._reset(core.x,core.y);return}
      this.c.x+=dx*0.12;this.c.y+=dy*0.12;
      const T=this.trail,last=T[T.length-1];
      if(Math.hypot(this.c.x-last.x,this.c.y-last.y)>=0.4){
        this.heading=Math.atan2(this.c.y-last.y,this.c.x-last.x);T.push({x:this.c.x,y:this.c.y});
        const need=Math.ceil((this.n*this.d+2)/0.4)+4;if(T.length>need)T.splice(0,T.length-need);
      }
    }
    _cells(){                            // células ao longo do rastro (o filamento desliza pelo próprio caminho)
      const T=this.trail,out=[];let acc=0,i=T.length-1,px=this.c.x,py=this.c.y,want=0;
      while(out.length<this.n&&i>=0){const q=T[i];const s=Math.hypot(q.x-px,q.y-py);
        if(acc+s>=want){const f=s>0?(want-acc)/s:0;let y=py+(q.y-py)*f;if(this.surf!==undefined&&y<this.surf+0.6)y=this.surf+0.6;out.push({x:px+(q.x-px)*f,y});want+=this.d;continue}
        acc+=s;px=q.x;py=q.y;i--}
      return out;
    }
    draw(ctx,g,al){
      const cells=this._cells(),d=this.d,het=[];
      ctx.save();
      ctx.beginPath();                    // células vegetativas num só caminho (desempenho)
      for(let k=0;k<cells.length;k++){const p=cells[k];if((k+this.off)%this.het===0&&k>0){het.push(p);continue}ctx.moveTo(p.x+d*0.5,p.y);ctx.arc(p.x,p.y,d*0.5,0,TAU)}
      ctx.fillStyle=`hsla(${this.hue},55%,40%,${0.95*al})`;ctx.fill();
      ctx.strokeStyle=`hsla(${this.hue},50%,22%,${0.8*al})`;ctx.lineWidth=0.12;ctx.stroke();
      if(het.length){                     // heterocistos: maiores, claros, parede grossa
        ctx.beginPath();for(const p of het){ctx.moveTo(p.x+d*0.62,p.y);ctx.arc(p.x,p.y,d*0.62,0,TAU)}
        ctx.fillStyle=`hsla(70,45%,82%,${0.95*al})`;ctx.fill();ctx.strokeStyle=`hsla(${this.hue},40%,25%,${0.9*al})`;ctx.lineWidth=0.22;ctx.stroke();
        ctx.beginPath();for(const p of het){ctx.moveTo(p.x+d*0.15,p.y);ctx.arc(p.x,p.y,d*0.15,0,TAU)}ctx.fillStyle=`rgba(255,255,255,${0.8*al})`;ctx.fill();
      }
      ctx.restore();
    }
  }

  BacteriumBody.KINDS=KINDS;
  root.BacteriumBody=BacteriumBody;
  root.CyanoBody=CyanoBody;
})(typeof window!=='undefined'?window:globalThis);
