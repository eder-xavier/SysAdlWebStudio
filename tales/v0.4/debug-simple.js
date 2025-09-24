const fs = require('fs');
const parser = require('./sysadl-parser.js');

const content = fs.readFileSync('AGV-completo.sysadl', 'utf8');
console.log('📄 Parsing SysADL file...');

try {
  const ast = parser.parse(content);
  console.log('✅ Parse successful');
  console.log('📊 AST type:', typeof ast);
  console.log('📊 AST keys:', Object.keys(ast));
  
  if (ast.members) {
    console.log('📦 Members found:', ast.members.length);
    console.log('📋 Member types:', ast.members.map(el => el.type));
    
    // Find environment definition
    const envDefIndex = ast.members.findIndex(el => el.type === 'EnvironmentDefinition');
    console.log('🔍 EnvironmentDefinition index:', envDefIndex);
    
    if (envDefIndex >= 0) {
      const envDef = ast.members[envDefIndex];
      console.log('🔍 Environment found:', envDef.name);
      console.log('🔧 Environment keys:', Object.keys(envDef));
      
      if (envDef.entities) {
        console.log('📦 Entities found:', envDef.entities.length);
        
        envDef.entities.forEach((entity, i) => {
          if (i < 3) { // Only first 3 entities
            console.log(`\n🏷️  Entity ${i}: ${entity.name} (${entity.type})`);
            console.log('      Entity keys:', Object.keys(entity));
            
            if (entity.propertyDefs) {
              console.log('   📋 Property Definitions:', entity.propertyDefs.length);
              entity.propertyDefs.forEach(prop => {
                console.log(`      - ${prop.name || prop.id} (${prop.type})`);
              });
            } else {
              console.log('   📋 No propertyDefs array');
            }
            
            if (entity.roles) {
              console.log('   🎭 Roles:', entity.roles.length);
              entity.roles.forEach(role => {
                console.log(`      - ${role.name || role.id} (${role.type})`);
              });
            } else {
              console.log('   🎭 No roles array');
            }
          }
        });
      } else {
        console.log('❌ No entities property in environment definition');
      }
    } else {
      console.log('❌ No EnvironmentDefinition found');
      console.log('   Available elements:');
      ast.members.slice(0, 10).forEach((el, i) => {
        console.log(`     ${i}: ${el.type} - ${el.name || 'unnamed'}`);
      });
    }
  } else {
    console.log('❌ No members property in AST');
  }
} catch (error) {
  console.error('❌ Parse error:', error.message);
}