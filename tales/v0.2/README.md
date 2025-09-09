# tales/v0.2

Nova versão do pipeline SysADL → JS (v0.2). Esta pasta contém runtime, transformer e simulador focados em instâncias definidas em `configuration` (ComponentUse / PortUse / ConnectorBinding) e manutenção de nomes o mais próximo possível ao SysADL.

Arquivos principais
- `sysadl-runtime.js` — runtime leve (ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression)
- `transformer.js` — transforma `.sysadl` para `v0.2/generated/<basename>.js` usando a seção `configuration`
- `simulator.js` — utilitário de simulação com `--loop`, `--stream`, `--ports` (lista)
- `utils.js` — helpers (sanitize/qualify)

Procedimento rápido
1. Gerar: `node tales/v0.2/transformer.js path/to/Model.sysadl tales/v0.2/generated`
2. Simular: `node tales/v0.2/simulator.js tales/v0.2/generated/Model.js --loop --count 3 --stream --ports comp.port`

