(function(global) {
  class ValueType {
    constructor(name, value) {
      this.name = name;
      this.value = value;
    }
  }

  class Enum {
    constructor(name, value) {
      this.name = name;
      this.value = value;
    }
  }

  class Component {
    constructor(name, ports, configuration) {
      this.name = name;
      this.ports = ports || [];
      this.configuration = configuration || null;
      this.data = {};
      this.activities = {};
    }

    setPortValue(portName, value) {
      this.data[portName] = value;
    }

    getPortValue(portName) {
      return this.data[portName];
    }

    addActivity(activityName, activity) {
      this.activities[activityName] = activity;
    }

    executeActivity(activityName, inputs) {
      return this.activities[activityName](inputs);
    }
  }

  class Connector {
    constructor(name, flows, bindings) {
      this.name = name;
      this.flows = flows || [];
      this.bindings = bindings || [];
    }

    transferData(sourceComponent, sourcePort, targetComponent, targetPort) {
      const value = sourceComponent.getPortValue(sourcePort);
      targetComponent.setPortValue(targetPort, value);
      return value;
    }
  }

  class SystemModel {
    constructor() {
      this.components = {};
      this.connectors = {};
      this.allocations = [];
      this.executables = {};
    }

    addComponent(name, component) {
      this.components[name] = component;
    }

    addConnector(name, connector) {
      this.connectors[name] = connector;
    }

    addAllocation(allocation) {
      this.allocations.push(allocation);
    }

    addExecutable(name, fn) {
      this.executables[name] = fn;
    }

    executeFlow(flow) {
      const sourceComp = this.components[flow.source.split('.')[0]];
      const targetComp = this.components[flow.target.split('.')[0]];
      const sourcePort = flow.source.split('.')[1] || flow.source;
      const targetPort = flow.target.split('.')[1] || flow.target;
      return this.connectors[flow.connector].transferData(sourceComp, sourcePort, targetComp, targetPort);
    }

    executeActivity(activityName, inputs) {
      const allocation = this.allocations.find(a => a.source === activityName);
      if (allocation) {
        const component = this.components[allocation.target];
        return component.executeActivity(activityName, inputs);
      }
      return null;
    }
  }

  global.SysADL = global.SysADL || {};
  global.SysADL.ValueType = ValueType;
  global.SysADL.Enum = Enum;
  global.SysADL.Component = Component;
  global.SysADL.Connector = Connector;
  global.SysADL.SystemModel = SystemModel;
})(window);