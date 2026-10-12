# Organismos com corpo novo

Todos os organismos da rizosfera ganharam um corpo desenhado mais fiel à biologia: ameba, fungos, bactérias, cianobactérias e nematoides. O motor continua calculando tudo com o corpo original: os ossos Verlet seguem existindo, invisíveis, e fazem a física. O corpo novo é só uma **camada visual** (skin) atualizada depois de cada passo e desenhada no lugar do esqueleto.

## Garantia de que a simulação não mudou

As skins não alteram posição, energia nem nenhuma variável do motor. Também não consomem números do `Math.random`: a semente de cada skin vem do genoma e da posição de nascimento. Por isso a simulação com skins é **idêntica, número a número**, à original.

Isso foi conferido com o mesmo gerador aleatório nas duas versões. Em 8 sementes, até 6000 passos, população, mortes, posições, energia, biomassa da planta e NH4+ do solo saíram iguais.

| Para desligar as skins | Como |
|---|---|
| Pela URL | `?skins=0` |
| Pelo console | `RizoSkins.enabled = false` e reiniciar |

## Protozoário → ameba (`js/ameba-lite.js`)

- **Pseudópodes:** crescem na direção para onde o organismo está indo. Competem entre si, se ramificam e recolhem.
- **Área conservada:** o citoplasma que entra num braço sai do corpo.
- **Avanço aos pulsos:** o centro visual flui para dentro do pseudópode que cresce e para enquanto outro se forma. O atraso em relação ao corpo do motor é de no máximo ~0,8 raio.
- **Interior:** endoplasma granuloso com fluxo em fonte, núcleo vesicular com nucléolo e vacúolo contrátil no uroide.
- **Fagocitose:** quando o motor registra a predação, um pseudópode alcança a presa e a leva para um vacúolo digestivo, que some aos poucos.

Os morfotipos vêm do gene `nd`, que já existe e muta:

| nd | Forma | Exemplos |
|---|---|---|
| ≤ 3 | limax | Vahlkampfia, Naegleria |
| 4–7 | lobosa ramificada | Amoeba, Chaos |
| ≥ 8 | acantopódios | Acanthamoeba |

## Flagelados e ciliados (`js/protista-lite.js`)

O grupo Protozoário tem três tipos, definidos pelo genoma (`protoKind` no motor: gene `mt` 4 = ameba; `mt` 5 com `nd` par = ciliado; o resto, flagelado — cerca de metade, porque no solo os flagelados são os mais numerosos). O tipo é herdado e muda raramente por mutação.

| Tipo | Corpo | Nado | Ecologia no motor |
|---|---|---|---|
| Ameba | pseudópodes (acima) | rasteja | pasta no biofilme da raiz (bactérias ali escapam de 75% dos ataques), come também fungos, encista abaixo de 30% de umidade |
| Flagelado euglenoide (tipo *Peranema*) | fuso flexível (metabolia), flagelo grosso para a frente batendo só a ponta, reservatório e vacúolo contrátil, grãos de paramido | desliza devagar, curvas largas | só bactérias soltas (no biofilme escapam de 95%), digere em 60% do tempo e aproveita 75% da energia, encista abaixo de 35% |
| Ciliado (tipo *Colpoda*) | rim com sulco oral, cílios em onda metacrônica, macronúcleo, vacúolo contrátil, vacúolos digestivos em ciclose | rápido, girando no eixo; recua e muda de rumo ao "esbarrar" (reação de evitação) | só bactérias soltas (95% no biofilme), digestão em 80% do tempo, encista abaixo de 45% |

Todos viram cisto de parede grossa na seca ou com fome prolongada, gastam 10% da energia e voltam quando a umidade sobe.

## Fungos → micélio (`js/micelio-lite.js`)

Regras comuns às quatro guildas:

- **Crescimento apical:** a hifa cresce pela ponta (ponto claro = Spitzenkörper) e ramifica atrás dela.
- **Micélio séssil:** a colônia avança crescendo de um lado. Do outro, as hifas velhas sofrem autólise e somem.
- **Ritmo:** parada, cresce devagar; quando o corpo do motor se desloca, as pontas aceleram para acompanhar.

| Guilda | Hifas | Estruturas |
|---|---|---|
| Trichoderma | septadas | conidióforos com conídios verdes; ao atacar um patógeno, a hifa vai até ele e se enrola (micoparasitismo) |
| Saprófito | cenocíticas (tipo Mucor) | esporângios escuros |
| Micorriza | grossas, brancas, cenocíticas (Glomeromycota) | esporos de parede espessa; perto da raiz, uma hifa entra nela e forma arbúsculos e vesículas |
| Arthrobotrys | septadas | alças adesivas; ao capturar, o nematoide se debate preso na alça |
| Patógeno (parte dele) | septadas, branco-violáceas (tipo *Fusarium oxysporum*) | macroconídios em forma de canoa com septos e microconídios; uma hifa penetra a raiz e o tecido escurece, com a mancha subindo pelo xilema (murcha vascular) |

