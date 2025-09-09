# SIMULATOR (tales/simulator.js)

Descrição
---------
O `tales/simulator.js` é um pequeno utilitário para carregar módulos JS gerados pelo transformer (em `tales/generated`) e executar cenários rápidos para validar comportamento.

Objetivo
--------
- Verificar que módulos gerados exportam `createModel()` e que executáveis e topologia foram gerados corretamente.
- Fornecer um modo interativo/contínuo para estimular portas de entrada e observar o fluxo de eventos (port -> connector -> activity -> action -> executable -> port).

Como rodar
---------
- Carregar automaticamente o primeiro `.js` em `tales/generated` (comportamento padrão):

```bash
node tales/simulator.js
```

- Carregar um arquivo ou diretório específico (arquivo `.js` ou pasta):

```bash
node tales/simulator.js tales/generated/RTC.js
node tales/simulator.js tales/generated
```

Flags CLI
---------
- `--loop` ou `-l`: entrar no modo contínuo onde o simulador injeta valores em portas de entrada
- `--stream`: mostrar eventos do modelo em tempo real (sobrescreve `model.logEvent` para imprimir cada evento)
- `--count N`: número de ticks/iterações (padrão: 1; se `--loop` sem `--count` usa Infinity)
- `--interval MS`: intervalo entre ticks em milissegundos (padrão: 1000)
- `--port component.port` ou `--port portName`: selecionar qual(is) porta(s) estimular. Se omitido, todas as portas de entrada (`direction === 'in'`) são candidatas.

Exemplos
--------
- Rodar o primeiro modelo gerado e listar executáveis:

```bash
node tales/simulator.js
```

- Rodar o modelo RTC, estimular `rtc.localtemp1` 3 vezes com 200ms entre estímulos e ver eventos em tempo real:

```bash
node tales/simulator.js tales/generated/RTC.js --loop --count 3 --interval 200 --port rtc.localtemp1 --stream
```

Exemplos avançados
------------------

- Estimular múltiplas portas (join) em um único tick: você pode passar `--port` com o nome da porta e, para estimular outras portas, executar o simulador várias vezes com um pequeno script que invoque `node` repetidamente ou modificar o simulador para aceitar uma lista separada por vírgulas. Exemplo (shell):

```bash
# estimular rtc.localtemp1 e rtc.localTemp2 em sequência rápida (script shell)
for p in rtc.localtemp1 rtc.localTemp2; do
  node tales/simulator.js tales/generated/RTC.js --loop --count 1 --port $p --stream
  sleep 0.05
done
```

- Cenário de teste em lote: iterar por todos os modelos em `tales/generated` e executar 3 ticks cada um (útil para regressão):

```bash
for f in tales/generated/*.js; do
  echo "=== Testando $f ===";
  node tales/simulator.js $f --loop --count 3 --interval 100 --stream;
done
```

- Script Node (automatizado) para estimular um conjunto de portas por tick (próximo passo se precisar):

```js
// scripts/stimulateJoin.js (exemplo)
const { execSync } = require('child_process');
const model = 'tales/generated/RTC.js';
const ports = ['rtc.localtemp1','rtc.localTemp2'];
for (let i=0;i<3;i++){
  for (const p of ports) {
    execSync(`node tales/simulator.js ${model} --loop --count 1 --port ${p}`, { stdio: 'inherit' });
  }
}
```


O que o simulador imprime
-------------------------
- Lista de executáveis encontrados no modelo.
- Para cada execução manual de um executable (modo não-loop), imprime `Executable <name>(args) -> <result>`.
- Em `--stream`/loop mode, imprime cada evento assim que `model.logEvent` é chamado. Eventos típicos do runtime:
  - `port_send` / `port_receive`
  - `activity_start` / `activity_end` / `activity_error`
  - `action_invoke` / `action_result` / `action_error` / `action_skipped`
  - `executable` (logs de inputs/outputs)

Ver o fluxo completo
--------------------
Para detectar o fluxo completo que você descreveu (valor enviado na porta → conector → porta de outro componente → activity → action → executável → retorno → porta de saída → próximo componente), siga estas recomendações:

1. Use `--stream` para ver os eventos em tempo real.
2. Aponte o simulador para o arquivo gerado correto (ex.: `tales/generated/RTC.js`).
3. Garanta que o modelo gerado contém bindings/connectors e que as activities têm `inputPorts` corretamente inferidos.
4. Se a activity espera múltiplas portas (join), injete valores nas portas necessárias (você pode chamar `--port` repetidamente usando scripts ou melhorar o simulador para estimular múltiplas portas por tick).

Melhorias possíveis
-------------------
- Implementar cenários por arquivo (dataset) para reproduzir sequências de entrada específicas.
- Fazer o simulador gerar relatórios agregados por elementType (quantos `port_receive`, quantos `executable` com erro, etc).

Observações
-----------
- O simulador é intencionalmente leve e inseguro (usa `new Function` ao criar executáveis). Use apenas com modelos confiáveis.
- Se quiser, posso:
  - adicionar iteração automática sobre todos os modelos gerados e sumarizar resultados;
  - habilitar estímulo mais sofisticado (sequências, injetar objetos, randomização);
  - produzir um README mais extenso.


Fim.
