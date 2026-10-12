# Organismos com corpo novo (amebas e fungos)

O protozoário e as quatro guildas de fungos ganharam um corpo desenhado mais fiel à biologia. O motor continua calculando tudo com o corpo original: os ossos Verlet seguem existindo, invisíveis, e fazem a física. O corpo novo é só uma **camada visual** (skin) atualizada depois de cada passo e desenhada no lugar do esqueleto.

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
- **Os dois:** quando a colônia chega a ~35 px da raiz, uma hifa vai até ela e entra.

**Quais patógenos aparecem como *Fusarium*:** os de morfologia ramificada ou tentacular (genes `mt` 2 ou 4), cerca de um terço. É só aparência: a guilda continua a mesma do motor, com as mesmas regras.

Com zoom pequeno, o desenho simplifica: some septos e pontas e ficam as hifas e as estruturas coloridas.

## Arquivos

- `js/ameba-lite.js`, `js/micelio-lite.js`: os corpos.
- `js/skins.js`: liga cada guilda ao seu corpo.
- `js/engine.js`:
  - cria a skin no nascimento;
  - atualiza a skin depois da física;
  - desenha a skin no lugar do esqueleto;
  - avisa a skin dos eventos de predação, biocontrole e captura.
- `js/organisms.js`, `js/ui-child.js`, `css/styles.css`: textos dos cartões, frases de observação e ícone.
- `tests/regression.js`: testes da ameba e do micélio.

## Custo

Com a população máxima (280 organismos), as skins acrescentam cerca de 1 ms por passo e 2 ms por quadro em um computador comum.
