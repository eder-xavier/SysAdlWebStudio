#!/usr/bin/env node
// Servidor Node.js para SysADL Transformer
// Elimina necessidade de wrappers browser

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Importar módulos necessários para usar o transformer
const { spawn } = require('child_process');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const STATIC_DIR = __dirname; // Servir arquivos da pasta atual

// MIME types para arquivos estáticos
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.sysadl': 'text/plain'
};

function getContentType(filePath) {
  const ext = path.extname(filePath);
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // CORS headers para desenvolvimento
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API Endpoint: Transformação SysADL → JavaScript
  if (pathname === '/api/transform' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { sysadlCode, options = {} } = JSON.parse(body);
        
        console.log('📥 Transformação solicitada, tamanho:', sysadlCode.length);
        
        // Usar o transformer original diretamente
        const result = await transformSysADL(sysadlCode, options);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          javascript: result.code,
          metadata: result.metadata
        }));
        
        console.log('✅ Transformação concluída com sucesso');
        
      } catch (error) {
        console.error('❌ Erro na transformação:', error && error.message ? error.message : error);
        if (error && error.stderr) console.error('--- transformer stderr ---\n', error.stderr);
        if (error && error.stdout) console.error('--- transformer stdout ---\n', error.stdout);

        const resp = {
          success: false,
          error: error && error.message ? error.message : String(error),
          stack: error && error.stack ? error.stack : null
        };
        if (error && error.stderr) resp.stderr = error.stderr;
        if (error && error.stdout) resp.stdout = error.stdout;

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resp));
      }
    });
    
    return;
  }
  
  // Servir arquivos estáticos
  let filePath = path.join(STATIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Verificar se arquivo existe
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 - Arquivo não encontrado');
    return;
  }
  
  // Verificar se é diretório
  if (fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - Index não encontrado');
      return;
    }
  }
  
  // Servir arquivo
  try {
    const content = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 - Erro interno do servidor');
  }
});

// Função de transformação usando o transformer.js real via processo filho
async function transformSysADL(sysadlCode, options = {}) {
  try {
    console.log('🔄 Iniciando transformação com transformer.js real...');
    
    // Extrair nome do modelo do código SysADL
    const modelName = extractModelName(sysadlCode) || 'UnknownModel';
    
    // Criar arquivo temporário com nome do modelo (será substituído se existir)
    const tempInputFile = path.join(__dirname, 'temp', `${modelName}.sysadl`);
    const tempDir = path.dirname(tempInputFile);
    
    // Criar diretório temporário se não existir
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Escrever código SysADL no arquivo temporário
    fs.writeFileSync(tempInputFile, sysadlCode, 'utf8');
    console.log('📝 Arquivo temporário criado:', tempInputFile);
    
    // Executar transformer.js como processo filho
    const result = await runTransformer(tempInputFile);
    
    // Limpar arquivo temporário
    try {
      fs.unlinkSync(tempInputFile);
      console.log('🧹 Arquivo temporário removido:', tempInputFile);
    } catch (cleanupError) {
      console.warn('⚠️ Erro ao limpar arquivo temporário:', cleanupError.message);
    }
    

    
    return result;
    
  } catch (error) {
    throw new Error(`Erro na transformação: ${error.message}`);
  }
}

// Função para executar o transformer.js como processo filho
function runTransformer(inputFile) {
  return new Promise((resolve, reject) => {
    const transformerPath = path.join(__dirname, 'transformer.js');
    // Passar explicitamente um outFile para garantir nome de saída determinístico
    const modelName = path.basename(inputFile, path.extname(inputFile));
    const outFilePath = path.join(__dirname, 'generated', `${modelName}.js`);
    const args = [transformerPath, inputFile, outFilePath];
    
    console.log('🚀 Executando:', 'node', args.join(' '));
    
    const child = spawn('node', args, {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Transformer falhou:', stderr);
        const err = new Error(`Transformer falhou com código ${code}`);
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
        return;
      }
      
      console.log('✅ Transformer executado com sucesso');
      
      try {
        // Procurar pelos arquivos gerados na pasta 'generated'
        // Preferir o arquivo outFile explicitamente solicitado
        const generatedDir = path.join(__dirname, 'generated');
        let generatedJsFile = outFilePath;

        // Se outFile não existir por algum motivo, tentar heurísticas antigas
        if (!generatedJsFile || !fs.existsSync(generatedJsFile)) {
          try {
            const inputModelName = extractModelName(fs.readFileSync(inputFile, 'utf8')) || modelName || 'Model';
            const possibleFiles = [
              path.join(generatedDir, `${inputModelName}.js`),
              path.join(generatedDir, `${inputModelName}Model.js`),
              path.join(generatedDir, `${inputModelName}-env-scen.js`)
            ];

            for (const file of possibleFiles) {
              if (fs.existsSync(file)) {
                generatedJsFile = file;
                break;
              }
            }

            if ((!generatedJsFile || !fs.existsSync(generatedJsFile)) && fs.existsSync(generatedDir)) {
              const files = fs.readdirSync(generatedDir)
                .filter(f => f.endsWith('.js'))
                .map(f => ({
                  name: f,
                  path: path.join(generatedDir, f),
                  mtime: fs.statSync(path.join(generatedDir, f)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

              if (files.length > 0) {
                generatedJsFile = files[0].path;
              }
            }
          } catch (heuristicError) {
            console.warn('⚠️ Heurística de localização do arquivo gerado falhou:', heuristicError.message);
            generatedJsFile = null;
          }
        }
        
        if (!generatedJsFile || !fs.existsSync(generatedJsFile)) {
          throw new Error('Arquivo JavaScript gerado não foi encontrado');
        }
        
        const generatedCode = fs.readFileSync(generatedJsFile, 'utf8');
        console.log('📄 Código gerado carregado de:', generatedJsFile);

        // Garantir que inputModelName exista (escopo/fallback seguro)
        let inputModelName;
        try {
          inputModelName = extractModelName(fs.readFileSync(inputFile, 'utf8')) || modelName || 'Model';
        } catch (e) {
          inputModelName = modelName || 'Model';
        }

        resolve({
          code: generatedCode,
          metadata: {
            modelName: inputModelName,
            generatedAt: new Date().toISOString(),
            linesOfCode: generatedCode.split('\n').length,
            transformer: 'transformer.js-native',
            generatedFile: generatedJsFile,
            stdout: stdout.trim(),
            stderr: stderr.trim()
          }
        });
        
      } catch (parseError) {
        reject(new Error(`Erro ao processar resultado: ${parseError.message}`));
      }
    });
    
    child.on('error', (error) => {
      console.error('❌ Erro ao executar transformer:', error);
      const err = new Error(`Erro ao executar transformer: ${error.message}`);
      err.stderr = String(error && error.stack ? error.stack : error);
      reject(err);
    });
  });
}

// Função auxiliar para extrair nome do modelo
function extractModelName(sysadlCode) {
  const match = sysadlCode.match(/model\s+(\w+)/i);
  return match ? match[1] : null;
}

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor SysADL iniciado em http://localhost:${PORT}`);
  console.log(`📡 API disponível em http://localhost:${PORT}/api/transform`);
  console.log(`📁 Servindo arquivos estáticos de: ${STATIC_DIR}`);
});

// Tratamento de sinais
process.on('SIGINT', () => {
  console.log('\n🛑 Servidor interrompido pelo usuário');
  server.close(() => {
    console.log('✅ Servidor fechado com segurança');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Servidor terminado');
  server.close(() => {
    process.exit(0);
  });
});