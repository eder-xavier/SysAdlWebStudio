# EventScheduler - Índice de Documentação

## 📚 Documentação Completa do EventScheduler

Esta pasta contém toda a documentação sobre o **EventScheduler**, sistema de agendamento de eventos implementado na Fase 5.2 do SysADL Framework v0.4.

---

## 📖 Documentos Disponíveis

### 1. **Documentação Técnica Completa**
📄 **Arquivo:** `EVENT-SCHEDULER-DOCUMENTATION.md`  
📊 **Tamanho:** ~350 linhas  
🎯 **Objetivo:** Documentação técnica detalhada do EventScheduler

**Conteúdo:**
- Visão geral do sistema
- Funcionalidades implementadas (scheduleAfterScenario, scheduleOnCondition, scheduleAfterDelay)
- Integração com o framework SysADL
- Monitoramento de condições (ciclo de 100ms)
- Sistema de logging narrativo
- Estruturas de dados internas
- Estatísticas e métricas
- Limpeza e destruição
- Exemplos de uso no SysADL
- Limitações conhecidas
- Arquivos modificados/criados
- Status de implementação

**Quando usar:** Para entender a arquitetura interna, como o EventScheduler funciona, e detalhes de implementação.

---

### 2. **Guia Rápido de Referência**
📄 **Arquivo:** `EVENT-SCHEDULER-QUICK-REFERENCE.md`  
📊 **Tamanho:** ~450 linhas  
🎯 **Objetivo:** Guia prático para uso diário do EventScheduler

**Conteúdo:**
- **Sintaxe SysADL**: Como agendar eventos no código SysADL
- **API JavaScript**: Todos os métodos do EventScheduler com exemplos
- **Acesso via Contexto**: Como usar o EventScheduler em cenários
- **Expressões Condicionais**: Sintaxe suportada e operadores
- **Ciclo de Vida**: Como eventos são agendados, monitorados e disparados
- **Exemplos Práticos**: 3 casos de uso completos (alarmes, AGVs, produção)
- **Debugging e Logs**: Como analisar logs JSONL e console
- **Dicas e Boas Práticas**: O que fazer e o que evitar
- **Performance**: Configuração e otimização
- **Troubleshooting**: Soluções para problemas comuns

**Quando usar:** Quando você precisa implementar agendamento de eventos e quer exemplos práticos e referência rápida.

---

### 3. **Exemplos de Teste**
📄 **Arquivo:** `EVENT-SCHEDULER-TEST-EXAMPLES.md`  
📊 **Tamanho:** ~500 linhas  
🎯 **Objetivo:** Exemplos completos de teste para validação

**Conteúdo:**
- **Teste Básico**: Evento após cenário (StartMotor, StopMotor)
- **Teste Condicional**: Monitoramento de temperatura (AlarmHigh, AlarmLow)
- **Teste Complexo**: Sistema de AGVs (múltiplos eventos simultâneos)
- **Teste de Performance**: 20 condições simultâneas
- **Teste de Integração**: Event chains (eventos em cadeia)
- **Teste de Erro**: Tratamento de condições inválidas
- **Teste de Delay**: Agendamento com setTimeout
- **Comandos Úteis**: Scripts para análise de logs e debugging
- **Checklist de Teste**: Validação completa (básico, intermediário, avançado)
- **Exemplo de Output**: Saída completa esperada

**Quando usar:** Quando você quer testar o EventScheduler ou criar novos casos de teste.

---

### 4. **Relatório de Conclusão da Fase 5.2**
📄 **Arquivo:** `PHASE-5.2-COMPLETE.md`  
📊 **Tamanho:** ~400 linhas  
🎯 **Objetivo:** Relatório executivo da implementação

**Conteúdo:**
- **Resumo Executivo**: O que foi implementado
- **Artefatos Criados**: Lista completa de arquivos
- **Validação e Testes**: Resultados dos testes end-to-end
- **Cobertura de Funcionalidades**: Tabela de status
- **Exemplo de Uso**: Como usar no SysADL
- **Arquitetura**: Diagrama de componentes
- **Métricas**: Linhas de código, tempo de desenvolvimento
- **Logging Narrativo**: Formato de logs
- **Transformação de Expressões**: Como funciona
- **Limitações**: O que precisa ser melhorado
- **Próximas Fases**: Roadmap futuro

**Quando usar:** Para ter uma visão executiva da implementação, métricas de desenvolvimento, ou apresentar o trabalho realizado.

---

### 5. **Resumo da Sessão de Desenvolvimento**
📄 **Arquivo:** `SESSION-SUMMARY-EVENTSCHEDULER.md`  
📊 **Tamanho:** ~500 linhas  
🎯 **Objetivo:** Documentação completa da sessão de desenvolvimento

