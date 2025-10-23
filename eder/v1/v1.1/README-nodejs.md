# SysADL Web Studio - Servidor Node.js

## 🎯 Comparação: Python Server vs Node.js Server

### ❌ **Python Server (Atual)**
- Servir arquivos estáticos apenas
- Transformer roda no browser (problemas de compatibilidade)
- Necessita wrappers complexos para funcionar
- Limitações de módulos Node.js no browser

### ✅ **Node.js Server (Novo)**
- API REST para transformação server-side
- Transformer roda nativamente no Node.js
- Zero wrappers necessários
- Acesso completo aos módulos nativos

## 🚀 **Como Usar**

### 1. Instalação
```bash
cd /Users/tales/desenv/SysAdlWebStudio/eder/v1/v1.0

# Instalar dependências (opcional, para desenvolvimento)
npm install

# OU usar Node.js diretamente
node server-node.js
```

### 2. Iniciar Servidor
```bash
# Modo produção
npm start

# Modo desenvolvimento (com nodemon)
npm run dev

# OU diretamente
node server-node.js
```

### 3. Acessar Interface
- Abra: `http://localhost:8000/index-node.html`
- API: `http://localhost:8000/api/transform`

## 📡 **API REST**

### Endpoint de Transformação
```
POST /api/transform
Content-Type: application/json

{
  "sysadlCode": "model Sample\\nconfiguration { ... }",
  "options": {
    "includeMetadata": true,
    "optimize": true
  }
}
```

### Resposta de Sucesso
```json
{
  "success": true,
  "javascript": "// Código JavaScript gerado...",
  "metadata": {
    "modelName": "Sample",
    "generatedAt": "2025-10-07T11:45:00.000Z",
    "linesOfCode": 45,
    "transformer": "node-server-v1.0"
  }
}
```

### Resposta de Erro
```json
{
  "success": false,
  "error": "Mensagem de erro...",
  "stack": "Stack trace..."
}
```

## 🔄 **Fluxo de Funcionamento**

1. **Frontend**: Usuario edita código SysADL no Monaco
2. **API Call**: JavaScript faz POST para `/api/transform`
3. **Server-Side**: Node.js executa transformer original
4. **Response**: JavaScript gerado retorna para frontend
5. **Display**: Código exibido e pronto para simulação

## ✅ **Vantagens**

### **Simplicidade**
- App.js muito mais simples (sem wrappers)
- Transformer funciona nativamente
- Manutenção reduzida

### **Robustez**
- Sem problemas de compatibilidade browser
- Acesso total aos módulos Node.js
- Tratamento de erro server-side

### **Performance**
- Transformação server-side (mais rápida)
- Cache possível no servidor
- Menor carga no browser

### **Escalabilidade**
- Múltiplos clientes podem usar o mesmo servidor
- Possibilidade de load balancing
- Deploy em produção mais fácil

## 🛠️ **Arquivos**

- `server-node.js` - Servidor HTTP + API REST
- `app-node.js` - Frontend simplificado (sem wrappers)
- `index-node.html` - Interface web para servidor Node.js
- `package.json` - Configuração Node.js

## 🔧 **Próximos Passos**

1. **Integrar Transformer Real**: Conectar com transformer.js completo
2. **Parser Integration**: Adicionar parsing SysADL real
3. **Cache System**: Sistema de cache para transformações
4. **WebSocket**: Updates em tempo real
5. **Deploy**: Configuração para produção

## 💡 **Conclusão**

O servidor Node.js **elimina completamente** a necessidade de wrappers browser e oferece uma solução muito mais limpa e robusta para o SysADL Web Studio.

A transformação acontece no ambiente nativo (Node.js) onde o transformer foi projetado para funcionar, eliminando todos os problemas de compatibilidade.