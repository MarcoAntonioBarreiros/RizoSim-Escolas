# Como Funciona a Simulação

Este documento resume as regras preservadas do motor original.

## Estado principal

- **Ambiente**: tipo de solo, temperatura, pH, umidade, toxicidade, luz, UV, viscosidade e retenção de nutrientes.
- **Solo**: grade 2D com carbono orgânico, NH4+, NO3-, fósforo livre, fósforo ligado, Fe3+, Fe2+ e O2.
- **Planta**: biomassa, nitrogênio, fósforo, ferro, AIA, estresse, nódulos e sinais químicos.
- **Organismos**: indivíduos com guilda, morfologia, energia, movimento, geração e investimentos funcionais.

## Guildas

| ID | Organismo | Função preservada |
|---:|---|---|
| 0 | Pseudomonas | Sideróforos, Fe3+ para Fe2+ |
| 1 | Bacillus | Solubilização de fosfato |
| 2 | Azospirillum | Fixação de N2 e AIA |
| 3 | Methylobacterium | AIA e mixotrofia |
| 4 | Trichoderma | Biocontrole de patógenos |
| 5 | Rhizobium | Nodulação e N |
| 6 | Patógeno | Estresse e dano oportunista |
| 7 | Cianobactéria | Luz, O2, carbono e N |
| 8 | Protozoário (ameba) | Predação de bactérias/fungos por fagocitose — ver `ORGANISMOS_VISUAIS.md` |
| 9 | Nematoide | Herbivoria radicular e predação oportunista |
| 10 | Saprófito | Decomposição de carbono orgânico |
| 11 | Micorriza | Hifas e fósforo |
| 12 | Arthrobotrys | Captura de nematoides |

## Ciclo de atualização

1. A grade do solo atualiza processos abióticos: nitrificação, oxidação de ferro, mineralização, lixiviação, dessorção de fósforo, pH e oxigênio.
2. Nutrientes difundem pela grade com mobilidades diferentes.
3. A planta absorve nutrientes nas células com presença radicular.
4. O crescimento segue uma limitação tipo Lei de Liebig por N, P e Fe.
5. A planta emite sinais: flavonoides quando N está baixo, ácidos orgânicos quando P está baixo e sinal de defesa sob estresse/patógenos.
6. Exsudatos e detritos aparecem e se difundem.
7. Organismos se movem, consomem energia, respondem a sinais, interagem e podem reproduzir, morrer ou reciclar nutrientes.
8. O canvas redesenha planta, raízes, nódulos, hifas, organismos, exsudatos e partículas.

## O que a versão escolar adiciona

A versão escolar não substitui esse ciclo por resultados fixos. Ela apenas traduz estado e eventos para uma interface apropriada para crianças e mantém os detalhes no modo professor.


## Regras ecológicas acrescentadas (branch `ecologia-v2`)

Antes, a população tinha só um teto total (280) e quem se reproduzia mais rápido o ocupava, quase sempre os saprófitos. Agora:

