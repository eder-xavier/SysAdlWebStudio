const fs = require('fs');
const parser = require('./sysadl-parser.js');

const content = fs.readFileSync('AGV-completo.sysadl', 'utf8');
console.log('📄 Parsing SysADL file...');

try {
  const ast = parser.parse(content);
  console.log('✅ Parse successful');
  console.log('📊 AST structure:', Object.keys(ast));
  
  if (ast.elements) {
    console.log('📦 Elements found:', ast.elements.length);
    
    // Find environment definition
    const envDef = ast.elements.find(el => el.type === 'EnvironmentDefinition');
    if (envDef) {
      console.log('🔍 Environment found:', envDef.name);
      console.log('� Environment keys:', Object.keys(envDef));
      console.log('�📦 Entities found:', envDef.entities?.length || 0);
      
      if (envDef.entities && envDef.entities.length > 0) {
        const entity = envDef.entities[0];
        console.log('\n🏷️  First entity keys:', Object.keys(entity));
        console.log('   Entity structure:');
        console.log('   ', JSON.stringify(entity, null, 2));
      }
    } else {
      console.log('❌ No EnvironmentDefinition found in elements');
      // Show what elements we do have
      ast.elements.forEach((el, i) => {
        console.log(`   Element ${i}: ${el.type}`);
      });
    }
  } else {
    console.log('❌ No elements property in AST');
    console.log('AST:', JSON.stringify(ast, null, 2));
  }
} catch (error) {
  console.error('❌ Parse error:', error.message);
}