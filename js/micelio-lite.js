/* ═══ MICÉLIO LEVE — guildas de fungos (Trichoderma, Saprófito, Micorriza, Arthrobotrys) ═══
   Camada visual: o corpo original do motor (ossos Verlet) continua existindo e se movendo
   invisível; aqui só se desenha um micélio que cresce atrás dele. Não muda nenhuma regra
   ecológica e não consome números do Math.random do motor.

   Biologia representada:
   - crescimento apical: as hifas crescem pela ponta (Spitzenkörper = ponto claro na ponta)
     e ramificam atrás da ponta (ramificação subapical, ~40–60°);
   - o micélio é séssil: a colônia "anda" crescendo para um lado e morrendo do outro
     (autólise das hifas velhas);
   - septos aparecem só nos fungos septados (Ascomycota: Trichoderma, Arthrobotrys);
     Mucorales (saprófito) e fungos micorrízicos arbusculares (Glomeromycota) são cenocíticos;
   - Trichoderma: conidióforos com conídios verdes e enrolamento em volta do patógeno
     (micoparasitismo);
   - Saprófito: esporangióforos com esporângios escuros (tipo Mucor);
   - Micorriza: hifas grossas brancas, esporos globosos grandes e, encostando na raiz,
     arbúsculos (árvore de ramificação dicotômica dentro da célula cortical) e vesículas;
   - Arthrobotrys: redes adesivas (alças) que capturam nematoides;
   - Fusarium (aparência de parte dos patógenos): micélio branco-violáceo, macroconídios em
     canoa com septos e microconídios; atraído pela raiz, penetra e escurece o tecido.
   - Tropismo pela raiz: hifas de micorriza ramificam mais e se orientam para a raiz
     (resposta às estrigolactonas); as de Fusarium são atraídas de mais longe (peroxidases).
*/
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  function prng(seed){let s=seed>>>0||1;return function(){s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  const KINDS={
    tricho:{label:'Hifas septadas',Rmax:7.0,tipsMin:3,tipsMax:6,branch:0.10,angle:0.75,septa:true, width:0.28,life:700, maxSegs:64,feat:'conid',featP:0.07},
    sapro: {label:'Hifas cenocíticas',Rmax:8.0,tipsMin:3,tipsMax:6,branch:0.09,angle:0.65,septa:false,width:0.30,life:650, maxSegs:64,feat:'spor', featP:0.05},
    myco:  {label:'Hifas de micorriza',Rmax:9.0,tipsMin:3,tipsMax:5,branch:0.07,angle:0.85,septa:false,width:0.42,life:900, maxSegs:64,feat:'spore',featP:0.025,rootTrop:90,branchRoot:2.5,contact:'arb'},
    fusa:  {label:'Hifas de Fusarium',Rmax:7.5,tipsMin:3,tipsMax:6,branch:0.09,angle:0.70,septa:true, width:0.26,life:700, maxSegs:64,feat:'macro',featP:0.06,rootTrop:120,branchRoot:0.8,contact:'lesion'},
    arthro:{label:'Hifas com armadilhas',Rmax:8.0,tipsMin:3,tipsMax:6,branch:0.09,angle:0.80,septa:true, width:0.28,life:750, maxSegs:64,feat:'trap', featP:0.08}
  };

  class MyceliumBody{
    constructor(x,y,g,kind,seed){
      this.rand=prng(seed);
      const R=this.rand;
      this.kind=kind;this.P=KINDS[kind];
      this.scale=0.8+0.25*(g.cs||1.2);
      this.Rmax=this.P.Rmax*this.scale;
      this.c={x,y};this.heading=R()*TAU;this.speed=0.1;
      this.t=0;this.segs=[];this.tips=[];this.events=[];this.arbs=[];
      this.segLen=0.8+0.3*R();
      const n=this.P.tipsMin+1;
      for(let k=0;k<n;k++)this._tip(x,y,k/n*TAU+R()*0.6,0);
      this.pre=true;                 // pré-crescimento na 1ª atualização (quando já se sabe onde é a superfície)
    }
    get label(){return this.P.label}
    _tip(x,y,a,gen){this.tips.push({x,y,lx:x,ly:y,a,acc:0,idle:0,gen,n:0,toRoot:false})}

    update(core,aim,hunting,rootX,rootTop,rootBottom){
      this.surf=rootTop;
      if(this.pre){this.pre=false;for(let k=0;k<60;k++)this._grow(null,this.c.x,this.c.y,rootX,rootTop,rootBottom,0)}
      let dx=core.x-this.c.x,dy=core.y-this.c.y;
      if(dx*dx+dy*dy>900){           // inoculação/teletransporte: recomeça a colônia
        this.c.x=core.x;this.c.y=core.y;this.segs.length=0;this.tips.length=0;
        for(let k=0;k<4;k++)this._tip(core.x,core.y,k*1.57+this.rand(),0);
        dx=dy=0;
      }
      const ox=this.c.x,oy=this.c.y;
      this.c.x+=dx*0.06;this.c.y+=dy*0.06;
      const vx=this.c.x-ox,vy=this.c.y-oy,sp=Math.hypot(vx,vy);
      this.speed+=(sp-this.speed)*0.02;
      if(sp>2e-3)this.heading+=wrap(Math.atan2(vy,vx)-this.heading)*0.05;
      this._grow(core,this.c.x,this.c.y,rootX,rootTop,rootBottom,1);
    }

    _grow(core,cx,cy,rootX,rootTop,rootBottom,live){
      const R=this.rand,P=this.P,T=this.tips;
      this.t++;
      const tipSpeed=0.035+this.speed*1.3;   // extensão apical: lenta parada, acompanha a colônia quando ela avança
      // tropismo pela raiz (micorriza: estrigolactonas; Fusarium: peroxidases da raiz)
      let rootF=0;
      if(live&&P.rootTrop&&rootX!==undefined&&cy>rootTop){
        const dr=Math.hypot(cx-rootX,Math.max(0,cy-rootBottom));
        rootF=clamp(1-dr/P.rootTrop,0,1);
      }
      this.rootF=rootF;
      const nearRoot=live&&P.contact&&rootX!==undefined&&Math.abs(cx-rootX)<35&&cy>rootTop&&cy<rootBottom+20;
      for(let k=T.length-1;k>=0;k--){
        const p=T[k];
        const ddx=p.x-cx,ddy=p.y-cy,d=Math.hypot(ddx,ddy);
        const out=d>0.3?Math.atan2(ddy,ddx):p.a;
        let steer=wrap(out-p.a)*0.025+wrap(this.heading-p.a)*0.012+(R()-0.5)*0.16;
        if(rootF>0){const ry=clamp(p.y,rootTop+2,rootBottom);steer+=wrap(Math.atan2(ry-p.y,rootX-p.x)-p.a)*0.03*rootF}
        if(p.toRoot){const ry=clamp(p.y,rootTop+2,rootBottom);steer=wrap(Math.atan2(ry-p.y,rootX-p.x)-p.a)*0.045+(R()-0.5)*0.2}
        p.a+=steer;
        const lim=p.toRoot?40:this.Rmax;               // a hifa que busca a raiz pode se estender além da colônia
        const gr=tipSpeed*clamp((lim-d)/1.5,0,1);
        if(gr<0.01){if(++p.idle>40){T.splice(k,1);continue}}else p.idle=0;
        p.x+=Math.cos(p.a)*gr;p.y+=Math.sin(p.a)*gr;p.acc+=gr;
        if(this.surf!==undefined&&p.y<this.surf+0.6){p.y=this.surf+0.6;p.a=Math.abs(p.a)}   // não sai do solo
        if(p.toRoot&&Math.abs(p.x-rootX)<1.4){              // hifa entrou na raiz: arbúsculo (FMA) ou lesão (Fusarium)
          this.arbs.push({x:rootX+(p.x<rootX?-0.6:0.6),y:p.y,t0:this.t,side:p.x<rootX?-1:1,seed:R(),type:P.contact});
          if(this.arbs.length>3)this.arbs.shift();
          this._seg(p);T.splice(k,1);continue;
        }
        if(p.acc>=this.segLen){
          this._seg(p);
          if(T.length<P.tipsMax+2*rootF&&R()<P.branch*(1+(P.branchRoot||0)*rootF)){   // perto da raiz ramifica mais
            const s=R()<0.5?-1:1;this._tip(p.x,p.y,p.a+s*(P.angle+(R()-0.5)*0.4),p.gen+1);
          }
        }
      }
      let active=0;for(const p of T)if(p.idle===0)active++;
      if(active<P.tipsMin&&T.length<P.tipsMax+4){            // novo ramo a partir do micélio existente
        const moving=this.speed>0.05,hx=Math.cos(this.heading),hy=Math.sin(this.heading),R2=(this.Rmax*0.75)**2;
        let best=null,bv=-1e9;const S=this.segs;
        for(let j=0;j<8&&S.length;j++){const s=S[Math.floor(R()*S.length)];const ex=s.x2-cx,ey=s.y2-cy;if(ex*ex+ey*ey>R2||s.age>P.life)continue;
          const v=(moving?ex*hx+ey*hy:0)+R()*2;if(v>bv){bv=v;best=s}}
        const bx=best?best.x2:cx,by=best?best.y2:cy;
        const a=moving?this.heading+(R()-0.5)*1.6:(best?Math.atan2(by-cy,bx-cx):R()*TAU)+(R()-0.5)*1.2;
        this._tip(bx,by,a,1);
      }
      if(nearRoot&&!T.some(p=>p.toRoot)&&R()<0.01){         // uma hifa vai até a raiz e entra nela
        const S=this.segs;const s=S.length?S[S.length-1-Math.floor(R()*Math.min(10,S.length))]:null;
        if(s){this._tip(s.x2,s.y2,Math.atan2(0,rootX-s.x2),1);T[T.length-1].toRoot=true}
      }
      // autólise: hifas velhas ou longe da frente somem
      const S=this.segs,life=P.life;
      if((this.t&3)===0){                                     // a cada 4 passos (desempenho)
        const far=this.Rmax*this.Rmax*2.6;let w=0;
        for(let i=0;i<S.length;i++){
          const s=S[i];const mx=(s.x1+s.x2)/2-cx,my=(s.y1+s.y2)/2-cy;
          s.age+=(mx*mx+my*my>far)?16:4;
          if(s.age<=life+160)S[w++]=s;
        }
        S.length=w;
      }
      if(S.length>P.maxSegs)S.splice(0,S.length-P.maxSegs);
      for(let i=this.events.length-1;i>=0;i--){const e=this.events[i];e.t++;if(e.t>e.life)this.events.splice(i,1)}
      for(let i=this.arbs.length-1;i>=0;i--)if(this.t-this.arbs[i].t0>900)this.arbs.splice(i,1);
    }

    _seg(p){
      const P=this.P,R=this.rand;
      p.n++;
      const s={x1:p.lx,y1:p.ly,x2:p.x,y2:p.y,age:0,septum:P.septa&&p.n%3===0,feat:null,fs:R()*TAU};
      if(R()<P.featP&&p.n>2)s.feat=P.feat;
      this.segs.push(s);p.lx=p.x;p.ly=p.y;p.acc=0;
    }

    /* Trichoderma encontrou um patógeno: uma hifa vai até ele e se enrola (micoparasitismo) */
    attack(x,y,color){this.events.push({type:'coil',x,y,col:color||'#ef4444',t:0,life:110,fx:this._nearestEnd(x,y)})}
    /* Arthrobotrys capturou um nematoide na rede adesiva */
    trap(x,y,color){this.events.push({type:'trap',x,y,col:color||'#fb923c',t:0,life:160,fx:this._nearestEnd(x,y),a:this.rand()*TAU})}
    _nearestEnd(x,y){let b=null,bd=1e9;for(const s of this.segs){const d=(s.x2-x)**2+(s.y2-y)**2;if(d<bd){bd=d;b=s}}return b?{x:b.x2,y:b.y2}:{x:this.c.x,y:this.c.y}}

    /* visão de longe: só as hifas e as estruturas coloridas, sem septos nem pontas.
       Em vez de desenhar colônia por colônia, junta os traços de mesma cor de todas as
       colônias e desenha tudo de uma vez no fim do quadro (MyceliumBody.flush). */
    _drawFar(ctx,hs,hue,sat,lit,W,life,al){
      const B=MyceliumBody._batch,q=v=>Math.round(v/15)*15,aq=Math.round((0.4+0.6*al)*4)/4;
      const key='L|'+hs(q(hue),Math.round(sat),Math.round(lit),(0.7*aq).toFixed(2))+'|'+W.toFixed(2);
      let arr=B.get(key);if(!arr){arr=[];B.set(key,arr)}
      for(const s of this.segs){if(s.age>life)continue;arr.push(s.x1,s.y1,s.x2,s.y2)}
      const k=this.kind;let col;
      if(k==='tricho')col='rgba(80,175,80,0.8)';else if(k==='fusa')col='rgba(250,235,245,0.8)';else if(k==='sapro')col='rgba(30,24,22,0.85)';else if(k==='myco')col='rgba(214,150,70,0.8)';else col=hs(q(hue),60,80,0.7);
      const fk=(k==='arthro'?'R|':'D|')+col+'|'+(0.6*this.scale).toFixed(2)+'|'+W.toFixed(2);
      let fa=B.get(fk);if(!fa){fa=[];B.set(fk,fa)}
      for(const s of this.segs){if(!s.feat||s.age<60||s.age>life)continue;fa.push(s.x2,s.y2)}
      for(const A of this.arbs){const ak='D|'+(A.type==='lesion'?'rgba(70,35,20,0.55)':'rgba(250,250,245,0.7)')+'|0.70|0.3';let aa=B.get(ak);if(!aa){aa=[];B.set(ak,aa)}aa.push(A.x,A.y)}
    }
    static flush(ctx){
      const B=MyceliumBody._batch;if(!B.size)return;
      ctx.save();ctx.lineCap='butt';ctx.lineJoin='bevel';ctx.globalAlpha=1;   // pontas retas: muito mais barato com milhares de traços
      for(const [key,a] of B){
        if(!a.length)continue;const parts=key.split('|');
        ctx.beginPath();
        if(parts[0]==='L'){for(let i=0;i<a.length;i+=4){ctx.moveTo(a[i],a[i+1]);ctx.lineTo(a[i+2],a[i+3])}ctx.strokeStyle=parts[1];ctx.lineWidth=+parts[2];ctx.stroke()}
        else{const r=+parts[2];for(let i=0;i<a.length;i+=2){ctx.moveTo(a[i]+r,a[i+1]);ctx.arc(a[i],a[i+1],r,0,TAU)}
          if(parts[0]==='R'){ctx.strokeStyle=parts[1];ctx.lineWidth=+parts[3]*0.9;ctx.stroke()}else{ctx.fillStyle=parts[1];ctx.fill()}}
      }
      B.clear();ctx.restore();
    }

    draw(ctx,g,al,gc){
      const P=this.P,k=this.kind,t=this.t;
      const hs=(h,s,l,a)=>`hsla(${h},${s}%,${l}%,${a})`;
      // Fusarium oxysporum: micélio branco-violáceo
      const hue=k==='fusa'?300:g.hue,sat=k==='myco'?Math.min(g.sat,8):k==='fusa'?32:g.sat*0.55,lit=k==='myco'?88:k==='fusa'?84:Math.min(82,g.lit+18);
      const W=P.width*this.scale,life=P.life;
      const zoom=ctx.getTransform().a/(root.devicePixelRatio||1);
      ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=1;
      if(zoom<3.2){this._drawFar(ctx,hs,hue,sat,lit,W,life,al);ctx.restore();return}
      // hifas em 3 faixas de opacidade (novas, maduras, em autólise)
      const buckets=[[],[],[]];
      for(const s of this.segs){const f=s.age<life*0.5?0:s.age<life?1:2;buckets[f].push(s)}
      const alphas=[0.85,0.6,0.25];
      for(let b=0;b<3;b++){
        if(!buckets[b].length)continue;
        ctx.beginPath();
        for(const s of buckets[b]){ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2)}
        ctx.strokeStyle=hs(hue,sat,lit-(b===2?20:0),alphas[b]*(0.4+0.6*al));
        ctx.lineWidth=W*(b===0?1:b===1?0.9:0.7);ctx.stroke();
      }
      // septos (só fungos septados)
      if(P.septa){
        ctx.beginPath();
        for(const s of this.segs){if(!s.septum||s.age>life)continue;const a=Math.atan2(s.y2-s.y1,s.x2-s.x1)+Math.PI/2,l=W*1.3;
          ctx.moveTo(s.x2+Math.cos(a)*l,s.y2+Math.sin(a)*l);ctx.lineTo(s.x2-Math.cos(a)*l,s.y2-Math.sin(a)*l)}
        ctx.strokeStyle=hs(hue,sat,Math.max(20,lit-35),0.55*al+0.2);ctx.lineWidth=W*0.45;ctx.stroke();
      }
      // estruturas que aparecem no micélio maduro
      for(const s of this.segs){
        if(!s.feat)continue;
        const m=clamp((s.age-25)/70,0,1)*(s.age>life?clamp(1-(s.age-life)/160,0,1):1);
        if(m<=0)continue;
        const a=Math.atan2(s.y2-s.y1,s.x2-s.x1)+(Math.sin(s.fs)>0?1:-1)*1.25;
        if(s.feat==='conid'){            // conidióforo + cabeça de conídios verdes (Trichoderma)
          const L=1.6*this.scale*m,ex=s.x2+Math.cos(a)*L,ey=s.y2+Math.sin(a)*L;
          ctx.strokeStyle=hs(hue,sat,lit,0.7*al);ctx.lineWidth=W*0.8;ctx.beginPath();ctx.moveTo(s.x2,s.y2);ctx.lineTo(ex,ey);ctx.stroke();
          ctx.fillStyle=`rgba(${70},${150+40*m},${70},${0.85*al})`;
          for(let i=0;i<5;i++){const b=s.fs+i*1.26;ctx.beginPath();ctx.arc(ex+Math.cos(b)*0.45*m,ey+Math.sin(b)*0.45*m,0.32*m+0.08,0,TAU);ctx.fill()}
        }else if(s.feat==='spor'){       // esporangióforo + esporângio escuro (Mucor)
          const L=2.2*this.scale*m,ex=s.x2+Math.cos(a)*L,ey=s.y2+Math.sin(a)*L;
          ctx.strokeStyle=hs(hue,sat,lit,0.65*al);ctx.lineWidth=W*0.8;ctx.beginPath();ctx.moveTo(s.x2,s.y2);ctx.lineTo(ex,ey);ctx.stroke();
          ctx.fillStyle=`rgba(40,32,30,${0.9*al})`;ctx.strokeStyle=hs(hue,sat,lit,0.5*al);ctx.lineWidth=0.12;
          ctx.beginPath();ctx.arc(ex,ey,0.75*m+0.1,0,TAU);ctx.fill();ctx.stroke();
        }else if(s.feat==='spore'){      // esporo globoso de FMA, preso à hifa
          // parede espessa e escura, conteúdo lipídico claro — diferente das gotas de exsudato
          const r=(0.55+0.3*Math.sin(s.fs)**2)*this.scale*m,ex=s.x2+Math.cos(a)*(r+W),ey=s.y2+Math.sin(a)*(r+W);
          ctx.fillStyle=`rgba(214,150,70,${0.85*al})`;ctx.strokeStyle=`rgba(95,55,20,${0.95*al})`;ctx.lineWidth=0.28;
          ctx.beginPath();ctx.arc(ex,ey,r,0,TAU);ctx.fill();ctx.stroke();
          ctx.fillStyle=`rgba(255,235,190,${0.55*al})`;ctx.beginPath();ctx.arc(ex,ey,r*0.38,0,TAU);ctx.fill();
        }else if(s.feat==='macro'){      // macroconídio em forma de canoa, com septos (+ microconídios)
          const L=2.4*this.scale*m,mx=s.x2+Math.cos(a)*1.0,my=s.y2+Math.sin(a)*1.0,b=a+Math.PI/2;
          const x0=mx-Math.cos(b)*L/2,y0=my-Math.sin(b)*L/2,x1=mx+Math.cos(b)*L/2,y1=my+Math.sin(b)*L/2;
          const cxq=mx+Math.cos(a)*0.7*m,cyq=my+Math.sin(a)*0.7*m;
          ctx.strokeStyle=`rgba(250,235,245,${0.9*al})`;ctx.lineWidth=0.55*m+0.1;ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(cxq,cyq,x1,y1);ctx.stroke();
          ctx.strokeStyle=`rgba(150,90,140,${0.7*al})`;ctx.lineWidth=0.08;ctx.beginPath();
          for(let i=1;i<5;i++){const u=i/5,qx=(1-u)*(1-u)*x0+2*(1-u)*u*cxq+u*u*x1,qy=(1-u)*(1-u)*y0+2*(1-u)*u*cyq+u*u*y1;ctx.moveTo(qx+Math.cos(a)*0.28,qy+Math.sin(a)*0.28);ctx.lineTo(qx-Math.cos(a)*0.28,qy-Math.sin(a)*0.28)}
          ctx.stroke();
          ctx.fillStyle=`rgba(245,230,240,${0.8*al})`;
          for(let i=0;i<3;i++){const c2=s.fs+i*2.1;ctx.beginPath();ctx.ellipse(s.x2+Math.cos(c2)*0.7,s.y2+Math.sin(c2)*0.7,0.28*m+0.05,0.17*m+0.04,c2,0,TAU);ctx.fill()}
        }else if(s.feat==='trap'){       // alça adesiva da rede (Arthrobotrys)
          const r=0.75*this.scale*m,ex=s.x2+Math.cos(a)*r,ey=s.y2+Math.sin(a)*r;
          ctx.strokeStyle=hs(hue,sat+10,lit-5,0.85*al);ctx.lineWidth=W*0.9;ctx.beginPath();ctx.arc(ex,ey,r,0,TAU);ctx.stroke();
          ctx.fillStyle=hs(hue,60,80,0.18*al);ctx.fill();
        }
      }
      // arbúsculos e vesículas dentro da raiz (micorriza)
      for(const A of this.arbs){
        const age=t-A.t0,m=clamp(age/120,0,1)*clamp((900-age)/200,0,1);if(m<=0)continue;
        if(A.type==='lesion'){         // Fusarium penetrou: tecido escurecido (murcha vascular)
          ctx.fillStyle=`rgba(60,28,16,${0.7*m})`;ctx.beginPath();ctx.ellipse(A.x-A.side*0.6,A.y,1.1*m,2.6*m,0,0,TAU);ctx.fill();
          ctx.strokeStyle=`rgba(90,40,25,${0.55*m})`;ctx.lineWidth=0.35;ctx.beginPath();ctx.moveTo(A.x-A.side*0.6,A.y-2*m);ctx.lineTo(A.x-A.side*0.6,A.y-7*m);ctx.moveTo(A.x-A.side*0.6,A.y+2*m);ctx.lineTo(A.x-A.side*0.6,A.y+7*m);ctx.stroke();   // escurecimento subindo pelo xilema
          ctx.strokeStyle=`rgba(245,225,240,${0.8*m})`;ctx.lineWidth=0.18;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(A.x-A.side*1.2,A.y+0.4);ctx.lineTo(A.x-A.side*1.4,A.y+2.2*m);ctx.stroke();
          continue;
        }
        const sd=prng(Math.floor(A.seed*1e9));
        ctx.strokeStyle=`rgba(250,250,245,${0.85*m})`;ctx.lineWidth=0.14;
        const branch=(x,y,a,l,d)=>{const ex=x+Math.cos(a)*l,ey=y+Math.sin(a)*l;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();
          if(d>0){branch(ex,ey,a-0.5-sd()*0.2,l*0.68,d-1);branch(ex,ey,a+0.5+sd()*0.2,l*0.68,d-1)}};
        branch(A.x,A.y,A.side>0?0:Math.PI,1.1*m,3);
        ctx.fillStyle=`rgba(240,236,220,${0.5*m})`;ctx.beginPath();ctx.ellipse(A.x+A.side*0.4,A.y+1.6,0.45*m,0.8*m,0,0,TAU);ctx.fill();
      }
      // pontas em crescimento (Spitzenkörper)
      ctx.fillStyle=`rgba(255,255,255,${0.75*al})`;
      ctx.beginPath();for(const p of this.tips){if(p.idle>0)continue;ctx.moveTo(p.x+W*0.9,p.y);ctx.arc(p.x,p.y,W*0.9,0,TAU)}ctx.fill();
      // interações
      for(const e of this.events){
        const f=e.t/e.life,reach=clamp(e.t/18,0,1);
        const hx=e.fx.x+(e.x-e.fx.x)*reach,hy=e.fx.y+(e.y-e.fx.y)*reach;
        ctx.strokeStyle=hs(hue,sat,lit,0.85*al);ctx.lineWidth=W;ctx.beginPath();ctx.moveTo(e.fx.x,e.fx.y);ctx.lineTo(hx,hy);ctx.stroke();
        if(e.type==='coil'){
          const fade=1-clamp((f-0.55)/0.45,0,1);
          ctx.globalAlpha=0.9*fade;ctx.strokeStyle=e.col;ctx.lineWidth=0.7;ctx.beginPath();ctx.moveTo(e.x-1,e.y-0.3);ctx.lineTo(e.x+1,e.y+0.3);ctx.stroke();
          ctx.globalAlpha=1;
          if(reach>=1){const turns=clamp((e.t-18)/40,0,1)*3;ctx.strokeStyle=hs(hue,sat,lit,0.9*al*(1-clamp((f-0.8)/0.2,0,1)));ctx.lineWidth=W*0.8;ctx.beginPath();
            for(let i=0;i<=24*turns;i++){const u=i/24*TAU,px=e.x-1+i/(24*3)*2,py=e.y+Math.sin(u)*0.55;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}
        }else{
          const fade=1-clamp((f-0.6)/0.4,0,1),wig=Math.sin(e.t*0.5)*(1-f)*0.6;
          ctx.globalAlpha=0.9*fade;ctx.strokeStyle=e.col;ctx.lineWidth=0.6;ctx.beginPath();
          for(let i=0;i<=10;i++){const u=i/10,px=e.x+Math.cos(e.a)*(u-0.5)*5,py=e.y+Math.sin(e.a)*(u-0.5)*5;const o=Math.sin(u*TAU+e.t*0.3)*wig;i?ctx.lineTo(px-Math.sin(e.a)*o,py+Math.cos(e.a)*o):ctx.moveTo(px,py)}ctx.stroke();
          ctx.globalAlpha=1;ctx.strokeStyle=hs(hue,sat+10,lit-5,0.9*al);ctx.lineWidth=W;ctx.beginPath();ctx.arc(e.x,e.y,0.9*this.scale,0,TAU);ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  MyceliumBody._batch=new Map();
  MyceliumBody.KINDS=KINDS;
  root.MyceliumBody=MyceliumBody;
})(typeof window!=='undefined'?window:globalThis);
