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
| 8 | Protozoário (ameba) | Predação de bactérias/fungos por fagocitose — ver `AMEBAS.md` |
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

