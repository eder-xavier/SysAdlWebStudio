const Command = Object.freeze({
    On: "On",
    Off: "Off"
});

class Temperature {
    constructor(value) {
        this.value = value;
    }
}

class CelsiusTemperature extends Temperature {
    static unit = 'Celsius';
}

class FahrenheitTemperature extends Temperature {
    constructor(value) {
        super(value);
    }
    static unit = 'Fahrenheit';
}

class Commands {
    constructor(heater, cooler) {
        this.heater = heater;
        this.cooler = cooler;
    }
}

// Para AGV
class Location {
    constructor(name) {
        this.value = name;
    }
}

class Status {
    constructor(location, destination, command) {
        this.location = location;
        this.destination = destination;
        this.command = command;
    }
}

class VehicleData {
    constructor(destination, command) {
        this.destination = destination;
        this.command = command;
    }
}

function convertFahrenheitToCelsius(f) {
    return new CelsiusTemperature(5 * (f.value - 32) / 9);
}