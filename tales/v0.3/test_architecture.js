const Simple = require('./generated/Simple');

console.log('=== Testando Arquitetura Melhorada ===');

try {
  const model = new Simple.SysADLModel();
  model.injectModelReference();
  
  // Execute assignment logic after model injection
  console.log('Executando atribuição manual de referências após injeção...');
  
  console.log('Testando walkConnectors:');
  let connectorCount = 0;
  
  // Test instanceof directly  
  console.log(`c1 instanceof Connector: ${model.SystemCP.connectors['c1'] instanceof require('./SysADLBase').Connector}`);
  
  // Debug walkConnectors step by step
  console.log('Debug walkConnectors:');
  console.log('model.connectors:', Object.keys(model.connectors || {}));
  console.log('model.SystemCP.connectors:', Object.keys(model.SystemCP.connectors || {}));
  
  // Test manual assignment
  model.SystemCP.connectors['c1'].activityName = "FarToCelAC";
  model.SystemCP.connectors['c2'].activityName = "FarToCelAC";
  console.log('Atribuição manual feita para c1 e c2');
  
  model.walkConnectors(c => {
    connectorCount++;
    console.log(`  Encontrado conector: ${c.name}, tipo: ${c.constructor.name}`);
  });
  console.log(`Total de conectores encontrados pelo walkConnectors: ${connectorCount}`);

  console.log('Chaves de atividade registradas:');
  console.log(Object.keys(model._activities));

  console.log('\nComponentes com referência de atividade:');
  let found = false;
  model.walkComponents(comp => {
    console.log(`  Componente: ${comp.name}, activityName: ${comp.activityName || 'undefined'}`);
    if (comp.activityName) {
      found = true;
      const activity = comp.getActivity();
      console.log(`    -> getActivity() retorna: ${activity ? activity.constructor.name : 'null'}`);
    }
  });

  console.log('\nTestando execução manual da lógica de atribuição:');
  console.log('Verificando conectores c1 e c2 (deveriam ter FarToCelAC):');
  const c1 = model.SystemCP.connectors['c1'];
  const c2 = model.SystemCP.connectors['c2'];
  console.log(`c1.constructor.name: ${c1.constructor.name}`);
  console.log(`c1.constructor.name.includes("FarToCelCN"): ${c1.constructor.name.includes("FarToCelCN")}`);
  console.log(`c1.activityName: ${c1.activityName}`);
  
  console.log('\nVerificando componente tempMon (deveria ter TempMonitorAC):');
  const tempMon = model.SystemCP.tempMon;
  console.log(`tempMon.props: ${JSON.stringify(tempMon.props)}`);
  console.log(`tempMon.props.sysadlDefinition: ${tempMon.props.sysadlDefinition}`);
  console.log(`tempMon.activityName: ${tempMon.activityName}`);

  if (!found && !foundConnector) {
    console.log('Nenhum elemento com activityName encontrado');
  }

  console.log('\n=== Comparação das Abordagens ===');
  console.log('ANTES: registerActivity("TempMonitorAC::TempMonitorCP", activity)');
  console.log('AGORA: registerActivity("TempMonitorAC", activity)');
  console.log('       + element.activityName = "TempMonitorAC"');
  console.log('       + element.getActivity() // lazy loading');

} catch (error) {
  console.error('Erro:', error.message);
  console.error(error.stack);
}