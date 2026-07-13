# Acessibilidade

## Implementado

- Botões grandes e foco visível.
- Navegação por teclado nos controles principais.
- Navegação por setas, Home e End nas categorias de organismos.
- Canvas focável com pan por setas e zoom por `+`/`-`.
- Pausa sem limite de tempo.
- Texto alternativo atualizado sobre o estado da simulação.
- Painel de eventos em linguagem curta.
- Diálogo de explicação para indicadores e acontecimentos.
- Tutorial opcional e reiniciável.
- Compatibilidade com `prefers-reduced-motion`: a simulação inicia pausada e remove transições longas.
- Conteúdo utilizável sem áudio.
- Estados dos indicadores usam texto além de cor; a água também informa se está abaixo, equilibrada ou acima do ideal.

## Atalhos disponíveis

- Espaço: pausar/continuar, quando o foco não está em um controle.
- 1, 2, 3: velocidades 1x, 2x e Aula.
- R: reiniciar.
- Esc: fechar seleção ou painel de cenários.
- Esc: sair do tutorial quando ele estiver ativo.
- Com o canvas focado: setas movem a visão; `+` e `-` alteram zoom.

## Limitações conhecidas

- O canvas continua sendo uma visualização complexa; por isso há descrição textual paralela, mas ela não enumera cada organismo individual em tempo real.
- A leitura por leitor de tela resume estados e eventos, não toda a animação.
- O modo professor contém muitos controles técnicos por natureza, mas está separado da tela infantil.
