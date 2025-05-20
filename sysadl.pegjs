// sysadl.pegjs
{
  function makeList(head, tail) {
    return tail ? [head, ...tail.map(t => t[1])] : [head];
  }
}

Model
  = _ statements:(Statement _)* { return statements.map(s => s[0]); }

Statement
  = AbstractComponentDef
  / ComponentDef
  / ConnectorDef
  / Flow
  / ActivityDef
  / Executable
  / Configuration

AbstractComponentDef
  = "abstract" _ "component" _ "def" _ name:ID _ "{" _ ports:Ports? _ activities:Activities? _ "}" {
      return { type: "AbstractComponentDef", name, ports: ports || [], activities: activities || [] };
    }

ComponentDef
  = "component" _ "def" _ name:ID _ "{" _ ports:Ports? _ activities:Activities? _ config:Configuration? _ "}" {
      return { type: "ComponentDef", name, ports: ports || [], activities: activities || [], config: config || null };
    }

ConnectorDef
  = "connector" _ "def" _ name:ID _ "{" _ ports:Ports _ "}" {
      return { type: "ConnectorDef", name, ports };
    }

Flow
  = "flow" _ src:QualifiedName _ "->" _ tgt:QualifiedName {
      return { type: "Flow", source: src, target: tgt };
    }

ActivityDef
  = "activity" _ "def" _ name:ID _ params:Parameters? _ body:ActivityBody? {
      return { type: "ActivityDef", name, params: params || [], body: body || null };
    }

Executable
  = "executable" _ "def" _ name:ID _ params:Parameters _ ":" _ "out" _ retType:QualifiedName _ "{" _ statements:StatementList _ "}" {
      return { type: "Executable", name, params, returnType: retType, statements };
    }

StatementList
  = statements:(VariableDecl / ReturnStatement / AssignmentExpressionStatement)* {
      return statements;
    }

VariableDecl
  = "let" _ name:ID _ ":" _ type:QualifiedName _ ("=" _ value:Expression)? _ ";" {
      return { type: "VariableDecl", name, type, value };
    }

ReturnStatement
  = "return" _ value:Expression _ ";" {
      return { type: "ReturnStatement", value };
    }

AssignmentExpressionStatement
  = lhs:ID _ "=" _ value:Expression _ ";" {
      return { type: "AssignmentExpression", lhs, value };
    }

Expression
  = LiteralExpression
  / NameExpression
  / AdditiveExpression

LiteralExpression
  = value:(StringLiteral / NumberLiteral / BooleanLiteral) {
      return { type: "LiteralExpression", value };
    }

StringLiteral
  = "\"" value:[^\"]* "\"" { return value.join(""); }

NumberLiteral
  = value:[0-9]+ { return parseInt(value.join(""), 10); }

BooleanLiteral
  = "true" { return true; }
  / "false" { return false; }

NameExpression
  = name:QualifiedName { return { type: "NameExpression", name }; }

AdditiveExpression
  = op1:Expression _ operator:("+" / "-") _ op2:Expression {
      return { type: "AdditiveExpression", op1, operator, op2 };
    }

Configuration
  = "configuration" _ "{" _ components:ComponentUse* _ connectors:ConnectorUse* _ delegations:Delegation* _ "}" {
      return { type: "Configuration", components, connectors, delegations };
    }

ComponentUse
  = "component" _ name:ID _ ":" _ def:QualifiedName {
      return { type: "ComponentUse", name, definition: def };
    }

ConnectorUse
  = "connector" _ name:ID _ ":" _ def:QualifiedName _ ports:Ports {
      return { type: "ConnectorUse", name, definition: def, ports };
    }

Delegation
  = "delegation" _ src:QualifiedName _ "to" _ tgt:QualifiedName {
      return { type: "Delegation", source: src, target: tgt };
    }

Ports
  = "ports" _ ":" _ ports:PortList { return ports; }

PortList
  = head:Port tail:("," _ Port)* { return makeList(head, tail); }

Port
  = name:ID _ ":" _ direction:("in" / "out" / "inout") { return { name, direction }; }

Activities
  = "activities" _ ":" _ activities:ActivityList { return activities; }

ActivityList
  = head:Activity tail:("," _ Activity)* { return makeList(head, tail); }

Activity
  = name:ID _ params:Parameters? { return { name, params: params || [] }; }

Parameters
  = "(" _ params:ParameterList? _ ")" { return params || []; }

ParameterList
  = head:Parameter tail:("," _ Parameter)* { return makeList(head, tail); }

Parameter
  = name:ID _ ":" _ type:QualifiedName { return { name, type }; }

ActivityBody
  = "body" _ "{" _ actions:ActionUse* _ flows:ActivityFlow* _ "}" {
      return { actions, flows };
    }

ActionUse
  = name:ID _ ":" _ def:QualifiedName { return { type: "ActionUse", name, definition: def }; }

ActivityFlow
  = "flow" _ "from" _ src:QualifiedName _ "to" _ tgt:QualifiedName {
      return { type: "ActivityFlow", source: src, target: tgt };
    }

QualifiedName
  = head:ID tail:("." ID)* { return [head, ...tail.map(t => t[1])].join("."); }

ID
  = [a-zA-Z_][a-zA-Z0-9_]* { return text(); }

_ "whitespace"
  = [ \t\n\r]*