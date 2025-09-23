class SysADLModel {
  constructor() {
    this.packages = [];
    this.components = {};
    this.connectors = {};
    this.ports = {};
    this.flows = [];
    this.executables = {};
    this.activities = {};
    this.actions = {};
    this.constraints = {};
    this.dataTypes = {};
    this.allocations = [];
    this.configurations = [];
  }
}

class SysADLComponent {
  constructor(name, isBoundary = false) {
    this.name = name;
    this.isBoundary = isBoundary;
    this.ports = [];
    this.subcomponents = [];
    this.connectors = [];
    this.activities = [];
    this.state = {};
  }
}

class SysADLPort {
  constructor(name, direction, type, component) {
    this.name = name;
    this.direction = direction;
    this.type = type;
    this.component = component;
    this.value = null;
  }
}

class SysADLConnector {
  constructor(name) {
    this.name = name;
    this.ports = [];
    this.flows = [];
    this.bindings = [];
  }
}

class SysADLFlow {
  constructor(type, source, target) {
    this.type = type;
    this.source = source;
    this.target = target;
  }
}

class SysADLExecutable {
  constructor(name, params, returnType, body) {
    this.name = name;
    this.params = params;
    this.returnType = returnType;
    this.body = body;
  }
}

class SysADLActivity {
  constructor(name, inParams, outParams, body) {
    this.name = name;
    this.inParams = inParams;
    this.outParams = outParams;
    this.body = body;
  }
}

class SysADLAction {
  constructor(name, inParams, returnType, constraints) {
    this.name = name;
    this.inParams = inParams;
    this.returnType = returnType;
    this.constraints = constraints;
  }
}

class SysADLConstraint {
  constructor(name, equation) {
    this.name = name;
    this.equation = equation;
  }
}

class SysADLDataType {
  constructor(name, fields = []) {
    this.name = name;
    this.fields = fields;
  }
}