| Regra | Valor | Por quê |
|---|---|---|
| Capacidade por tipo | bactérias 45%, fungos 30%, protozoários 10%, nematoides 5% da população máxima | pirâmide trófica: muitos decompositores e bactérias, poucos predadores; a chance de nascer cai à medida que o tipo enche (logística) |
| Espaço máx. de um grupo dentro do tipo | bactérias 30%, fungos 50% | vários grupos convivem |
| Saprófitos | sem bônus de exsudato; perto da raiz perdem carbono para as bactérias vizinhas; colônia nova só com menos de 3 vizinhas | exsudato é recurso de bactérias; limita o número de colônias sem enfraquecer cada uma |
| Bactérias benéficas | dividem-se com 55% da energia dos outros grupos | ciclo mais curto da rizosfera |
| Protozoário | 150 passos de digestão entre presas | fagocitose e digestão no vacúolo |
| Refúgio no rizoplano | bactérias a até 6 px da raiz escapam de 75% dos encontros com protozoários | biofilme protege da predação |
| Nematoide | ciclo de reprodução 4× mais longo | gerações de dias, não de horas |
| Trichoderma e Arthrobotrys | também decompõem matéria orgânica (40% e 20% do saprófito) | são saprófitos que usam o parasitismo como fonte extra |
| Encistamento da ameba | umidade < 30% ou fome prolongada: vira cisto (parede dupla), não se move nem come, gasta 10% da energia; desencista quando a umidade volta | sobrevivência à seca |
| Defesa da Pseudomonas | escapa de 60% dos ataques de protozoários; quando comida, rende 40% da energia | metabólitos tóxicos a protozoários (HCN, lipopeptídeos) |
| Rizóbio livre | come exsudatos e ganha o bônus da rizosfera como as outras bactérias; custo 1,4 (antes 2,8 e sem comida: sumia em ~30 s) | rizóbios vivem como saprófitos na rizosfera antes de nodular |
| Nodulação | probabilidade por passo 0,3% (N baixo), 0,1% (N médio), 0,03% (N alto); máx. 3 a 12 nódulos conforme o tamanho da planta; bacteroides no nódulo não são predados | a infecção leva tempo e a planta autorregula a nodulação |
| Proteção contra o patógeno | competição por sítio: cada benéfica vizinha reduz o ataque (fator 0,18); antibiose = Bacillus + 0,6×Pseudomonas vizinhos: a partir de 1 é bacteriostática (o patógeno não cresce nem se divide), a partir de 3 é bactericida (perde 12 de energia por passo) | o patógeno ataca a planta saudável; com benéficas a doença diminui, com muitas ela é eliminada |
| Patógeno bacteriano | divide-se no ciclo rápido das bactérias e come exsudatos na rizosfera | patógenos de solo colonizam a rizosfera antes de atacar |
| Sinergia nematoide–patógeno | o dano dos nematoides abre feridas na raiz (cicatrizam em ~10 s em 1x); perto da raiz ferida o ataque do patógeno chega a 2,5× e a antibiose rende proporcionalmente menos | complexo *Meloidogyne*–*Fusarium*: feridas são porta de entrada |
| Água e temperatura na planta | o crescimento é multiplicado pelo menor entre o conforto hídrico (curva do indicador "Água") e o térmico (ótimo 20–30 °C); seca (<30%), encharcamento (>85%), calor (>33 °C) e frio (<13 °C) geram estresse e travam a recuperação; abaixo de 45% de conforto a planta murcha (perde biomassa) | antes só N, P e Fe limitavam o crescimento e um veranico quase não aparecia |
| Triângulo da doença | umidade > 80% soma 0,6 e temperatura > 32 °C soma 0,4 ao fator ambiental, que aumenta o ataque e divide a antibiose | encharcamento e calor favorecem surtos |

## Clima em cada grupo de organismos

Na faixa de conforto de cada grupo nada muda em relação ao modelo anterior (a 25 °C e 60% de umidade a simulação é idêntica, conferido passo a passo). Fora dela:

| Condição | O que acontece | Quem sente mais | Quem tolera |
|---|---|---|---|
| Calor (acima de T ótima + tolerância) | atividade (comer, funções, caçar) cai até 20%; o custo continua subindo como antes | Pseudomonas, rizóbio, micorriza, Trichoderma, protozoários | Bacillus (até 40 °C), patógeno, Azospirillum, cianobactérias, nematoides |
| Frio (abaixo de 20 °C) | tudo desacelera pelo Q10 ≈ 2 (gasto, alimentação, caça, nado); abaixo da faixa do grupo, desacelera mais | Bacillus, Azospirillum, Methylobacterium, cianobactérias | Pseudomonas, saprófitos |
| Seca (< 40%) | bactérias e protozoários perdem atividade (até 55%), nematoides mais (até 25%); custo extra até +50%; nado mais lento; protozoários encistam | nematoides, bactérias | fungos (as hifas cruzam os poros com ar: sentem 30% da viscosidade), cianobactérias da crosta |
| Pouco O₂ na célula (< 25) | aeróbios perdem atividade conforme a sensibilidade ao O₂ (cada organismo usa o O₂ da célula onde está); custo extra até +120% | fungos, nematoides, rizóbio, Methylobacterium | Azospirillum (microaeróbio), patógeno, cianobactérias |
| Desnitrificação (O₂ < 20 na célula) | o NO₃ do solo vira gás, mais rápido quanto menos O₂ e mais C orgânico | — | — |

Faixas (T ótima − tolerância ao frio … T ótima + tolerância ao calor): Pseudomonas 10–30 °C, Bacillus 22–40, Azospirillum 20–35, Methylobacterium 20–34, Trichoderma 13–31, rizóbio 16–30, patógeno 15–37, cianobactéria 20–36, protozoário 13–31, nematoide 17–34, saprófito 13–34, micorriza 14–30, Arthrobotrys 13–31.

O O₂ depende da umidade, do solo, da profundidade e de quem respira por perto (ver abaixo). Por isso o mesmo encharcamento é forte no argiloso, moderado no franco e quase nulo no arenoso.

Organismos fora da faixa ficam mais pálidos. Quando o solo fica quente (≥ 32 °C), frio (≤ 15 °C), seco (< 35%) ou encharcado (> 82%) por alguns segundos, o selo sobre o solo e "O que está acontecendo?" dizem quais grupos presentes estão com dificuldade e quais toleram.

