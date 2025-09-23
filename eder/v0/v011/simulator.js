function simulateSysADL(model, log) {
  log("Iniciando simulação...");
  const state = {};

  // Inicializar estado
  log("Inicializando portas...");
  Object.entries(model.ports).forEach(([key, port]) => {
    state[key] = getDefaultValue(port.type);
    log(`Porta ${key} inicializada com: ${JSON.stringify(state[key])}`);
  });

  // Propagar fluxos
  log("Propagando fluxos...");
  model.flows.forEach(flow => {
    if (state[flow.source] !== null) {
      state[flow.target] = state[flow.source];
      log(`Fluxo ${flow.source} -> ${flow.target}: ${JSON.stringify(state[flow.target])}`);
    }
  });

  // Executar atividades
  log("Executando atividades...");
  Object.values(model.activities).forEach(activity => {
    log(`Processando atividade ${activity.name}`);
    activity.body.flows.forEach(flow => {
      const srcKey = `${activity.name}.${flow.source}`;
      const tgtKey = `${activity.name}.${flow.target}`;
      if (state[srcKey] !== null) {
        state[tgtKey] = state[srcKey];
        log(`Fluxo interno ${srcKey} -> ${tgtKey}: ${JSON.stringify(state[tgtKey])}`);
      }
    });
    activity.body.delegations.forEach(del => {
      const action = model.actions[del.target];
      if (action) {
        const exec = Object.values(model.executables).find(e =>
          model.allocations.some(a => a.source === activity.name && a.target === e.name)
        );
        if (exec) {
          const params = activity.inParams.map(p => state[`${activity.name}.${p.name}`] || getDefaultValue(p.type));
          const result = evaluateExecutable(exec, params);
          state[`${activity.name}.${del.target}`] = result;
          log(`Atividade ${activity.name} executou ${del.target}: ${JSON.stringify(result)}`);
        }
      }
    });
  });

  // Verificar restrições
  log("Verificando restrições...");
  Object.values(model.constraints).forEach(constraint => {
    if (constraint.equation) {
      const context = { variables: { ...state } };
      const valid = evaluateConstraint(constraint.equation, context);
      log(`Restrição ${constraint.name} ${valid ? "passou" : "falhou"}: ${constraint.equation}`);
    }
  });

  log("Simulação concluída.");
  return state;
}