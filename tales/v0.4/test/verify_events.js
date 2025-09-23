const fs = require('fs');

try {
    // Lê o arquivo gerado
    const content = fs.readFileSync('generated/AGV-completo-env-scen.js', 'utf8');
    
    // Busca o objeto events
    const eventsMatch = content.match(/events:\s*({[\s\S]*?})\s*}\);/);
    
    if (eventsMatch) {
        console.log('✅ Objeto events encontrado!');
        
        // Extrai o conteúdo do objeto events
        const eventsContent = eventsMatch[1];
        
        // Lista os eventos encontrados
        const eventMatches = eventsContent.match(/(\w+Events):\s*{/g);
        
        if (eventMatches) {
            console.log('\n📋 Eventos encontrados:');
            eventMatches.forEach(match => {
                const eventName = match.replace(':', ' {', '').trim();
                console.log(`  • ${eventName}`);
            });
            
            console.log(`\n✅ Total de ${eventMatches.length} tipos de eventos gerados`);
            
            // Verifica se há triggers definidos
            const triggerMatches = eventsContent.match(/trigger:\s*"([^"]+)"/g);
            if (triggerMatches) {
                console.log(`\n🎯 Total de ${triggerMatches.length} triggers encontrados:`);
                triggerMatches.forEach((match, i) => {
                    const trigger = match.match(/"([^"]+)"/)[1];
                    console.log(`  ${i+1}. ${trigger}`);
                });
            }
            
            // Verifica se há actions definidas
            const actionMatches = eventsContent.match(/actions:\s*\[([^\]]+)\]/g);
            if (actionMatches) {
                console.log(`\n⚡ Actions encontradas: ${actionMatches.length}`);
            }
            
        } else {
            console.log('❌ Nenhum evento específico encontrado no objeto events');
        }
    } else {
        console.log('❌ Objeto events não encontrado no arquivo gerado');
        
        // Verifica se há pelo menos a estrutura base
        if (content.includes('events:')) {
            console.log('ℹ️ A palavra "events:" foi encontrada, mas a estrutura pode estar incorreta');
        }
    }
    
    // Verifica as classes de eventos individuais
    const eventClassMatches = content.match(/class\s+(\w+Events)\s+extends\s+Event/g);
    if (eventClassMatches) {
        console.log('\n🏗️ Classes de eventos encontradas:');
        eventClassMatches.forEach(match => {
            const className = match.match(/class\s+(\w+Events)/)[1];
            console.log(`  • ${className}`);
        });
    }
    
} catch (error) {
    console.error('❌ Erro ao verificar arquivo:', error.message);
}