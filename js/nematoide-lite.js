/* ═══ NEMATOIDE — camada visual ═══
   O corpo original do motor continua fazendo a física; dele se usa só a posição da cabeça e
   a direção do corpo. O desenho é uma onda senoidal que corre ao longo do corpo com fase
   dada pela distância percorrida — como na locomoção ondulatória real, em que o corpo
   passa pelos mesmos pontos por onde a cabeça passou.
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
      this.c={x,y};this.dir=R()*TAU;this.s=R()*10;this.feed=0;this.ph=R()*TAU;
    }
    get label(){return this.feed>0.3?'Nematoide se alimentando (estilete)':'Nematoide (ondulação)'}
    update(core,aim,hunting,rootX,rootTop,rootBottom,org){
      const S=org&&org.pts&&org.pts.length>=2?org.pts:null;
      const h=S?S[0]:core,t=S?S[S.length-1]:{x:core.x-Math.cos(this.dir)*2,y:core.y-Math.sin(this.dir)*2};
      if(this.hx===undefined||Math.hypot(h.x-this.hx,h.y-this.hy)>30){this.hx=h.x;this.hy=h.y;this.dir=Math.atan2(h.y-t.y,h.x-t.x)}
      const ox=this.hx,oy=this.hy;
      this.hx+=(h.x-this.hx)*0.5;this.hy+=(h.y-this.hy)*0.5;
      const want=Math.atan2(h.y-t.y,h.x-t.x),d=Math.atan2(Math.sin(want-this.dir),Math.cos(want-this.dir));
      this.dir+=d*0.12;
      const mv=(this.hx-ox)*Math.cos(this.dir)+(this.hy-oy)*Math.sin(this.dir);
      this.s+=Math.abs(mv)+0.02;                 // a onda corre pelo corpo enquanto ele avança
      const atRoot=rootX!==undefined&&Math.abs(this.hx-rootX)<4&&this.hy>rootTop&&this.hy<rootBottom+5;
      this.feed+=((atRoot?1:0)-this.feed)*0.05;
      this.ph+=0.25;
    }
    /* corpo: senoide ao longo do eixo cabeça→cauda do corpo do motor, com a fase dada pela
       distância percorrida (a onda fica parada no espaço enquanto o verme avança por ela) */
    _pts(){
      const Lb=this.Lb,lam=Lb*0.55,A=Lb*0.065,cx=Math.cos(this.dir),cy=Math.sin(this.dir),nx=-cy,ny=cx,out=[];
      for(let k=0;k<NP;k++){const u=k/(NP-1),env=0.35+0.65*Math.min(1,u*2.5);
        const o=Math.sin((u*Lb-this.s)/lam*TAU)*A*env;
        out.push({x:this.hx-cx*u*Lb+nx*o,y:this.hy-cy*u*Lb+ny*o})}
      this.len=Lb;return out;
    }
    draw(ctx,g,al,gc,org){
      if(org)this.org=org;
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
