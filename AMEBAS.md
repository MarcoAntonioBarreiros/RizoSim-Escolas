# Protozoário ameboide

O protozoário (guilda 8) deixou de ser desenhado como planária, cefalópode ou artrópode e passou a ser uma **ameba**. O corpo vem de uma versão simplificada do modelo [Ameba Sol-Gel](https://github.com/MarcoAntonioBarreiros/amebasim). Ela foi feita para rodar dezenas de organismos ao mesmo tempo.

## O que mudou

- **Corpo:** a membrana tem 48 pontos em volta do centro do organismo. Os pseudópodes são braços que crescem, tateiam, se ramificam e recolhem. O citoplasma que entra nos braços sai do corpo, porque a área é conservada. A membrana fica aderida ao substrato, então o uroide fica para trás quando a célula avança.
- **Fagocitose:** quando o motor decide que uma bactéria ou fungo foi comido, um pseudópode vai até a presa. A presa então é levada para dentro e vira um vacúolo digestivo, que some aos poucos.
- **Interior:** a célula tem endoplasma granuloso que escorre para o pseudópode em crescimento (fluxo em fonte). Tem também núcleo vesicular com nucléolo, vacúolo contrátil pulsando no uroide e capuz hialino nas pontas.
- **Morfotipos:** são escolhidos pelo gene `nd`, que já existe no genoma e muta ±1, de modo que a forma também evolui.

| nd | Forma | Exemplos reais |
|---|---|---|
| 3 | limax: um lobo frontal largo, corpo alongado, bolhas laterais | Vahlkampfia, Naegleria |
| 4–7 | lobosa: lobopódios que se ramificam | Amoeba, Chaos |
| 8 | acantopódios: lobo hialino com espículas finas | Acanthamoeba |

## O que não mudou

Continuam iguais as decisões ecológicas do protozoário:

- para onde vai (quimiotaxia pelas presas);
- o que come e com que taxa (predação frequência-dependente);
- quanta energia ganha e gasta;
- quando se reproduz e quando morre;
- a predação por nematoides.

O corpo apenas acompanha o ponto central que o motor move.

Trocar o corpo mexia em duas coisas que afetam a ecologia. As duas foram compensadas:

1. **Custo de manutenção.** O motor cobra energia por ponto do corpo. O ameboide paga o número médio de pontos que as três morfologias antigas teriam com o mesmo gene `nd` (`amoCostPts`).
2. **Velocidade.** O corpo antigo arrastava ossos e patas; o ameboide é um ponto só. Por isso recebe:
   - o fator de impulso médio das formas antigas (`AMO_SPD = 1,133`);
   - um atrito equivalente (`AMO_FRIC = 0,76`);
   - um fator na caça (`AMO_HUNT = 0,62`), porque a cadeia de ossos impedia o corpo antigo de acelerar ao perseguir presas.

   O fator de impulso varia em pulsos (`drive`, média ~1). A célula avança quando um pseudópode alinhado ao alvo cresce.

## Arquivos

- `js/ameba-lite.js`: classe `AmoebaBody` (forma, pseudópodes, fagocitose, desenho).
- `js/engine.js`: nova morfologia `mt = 6` para a guilda 8, custo e atrito equivalentes, e chamada de `engulf()` na predação.
- `js/organisms.js`, `css/styles.css`: texto do cartão e ícone.
- `tests/regression.js`: novo teste do protozoário ameboide.
