const fs = require('fs');

try {
    // Lê o arquivo gerado
    const content = fs.readFileSync('generated/AGV-completo-env-scen.js', 'utf8');
    
    // Busca a linha que contém o objeto events
    const eventsMatch = content.match(/events:\s*(\{.*?\})\s*}\);/s);
    
    if (eventsMatch) {
        console.log('✅ Objeto events encontrado!');
        
        try {
            // Extrai e parseia o JSON dos eventos
            let eventsJsonStr = eventsMatch[1];
            
            // Limpa e ajusta o JSON para parsing
            eventsJsonStr = eventsJsonStr.replace(/\n/g, ' ').replace(/\s+/g, ' ');
            
            // Tenta extrair um pequeno trecho para análise
            console.log('\n📊 Estrutura dos eventos (primeiros 500 caracteres):');
            console.log(eventsJsonStr.substring(0, 500) + '...');
            
            // Busca por padrões específicos
            const triggerMatches = eventsJsonStr.match(/"trigger":"([^"]+)"/g);
            const actionMatches = eventsJsonStr.match(/"actions":\[([^\]]*)\]/g);
            
            if (triggerMatches) {
                console.log('\n🎯 TRIGGERS encontrados:');
                triggerMatches.forEach((match, i) => {
                    const trigger = match.match(/"trigger":"([^"]+)"/)[1];
                    console.log(`  ${i+1}. ${trigger}`);
                });
            }
            
            if (actionMatches) {
                console.log('\n⚡ ACTIONS encontradas:');
                actionMatches.forEach((match, i) => {
                    console.log(`  ${i+1}. ${match.substring(0, 100)}...`);
                });
            }
            
            // Busca por cadeias específicas de eventos
            const chainPatterns = [
                'cmdSupervisor',
                'AGV1NotifLoad', 
                'AGV1NotifArriveA',
                'cmdAGV1loadA',
                'AGV1atachPartX'
            ];
            
            console.log('\n🔗 CADEIAS DE EVENTOS encontradas:');
            chainPatterns.forEach(pattern => {
                if (eventsJsonStr.includes(pattern)) {
                    console.log(`  ✅ ${pattern} - presente`);
                } else {
                    console.log(`  ❌ ${pattern} - ausente`);
                }
            });
            
            // Busca por estruturas "ON...THEN"
            const onThenMatches = eventsJsonStr.match(/"trigger":"([^"]+)"[^}]*"actions":\[[^\]]*"name":"([^"]+)"/g);
            if (onThenMatches) {
                console.log('\n🔄 RELAÇÕES ON->THEN encontradas:');
                onThenMatches.forEach((match, i) => {
                    const triggerMatch = match.match(/"trigger":"([^"]+)"/);
                    const actionMatch = match.match(/"name":"([^"]+)"/);
                    if (triggerMatch && actionMatch) {
                        console.log(`  ${i+1}. ON ${triggerMatch[1]} → THEN ${actionMatch[1]}`);
                    }
                });
            }
            
        } catch (parseError) {
            console.log('⚠️ Erro ao parsear JSON dos eventos, mas estrutura foi encontrada');
            console.log('📋 Analisando via regex...');
            
            // Análise alternativa via regex
            const rulesMatches = eventsJsonStr.match(/"rules":\[([^\]]*)\]/g);
            if (rulesMatches) {
                console.log(`\n✅ ${rulesMatches.length} conjuntos de rules encontrados`);
            }
        }
        
    } else {
        console.log('❌ Objeto events não encontrado');
    }
    
} catch (error) {
    console.error('❌ Erro ao analisar arquivo:', error.message);
}