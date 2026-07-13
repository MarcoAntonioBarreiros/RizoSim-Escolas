# Relatório de Implementação

Data: 2026-07-13

## Repositório original

O repositório `MarcoAntonioBarreiros/RizoSim` foi clonado apenas para leitura em `work/RizoSim-original-readonly`. Ele contém `index.html`, `README.md` e `LICENSE`. O motor principal estava concentrado em `index.html`.

## Novo repositório

Foi criado um novo repositório independente em `outputs/RizoSim-Escolas`.

## Partes do motor preservadas

- Constantes principais de população, energia, reprodução, digestão e física.
- Grade espacial de nutrientes e difusão.
- 13 guildas, seus parâmetros, cores, tipos, funções e morfologias.
- Física Verlet e desenho dos organismos.
- Ambiente, solo, planta, raízes, nódulos e renderização do feijão.
- Regras de absorção, Liebig, sinais da planta e exsudação.
- Nodulação, micorrização, competição, predação, herbivoria, patógenos, decomposição, reciclagem e reprodução.
- Loop de simulação, pausa, velocidade, reinício, zoom e pan.

## Partes refatoradas ou separadas

- `js/engine.js`: motor original extraído do `index.html` e acrescido de uma API pequena para UI/testes.
- `js/organisms.js`: metadados pedagógicos dos organismos.
- `js/environment.js`: cenários didáticos que configuram variáveis reais.
- `js/plant.js`: tradução dos valores técnicos para cinco indicadores.
- `js/ui-child.js`: interface infantil, cartões, eventos, seleção e acessibilidade.
- `js/ui-teacher.js`: abertura do modo professor e sincronização de sliders.
- `js/tutorial.js`: tutorial guiado opcional.

## Ajustes pedagógicos posteriores de equilíbrio

- A tela infantil passou a permitir ajustar água pelo indicador **Água**, chamando o controle real de umidade do motor.
- Foi criado o cenário **Pouco ferro disponível** para tornar a função de Pseudomonas observável.
- O cenário **Ataque às raízes** foi suavizado: continua iniciando patógenos e nematoides, mas com pressão inicial menor para permitir intervenção.
- A adição infantil de Trichoderma e Arthrobotrys passou a posicionar esses organismos perto de patógenos/nematoides quando esses alvos já existem.
- No motor, o sinal de defesa da planta também responde a nematoides; captura por Arthrobotrys e biocontrole por Trichoderma foram levemente ajustados para ter efeito observável sem remover a interação emergente.

## Mudanças somente de interface

- Reorganização visual.
- Cartões por categorias em vez de lista textual única.
- Indicadores simples em vez de barras técnicas na tela infantil.
- Mensagens traduzidas em **O que está acontecendo?**.
- Painel técnico movido para **Modo professor**.
- Tutorial e cenários.
- Destaque ao selecionar organismo.

## Tradução de eventos técnicos

Eventos como `Rhizobium nódulo`, `Micorriza: PO4`, `Bacillus`, `Proto`, `Nematóide`, `Patógeno`, `Saprófito` e inoculações são interceptados e convertidos em mensagens curtas. O botão **ENTENDA** abre a explicação científica.

## Controles transferidos ao modo professor

- Estoques químicos completos.
- Sliders técnicos.
- Mapa de nutrientes.
- Gráfico de guildas.
- Estatísticas detalhadas.
- Inoculação técnica por lista.
- Gargalo populacional.

## Testes realizados

- Checagem de sintaxe com `node --check` para todos os scripts novos e `js/engine.js`.
- Testes de regressão em `tests/regression.html`: todos passaram.
- Validação visual em navegador local por servidor estático em `127.0.0.1`.
- Interação testada: pular tutorial, adicionar rizóbio por cartão, seleção do organismo, painel de eventos traduzido e abertura do modo professor.
- Checagem responsiva em 900x700 e 412x915: sem overflow horizontal, canvas ativo, cinco indicadores presentes e cartões navegáveis.

## Problemas encontrados

- O projeto original concentrava motor, UI e renderização em um único arquivo grande.
- A saída do terminal exibiu alguns textos UTF-8 como mojibake, mas os arquivos foram copiados/escritos em UTF-8.
- O motor original depende de IDs de DOM; por isso o modo professor preserva os IDs técnicos esperados.

## Limitações

- A separação do motor foi conservadora para evitar mudança silenciosa de regra ecológica.
- A descrição textual da simulação resume o estado, mas não substitui a visualização completa do canvas.
- A versão escolar continua sendo educativa, não diagnóstica.

## Desempenho em tablet

Design preparado para tablet Android com botões grandes, cartões horizontais, painéis fecháveis, tela cheia, touch, zoom e pan. Em viewport de tablet 900x700 a aplicação manteve canvas ativo, cinco indicadores, cartões e ausência de overflow horizontal. Medição em dispositivo físico real ainda deve ser feita na escola.
