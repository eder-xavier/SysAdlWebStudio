Runtime contract (minimal) expected by the transformer

Resumo (2-4 bullets)
- O transformer gera código que usa um runtime com as classes/funcionalidades: ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression.
- A API do runtime deve expor métodos: ModelBase.addComponent, ModelBase.addConnector, ModelBase.addExecutable; ComponentBase.addPort; PortBase.bindTo/send/receive; ModelBase.logEvent/getLog/dumpLog.
- Executáveis são funções invocáveis por `model.executables['Name'](args...)` e são registradas por `ModelBase.addExecutable(name, fn)`; o runtime é responsável por embrulhar a função para registro de logs e preservação de aridade.

Contrato detalhado

1) ModelBase
- new ModelBase(name)
- propriedades esperadas pelo gerador:
  - model.components : { [instName]: ComponentBase }
  - model.connectors : { [name]: ConnectorBase }
  - model.executables : { [name]: Function }
- métodos:
  - addComponent(componentInstance) -> adiciona em model.components usando componentInstance.name
  - addConnector(connectorInstance) -> adiciona em model.connectors
  - addExecutable(name, fn) -> registra fn em model.executables[name]; runtime deve embrulhar fn para logar inputs/outputs e preservar .length
  - logEvent(entry) -> append a um log interno (entry: { elementType, name, inputs, output?, error?, when })
  - getLog() -> retorna lista de eventos
  - dumpLog() -> imprime log

2) ComponentBase
- new ComponentBase(name)
- propriedades:
  - component.ports : { [portName]: PortBase }
  - component.subcomponents : { [name]: ComponentBase }
- métodos:
  - addPort(portInstance) -> insere em component.ports usando portInstance.name
  - addSubcomponent(inst) -> insere em component.subcomponents

3) PortBase
- new PortBase(name, direction = 'in', type = null)
- propriedades:
  - port.name
  - port.direction
  - port.type
  - port.binding (opcional)
  - port.lastValue (opcional)
- métodos:
  - bindTo(target) -> alvo pode ser um objeto com receive(value, model) ou descriptor { component, port }
  - send(value, model?) -> registra event port_send e encaminha para binding (se binding.receive)
  - receive(value, model?) -> registra event port_receive e define lastValue

4) ConnectorBase
- new ConnectorBase(name)
- métodos mínimos: addParticipant(portRef)
- propriedades: participants (map)

5) createExecutableFromExpression(exprText, paramNames)
- retorna uma função JS que implementa a expressão; transformer chama `ModelBase.addExecutable(name, createExecutableFromExpression(body, params))`
- recomendação: runtime pode embalar com try/catch e logEvent

6) Log format
- entrada: { elementType: 'executable'|'port_send'|'port_receive'|'binding_error'|..., name, inputs, output?, error?, when }
- when: timestamp em ms

Observações
- O runtime atual (`tales/sysadl-runtime.js`) implementa este contrato minimalmente. Se quiser estender o comportamento (activities, timers, policies), mantenha a API pública compatível com o que o gerador emite ou atualize o gerador de forma coordenada.
- `createExecutableFromExpression` usa `new Function` — substitua por um avaliador seguro se precisar executar modelos não confiáveis.

Exemplo mínimo de uso (em JS gerado pelo transformer)

const m = new ModelBase('X');
const c = new ComponentBase('s1'); m.addComponent(c);
c.addPort(new PortBase('p1','in'));
const exe = createExecutableFromExpression('x*2', ['x']);
m.addExecutable('Double', exe);
// bind p1 to receive wrapper
c.ports['p1'].bindTo({ receive: function(v, model){ const r = model.executables['Double'](v); /* ... */ } });
