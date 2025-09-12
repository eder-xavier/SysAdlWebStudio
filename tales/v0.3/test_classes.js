const { Int, Boolean, String, Void, Real, temperature, FahrenheitTemperature, CelsiusTemperature, Command, On, Off, Commands } = require('./generated/RTC.js');

// Teste de instanciação das classes
console.log('Testando instanciação das classes SysADL:');

// Teste Int
try {
  const intValue = new Int(42);
  console.log('Int(42):', intValue);
} catch (e) {
  console.log('Erro em Int:', e.message);
}

// Teste Int com valor inválido
try {
  const invalidInt = new Int('abc');
  console.log('Int("abc"):', invalidInt);
} catch (e) {
  console.log('Erro esperado em Int("abc"):', e.message);
}

// Teste Boolean
try {
  const boolValue = new Boolean(true);
  console.log('Boolean(true):', boolValue);
} catch (e) {
  console.log('Erro em Boolean:', e.message);
}

// Teste String
try {
  const strValue = new String('hello');
  console.log('String("hello"):', strValue);
} catch (e) {
  console.log('Erro em String:', e.message);
}

// Teste Real
try {
  const realValue = new Real(3.14);
  console.log('Real(3.14):', realValue);
} catch (e) {
  console.log('Erro em Real:', e.message);
}

// Teste Real com valor inválido
try {
  const invalidReal = new Real('not a number');
  console.log('Real("not a number"):', invalidReal);
} catch (e) {
  console.log('Erro esperado em Real("not a number"):', e.message);
}

// Teste Enum Command
console.log('Command.On:', Command.On);
console.log('Command.Off:', Command.Off);

// Teste Commands (datatype)
try {
  const commandsValue = new Commands({ heater: Command.On, cooler: Command.Off });
  console.log('Commands({ heater: Command.On, cooler: Command.Off }):', commandsValue);
} catch (e) {
  console.log('Erro em Commands:', e.message);
}

// Teste Commands com objeto inválido
try {
  const invalidCommands = new Commands('not an object');
  console.log('Commands("not an object"):', invalidCommands);
} catch (e) {
  console.log('Erro esperado em Commands("not an object"):', e.message);
}

// Teste CelsiusTemperature (derived type)
try {
  const celsiusTemp = new CelsiusTemperature(25);
  console.log('CelsiusTemperature(25):', celsiusTemp);
  console.log('Unidade:', CelsiusTemperature.unit);
  console.log('Dimensão:', CelsiusTemperature.dimension);
} catch (e) {
  console.log('Erro em CelsiusTemperature:', e.message);
}

// Teste FahrenheitTemperature (derived type)
try {
  const fahrenheitTemp = new FahrenheitTemperature(77);
  console.log('FahrenheitTemperature(77):', fahrenheitTemp);
  console.log('Unidade:', FahrenheitTemperature.unit);
  console.log('Dimensão:', FahrenheitTemperature.dimension);
} catch (e) {
  console.log('Erro em FahrenheitTemperature:', e.message);
}

console.log('Testes concluídos.');