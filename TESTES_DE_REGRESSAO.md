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
- O protozoário ameboide continua predando bactérias, com pseudópodes (alongamento > 1,4) e vacúolos digestivos.
- Controles técnicos continuam alterando ambiente.
- Pseudomonas continua útil quando ferro limita a planta.
- Trichoderma e Arthrobotrys continuam reduzindo patógenos ou nematoides quando encontram seus alvos.
- Indicador de água mede conforto hídrico: água equilibrada aparece como boa e excesso não aparece como bom.
- Eventos de Trichoderma e Arthrobotrys são traduzidos como controle, não como dano à raiz.
- Crescimento representa as condições atuais para crescer, não o tamanho acumulado da planta.
- A explicação de crescimento não chama o nutriente relativamente menor de deficiência quando ele já está em faixa boa.
- Quando Pseudomonas já está perto da raiz, a explicação reconhece a ação em andamento e informa que a resposta é gradual.
- O botão **Observar** amplia e acompanha um organismo real sem pausar ou reduzir a velocidade da comunidade.

## Verificações manuais recomendadas

- Selecionar cada categoria de organismos e confirmar que nem todos os cartões aparecem ao mesmo tempo.
- Adicionar Bacillus em cenário de pouco fósforo e observar painel/indicadores.
- Adicionar rizóbio em cenário de pouco nitrogênio e observar eventual nodulação.
- Clicar no indicador Água e alternar pouca água, água equilibrada e muita água.
- Clicar em Crescimento e Saúde da raiz durante cenários de estresse e confirmar que a explicação cita causas reais.
- Depois de corrigir uma deficiência, confirmar que o texto de Crescimento acompanha o estado atual e não conserva a causa anterior.
- Confirmar que Saúde da raiz diferencia organismos próximos da raiz daqueles apenas presentes no solo.
- Usar o cenário de pouco ferro disponível e observar a utilidade de Pseudomonas.
- Usar o cenário de ataque às raízes e adicionar Trichoderma/Arthrobotrys cedo.
- Ativar mapa de nutrientes no modo professor.
- Testar zoom e pan por mouse, toque e teclado.
- Usar **Observar** em diferentes cartões e confirmar que a câmera acompanha o exemplar enquanto ele e os demais organismos continuam se movendo.
- Confirmar que o botão de gargalo populacional não aparece na tela infantil.
- Em 1024x768 horizontal, confirmar que simulação, indicadores, acontecimentos e cartões permanecem no mesmo quadro.

## Regra de preservação

Os testes não substituem revisão científica. Eles são guardrails para detectar que o motor preservado ainda apresenta os comportamentos centrais esperados após mudanças de interface.