**Conteúdo:**
- **O Que Foi Realizado**: Lista detalhada de todas as alterações
- **EventScheduler.js**: Descrição completa do novo componente
- **Integrações**: Modificações em SysADLBase.js e transformer.js
- **Código Gerado**: Como o código é gerado pelo transformer
- **Validação e Testes**: Comando e resultados completos
- **Métricas da Sessão**: Código, documentação, tempo
- **Bugs Corrigidos**: Lista de problemas encontrados e resolvidos
- **Arquitetura**: Diagrama de integração
- **Lições Aprendidas**: Desafios e soluções
- **Sintaxe SysADL**: Exemplos de uso
- **Próximas Fases**: Roadmap detalhado
- **Destaques**: Principais conquistas

**Quando usar:** Para entender todo o contexto da implementação, incluindo decisões técnicas, problemas enfrentados e soluções aplicadas.

---

### 6. **Status da Execução de Cenários** (Atualizado)
📄 **Arquivo:** `SCENARIO-EXECUTION-STATUS.md`  
📊 **Tamanho:** ~300 linhas  
🎯 **Objetivo:** Status geral da implementação de ScenarioExecution

**Conteúdo Relacionado ao EventScheduler:**
- ✅ EventScheduler implementado (Fase 5.2)
- Funcionalidades do EventScheduler
- Arquivos modificados
- Validação de funcionamento
- Limitações remanescentes
- Próximos passos (Entity Binding)

**Quando usar:** Para ver o status geral da implementação de cenários e como o EventScheduler se integra.

---

### 7. **README Principal** (Atualizado)
📄 **Arquivo:** `README.md`  
📊 **Tamanho:** ~200 linhas  
🎯 **Objetivo:** Documentação principal do SysADL Framework v0.4

**Seção do EventScheduler:**
- Descrição das 3 estratégias de agendamento
- Exemplo de sintaxe SysADL
- Links para documentação detalhada
- Status: Phase 5.2 completa ⭐

**Quando usar:** Para ter uma visão geral do framework e encontrar links para documentação específica.

---

## 🗂️ Como Navegar na Documentação

### Para **Iniciantes**:
1. Comece com `README.md` para visão geral
2. Leia `EVENT-SCHEDULER-QUICK-REFERENCE.md` para exemplos práticos
3. Execute exemplos de `EVENT-SCHEDULER-TEST-EXAMPLES.md`

### Para **Desenvolvedores**:
1. Leia `EVENT-SCHEDULER-DOCUMENTATION.md` para arquitetura
2. Consulte `EVENT-SCHEDULER-QUICK-REFERENCE.md` para API completa
3. Use `EVENT-SCHEDULER-TEST-EXAMPLES.md` para criar testes

### Para **Arquitetos/Gerentes**:
1. Leia `PHASE-5.2-COMPLETE.md` para resumo executivo
2. Consulte `SESSION-SUMMARY-EVENTSCHEDULER.md` para contexto completo
3. Veja `SCENARIO-EXECUTION-STATUS.md` para roadmap

### Para **Debugging**:
1. Consulte seção "Troubleshooting" em `EVENT-SCHEDULER-QUICK-REFERENCE.md`
2. Use comandos de `EVENT-SCHEDULER-TEST-EXAMPLES.md`
3. Analise logs seguindo exemplos em "Debugging e Logs"

---

## 📊 Visão Geral do EventScheduler

### 🎯 O Que É?
Sistema de agendamento de eventos para execução de cenários SysADL, permitindo eventos condicionais, temporais e sequenciais.

### ✨ Funcionalidades Principais
1. **scheduleAfterScenario()**: Dispara evento após conclusão de cena/cenário
2. **scheduleOnCondition()**: Monitora condição e dispara quando verdadeira
3. **scheduleAfterDelay()**: Dispara evento após tempo específico

### 🚀 Como Usar (Básico)
```sysadl
ScenarioExecution to MyScenarios {
  inject Event1 after Scenario1;           // Após cenário
  inject Event2 when temperature > 80;     // Condicional
  
  Scenario1;
}
```

### 📈 Status
- ✅ **Implementado**: 100%
- ✅ **Testado**: Sim (end-to-end validado)
- ✅ **Documentado**: Sim (1200+ linhas)
- ✅ **Production Ready**: Sim

---

## 📞 Links Úteis

### Documentação Técnica
- [Documentação Completa](EVENT-SCHEDULER-DOCUMENTATION.md)
- [Guia Rápido](EVENT-SCHEDULER-QUICK-REFERENCE.md)
- [Exemplos de Teste](EVENT-SCHEDULER-TEST-EXAMPLES.md)

