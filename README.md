# RizoSim Escolas

Versão escolar do RizoSim para exploração da rizosfera do feijão em tablets, projetores e computadores. A aplicação preserva o motor de simulação do repositório original e muda principalmente a interface, a linguagem, a progressão pedagógica e a forma de observar os acontecimentos.

## Como abrir

Abra `index.html` em um navegador moderno. A aplicação é estática, funciona offline e não usa dependências remotas.

Para executar as verificações de regressão no navegador, abra `tests/regression.html` e clique em **Executar testes**.

## O que foi preservado

- 13 guildas do simulador original.
- Movimento em canvas com física Verlet.
- Grade espacial de nutrientes e difusão.
- Absorção radicular, crescimento da planta e Lei de Liebig.
- Nodulação por rizóbio.
- Micorrização e exploração relacionada ao fósforo.
- Competição, predação, herbivoria, patógenos e decomposição.
- Exsudatos, detritos, reciclagem e sinais da planta.
- Controles técnicos no modo professor.

## O que mudou

- A tela inicial agora é infantil/escolar.
- Os valores técnicos aparecem como cinco indicadores visuais.
- Organismos são escolhidos por cartões e categorias.
- Eventos técnicos são traduzidos para mensagens curtas.
- Há tutorial guiado, cenários didáticos e explicações ao selecionar organismos.
- O modo professor mantém sliders, estoques químicos, estatísticas e mapas.
- Todos os organismos ganharam corpo mais fiel à biologia: a ameba (pseudópodes e fagocitose), os fungos (micélio que cresce pela ponta, tropismo pela raiz, *Fusarium*), as bactérias (células rígidas com flagelos, divisão, endósporo, bacteroides), as cianobactérias (tricomas com heterocistos) e os nematoides (ondulação, estilete). É só a camada visual: a simulação continua idêntica, número a número (ver `ORGANISMOS_VISUAIS.md`).

## Estrutura

```text
index.html
css/styles.css
js/ameba-lite.js
js/micelio-lite.js
js/bacteria-lite.js
js/nematoide-lite.js
js/skins.js
js/engine.js
js/organisms.js
js/environment.js
js/plant.js
js/ui-child.js
js/ui-teacher.js
js/tutorial.js
tests/regression.html
tests/regression.js
```

`js/engine.js` contém o motor extraído do RizoSim original e uma pequena API de acesso para UI/testes. Os demais arquivos organizam a camada escolar.


## Celular e tablet: modo tela cheia

Em telas estreitas (até 900 px) ou baixas com toque (celular deitado), a simulação ocupa a tela inteira e o resto vira um menu de pausa, como em um jogo (`js/ui-game.js`):

- **☰** pausa e abre o menu: Organismos (observar/adicionar), Feijão (indicadores), Acontecimentos, Professor (mapas, solo, provocar, gráficos) e Mais (cenários, reiniciar, ajuda, tela cheia). **Continuar ▶** fecha e retoma.
- **⏸/▶** e **1x/2x/Aula** ficam sempre visíveis; o último acontecimento aparece numa faixa embaixo (tocar abre a explicação).
- Ao "Adicionar", o menu fecha e cada toque no solo coloca o organismo; **Concluir** encerra.
- "Ver como página" (em Mais) volta ao layout antigo naquele aparelho; um botão "⛶ Tela cheia" desfaz a escolha.
- No computador nada muda. Para testar no computador: `index.html?modo=jogo`; para forçar a página: `?modo=pagina`.
