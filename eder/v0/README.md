# SysAdlWebStudio
Web execution tool for SysADL 

![image](https://github.com/user-attachments/assets/a4e52266-a8d8-42c9-b97f-63dba1c644aa)

## Documentação do simulador (tales/simulator.js)

O `tales/simulator.js` carrega módulos JS gerados pelo transformer (em `tales/generated`) e oferece modos para validação e simulação contínua do fluxo do sistema.

### Objetivo
- Validar que o módulo gerado exporta `createModel()` e que executáveis e topologia foram gerados corretamente.
- Permitir estímulo de portas e visualização do fluxo dinâmico: porta → conector → activity → action → executable → porta.

### Uso rápido
- Carregar o primeiro `.js` em `tales/generated`:

```
node tales/simulator.js
```

- Carregar um arquivo ou diretório específico:

```
node tales/simulator.js tales/generated/RTC.js
node tales/simulator.js tales/generated
```

### Flags CLI
- `--loop`, `-l`: modo contínuo (injeta valores nas portas de entrada). Use com `--count`.
- `--count N`: número de ticks a executar no modo loop (default: 1; se `--loop` e sem `--count`, usa Infinity).
- `--interval MS`: intervalo entre ticks em ms (default: 1000).
- `--port component.port` ou `--port portName`: seleciona a porta a ser estimulada; se omitida, todas as portas `in` são candidatas.
- `--stream`: imprime eventos do modelo em tempo real (sobrepõe `model.logEvent`).

### Exemplo

```
node tales/simulator.js tales/generated/RTC.js --loop --count 5 --interval 500 --port rtc.localtemp1 --stream
```

### Eventos registrados pelo runtime
- `port_send` / `port_receive`
- `activity_start` / `activity_end` / `activity_error`
- `action_invoke` / `action_result` / `action_error` / `action_skipped`
- `executable` (inputs/outputs/errors)

### Dicas
- Use `--stream` para acompanhar o fluxo completo.
- Verifique bindings/connectors e `inputPorts` das activities se o fluxo não disparar.
- O runtime usa `new Function` para executáveis — rode apenas modelos confiáveis.

### Melhorias possíveis
- Adicionar cenários (arquivos) para reproduzir sequências de inputs.
- Iterar automaticamente sobre todos os modelos gerados para testes em lote.