### Relatórios
- [Fase 5.2 Completa](PHASE-5.2-COMPLETE.md)
- [Resumo da Sessão](SESSION-SUMMARY-EVENTSCHEDULER.md)
- [Status de Cenários](SCENARIO-EXECUTION-STATUS.md)

### Framework
- [README Principal](README.md)
- [Código Fonte](sysadl-framework/EventScheduler.js)
- [Transformer](transformer.js)

---

## 🔍 Busca Rápida

### Como fazer...

**...agendar evento após cenário?**
→ `EVENT-SCHEDULER-QUICK-REFERENCE.md` → Seção "Sintaxe SysADL" → "Evento Após Cenário/Cena"

**...agendar evento condicional?**
→ `EVENT-SCHEDULER-QUICK-REFERENCE.md` → Seção "Sintaxe SysADL" → "Evento Condicional"

**...usar API JavaScript?**
→ `EVENT-SCHEDULER-QUICK-REFERENCE.md` → Seção "API JavaScript"

**...debug eventos não disparando?**
→ `EVENT-SCHEDULER-QUICK-REFERENCE.md` → Seção "Troubleshooting"

**...analisar logs?**
→ `EVENT-SCHEDULER-QUICK-REFERENCE.md` → Seção "Debugging e Logs"

**...entender arquitetura?**
→ `EVENT-SCHEDULER-DOCUMENTATION.md` → Seção "Integração com o Framework"

**...ver exemplos completos?**
→ `EVENT-SCHEDULER-TEST-EXAMPLES.md` → Escolha o exemplo relevante

**...criar testes?**
→ `EVENT-SCHEDULER-TEST-EXAMPLES.md` → Seção "Checklist de Teste"

---

## 📦 Estrutura de Arquivos

```
v0.4/
├── README.md                                   # ← Visão geral do framework
├── SCENARIO-EXECUTION-STATUS.md                # ← Status geral de cenários
│
├── 📚 Documentação do EventScheduler:
│   ├── EVENT-SCHEDULER-DOCUMENTATION.md        # ← Documentação técnica completa
│   ├── EVENT-SCHEDULER-QUICK-REFERENCE.md      # ← Guia rápido de referência
│   ├── EVENT-SCHEDULER-TEST-EXAMPLES.md        # ← Exemplos de teste
│   ├── PHASE-5.2-COMPLETE.md                   # ← Relatório de conclusão
│   ├── SESSION-SUMMARY-EVENTSCHEDULER.md       # ← Resumo da sessão
│   └── EVENT-SCHEDULER-INDEX.md                # ← Este arquivo (índice)
│
├── 🏗️ Código Fonte:
│   ├── sysadl-framework/
│   │   ├── EventScheduler.js                   # ← Implementação do EventScheduler
│   │   ├── SysADLBase.js                       # ← Integração com framework
│   │   └── ...
│   └── transformer.js                          # ← Geração de código
│
└── 📂 generated/
    └── AGV-completo-env-scen.js                # ← Exemplo de código gerado
```

---

## 🎓 Glossário

**EventScheduler**: Componente do SysADL Framework que gerencia agendamento e disparo de eventos durante execução de cenários.

**after_scenario**: Estratégia de agendamento que dispara evento após conclusão de cena/cenário.

**conditional**: Estratégia de agendamento que monitora condição booleana e dispara evento quando se torna verdadeira.

**delayed**: Estratégia de agendamento que dispara evento após tempo específico (setTimeout).

**Monitoring Loop**: Loop de verificação de condições que roda a cada 100ms (padrão).

**environmentConfig**: Objeto que contém configuração do ambiente (entidades, atributos) acessível via `context.model.environmentConfig`.

**Logging Narrativo**: Sistema de logs que transforma eventos técnicos em narrativas legíveis.

**JSONL**: JSON Lines - formato de log onde cada linha é um objeto JSON válido.

---

## ⚡ Quick Start

### 1. Ler Visão Geral
```bash
cat README.md | grep -A 20 "EventScheduler"
```

### 2. Ver Exemplo Rápido
```bash
cat EVENT-SCHEDULER-QUICK-REFERENCE.md | head -n 100
```

### 3. Executar Teste
```bash
node environment-simulator.js generated/AGV-completo-env-scen.js --scenario=MyScenariosExecution | grep EventScheduler
```

### 4. Analisar Logs
```bash
cat logs/sysadl-execution-*.jsonl | jq 'select(.what | contains("event"))'
```

---

**Framework:** SysADL Framework v0.4  
**Fase:** 5.2 - EventScheduler Implementation  
**Status:** ✅ COMPLETO  
**Data:** 05 de novembro de 2025

---

_Para mais informações, consulte os documentos listados acima ou abra uma issue no repositório._
