(function(global) {
  function executeSysADLCode(code, logElement, jsOutputElement) {
    const { parseSysADL } = global.SysADL;
    const { generateJavaScript } = global.SysADL;

    const { ast, log } = parseSysADL(code);
    logElement.textContent = log;

    if (ast) {
      const { jsCode, systemModel, symbolTable } = generateJavaScript(ast);
      jsOutputElement.textContent = jsCode;
      try {
        eval(jsCode);
        const result = simulateSystem(systemModel, symbolTable);
        logElement.textContent += `\n\nResultado da simulação:\n${JSON.stringify(result, null, 2)}`;
      } catch (e) {
        logElement.textContent += `\nErro de execução: ${e.message}`;
      }
    }
  }

  function simulateSystem(model, symbolTable) {
    const results = {};

    // Inicializar valores iniciais para o sistema RTC
    model.components["s1"].setPortValue("current1", new SysADL.ValueType("FahrenheitTemperature", 77)); // 25°C
    model.components["s2"].setPortValue("current2", new SysADL.ValueType("FahrenheitTemperature", 77));
    model.components["s3"].setPortValue("detectedS", new SysADL.ValueType("Boolean", true));
    model.components["ui"].setPortValue("desired", new SysADL.ValueType("CelsiusTemperature", 22));

    // Executar fluxos de conectores
    model.connectors["c1"].transferData(model.components["s1"], "current1", model.components["rtc"], "localtemp1");
    model.connectors["c2"].transferData(model.components["s2"], "current2", model.components["rtc"], "localTemp2");
    model.connectors["pc"].transferData(model.components["s3"], "detectedS", model.components["rtc"], "detected");
    model.connectors["uc"].transferData(model.components["ui"], "desired", model.components["rtc"], "userTemp");

    // Executar atividades
    const localTemp1 = model.executables["FahrenheitToCelsiusEx"](model.components["rtc"].getPortValue("localtemp1").value);
    const localTemp2 = model.executables["FahrenheitToCelsiusEx"](model.components["rtc"].getPortValue("localTemp2").value);
    const averageTemp = model.executables["CalculateAverageTemperatureEx"](localTemp1, localTemp2);
    const userTemp = model.components["rtc"].getPortValue("userTemp").value;
    const presence = model.components["rtc"].getPortValue("detected").value;

    const targetTemp = model.executables["CheckPresenceToSetTemperature"](presence, userTemp);
    const commands = model.executables["CompareTemperatureEx"](targetTemp, averageTemp);

    model.connectors["cc1"].transferData(model.components["rtc"], "heating", model.components["a1"], "controllerH");
    model.connectors["cc2"].transferData(model.components["rtc"], "cooling", model.components["a2"], "controllerC");

    results.heaterCommand = model.components["a1"].getPortValue("controllerH");
    results.coolerCommand = model.components["a2"].getPortValue("controllerC");

    return results;
  }

  global.SysADL = global.SysADL || {};
  global.SysADL.executeSysADLCode = executeSysADLCode;
})(window);