/* ═══ FLAGELADOS E CILIADOS DO SOLO — camada visual ═══
   O grupo Protozoário do motor tem três tipos (função protoKind do motor, a partir do genoma):
   ameba (ameba-lite.js), flagelado e ciliado (este arquivo). O motor decide onde cada um está e
   o que come; aqui só se desenha o organismo e o seu jeito de nadar. Nada aqui consome o
   Math.random do motor.

   Flagelado (tipo Bodo / Cercomonas): célula pequena em forma de feijão, com dois flagelos —
   um curto à frente, que bate rápido, e um longo arrastado atrás. Nada aos trancos e muda de
   direção de repente.
   Ciliado (tipo Colpoda, o ciliado típico do solo; o paramécio é parente de água doce): célula
   maior em forma de rim, coberta de cílios que batem em onda (onda metacrônica), sulco oral
   do lado, macronúcleo grande, vacúolo contrátil e vacúolos digestivos que circulam (ciclose).
   Nada rápido girando em torno do próprio eixo e, quando "esbarra", recua e muda de rumo
   (reação de evitação).
   Os dois encistam na seca: viram um cisto redondo de parede grossa. */
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  function prng(seed){let s=seed>>>0||1;return function(){s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const zoomOf=ctx=>ctx.getTransform().a/(root.devicePixelRatio||1);

  class ProtistBody{
    constructor(x,y,g,kind,seed){
      this.rand=prng(seed);const R=this.rand;
      this.kind=kind;const cs=g.cs||1.6;
      if(kind==='cil'){this.L=clamp(5.6+cs*1.1,6,8.5);this.W=this.L*0.6;this.v0=0.3+0.12*R();this.leash=14}
      else{this.L=clamp(2.6+cs*0.5,2.8,4);this.W=this.L*0.55;this.v0=0.17+0.1*R();this.leash=10}
      this.c={x,y};this.heading=R()*TAU;this.dh=this.heading;this.o={x:0,y:0};this.vx=0;this.vy=0;
      this.A=null;this.aS=0;this.run=this._runLen();this.turnT=0;this.dTurn=0;this.back=0;
      this.ph=R()*TAU;this.spin=R()*TAU;this.food=[];this.cystT=0;this.t=0;
    }
    get label(){
      if(this.cystT>0.5)return this.kind==='cil'?'Cisto de ciliado (espera a umidade voltar)':'Cisto de flagelado (espera a umidade voltar)';
      return this.kind==='cil'?'Ciliado (tipo Colpoda)':'Flagelado (tipo Bodo/Cercomonas)';
    }
    viewPos(){return this.c}
    _runLen(){return this.kind==='cil'?150+this.rand()*180:30+this.rand()*70}

    update(core,aim,hunting,rootX,rootTop,rootBottom,org){
      const R=this.rand;this.t++;
      if(!this.A||Math.hypot(core.x-this.A.x,core.y-this.A.y)>30){this.A={x:core.x,y:core.y};this.c.x=core.x;this.c.y=core.y;this.o.x=this.o.y=0;this.hist=[];this.aS=0}
      const A=this.A;A.x+=(core.x-A.x)*0.05;A.y+=(core.y-A.y)*0.05;
      const H=this.hist;H.push(A.x,A.y);if(H.length>80)H.splice(0,2);
      this.aS+=(Math.hypot(A.x-H[0],A.y-H[1])/Math.max(1,H.length/2-1)-this.aS)*0.05;
      const cyst=!!(org&&org.cyst);
      this.cystT+=((cyst?1:0)-this.cystT)*0.03;
      for(let i=this.food.length-1;i>=0;i--){const f=this.food[i];f.t++;if(f.t>f.life)this.food.splice(i,1)}
      const px=this.c.x,py=this.c.y;
      if(this.cystT<0.6){                                  // nado próprio, preso à posição do motor
        const o=this.o,d=Math.hypot(o.x,o.y),toA=Math.atan2(-o.y,-o.x),Rl=this.leash;
        let v=this.v0*(1-this.cystT);
        if(this.turnT>0){this.turnT--;this.heading+=this.dTurn;v*=this.kind==='cil'?0.5:0.4}
        else if(this.back>0){this.back--;v*=-0.6;if(this.back===0){const s=R()<0.5?-1:1;this.turnT=12;this.dTurn=s*(1.2+R()*0.6)/12}}
        else{
          this.heading+=(R()-0.5)*(this.kind==='cil'?0.03:0.08)+(this.kind==='cil'?0.012:0);   // ciliado: trajetória em curva suave
          const mv=this.heading;
          if(d>Rl*1.2)this.heading+=clamp(wrap(toA-mv),-1,1)*0.07*Math.min(2,d/Rl-1);
          const cosA=d>Rl*0.5?Math.cos(wrap(toA-mv))*Math.min(1,d/Rl):0;
          this.run-=1-0.6*cosA;
          if(this.run<=0&&!(d>Rl*1.2&&cosA>0.5)){
            this.run=this._runLen();
            if(this.kind==='cil')this.back=10+Math.floor(R()*8);               // reação de evitação: recua e vira
            else{const s=(d>Rl*0.6&&R()<0.7)?(wrap(toA-mv)<0?-1:1):(R()<0.5?-1:1);this.turnT=5;this.dTurn=s*(0.9+R()*1.2)/5}  // tranco
          }
        }
        o.x+=Math.cos(this.heading)*v;o.y+=Math.sin(this.heading)*v;
      }
      this.c.x=A.x+this.o.x;this.c.y=A.y+this.o.y;
      if(rootTop!==undefined&&this.c.y<rootTop+1.5){this.c.y=rootTop+1.5;this.o.y=this.c.y-A.y;if(Math.sin(this.heading)<0)this.heading=-this.heading}
      this.vx+=((this.c.x-px)-this.vx)*0.25;this.vy+=((this.c.y-py)-this.vy)*0.25;
      const spd=Math.hypot(this.vx,this.vy);
      if(spd>0.01&&this.cystT<0.6){
        let tgt=Math.atan2(this.vy,this.vx);if(this.back>0)tgt+=Math.PI;
        const rate=this.turnT>0?0.35:spd/(0.45*this.L);
        this.dh+=clamp(wrap(tgt-this.dh),-rate,rate);
      }
      this.ph+=this.kind==='cil'?0.35:0.6+spd*3;this.spin+=0.12;
    }

    /* o motor registrou a predação: a presa vira um vacúolo digestivo */
    engulf(x,y,color,size){
      this.meals=(this.meals||0)+1;
      const a=this.dh,ca=Math.cos(a),sa=Math.sin(a),dx=x-this.c.x,dy=y-this.c.y;
      this.food.push({u:clamp((dx*ca+dy*sa)/(this.L/2),-1,1),w:clamp((-dx*sa+dy*ca)/(this.W/2),-1,1),col:color||'#7dd3fc',t:0,life:this.kind==='cil'?420:260,s:this.rand()*TAU});
      if(this.food.length>6)this.food.shift();
    }

    _cyst(ctx,g,al,f){
      const r=this.kind==='cil'?this.L*0.42:this.L*0.4,c=this.c,hs=(h,s,l,a)=>`hsla(${h},${s}%,${l}%,${a})`;
      ctx.save();ctx.globalAlpha=f;
      ctx.beginPath();ctx.arc(c.x,c.y,r,0,TAU);ctx.fillStyle=hs(g.hue,g.sat*0.35,Math.max(25,g.lit-15),0.85*al+0.1);ctx.fill();
      ctx.strokeStyle=hs(g.hue,g.sat*0.4,Math.max(15,g.lit-35),0.95);ctx.lineWidth=Math.max(0.25,r*0.18);ctx.stroke();
      ctx.beginPath();ctx.arc(c.x,c.y,r*0.62,0,TAU);ctx.strokeStyle=hs(g.hue,g.sat*0.5,Math.min(90,g.lit+28),0.8);ctx.lineWidth=0.15;ctx.stroke();
      ctx.restore();
    }

    draw(ctx,g,al){
      if(this.cystT>0.02)this._cyst(ctx,g,al,this.cystT);
      if(this.cystT>0.97)return;
      const fade=1-this.cystT;
      ctx.save();ctx.globalAlpha=fade;ctx.lineCap='round';ctx.lineJoin='round';
      if(this.kind==='cil')this._drawCil(ctx,g,al);else this._drawFlag(ctx,g,al);
      ctx.restore();
    }

    _local(){const a=this.dh;return {hx:Math.cos(a),hy:Math.sin(a),nx:-Math.sin(a),ny:Math.cos(a)}}

    _drawFlag(ctx,g,al){
      const {hx,hy,nx,ny}=this._local(),c=this.c,L=this.L,W=this.W,zoom=zoomOf(ctx);
      const hs=(h,s,l,a)=>`hsla(${h},${s}%,${l}%,${a})`,hue=g.hue;
      const P=(u,w)=>({x:c.x+hx*u*L/2+nx*w*W/2,y:c.y+hy*u*L/2+ny*w*W/2});
      // corpo em feijão: um lado levemente côncavo (bolso flagelar à frente)
      ctx.beginPath();
      for(let i=0;i<=24;i++){const a=i/24*TAU,u=Math.cos(a),w=Math.sin(a)*(1-0.18*Math.max(0,Math.sin(a))*(u>0?1:0.3));const p=P(u,w);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}
      ctx.closePath();ctx.fillStyle=hs(hue,g.sat*0.45,Math.min(82,g.lit+14),0.7*al+0.15);ctx.fill();
      ctx.strokeStyle=hs(hue,g.sat*0.5,Math.max(20,g.lit-20),0.9*al);ctx.lineWidth=0.14;ctx.stroke();
      // flagelos: curto à frente (bate rápido) e longo arrastado atrás
      const base=P(0.75,0.35);
      const wave=(x0,y0,a,len,amp,ph,n)=>{ctx.moveTo(x0,y0);const ca=Math.cos(a),sa=Math.sin(a);for(let i=1;i<=n;i++){const u=i/n,o=Math.sin(u*TAU*1.3-ph)*amp*Math.min(1,u*3);ctx.lineTo(x0+ca*len*u-sa*o,y0+sa*len*u+ca*o)}};
      ctx.beginPath();
      wave(base.x,base.y,this.dh+0.5*Math.sin(this.ph*1.7),L*0.9,0.35,this.ph*2.2,8);
      wave(base.x,base.y,this.dh+Math.PI+0.25,L*1.7,0.22,this.ph,12);
      ctx.strokeStyle=hs(hue,g.sat*0.4,Math.min(88,g.lit+25),0.7*al);ctx.lineWidth=0.11;ctx.stroke();
      if(zoom>=3){
        const n=P(0.3,0);ctx.beginPath();ctx.arc(n.x,n.y,W*0.17,0,TAU);ctx.fillStyle=hs(hue,g.sat*0.4,Math.max(25,g.lit-15),0.6*al);ctx.fill();
        this._vacuoles(ctx,P,0.12*L,false);
      }
    }

    _drawCil(ctx,g,al){
      const {hx,hy,nx,ny}=this._local(),c=this.c,L=this.L,zoom=zoomOf(ctx);
      const W=this.W*(0.86+0.14*Math.cos(this.spin));                     // gira em torno do próprio eixo
      const side=Math.cos(this.spin)>0?1:-1;                                // de que lado aparece o sulco oral
      const hs=(h,s,l,a)=>`hsla(${h},${s}%,${l}%,${a})`,hue=g.hue;
      const P=(u,w)=>({x:c.x+hx*u*L/2+nx*w*W/2,y:c.y+hy*u*L/2+ny*w*W/2});
      // contorno em rim: entalhe (sulco oral) no terço anterior
      const pts=[];
      for(let i=0;i<48;i++){const a=i/48*TAU,u=Math.cos(a),s=Math.sin(a);
        const notch=s*side>0?0.32*Math.exp(-((u-0.35)**2)/0.03):0;pts.push({u,w:s*(1-notch)})}
      ctx.beginPath();pts.forEach((q,i)=>{const p=P(q.u,q.w);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.closePath();
      ctx.fillStyle=hs(hue,g.sat*0.4,Math.min(80,g.lit+12),0.55*al+0.15);ctx.fill();
      ctx.strokeStyle=hs(hue,g.sat*0.5,Math.max(18,g.lit-22),0.9*al);ctx.lineWidth=0.16;ctx.stroke();
      if(zoom<2.4)return;
      // cílios em onda metacrônica
      ctx.beginPath();
      for(let i=0;i<48;i+=1){const q=pts[i],p=P(q.u,q.w),qn=pts[(i+1)%48],pn=P(qn.u,qn.w);
        const tx=pn.x-p.x,ty=pn.y-p.y,tl=Math.hypot(tx,ty)||1,ox=ty/tl,oy=-tx/tl;
        const beat=Math.sin(this.ph*2-i*0.55),len=0.55+0.25*beat;
        ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+ox*len+tx/tl*beat*0.35,p.y+oy*len+ty/tl*beat*0.35)}
      ctx.strokeStyle=hs(hue,g.sat*0.3,Math.min(90,g.lit+30),0.55*al);ctx.lineWidth=0.07;ctx.stroke();
      // macronúcleo, vacúolo contrátil, sulco oral
      const m=P(-0.05,0);ctx.beginPath();ctx.ellipse(m.x,m.y,L*0.16,W*0.2,this.dh,0,TAU);
      ctx.fillStyle=hs(hue,g.sat*0.4,Math.max(25,g.lit-12),0.55*al);ctx.fill();
      const cvp=P(-0.72,0),cvr=W*0.1*(0.6+0.4*Math.max(0,Math.sin(this.t*0.05)));
      ctx.beginPath();ctx.arc(cvp.x,cvp.y,cvr,0,TAU);ctx.fillStyle=`rgba(225,240,255,${0.6*al})`;ctx.fill();
      const og=P(0.35,side*0.55);ctx.beginPath();ctx.arc(og.x,og.y,W*0.08,0,TAU);ctx.fillStyle=hs(hue,g.sat*0.5,Math.max(15,g.lit-30),0.7*al);ctx.fill();
      this._vacuoles(ctx,P,0.07*L,true);
    }

    _vacuoles(ctx,P,r,cyclosis){
      for(const f of this.food){
        const k=f.t/f.life;let u=f.u*(1-k*0.5),w=f.w*(1-k*0.5);
        if(cyclosis){const a=f.s+f.t*0.02;u=0.55*Math.cos(a);w=0.5*Math.sin(a)}  // ciclose: vacúolos circulam
        const p=P(u,w);
        ctx.beginPath();ctx.arc(p.x,p.y,r*(1.2-0.6*k),0,TAU);ctx.fillStyle=`rgba(255,250,235,${0.35*(1-k)})`;ctx.fill();
        ctx.beginPath();ctx.arc(p.x,p.y,r*0.6*(1-k*0.7),0,TAU);ctx.fillStyle=f.col;ctx.globalAlpha*=0.85;ctx.fill();ctx.globalAlpha/=0.85;
      }
    }
  }
  root.ProtistBody=ProtistBody;
})(typeof window!=='undefined'?window:globalThis);
