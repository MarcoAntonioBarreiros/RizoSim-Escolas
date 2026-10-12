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
| Triângulo da doença | umidade > 80% soma 0,6 e temperatura > 32 °C soma 0,4 ao fator ambiental, que aumenta o ataque e divide a antibiose | encharcamento e calor favorecem surtos |

## Imprevistos naturais (`js/imprevistos.js`)

- Ao escolher um cenário ou reiniciar, temperatura, pH, umidade, nutrientes, C orgânico, ferro e luz são sorteados em torno dos valores do cenário. O que caracteriza o cenário varia pouco.
- Com a simulação rodando, a cada ~1–2,5 min (em 1x) pode acontecer: veranico, chuva forte (encharcamento), onda de calor, frente fria, chegada de patógenos ou de nematoides. O clima muda aos poucos e volta ao que era. Cada acontecimento aparece em "O que está acontecendo?".
- O professor desliga em "Imprevistos naturais" no painel do modo professor.
