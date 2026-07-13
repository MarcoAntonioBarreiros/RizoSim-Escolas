# Testes de Regressão

## Como executar

Abra `tests/regression.html` no navegador e clique em **Executar testes**.

Os testes carregam `index.html` em um iframe e usam a API `RizoSimEngine` para configurar cenários, inocular organismos e avançar ticks do motor real.

## Verificações automatizadas

- As 13 guildas originais continuam presentes.
- Rizóbio continua capaz de formar nódulos em condição de nitrogênio baixo.
- Micorriza continua relacionada à exploração/mobilização de fósforo.
- Decompositores continuam reciclando nutrientes.
- Patógenos e nematoides continuam afetando raízes.
- Populações continuam interagindo por predação/competição.
- Controles técnicos continuam alterando ambiente.

## Verificações manuais recomendadas

- Selecionar cada categoria de organismos e confirmar que nem todos os cartões aparecem ao mesmo tempo.
- Adicionar Bacillus em cenário de pouco fósforo e observar painel/indicadores.
- Adicionar rizóbio em cenário de pouco nitrogênio e observar eventual nodulação.
- Ativar mapa de nutrientes no modo professor.
- Testar zoom e pan por mouse, toque e teclado.
- Confirmar que o botão de gargalo populacional não aparece na tela infantil.

## Regra de preservação

Os testes não substituem revisão científica. Eles são guardrails para detectar que o motor preservado ainda apresenta os comportamentos centrais esperados após mudanças de interface.

