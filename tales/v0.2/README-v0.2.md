# tales/v0.2

Pequeno pipeline v0.2 para gerar código JavaScript executável a partir de modelos SysADL.

Como usar

1. Gerar código a partir de um modelo SysADL (ex.: AGV.sysadl):

```bash
node tales/v0.2/transformer.js AGV.sysadl
```

O arquivo gerado ficará em `tales/v0.2/generated/AGV.js`.

2. Simular o modelo (exemplo de teste):

```bash
node tales/v0.2/tests/simulate_agv.js
```

3. Teste de fumaça (assegura presença de ports/activities):

```bash
node tales/v0.2/tests/assert_agv.js
```

Debug

- Para ver saídas de debug detalhadas do transformer, exporte `DEBUG=1` antes de rodar o gerador:

```bash
DEBUG=1 node tales/v0.2/transformer.js AGV.sysadl
```

- Para depurar a tradução de expressões SysADL para JS, exporte `SYSADL_DEBUG=1`.

Próximos passos sugeridos

- Melhorar heurísticas de mapeamento entre ActivityDefs e ComponentInstances.
- Adicionar testes automatizados adicionais para validar caminhos de conectores e propagação de portas.

