**Simulator**
- **Arquivo**: `tales/v0.3/simulator.js` — executor CLI para módulos gerados pelo `transformer`.

**Propósito**
- **Descrição**: Executa um modelo SysADL gerado (arquivo JS) em Node.js, permite estimular portas de entrada, chamar executáveis do modelo e capturar logs/trace de execução.

**Principais Flags**
- **`--trace`**: ativa o rastreamento estruturado de execução (`Model.enableTrace()` é chamado quando disponível). No final da execução, o `simulator` imprime o conteúdo de `m.getExecutionTrace()` como JSON.
- **`--payload` / `-p`**: fornece um JSON (ou caminho para um arquivo JSON) com mapeamentos de porta -> valor para enviar em modo single-shot ou em loop. Ex.: `--payload '{"SystemCP.tempMon.s1":20}'` ou `-p ./payload.json`.
- **`--loop` / `-l`**: modo contínuo — o `simulator` repetirá o envio de estímulos aos ports até `--count` for atingido (ou indefinidamente se `--count` não for usado).
- **`--count <n>`**: número de iterações em modo loop (default `1` para single-shot, `Infinity` se `--loop` sem `--count`).
- **`--interval <ms>`**: intervalo entre iterações no modo `--loop` (padrão `1000` ms).
- **`--ports <a,b,c>`**: restringe estímulos a uma lista de portas específicas (identificadas como `Component.port` ou apenas `port`).
- **`--stream`**: habilita comportamento de streaming (usa `m.logEvent` se disponível para emitir passos consolidados).

**Eventos e Saída**
- O `simulator` emite linhas com prefixo `[EVENT]` para facilitar parsing: eventos de tipos `step`, `log`, `executables` e `simulation_end`.
- Em modo `--trace`, após a execução o `simulator` imprime uma seção `--- Execution Trace ---` contendo o array JSON retornado por `m.getExecutionTrace()`.
- Cada evento `step` contém um objeto com as chaves: `element` (quem gerou o evento), `kind` (`port`, `exec`, `log`), `in`, `out`, `when`.

**Resolução de Alvos de Payload**
- O `--payload` pode usar chaves de forma:
  - `Component.port` (ex.: `SystemCP.tempMon.s1`)
  - `port` (procura primeira ocorrência no modelo)
  - alias definidos pela geração (`mod.__portAliases`) — o `simulator` consultará esse mapa quando disponível
- Se um alvo não for encontrado, o `simulator` tenta `send` recursivamente por nome e em último caso emite `Payload target not found: <key>`.

**Exemplos de Uso**
- Executar o primeiro modelo gerado na pasta `generated`:
```bash
node tales/v0.3/simulator.js
```
- Executar um modelo específico com payload único (single-shot):
```bash
node tales/v0.3/simulator.js generated/Simple.js -p '{"SystemCP.tempMon.s1":20}' --trace
```
- Rodar em loop estimulando portas específicas (ex.: duas portas):
```bash
node tales/v0.3/simulator.js generated/AGV.js --loop --count 10 --interval 500 --ports SystemCP.s1,SystemCP.s2 --payload '{"SystemCP.s1":1,"SystemCP.s2":0}'
```

**Dicas de Depuração**
- Se vir nomes de portas com `null` no trace, verifique o código gerado para `new <PortClass>(name, { owner: <owner> })` — o `owner` deve ser o nome da instância dona da porta.
- Se `--payload` não encontra o alvo, tente usar o nome totalmente qualificado (`Component.port`) ou inspecione `mod.__portAliases` exportado pelo módulo gerado.
- Para entender o fluxo interno (connectors / activities), use `--trace` e examine a sequência JSON: busque eventos `port` → `connector` → `activity` → `action` para mapear o caminho do dado.
- Se o modelo expõe `m.dumpLog()` ou `m.getLog()`, o `simulator` imprimirá esses logs automaticamente antes / depois da execução.

**Formato do Trace**
- O trace é um array de objetos, cada objeto tipicamente contém campos como:
  - `sequence`: número sequencial do evento
  - `timestamp` (ms desde epoch) e `iso_time`
  - `element_type`: tipo da entidade (ex.: `port`, `activity`, `action`, `connector`)
  - `element_name`: identificador legível (ex.: `tempMon.s1`)
  - `operation`: operação executada (ex.: `send`, `receive`, `trigger`, `invoke`)
  - `input` / `output`: dados relacionados ao evento
  - `metadata`: campo livre para informações extras

**Próximos Passos Recomendados**
- Adicionar uma visualização minimalista do trace (HTML/JS) que represente eventos como um grafo temporal.
- Fazer um teste E2E com modelos AGV/RTC para validar aliases e conectores compostos e garantir que `transformer.js` gere `owner` corretamente para portas.

Arquivo salvo: `/Users/tales/desenv/SysAdlWebStudio/tales/v0.3/SIMULATOR.md`.
