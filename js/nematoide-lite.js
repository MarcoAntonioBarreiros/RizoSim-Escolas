/* ═══ NEMATOIDE — camada visual ═══
   O corpo original do motor continua fazendo a física; dele se usa só a posição da cabeça.
   O corpo desenhado desliza pelo caminho percorrido pela cabeça, e a ondulação está presa
   ao caminho (onda parada no solo) — como na locomoção ondulatória real: quando o verme
   ondula, ele avança; quando para, para.
   Nada aqui consome o Math.random do motor.

   Anatomia simplificada de um nematoide fitoparasita:
   - cutícula transparente com anelação;
   - estilete na cabeça (agulha usada para perfurar a célula da raiz), que se projeta
     ritmicamente quando o nematoide está se alimentando na raiz;
   - esôfago com bulbo mediano (bomba de sucção);
   - intestino granuloso; cauda afilada.
*/
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  function prng(seed){let s=seed>>>0||1;return function(){s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const zoomOf=ctx=>ctx.getTransform().a/(root.devicePixelRatio||1);
  const NP=26;

  class NematodeBody{
    constructor(x,y,g,seed){
      this.rand=prng(seed);const R=this.rand;
      this.Lb=clamp(((g.nd||6)-1)*(g.sl||2.5)*1.25,14,28);
      this.W=clamp(0.55+(g.th||1)*0.35,0.7,1.15);
      this.lam=this.Lb*0.55;this.A=this.Lb*0.065;
      this.dir=R()*TAU;this.feed=0;this.ph=R()*TAU;this.S0=R()*20;
      this.trail=null;
    }
    get label(){return this.feed>0.3?'Nematoide se alimentando (estilete)':'Nematoide (ondulação)'}
    _reset(x,y){
      // rastro inicial reto atrás da cabeça; S = coordenada ao longo do caminho
      this.trail=[];const L=this.Lb+3;
      for(let d=L;d>=0;d-=0.5)this.trail.push({x:x-Math.cos(this.dir)*d,y:y-Math.sin(this.dir)*d,S:this.S0-d});
      this.Sh=this.S0;this.gx=x;this.gy=y;
    }
    /* Translocação: a cabeça segue (suavizada) a cabeça do corpo do motor e deixa um rastro.
       O corpo ocupa o último trecho do rastro e o desvio lateral depende da posição NO CAMINHO
       (onda parada no solo): ao avançar, o corpo desliza pela própria trilha sinuosa, como
       um nematoide de verdade. Se o motor manda recuar, o verme anda de ré pela trilha. */
    update(core,aim,hunting,rootX,rootTop,rootBottom,org){
      const S=org&&org.pts&&org.pts.length>=2?org.pts:null;
      const h=S?S[0]:core;
      if(!this.trail||Math.hypot(h.x-this.gx,h.y-this.gy)>30){if(S)this.dir=Math.atan2(S[0].y-S[S.length-1].y,S[0].x-S[S.length-1].x);this._reset(h.x,h.y);return}
      // alvo = cabeça do motor sem o tremor dos "músculos"
      this.gx+=(h.x-this.gx)*0.1;this.gy+=(h.y-this.gy)*0.1;
      // A cabeça desenhada é um "piloto" com raio de curva mínimo: o motor às vezes faz o
      // verme rodar em volta do alimento; aqui ele só vira enquanto avança, avança só se o
      // alvo estiver à frente, e recua pela trilha se o alvo ficar para trás. O desvio em
      // relação ao corpo do motor fica limitado a poucos px.
      const T=this.trail,H0=this._at(this.Sh);
      const dx=this.gx-H0.x,dy=this.gy-H0.y,dist=Math.hypot(dx,dy);
      const d=Math.atan2(Math.sin(Math.atan2(dy,dx)-this.dir),Math.cos(Math.atan2(dy,dx)-this.dir));
      const fwd=dist*Math.cos(d);
      if(fwd>0.05){
        const sp=Math.min(0.7,fwd*0.08+Math.max(0,dist-8)*0.05);
        const rate=sp*(0.08+0.025*Math.max(0,dist-7));           // curvatura máx. ~1/12 px (raio de curva mínimo)
        this.dir+=clamp(d,-rate,rate);
        const last=T[T.length-1];
        if(this.Sh<last.S-1e-6)T.length=this._idx(this.Sh)+1;      // retoma depois de recuar
        const L2=T[T.length-1],nx=H0.x+Math.cos(this.dir)*sp,ny=H0.y+Math.sin(this.dir)*sp;
        if(Math.hypot(nx-L2.x,ny-L2.y)>=0.25)T.push({x:nx,y:ny,S:L2.S+Math.hypot(nx-L2.x,ny-L2.y)});
        else{L2.x=nx;L2.y=ny}
        this.Sh=T[T.length-1].S;
      }else if(dist>5){                                             // alvo atrás: anda de ré
        this.Sh-=Math.min(0.5,(dist-5)*0.06);
        const first=T[0],sec=T[1]||first,a=Math.atan2(first.y-sec.y,first.x-sec.x);
        while(T[0].S>this.Sh-this.Lb-2){const f=T[0];T.unshift({x:f.x+Math.cos(a)*0.5,y:f.y+Math.sin(a)*0.5,S:f.S-0.5})}
        this.dir=this._at(this.Sh).a;
      }
      while(T.length>2&&T[1].S<this.Sh-this.Lb-3)T.shift();
      const H=this._at(this.Sh);this.hx=H.x;this.hy=H.y;
      const atRoot=rootX!==undefined&&Math.abs(this.hx-rootX)<4&&this.hy>rootTop&&this.hy<rootBottom+5;
      this.feed+=((atRoot?1:0)-this.feed)*0.05;
      this.ph+=0.25;
    }
    _idx(Sv){const T=this.trail;let lo=0,hi=T.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(T[m].S<=Sv)lo=m;else hi=m}return lo}
    _at(Sv){                             // ponto e direção do rastro na coordenada Sv
      const T=this.trail;
      if(Sv<=T[0].S){const a=Math.atan2(T[1].y-T[0].y,T[1].x-T[0].x),k=Sv-T[0].S;return {x:T[0].x+Math.cos(a)*k,y:T[0].y+Math.sin(a)*k,a}}
      if(Sv>=T[T.length-1].S){const n=T.length,a=Math.atan2(T[n-1].y-T[n-2].y,T[n-1].x-T[n-2].x);return {x:T[n-1].x,y:T[n-1].y,a}}
      const i=this._idx(Sv),p=T[i],q=T[i+1],f=(Sv-p.S)/Math.max(1e-6,q.S-p.S);
      return {x:p.x+(q.x-p.x)*f,y:p.y+(q.y-p.y)*f,a:Math.atan2(q.y-p.y,q.x-p.x)};
    }
    _pts(){
      const Lb=this.Lb,out=[];
      for(let k=0;k<NP;k++){const u=k/(NP-1),Sv=this.Sh-u*Lb,P=this._at(Sv),env=0.35+0.65*Math.min(1,u*2.5);
        const o=Math.sin(Sv/this.lam*TAU)*this.A*env;          // onda presa ao caminho
        out.push({x:P.x-Math.sin(P.a)*o,y:P.y+Math.cos(P.a)*o})}
      this.len=Lb;return out;
    }
    draw(ctx,g,al,gc,org){
      if(!this.trail)return;
      const P=this._pts(),W=clamp(this.Lb*0.055,0.7,1.3),zoom=zoomOf(ctx);
      const hue=(g.hue||25),body=`hsla(${hue},18%,84%,${0.55*al+0.15})`,edge=`hsla(${hue},22%,55%,${0.9*al})`;
      // largura: afina na cabeça e na cauda
      const wAt=u=>W*(u<0.12?0.55+0.45*u/0.12:u>0.7?Math.max(0.12,1-(u-0.7)/0.3*0.88):1);
      const L=[],Rr=[];
      for(let i=0;i<NP;i++){const a=P[Math.max(0,i-1)],b=P[Math.min(NP-1,i+1)];const t=Math.atan2(a.y-b.y,a.x-b.x)+Math.PI/2,w=wAt(i/(NP-1))/2;
        L.push({x:P[i].x+Math.cos(t)*w,y:P[i].y+Math.sin(t)*w});Rr.push({x:P[i].x-Math.cos(t)*w,y:P[i].y-Math.sin(t)*w})}
      ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(L[0].x,L[0].y);for(const p of L)ctx.lineTo(p.x,p.y);for(let i=NP-1;i>=0;i--)ctx.lineTo(Rr[i].x,Rr[i].y);ctx.closePath();
      ctx.fillStyle=body;ctx.fill();ctx.strokeStyle=edge;ctx.lineWidth=0.18;ctx.stroke();
      // intestino granuloso
      ctx.strokeStyle=`hsla(${hue+10},45%,45%,${0.55*al})`;ctx.lineWidth=W*0.32;ctx.beginPath();
      const i0=Math.floor(NP*0.32),i1=Math.floor(NP*0.84);ctx.moveTo(P[i0].x,P[i0].y);for(let i=i0;i<=i1;i++)ctx.lineTo(P[i].x,P[i].y);ctx.stroke();
      if(zoom<3){ctx.restore();return}       // de longe: só corpo e intestino
      // esôfago + bulbo mediano
      const ib=Math.floor(NP*0.16);
      ctx.strokeStyle=`hsla(${hue},30%,40%,${0.6*al})`;ctx.lineWidth=0.16;ctx.beginPath();ctx.moveTo(P[0].x,P[0].y);for(let i=1;i<=i0;i++)ctx.lineTo(P[i].x,P[i].y);ctx.stroke();
      const pump=1+0.18*Math.sin(this.ph*2)*this.feed;
      ctx.fillStyle=`hsla(${hue},35%,38%,${0.75*al})`;ctx.beginPath();
      const ba=Math.atan2(P[ib-1].y-P[ib+1].y,P[ib-1].x-P[ib+1].x);ctx.ellipse(P[ib].x,P[ib].y,W*0.34*pump,W*0.24*pump,ba,0,TAU);ctx.fill();
      if(zoom>=3){
        // anelação da cutícula
        ctx.strokeStyle=`hsla(${hue},30%,60%,${0.35*al})`;ctx.lineWidth=0.06;ctx.beginPath();
        for(let i=2;i<NP-2;i+=1){ctx.moveTo(L[i].x,L[i].y);ctx.lineTo(Rr[i].x,Rr[i].y)}ctx.stroke();
      }
      // estilete (projeta quando se alimenta na raiz)
      const ha=Math.atan2(P[0].y-P[1].y,P[0].x-P[1].x),thr=this.feed*(0.5+0.5*Math.max(0,Math.sin(this.ph)));
      const sx=P[0].x-Math.cos(ha)*W*0.9,sy=P[0].y-Math.sin(ha)*W*0.9,len=W*1.0+thr*W*0.9;
      ctx.strokeStyle=`hsla(${hue},20%,25%,${0.9*al})`;ctx.lineWidth=0.14;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(ha)*len,sy+Math.sin(ha)*len);ctx.stroke();
      ctx.restore();
    }
  }
  root.NematodeBody=NematodeBody;
})(typeof window!=='undefined'?window:globalThis);
