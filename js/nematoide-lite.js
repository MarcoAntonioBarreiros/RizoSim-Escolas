/* ═══ NEMATOIDE — camada visual ═══
   O corpo original do motor continua fazendo a física; dele se usa só a posição da cabeça.
   O corpo desenhado desliza pelo caminho percorrido pela cabeça, e a ondulação está presa
   ao caminho (onda parada no solo) — como na locomoção ondulatória real: quando o verme
   ondula, ele avança.
   A cabeça desenhada nada sozinha, sempre para frente, presa por uma "coleira" à cabeça do
   corpo do motor (como o micélio): o motor decide para onde o nematoide vai; o desenho
   nunca para, nunca anda de ré e não gira no lugar — só faz curvas enquanto avança, com
   raio mínimo proporcional ao corpo. Na raiz, desacelera e o estilete bombeia.
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
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
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
      this.trail=null;this.turn=0;this.aS=0;this.leash=16;
      this.v0=0.09+0.06*clamp(((g.thr||0.55)-0.3)/0.5,0,1);     // px por passo (~5-9 px/s em 1x)
    }
    get label(){return this.feed>0.3?'Nematoide se alimentando (estilete)':'Nematoide (ondulação)'}
    _reset(x,y){
      // rastro inicial reto atrás da cabeça; S = coordenada ao longo do caminho
      this.trail=[];const L=this.Lb+3;
      for(let d=L;d>=0;d-=0.5)this.trail.push({x:x-Math.cos(this.dir)*d,y:y-Math.sin(this.dir)*d,S:this.S0-d});
      this.Sh=this.S0;this.gx=x;this.gy=y;
    }
    viewPos(){return this.trail?this._at(this.Sh-this.Lb*0.5):null}   // meio do corpo desenhado
    update(core,aim,hunting,rootX,rootTop,rootBottom,org){
      const S=org&&org.pts&&org.pts.length>=2?org.pts:null,h=S?S[0]:core,R=this.rand;
      if(!this.trail||Math.hypot(h.x-this.gx,h.y-this.gy)>40){         // nascimento ou inoculação
        if(S)this.dir=Math.atan2(S[0].y-S[S.length-1].y,S[0].x-S[S.length-1].x);
        this._reset(h.x,h.y);this.px=h.x;this.py=h.y;this.hist=[];this.aS=0;return}
      // alvo = cabeça do motor sem o tremor dos "músculos"; aS = quanto ela anda de fato
      this.gx+=(h.x-this.gx)*0.1;this.gy+=(h.y-this.gy)*0.1;
      const Hh=this.hist;Hh.push(this.gx,this.gy);if(Hh.length>120)Hh.splice(0,2);
      this.aS+=(Math.hypot(this.gx-Hh[0],this.gy-Hh[1])/Math.max(1,Hh.length/2-1)-this.aS)*0.05;
      const dx=this.gx-this.px,dy=this.gy-this.py,d=Math.hypot(dx,dy),Rl=this.leash;
      const atRoot=rootX!==undefined&&Math.abs(this.px-rootX)<4&&this.py>rootTop&&this.py<rootBottom+5;
      this.feed+=((atRoot?1:0)-this.feed)*0.05;
      const v=Math.max(this.v0,this.aS*1.2)*(1-0.6*this.feed)*(1+clamp((d-Rl)/Rl,0,1.5));   // ficou para trás: acelera
      // curvas: taxa de giro com passeio aleatório + coleira, limitada pelo raio mínimo de curva
      this.turn=(this.turn+(R()-0.5)*0.004)*0.985;
      let rate=this.turn;
      if(d>Rl*0.5)rate+=clamp(wrap(Math.atan2(dy,dx)-this.dir),-1,1)*0.02*Math.min(3,d/Rl);
      const kmax=v/(this.Lb*(d>Rl*1.5?0.25:0.4));
      this.dir=wrap(this.dir+clamp(rate,-kmax,kmax));
      if(rootTop!==undefined&&this.py<rootTop+3&&Math.sin(this.dir)<0)this.dir=wrap(this.dir+(Math.cos(this.dir)>0?1:-1)*kmax*2);   // perto da superfície, curva para baixo
      this.px+=Math.cos(this.dir)*v;this.py+=Math.sin(this.dir)*v;
      if(rootTop!==undefined&&this.py<rootTop+1)this.py=rootTop+1;
      // o último ponto do rastro é a cabeça (move a cada passo); a cada 0,25 px vira ponto fixo
      const T=this.trail,P0=T[T.length-2],sd=Math.hypot(this.px-P0.x,this.py-P0.y);
      const Lh=T[T.length-1];Lh.x=this.px;Lh.y=this.py;Lh.S=P0.S+sd;
      if(sd>=0.25)T.push({x:this.px,y:this.py,S:Lh.S});
      this.Sh=Lh.S;
      while(T.length>2&&T[1].S<this.Sh-this.Lb-3)T.shift();
      this.hx=T[T.length-1].x;this.hy=T[T.length-1].y;
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
