# Tales SysADL Transformer & Simulator

Este diretório (`tales/`) contém um pipeline mínimo para transformar um modelo SysADL (`*.sysadl`) em um módulo JavaScript executável e um runtime/simulador para instanciar e exercitar o modelo gerado.

## Visão geral do fluxo

1. Parser (PEG) lê o arquivo `.sysadl` e gera uma AST.
2. `tales/transformer.js` percorre a AST, extrai:
   - executables (corpo e parâmetros);
   - configuração (componentes, portas, conectores e bindings);
   - alocações (activity -> connector, executable -> action).
3. O transformer gera um módulo CommonJS em `tales/generated/<ModelName>Model.js` que usa o runtime (`tales/sysadl-runtime.js`) para construir instâncias de `ModelBase`, `ComponentBase`, `PortBase`, `ConnectorBase` e registrar executáveis.
4. `tales/simulator.js` carrega o módulo gerado, instancia o modelo e executa passos de exemplo (invocar executáveis e enviar dados para portas). O runtime grava eventos em um log (executables, port_send, port_receive).

## Como usar

1. Gerar o módulo JavaScript a partir do modelo SysADL (ex.: `tales/Simple.sysadl`):

```bash
node tales/transformer.js tales/Simple.sysadl
```

Saída: `tales/generated/SimpleModel.js` (ou `tales/generated/<ModelName>Model.js`, dependendo do `Model` no arquivo). No repositório atual o gerador produz `tales/generated/SysADLModelModel.js`.

2. Executar o simulador (instancia o modelo gerado e imprime logs):

```bash
node tales/simulator.js
```

O simulador imprime:
- lista de executáveis registrados;
- resultado de invocações de exemplo;
- logs de envio/recebimento de portas.

## Arquivos principais e responsabilidades

- `tales/sysadl-parser.js` — Parser gerado (PEG/peggy) que exporta `parse(source, options)` como um ES module; o transformer importa dinamicamente este módulo para construir a AST.

- `tales/sysadl-runtime.js` — Runtime leve com primitivas:
  - `ModelBase` — contém componentes, connectors e executables e mantém o log;
  - `ComponentBase` — instância de componente com `ports` e `subcomponents`;
  - `PortBase` — objeto de porta com `send(value, model)`, `receive(value, model)` e `bindTo(target)`;
  - `ConnectorBase` — estrutura para representar conectores (usado para rastrear participantes);
  - `createExecutableFromExpression(exprText, paramNames)` — compila corpo de executável para função JavaScript (usa `new Function`); o `ModelBase.addExecutable` embrulha a função para registrar inputs/outputs no log e preservar aridade.

- `tales/transformer.js` — Transformer que:
  - importa o parser dinamicamente (ES module);
  - percorre a AST para extrair `Executable` nodes e suas expressões;
  - extrai a `Configuration` (ComponentUse, PortUse, ConnectorUse, ConnectorBinding);
  - dede em `allocation` para mapear activities/executables para connectors/actions;
  - gera `tales/generated/<ModelName>Model.js` (CommonJS) que cria componentes, portas, registra executáveis e emite bindings; se um conector tiver executáveis alocados, o binding emitido chamará `m.executables['Name'](value)` antes de encaminhar o resultado.

- `tales/simulator.js` — Exemplo de runner/simulador que carrega o módulo gerado, instancia o modelo, chama alguns executáveis e faz `send()` em portas para demonstrar o fluxo e imprime o log.

- `tales/generated/` — Pasta de saída onde o transformer grava os módulos gerados.

- `tales/scripts/*.js` — Scripts auxiliares usados durante desenvolvimento para inspecionar a AST (ex.: `dump_config_ast.js`, `dump_connectors.js`, `dump_allocations.js`, `count_types.js`). Eles não são necessários para rodar o pipeline, mas ajudam ao estender o transformador.

## Notas técnicas e limitações

- O parser exporta ESM; `tales/transformer.js` importa com `import(pathToFileURL(...).href)` para evitar erros `Unexpected token "export"`.
- O gerador usa heurísticas para mapear bindings e alocações:
  - tenta inferir portas quando bindings aparecem como `temp1 = s1` (porta = instancia);
  - constrói um mapa determinístico `connectorDef -> [executables]` usando a seção `allocations` e escaneando `ActivityDef` e `ActionUse` para ligar executáveis às atividades sem depender de sufixos (AN/AC) na nomenclatura.
- Executáveis são compilados com `new Function` — portanto considere modelos confiáveis. Se for necessário executar modelos não confiáveis, troque por um avaliador mais seguro.
- O runtime e o gerador ainda usam heurísticas para casos complexos (múltiplos participantes, canais com transformação complexa, direcionalidade de fluxo). A estratégia adotada foi evoluir incrementos pequenos e testáveis.
 - O runtime agora implementa coordenação assíncrona de entradas por activity: quando uma porta recebe um valor, o runtime acumula valores por activity alocada ao componente e só executa a activity quando todos os ports de entrada requeridos estiverem presentes; depois consome os valores. Isto é compatível com a semântica de SysADL para atividades que dependem de várias entradas assíncronas.

## Comandos úteis

```bash
# gerar o modelo a partir do SysADL
node tales/transformer.js tales/Simple.sysadl
# executar o simulador
node tales/simulator.js
```

## Próximos passos recomendados

- Adicionar testes automatizados (script que gera, executa e checa logs esperados).
- Melhorar resolução de participantes e fluxo (direção in/out) para gerar `PortBase` com direção correta e usar send/receive adequados.
- Implementar encadeamento de múltiplos executáveis por conector quando necessário.

## Novidades nesta versão

- Coordenação assíncrona por activity: `model.registerActivity(activityName, descriptor)` permite que o transformador descreva quais portas a activity usa e quais actions/executables compõem a activity; o runtime acumula inputs e só dispara a execução quando todos os ports esperados tiverem valores.
- Logs de execução ampliados: eventos `activity_start`, `action_invoke`, `action_result`, `activity_end` aparecem agora no `model.getLog()`.

Veja `tales/sysadl-runtime.js` e `tales/transformer.js` para detalhes de implementação.

---

Se quiser, eu crio agora um `tales/test.sh` (ou `node` smoke-test) que gera o modelo e verifica entradas do log automaticamente. Deseja que eu adicione isso também?
