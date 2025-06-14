function simulate(jsCode) {
    try {
        // Create context with runtime classes
        const context = {
            CelsiusTemperature,
            FahrenheitTemperature,
            Commands,
            Command,
            Location,
            Status,
            VehicleData,
            convertFahrenheitToCelsius,
            console,
            inputs: {
                fahrenheit: new FahrenheitTemperature(68),
                temp1: new CelsiusTemperature(20),
                temp2: new CelsiusTemperature(22),
                presence: true,
                userTemp: new CelsiusTemperature(21),
                target: new CelsiusTemperature(21),
                average: new CelsiusTemperature(20),
                cmds: new Commands(Command.Off, Command.Off),
                // Para AGV
                location: new Location('Station1'),
                destination: new Location('Station2'),
                statusMotor: 'started',
                statusArm: 'loaded',
                move: new VehicleData('Station3', 'load')
            },
            results: {}
        };

        // Executar código gerado
        const func = new Function('context', `
            with (context) {
                ${jsCode}
                return simulateSysADL(inputs);
            }
        `);
        const result = func(context);

        return JSON.stringify(result, null, 2);
    } catch (error) {
        return 'Simulation error: ' + error.message;
    }
}