Medido (4 sementes, 40 s de condição, comunidade com benéficas inoculadas, soma das populações; controle → condição): calor 36 °C: Pseudomonas 71 → 16, rizóbio 91 → 14, Bacillus 65 → 152 (os protozoários, sensíveis, caçam menos); seca 22%: fungos estáveis, protozoários encistam; franco encharcado: NO₃ 18 → 6, Azospirillum 31 → 79; argiloso encharcado: rizóbio 94 → 42, Arthrobotrys 77 → 38, micorriza 11 → 4, Azospirillum 51 → 98, NO₃ 45 → 3.

## Oxigênio e nitrato com gradiente

Antes o O₂ era recalculado igual em todo o solo a cada passo, e o nitrato se espalhava rápido demais (difusão 0,22): os dois mapas ficavam homogêneos.

- **O₂**: cada célula tende a um perfil que entra pela superfície e cai com a profundidade (queda maior com poros cheios de água: 6 no franco a 60%, ~10 no argiloso, ~13 no franco encharcado; a difusão do gás também cai com a água). Sobre isso, o O₂ é consumido onde há respiração: cada aeróbio (fungos e nematoides mais que bactérias), a raiz e, sobretudo, os saprófitos decompondo (25 saprófitos juntos levam a célula de ~40 para ~21: hipóxia local). As cianobactérias produzem O₂ na superfície (fotossíntese), que fica mais oxigenada onde elas estão.
- **Nitrato**: a nitrificação precisa de O₂; a lixiviação leva o nitrato para baixo camada por camada (mais no arenoso e no solo úmido) e o que passa da última camada se perde; a difusão lateral é lenta (0,05), então aparece a zona de depleção perto da raiz; nos pontos sem O₂ ele é desnitrificado. No franco a 60% o nitrato aumenta com a profundidade (de ~7 na superfície a ~19 no fundo): a raiz absorve em cima e a água leva o resto para baixo, para fora do alcance da raiz.
- O mapa de calor agora é desenhado suavizado (cada célula da grade é um ponto de uma imagem ampliada), mostrando o gradiente contínuo.

## Tipo de solo

| | Arenoso | Franco | Argiloso | Por quê |
|---|---|---|---|---|
| Lixiviação do nitrato | 0,002 | 0,0008 | 0,0003 | poros grandes, água desce rápido |
| Amônio também lixivia | 30% da taxa do nitrato | não | não | baixa capacidade de troca de cátions |
| Fosfato livre no equilíbrio | 60% do preso | 40% | 20% | argila e óxidos de Fe/Al fixam fosfato: Bacillus e micorriza valem mais no argiloso |
| Bactérias escondidas em poros pequenos | — | — | escapam de 30% dos protozoários | exclusão por tamanho de poro |
| Decomposição da matéria orgânica | ×1,25 | ×1 | ×0,75 | argila protege a matéria orgânica |
| O₂ | +15 | 0 | −10 | arejamento |
| Veranico | seca 1,8× mais rápido e mais fundo | — | seca 2× mais devagar e menos | retenção de água |
| Chuva forte | quase não encharca e drena rápido | — | encharca mais e por 1,5× mais tempo | drenagem |

O multiplicador direto do crescimento da planta (arenoso 0,6, argiloso 1,3) foi retirado: a diferença entre os solos agora vem desses mecanismos. Medido (5 sementes, média aos 150 s, 25 °C e 60%): planta no arenoso 113, franco 127, argiloso 146; fósforo na planta menor no argiloso; amônio menor no arenoso; nitrato retido no argiloso.

## Imprevistos naturais (`js/imprevistos.js`)

- Ao escolher um cenário ou reiniciar, temperatura, pH, umidade, nutrientes, C orgânico, ferro e luz são sorteados em torno dos valores do cenário. O que caracteriza o cenário varia pouco.
- Com a simulação rodando, a cada ~2 a 3,5 min (em 1x; o primeiro só depois de ~2 min, para a comunidade se formar) pode acontecer (seca e chuva forte são os mais comuns): veranico, chuva forte (encharcamento), onda de calor, frente fria, chegada de patógenos ou de nematoides. O clima muda aos poucos e volta ao que era. Cada acontecimento aparece em "O que está acontecendo?".
- No modo professor, a barra do topo tem "Provocar" (veranico, chuva forte, calor, frio, patógenos, nematoides) e a caixa "Imprevistos naturais" para desligar os espontâneos. O acontecimento em curso aparece num selo sobre o solo.
- Reiniciar mantém o tipo de solo e os controles que o professor mexeu à mão.
- A recuperação do estresse da planta é mais lenta com patógenos e nematoides na raiz e mais rápida com bactérias benéficas e micorriza colonizando a raiz.
