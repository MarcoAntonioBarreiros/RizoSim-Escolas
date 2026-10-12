/* ═══ CORPO AMEBOIDE LEVE — guilda Protozoário ═══
   Versão simplificada do modelo Ameba Sol-Gel (github.com/MarcoAntonioBarreiros/amebasim)
   para dezenas de organismos ao mesmo tempo.

   O que este arquivo faz: a FORMA e o DESENHO do protozoário — membrana, pseudópodes
   que se estendem, ramificam e recolhem, uroide, grânulos do endoplasma, núcleo,
   vacúolo contrátil e fagocitose (o pseudópode alcança a presa e a leva para um vacúolo
   digestivo).
   O que NÃO faz: decidir para onde o organismo vai, o que come e quanta energia ganha.
   É só a camada visual: o corpo original do motor (ossos Verlet) continua existindo e se
   movendo invisível, e a ameba é desenhada em volta dele. O centro visual da ameba segue
   o centro do motor aos pulsos — avança quando um pseudópode alinhado cresce e fica
   parado enquanto ele se forma — com atraso máximo de ~0,8 raio. Nada aqui consome
   números do Math.random do motor, então a simulação é idêntica à original.

   Morfotipos (derivados do gene nd, que já existe no genoma e muta ±1):
     nd ≤ 3  → limax       (monopodial, tipo Vahlkampfia/Naegleria: um lobo frontal largo)
     nd 4–7  → lobosa      (lobopódios ramificados, tipo Amoeba/Chaos)
     nd ≥ 8  → acantopódios (lobo hialino com espículas finas, tipo Acanthamoeba)
*/
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;

  const VARIANTS={
    limax:  {name:'limax',       maxPods:1,podW:0.70,ext:[1.0,1.5],grow:0.045,hold:[25,60], branch:0,   spawn:0.035,side:0.012,tail:0.85,spikes:0},
    lobosa: {name:'lobosa',      maxPods:3,podW:0.32,ext:[1.2,2.2],grow:0.030,hold:[40,110],branch:0.6, spawn:0.022,side:0,    tail:0,   spikes:0},
    acanto: {name:'acantopódios',maxPods:1,podW:0.55,ext:[0.6,1.0],grow:0.035,hold:[30,70], branch:0,   spawn:0.025,side:0,    tail:0,   spikes:5}
  };
  function variantFor(nd){return nd<=3?VARIANTS.limax:nd>=8?VARIANTS.acanto:VARIANTS.lobosa}

  /* PRNG próprio: o corpo não consome números do Math.random do motor (1 chamada na criação) */
  function prng(seed){let s=seed>>>0||1;return function(){s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  /* Distância, ao longo de um raio saindo do centro, até a borda de um braço (cápsula
     que nasce no centro com ângulo a, comprimento L e meia-largura hw).
     cphi/sphi = cos/sen do ângulo entre o raio e o braço. */
  function capsuleReach(cphi,sphi,L,hw){
    if(cphi<=0)return hw;
    const s=Math.abs(sphi), Ls=L*s;
    if(Ls<=hw)return L*cphi+Math.sqrt(hw*hw-Ls*Ls);
    return hw/s;
  }

  class AmoebaBody{
    constructor(x,y,g,seed){
      this.rand=prng(seed);
      const R=this.rand;
      this.v=variantFor(g.nd|0);
      this.R0=2.2+(g.cs||1.4)*1.5;          // raio de repouso (px do mundo)
      this.N=48;
      this.cosA=new Float32Array(this.N);this.sinA=new Float32Array(this.N);
      for(let i=0;i<this.N;i++){const a=i/this.N*TAU;this.cosA[i]=Math.cos(a);this.sinA[i]=Math.sin(a)}
      this.r=new Float32Array(this.N).fill(this.R0);
      this.tgt=new Float32Array(this.N).fill(this.R0);
      this.A0=Math.PI*this.R0*this.R0;
      this.Rb=this.R0;                      // raio do corpo-base, ajustado para conservar área
      this.cx=x;this.cy=y;
      this.heading=R()*TAU;this.aim=this.heading;
      this.pods=[];this.spikes=[];
      for(let k=0;k<this.v.spikes;k++)this.spikes.push(this._spike(R()*TAU,R()));
      this.pulse=0;
      this.t=Math.floor(R()*1000);
      this.gran=[];
      for(let k=0;k<12;k++)this.gran.push({a:R()*TAU,f:0.25+0.55*R(),ph:R()*TAU,s:0.18+0.12*R()});
      this.food=[];
      this.nuc={x:0,y:0};
      this.cvPh=R();
      this.wob=R()*TAU;
    }

    _spike(a,age){return {a,len:1.2+0.8*this.rand(),amp:age||0,life:200+Math.floor(this.rand()*400),age:Math.floor((age||0)*200)}}

    /* chamado a cada passo, depois do motor mover o core.
       aim = ângulo para onde o motor está dirigindo (quimiotaxia); hunting = sente presa/sinal */
    update(core,aim,hunting){
      const R=this.rand,v=this.v,P=this.pods,N=this.N;
      this.t++;
      // centro visual segue o centro do motor aos pulsos
      let ex=core.x-this.cx,ey=core.y-this.cy;const off=Math.hypot(ex,ey);
      let dx,dy;
      if(off>this.R0*6){dx=dy=0;this.cx=core.x;this.cy=core.y;this.r.fill(this.Rb);ex=ey=0}  // inoculação
      else{
        const k=0.012+0.17*this.pulse;
        dx=ex*k;dy=ey*k;
        const lim=this.R0*0.8,rem=off*(1-k);
        if(rem>lim){const f=(rem-lim)/off;dx+=ex*f;dy+=ey*f}
        this.cx+=dx;this.cy+=dy;
      }
      const sp=Math.hypot(dx,dy);
      if(sp>1e-4)this.heading+=wrap(Math.atan2(dy,dx)-this.heading)*0.08;
      // alvo dos pseudópodes: para onde o corpo do motor está indo (ele está à frente)
      const goal=off>0.4?Math.atan2(ey,ex):(Number.isFinite(aim)?aim:this.aim);
      this.aim+=wrap(goal-this.aim)*0.1;

      /* ── pseudópodes: nascem na direção do alvo, competem, ramificam, recolhem ── */
      let active=0;for(const p of P)if(p.phase!=='retract'&&!p.cup)active++;
      const want=v.spawn*(hunting?1.6:1.3)*(active===0?2:1);   // sem pseudópode, explora logo
      if(active<v.maxPods&&R()<want){
        const spread=hunting?0.75:1.1;
        const a=this.aim+(R()+R()+R()-1.5)*spread;
        P.push(this._pod(a,v.podW,v.ext[0]+(v.ext[1]-v.ext[0])*R(),0));
      }
      if(v.side&&R()<v.side){             // limax: bolhas laterais eruptivas perto da frente
        const s=R()<0.5?-1:1;P.push(this._pod(this.aim+s*(0.6+0.4*R()),0.45,0.35+0.3*R(),3));
      }
      for(let k=P.length-1;k>=0;k--){
        const p=P[k];
        p.a+=Math.sin(this.t*0.07+p.ph)*0.006;                     // a ponta tateia
        if(!p.cup&&p.gen===0)p.a+=wrap(this.aim-p.a)*0.004;        // e se curva devagar para o sinal
        const off=Math.abs(wrap(p.a-this.aim));
        if(p.phase==='grow'){
          p.amp+=p.rate*(1.15-p.amp);
          if(p.amp>=1){p.amp=1;p.phase='hold'}
          if(!p.cup&&off>1.7&&P.length>1)p.phase='retract';        // perde a competição
        }else if(p.phase==='hold'){
          if(--p.hold<=0)p.phase='retract';
          else if(!p.cup&&p.gen<2&&v.branch>0&&p.hold%20===0&&R()<v.branch*0.4){
            // bifurca: dois ramos a partir da ponta; o braço-mãe cede devagar
            const d=0.22+0.18*R();
            for(const s of [-1,1])if(R()<0.85)P.push(this._pod(p.a+s*d,p.w*0.78,p.ext*(1.05+0.25*R()),p.gen+1));
            p.phase='retract';p.rate*=0.5;
          }
        }else{
          p.amp-=p.rate*0.6;
          if(p.amp<=0.02)P.splice(k,1);
        }
      }
      if(P.length>9)P.splice(0,P.length-9);
      for(const s of this.spikes){                                 // acantopódios: renovação lenta
        s.age++;
        if(s.age<s.life)s.amp=Math.min(1,s.amp+0.02);else s.amp-=0.02;
        if(s.amp<=0){Object.assign(s,this._spike(this.aim+(R()-0.5)*2.6,0))}
      }

      /* ── forma-alvo: corpo-base + braços (união suave) ── */
      const Rb=this.Rb,tg=this.tgt,PN=8;
      const caps=[];
      for(const p of P){
        const e=p.amp*p.amp*(3-2*p.amp);                            // suavização da extensão
        caps.push({ca:Math.cos(p.a),sa:Math.sin(p.a),L:Rb*(0.55+p.ext*e)+(p.reach?p.reach*e:0),hw:Rb*p.w});
      }
      if(v.tail){const a=this.heading+Math.PI;caps.push({ca:Math.cos(a),sa:Math.sin(a),L:Rb*(0.55+v.tail),hw:Rb*0.62})}
      for(const s of this.spikes){if(s.amp<=0)continue;caps.push({ca:Math.cos(s.a),sa:Math.sin(s.a),L:Rb*(0.7+s.len*s.amp),hw:Rb*0.17})}
      let area=0;
      for(let i=0;i<N;i++){
        let acc=Math.pow(Rb,PN);
        const ci=this.cosA[i],si=this.sinA[i];
        for(const c of caps){
          const cphi=ci*c.ca+si*c.sa,sphi=si*c.ca-ci*c.sa;
          acc+=Math.pow(capsuleReach(cphi,sphi,c.L,c.hw),PN);
        }
        tg[i]=Math.pow(acc,1/PN);
      }
      /* membrana: segue a forma-alvo com atraso; aderida ao substrato, fica para trás quando o
         corpo avança (uroide) e é absorvida na frente */
      const r=this.r;
      for(let i=0;i<N;i++){
        const proj=dx*this.cosA[i]+dy*this.sinA[i];
        r[i]-=proj*(proj>0?0.3:0.5);
        const d=tg[i]-r[i];
        r[i]+=d*(d>0?0.3:0.12);
      }
      // tensão superficial: suaviza vizinhos
      const tmp=this._tmp||(this._tmp=new Float32Array(N));
      for(let i=0;i<N;i++)tmp[i]=r[i]*0.76+(r[(i+1)%N]+r[(i+N-1)%N])*0.12;
      for(let i=0;i<N;i++){r[i]=clamp(tmp[i],this.R0*0.45,this.R0*4.2);area+=r[i]*r[i]}
      area*=Math.PI/N;
      // conservação de área: o citoplasma que entra nos braços sai do corpo
      this.Rb=clamp(this.Rb*(1+(Math.sqrt(this.A0/area)-1)*0.25),this.R0*0.55,this.R0*1.15);

      /* ── avanço aos pulsos: o corpo flui para dentro do pseudópode que cresce alinhado ── */
      let raw=0;
      for(const p of P)if(p.phase==='grow'&&!p.cup)raw+=Math.max(0,Math.cos(p.a-this.aim))*(1-p.amp)*1.6;
      this.pulse+=(clamp(raw,0,1)-this.pulse)*0.2;

      /* ── endoplasma: grânulos escorrem para o pseudópode que cresce (fluxo em fonte) ── */
      let lead=null,best=0;for(const p of P)if(p.phase!=='retract'&&p.amp>best){best=p.amp;lead=p}
      for(const q of this.gran){
        q.ph+=0.05;
        if(lead){q.a+=wrap(lead.a-q.a)*0.012*q.s*4;q.f+=(0.82-q.f)*0.01}
        else{q.a+=Math.sin(q.ph*0.3)*0.01;q.f+=(0.5-q.f)*0.01}
        q.f=clamp(q.f+Math.sin(q.ph)*0.004,0.15,0.85);
      }
      /* núcleo: atrás do centro, sem saltos */
      const nb=-0.22*this.Rb;
      this.nuc.x+=(Math.cos(this.heading)*nb-this.nuc.x)*0.04;
      this.nuc.y+=(Math.sin(this.heading)*nb-this.nuc.y)*0.04;
      this.cvPh=(this.cvPh+1/320)%1;

      /* ── fagocitose: presa capturada é puxada para dentro e digerida ── */
      for(let k=this.food.length-1;k>=0;k--){
        const f=this.food[k];f.t++;
        // posição guardada relativa ao core
        if(f.t<=f.catchT){/* parada onde foi capturada: o braço chega até ela */f.lx-=dx;f.ly-=dy}
        else if(f.t<=f.catchT+f.pullT){const k2=0.08;f.lx+=(f.vx-f.lx)*k2;f.ly+=(f.vy-f.ly)*k2}
        else{f.lx+=(f.vx-f.lx)*0.02;f.ly+=(f.vy-f.ly)*0.02;f.vx*=0.995;f.vy*=0.995}
        if(f.t>f.catchT+f.pullT+f.digT)this.food.splice(k,1);
      }
    }

    _pod(a,w,ext,gen){
      const v=this.v,R=this.rand;
      return {a,w,ext,gen,amp:0,phase:'grow',rate:v.grow*(0.7+0.6*R())*(gen===3?1.8:1),hold:Math.floor(v.hold[0]+(v.hold[1]-v.hold[0])*R())*(gen===3?0.4:1)|0,ph:R()*TAU,cup:false,reach:0};
    }

    /* o motor decidiu que esta presa foi comida: o pseudópode vai buscá-la */
    engulf(x,y,color,size){
      const dx=x-this.cx,dy=y-this.cy,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
      const p=this._pod(a,0.5,0,1);
      p.cup=true;p.rate=0.16;p.hold=10;
      p.reach=Math.max(0,d-this.Rb*0.55)+ (size||1.2);           // o braço chega até a presa
      this.pods.push(p);
      const ia=a+Math.PI+(this.rand()-0.5)*1.2;
      this.food.push({lx:dx,ly:dy,vx:Math.cos(ia)*this.Rb*0.25,vy:Math.sin(ia)*this.Rb*0.25,
        t:0,catchT:Math.min(14,4+Math.round(d*0.7)),pullT:30,digT:220,col:color||'#8fd18f',sz:size||1.2});
      if(this.food.length>4)this.food.shift();
    }

    get morphName(){return this.v.name}
    get label(){return 'Ameba '+this.v.name}

    _path(ctx){
      const N=this.N,r=this.r,cx=this.cx,cy=this.cy;
      const X=i=>cx+this.cosA[i%N]*r[i%N],Y=i=>cy+this.sinA[i%N]*r[i%N];
      ctx.beginPath();
      ctx.moveTo((X(0)+X(1))/2,(Y(0)+Y(1))/2);
      for(let i=1;i<=N;i++)ctx.quadraticCurveTo(X(i),Y(i),(X(i)+X(i+1))/2,(Y(i)+Y(i+1))/2);
      ctx.closePath();
    }

    /* desenha em coordenadas do mundo (o ctx já está transformado pela câmera) */
    draw(ctx,g,al,gc){
      const hue=g.hue,sat=g.sat,lit=g.lit,cx=this.cx,cy=this.cy,Rb=this.Rb;
      const hs=(h,s,l,a)=>`hsla(${h},${s}%,${l}%,${a})`;
      ctx.save();
      ctx.globalAlpha=1;
      // halo hialino (ectoplasma) e corpo
      this._path(ctx);
      ctx.fillStyle=hs(hue,sat*0.6,Math.min(80,lit+12),0.40*al+0.10);
      ctx.fill();
      ctx.lineJoin='round';
      ctx.strokeStyle=hs(hue,sat*0.4,Math.min(88,lit+28),0.22*al);ctx.lineWidth=Rb*0.34;ctx.stroke();
      ctx.strokeStyle=hs(hue,sat*0.85,Math.min(88,lit+24),0.9*al+0.05);ctx.lineWidth=0.42;ctx.stroke();
      ctx.save();this._path(ctx);ctx.clip();
      // endoplasma granuloso
      const N=this.N;
      const rAt=a=>{const u=((a%TAU)+TAU)%TAU/TAU*N,i=Math.floor(u),f=u-i;return this.r[i%N]*(1-f)+this.r[(i+1)%N]*f};
      ctx.fillStyle=hs(hue,sat*0.7,Math.max(18,lit-12),0.75*al);
      for(const q of this.gran){
        const rr=rAt(q.a)*q.f;ctx.beginPath();ctx.arc(cx+Math.cos(q.a)*rr,cy+Math.sin(q.a)*rr,Rb*0.075+0.12,0,TAU);ctx.fill();
      }
      // vacúolos digestivos com a presa sendo digerida
      for(const f of this.food){
        if(f.t<=f.catchT)continue;
        const x=cx+f.lx,y=cy+f.ly,dig=Math.max(0,f.t-f.catchT-f.pullT)/f.digT,left=1-dig;
        {
          ctx.fillStyle=`rgba(255,250,235,${0.35*al*left+0.05})`;ctx.strokeStyle=hs(hue,sat*0.5,lit+20,0.6*al);ctx.lineWidth=0.18;
          ctx.beginPath();ctx.arc(x,y,f.sz*1.25,0,TAU);ctx.fill();ctx.stroke();
        }
        ctx.globalAlpha=Math.max(0,left)*0.9;
        ctx.fillStyle=f.col;ctx.beginPath();ctx.arc(x,y,f.sz*(0.35+0.55*left),0,TAU);ctx.fill();
        ctx.globalAlpha=1;
      }
      // vacúolo contrátil no uroide (diástole lenta, sístole rápida)
      const ph=this.cvPh,cvR=Rb*(ph<0.85?0.08+0.26*ph/0.85:0.34*(1-(ph-0.85)/0.15));
      const ra=this.heading+Math.PI,rr=rAt(ra)*0.6;
      ctx.fillStyle=`rgba(235,248,255,${0.55*al})`;ctx.strokeStyle=`rgba(200,225,240,${0.6*al})`;ctx.lineWidth=0.15;
      ctx.beginPath();ctx.arc(cx+Math.cos(ra)*rr,cy+Math.sin(ra)*rr,Math.max(0.05,cvR),0,TAU);ctx.fill();ctx.stroke();
      // núcleo vesicular com nucléolo central (cariossomo), típico de amebas do solo
      const nx=cx+this.nuc.x,ny=cy+this.nuc.y,nr=this.R0*0.3;
      ctx.fillStyle=hs(hue,sat*0.3,Math.min(90,lit+30),0.55*al+0.15);ctx.strokeStyle=hs(hue,sat*0.6,Math.max(15,lit-20),0.8*al);ctx.lineWidth=0.18;
      ctx.beginPath();ctx.arc(nx,ny,nr,0,TAU);ctx.fill();ctx.stroke();
      ctx.fillStyle=hs(hue,sat*0.7,Math.max(12,lit-25),0.9*al);ctx.beginPath();ctx.arc(nx,ny,nr*0.42,0,TAU);ctx.fill();
      ctx.restore();
      // presa ainda do lado de fora, sendo alcançada pelo pseudópode
      for(const f of this.food){if(f.t>f.catchT)continue;ctx.fillStyle=f.col;ctx.globalAlpha=0.9;ctx.beginPath();ctx.arc(cx+f.lx,cy+f.ly,f.sz*0.9,0,TAU);ctx.fill();ctx.globalAlpha=1}
      // capuz hialino nas pontas em crescimento
      ctx.fillStyle=`rgba(255,255,255,${0.16*al})`;
      for(const p of this.pods){if(p.phase==='retract'||p.amp<0.3)continue;
        const rr2=rAt(p.a);ctx.beginPath();ctx.arc(cx+Math.cos(p.a)*(rr2-Rb*p.w*0.45),cy+Math.sin(p.a)*(rr2-Rb*p.w*0.45),Rb*p.w*0.55,0,TAU);ctx.fill()}
      ctx.restore();
    }
  }

  AmoebaBody.variantFor=variantFor;
  AmoebaBody.VARIANTS=VARIANTS;
  root.AmoebaBody=AmoebaBody;
})(typeof window!=='undefined'?window:globalThis);
