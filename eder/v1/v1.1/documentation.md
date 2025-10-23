Documentação do Sistema de Visualização de Arquitetura SysADL
Este documento descreve as funcionalidades do sistema de visualização de arquiteturas baseado em SysADL, os arquivos responsáveis por sua implementação, e os pontos que ainda não estão funcionando corretamente.
Funcionalidades do Sistema

Transformação de Modelos SysADL: Converte código SysADL em JavaScript dinâmico usando um transformador (ex.: sysadl-parser.js e sysadl-transformer).
Criação de Modelos Dinâmicos: Gera instâncias de modelos (ex.: SysADLModel) a partir do código JavaScript transformado, utilizando createDynamicModel em visualizer.js.
Visualização de Arquitetura: Renderiza componentes, portas e conectores como um grafo interativo usando a biblioteca vis-network, com suporte a zoom e tooltips.
Design Moderno: Exibe subcomponentes como retângulos com padding, portas como círculos coloridos (amarelo para out, vermelho para in), e conectores como arestas com rótulos e setas.
Logs e Depuração: Fornece logs detalhados (ex.: [INFO], [DEBUG], [AVISO]) para rastrear o processamento de componentes e conectores.
Legenda Interativa: Mostra uma legenda com as cores associadas a componentes, portas e conectores.

Arquivos Responsáveis

index.html:

Contém a estrutura HTML da interface, incluindo o editor de código, botões de transformação e visualização, e o painel de log.
Integra app.js e carrega dependências como vis-network.


app.js:

Gerencia a interação do usuário (ex.: clique em "Transform ▶" e "Visualizar Arquitetura").
Faz requisições ao servidor Node.js (http://localhost:3000/api/transform) e chama renderVisualization do visualizer.js.


visualizer.js:

Responsável por criar o modelo dinâmico a partir do código JavaScript gerado.
Extrai dados de arquitetura (nós e arestas) e renderiza o grafo com vis-network.
Implementa a lógica para mapear componentes, portas e conectores, incluindo o uso de bindings para conectar portas.


sysadl-framework/SysADLBase.js:

Define as classes base (Component, Port, Connector, etc.) usadas pelo modelo gerado (ex.: CP_Elements_SensorCP, CN_Elements_FarToCelCN).


sysadl-parser.js e sysadl-transformer:

Processam o código SysADL e geram o JavaScript correspondente (ex.: Simple.js).


simulator.js e sysadl-monaco.js:

Suportam simulação e edição de código SysADL, respectivamente, mas não estão diretamente envolvidos na visualização.



Pontos Não Funcionando Corretamente

Conectores Não Aparecem na Visualização:

Os conectores (c1, c2, c3) no modelo Simple não são renderizados como arestas no grafo.
Log atual: [AVISO] Conector com informações incompletas: c1, from: null.source, to: null.target, indicando falha no mapeamento das portas.
Causa: O método bind (ex.: c1.bind(this.getPort("temp1"), this.SystemCP.tempMon.getPort("s1"))) usa portas como temp1, que não estão definidas como nós independentes, e os bindings não estão sendo capturados corretamente pelo visualizer.js.


Arestas Limitadas:

A visualização mostra apenas 6 arestas (provavelmente ligações tracejadas entre componentes e portas), enquanto o esperado são 9 arestas (6 tracejadas + 3 para conectores).
Isso sugere que a extração de flowSchema e participantSchema não está traduzindo os bindings em conexões visíveis.


Mapeamento de Portas Incorreto:

As portas referenciadas em bind (ex.: temp1, temp2, avg) não correspondem às portas reais dos subcomponentes (ex.: s1.current, tempMon.s1), causando falha na associação.
O findComponentByPortRole não está interpretando corretamente as associações de bind, resultando em fromCompName e toCompName como null.


Compatibilidade com Outros Modelos:

Embora o sistema deva suportar modelos como AGV-completo.sysadl e RTC.sysadl, a falha no mapeamento de bindings pode afetar a visualização em outros contextos, dependendo da estrutura dos conectores.



Ações Recomendadas

Depuração de bindings:

Verificar no console se model.components.SystemCP.connectors.c1.bindings contém os mapeamentos esperados (ex.: { f: { owner: 's1', port: { name: 'current' } }, c: { owner: 'tempMon', port: { name: 's1' } } }).
Se vazio, investigar se o SysADLBase.js está atualizando corretamente os bindings após bind.


Ajuste no visualizer.js:

Melhorar findComponentByPortRole para rastrear dinamicamente as portas associadas via bind, possivelmente analisando o histórico de chamadas no construtor de SysADLModel.


Validação com SysADL:

Compartilhar o código SysADL do Simple para confirmar a definição dos conectores (ex.: connector c1 (s1.current -> tempMon.s1)), ajudando a alinhar o mapeamento.


Testes Adicionais:

Testar com um modelo simples (ex.: connector w1 (s1.out -> d1.in)) para isolar o problema.
Verificar a renderização de conectores em AGV-completo.sysadl ou RTC.sysadl após correção.



Contato
Para suporte ou atualizações, consulte os logs ou compartilhe feedback com os desenvolvedores.
Última atualização: 09:30 AM -03, Segunda-feira, 20 de Outubro de 2025