**Tropismo pela raiz:**
- **Micorriza:** perto da raiz, as hifas ramificam mais e se orientam para ela, como a resposta às estrigolactonas ([Akiyama et al. 2005](https://www.doi.org/10.1038/NATURE03608); [Sbrana & Giovannetti 2005](https://link.springer.com/doi/10.1007/s00572-005-0362-5)).
- ***Fusarium*:** as hifas são atraídas de mais longe, como pelas peroxidases da raiz ([Turrà et al. 2015](https://doi.org/10.1038/nature15516)).
- ***Trichoderma*:** tropismo mais fraco; a hifa para na superfície e coloniza a epiderme e o córtex externo (endofítico), com enrolamentos na superfície.
- **Os três:** quando a colônia chega a ~35 px da raiz, uma hifa vai até ela e entra.

**Quais patógenos aparecem como *Fusarium*:** os de morfologia ramificada ou tentacular (genes `mt` 2 ou 4), cerca de um terço. É só aparência: a guilda continua a mesma do motor, com as mesmas regras.

Com zoom pequeno, o desenho simplifica: some septos e pontas e ficam as hifas e as estruturas coloridas. De longe, as hifas de todas as colônias são desenhadas juntas, num só traço por cor, para economizar processamento.

## Bactérias (`js/bacteria-lite.js`)

A bactéria é uma célula rígida, que **não ondula como um verme**: é empurrada pelos flagelos, que giram.

- **Nado próprio, preso ao motor:** como o micélio, o desenho tem movimento próprio, preso por uma "coleira" (~10 px) à posição que o motor calcula. A posição desenhada é a do motor somada ao nado da célula, então ela acompanha para onde o motor leva o organismo, nunca para e só muda de direção enquanto anda (não gira no lugar).
- **Corre e cambalhota:** corridas quase retas de ~1–2 s. Correndo, os flagelos ficam num feixe atrás da célula.
  - Peritríquias (Bacillus, rizóbio, patógeno): cambalhota curta, com os flagelos abertos, e novo rumo de ~70° ao acaso.
  - Flagelo polar ou tufo (Pseudomonas, Azospirillum, Methylobacterium): freiam, dão ré sem virar o corpo e depois viram ~90° ("flick").
  - Corridas de volta para a posição do motor duram mais, como na quimiotaxia.
- **Velocidade:** vem do gene de propulsão (`thr`) e do grupo, então cada indivíduo nada num ritmo. Em média, o desenho anda o que o motor anda.
- **Divisão binária:** perto de se reproduzir, a célula alonga e estrangula no meio.

| Guilda | Forma | Flagelos | Detalhe |
|---|---|---|---|
| Pseudomonas | bacilo reto | tufo polar | — |
| Bacillus | bacilo grande | peritríquios | com pouca energia forma endósporo refringente |
| Azospirillum | bastonete curvo (vibrioide) | um polar | — |
| Methylobacterium | bacilo rosa | polar | grânulos de PHB |
| Rizóbio | bacilo | peritríquios | dentro do nódulo vira bacteroide (forma em Y, sem flagelos); o nódulo é desenhado colado na superfície da raiz, com os bacteroides dentro |
| Patógeno | bacilo | peritríquios | os que não aparecem como *Fusarium* |
| Cianobactéria | tricoma (fila de células, tipo *Anabaena*/*Nostoc*) que desliza pelo próprio caminho | — | heterocistos a cada ~9 células |

## Nematoide (`js/nematoide-lite.js`)

- **Movimento:** a cabeça desenhada nada sozinha, sempre para frente, presa por uma "coleira" (~16 px) à cabeça do corpo do motor. Nunca para, nunca anda de ré e não gira no lugar: faz curvas enquanto avança, com raio mínimo proporcional ao corpo. Quando o motor o mantém no lugar, ele serpenteia por perto. Na raiz, desacelera e o estilete bombeia.
- **Corpo:** do corpo do motor só se usam a posição da cabeça e a direção. O desenho é uma onda senoidal que corre ao longo do corpo, com fase dada pela distância percorrida: o corpo passa pelos pontos por onde a cabeça passou, como na locomoção ondulatória real.
- **Anatomia:** cutícula com anelação, esôfago com bulbo mediano, intestino granuloso e cauda afilada.
- **Estilete:** fica na cabeça e se projeta, com o bulbo bombeando, quando o nematoide está se alimentando na raiz.

**Câmera, clique e efeitos:** como bactérias e nematoide nadam em volta da posição do motor, o "Observar", o clique para selecionar, o anel de seleção e os efeitos de predação, biocontrole e captura usam a posição desenhada.

## Arquivos

- `js/ameba-lite.js`, `js/micelio-lite.js`, `js/bacteria-lite.js`, `js/nematoide-lite.js`: os corpos.
- `js/skins.js`: liga cada guilda ao seu corpo.
- `js/engine.js`:
  - cria a skin no nascimento;
  - atualiza a skin depois da física;
  - desenha a skin no lugar do esqueleto;
  - avisa a skin dos eventos de predação, biocontrole e captura.
- `js/organisms.js`, `js/ui-child.js`, `css/styles.css`: textos dos cartões, frases de observação e ícone.
- `tests/regression.js`: testes da ameba e do micélio.

## Custo

Com a população máxima (280 organismos, todos com corpo novo), as skins acrescentam cerca de 1 ms por passo e 2 ms por quadro em um computador comum. Para desligar, use `?skins=0`.
