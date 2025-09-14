const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit } = require('../SysADLBase');

// Types
const DM_Temperature = dimension('Temperature');
const UN_Celsius = unit('Celsius');
const UN_Fahrenheit = unit('Fahrenheit');
const VT_temperature = valueType('temperature', { extends: Real, dimension: DM_Temperature });
const VT_FahrenheitTemperature = valueType('FahrenheitTemperature', { extends: VT_temperature, unit: UN_Fahrenheit, dimension: DM_Temperature });
const VT_CelsiusTemperature = valueType('CelsiusTemperature', { extends: VT_temperature, unit: UN_Celsius, dimension: DM_Temperature });
const EN_Command = new Enum("On", "Off");
const DT_Commands = dataType('Commands', { heater: EN_Command, cooler: EN_Command });

// Ports
class PT_TestPort extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "CelsiusTemperature" }, ...opts });
  }
}

// Components
class CP_SubCP extends Component { }
class CP_TestCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_TestPort("temp", "out", { owner: name }));
    }
}

class TypesTest extends Model {
  constructor(){
    super("TypesTest");
    this.TestCP = new CP_TestCP("TestCP", { sysadlDefinition: "TestCP" });
    this.addComponent(this.TestCP);
    this.TestCP.sub = new CP_SubCP("sub", { sysadlDefinition: "SubCP" });
    this.TestCP.addComponent(this.TestCP.sub);

  }
}

const __portAliases = {};
function createModel(){ return new TypesTest(); }
module.exports = { createModel, TypesTest, __portAliases, VT_temperature, VT_FahrenheitTemperature, VT_CelsiusTemperature, EN_Command, DT_Commands, DM_Temperature, UN_Celsius, UN_Fahrenheit, PT_TestPort };