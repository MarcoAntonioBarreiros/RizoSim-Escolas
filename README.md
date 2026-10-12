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
- O protozoário agora é uma ameba (pseudópodes, fagocitose, três morfotipos do solo) e os fungos são micélios que crescem pela ponta, cada um com suas estruturas. É só a camada visual: a simulação continua idêntica, número a número (ver `ORGANISMOS_VISUAIS.md`).

## Estrutura

```text
index.html
css/styles.css
js/ameba-lite.js
js/micelio-lite.js
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

