Start
  = _ model:Model _ { return model; }

Model
  = "Model" _ name:Identifier _ "{" _ elements:(Element _)* "}" {
      return { type: "Model", name, elements: elements.map(e => e[0]) };
    }

Element
  = Package / Requirement / Style / Allocation

Package
  = "package" _ name:Identifier _ "{" _ declarations:(Declaration _)* "}" {
      return { type: "Package", name, declarations: declarations.map(d => d[0]) };
    }

Declaration
  = ValueType / Enum / DataType / PortDef / Block

ValueType
  = "value type" _ name:Identifier _ (":" _ base:Identifier)? ";" {
      return { type: "ValueType", name, base: base || null };
    }

Enum
  = "enum" _ name:Identifier _ "{" _ values:(Identifier (_ "," _ Identifier)*)? _ "}" {
      const allValues = values ? [values[0]].concat(values[1].map(v => v[3])) : [];
      return { type: "Enum", name, values: allValues };
    }

DataType
  = "datatype" _ name:Identifier _ "{" _ fields:(DataField _)* "}" {
      return { type: "DataType", name, fields: fields.map(f => f[0]) };
    }

DataField
  = name:Identifier _ ":" _ type:Identifier ";" {
      return { name, type };
    }

PortDef
  = "port def" _ name:Identifier _ "{" _ ports:(PortField _)* "}" {
      return { type: "PortDef", name, ports: ports.map(p => p[0]) };
    }

PortField
  = dir:("in" / "out") _ name:Identifier _ ":" _ type:Identifier ";" {
      return { direction: dir, name, type };
    }

Block
  = "block" _ name:Identifier _ "{" _ parts:(BlockPart _)* "}" {
      return { type: "Block", name, parts: parts.map(p => p[0]) };
    }

BlockPart
  = BlockPort / Composition

BlockPort
  = "port" _ name:Identifier _ ":" _ type:Identifier ";" {
      return { type: "Port", name, portType: type };
    }

Composition
  = "composition" _ "{" _ items:(CompositionItem _)* "}" {
      return { type: "Composition", items: items.map(i => i[0]) };
    }

CompositionItem
  = Component / Bind / Connect

Component
  = "component" _ name:Identifier _ ":" _ type:Identifier ";" {
      return { type: "Component", name, componentType: type };
    }

Bind
  = "bind" _ from:QualifiedName _ "to" _ to:QualifiedName ";" {
      return { type: "Bind", from, to };
    }

Connect
  = "connect" _ from:QualifiedName _ "to" _ to:QualifiedName ";" {
      return { type: "Connect", from, to };
    }

QualifiedName
  = head:Identifier tail:("." Identifier)* {
      return [head].concat(tail.map(t => t[1])).join(".");
    }

Identifier
  = $([a-zA-Z_][a-zA-Z0-9_]*)

_ = [ \t\n\r]*

Requirement = "" { return null; } // placeholder
Style       = "" { return null; }
Allocation  = "" { return null; }
