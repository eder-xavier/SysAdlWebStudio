// SysADL Language Definition for Monaco Editor

export function registerSysADLLanguage() {
  if (!window.monaco) {
    console.warn('Monaco Editor não está disponível');
    return;
  }

  // Registrar a linguagem SysADL
  monaco.languages.register({ id: 'sysadl' });

  // Configurar syntax highlighting
  monaco.languages.setMonarchTokensProvider('sysadl', {
    // Palavras-chave da linguagem SysADL
    keywords: [
      'Model', 'package', 'value', 'type', 'enum', 'datatype', 'dimension', 'unit',
      'port', 'def', 'connector', 'component', 'constraint', 'activity', 'action',
      'executable', 'allocations', 'flow', 'in', 'out', 'inout', 'boundary',
      'configuration', 'components', 'connectors', 'delegations', 'using', 'ports',
      'bindings', 'import', 'from', 'to', 'delegate', 'bind', 'equation',
      // Environment & Scenario keywords
      'environment', 'environments', 'entity', 'entities', 'scenario', 'scenarios',
      'scene', 'scenes', 'execution', 'executions', 'event', 'events', 'connection',
      'connections', 'when', 'then', 'given', 'and', 'or', 'not', 'if', 'else',
      // Tipos básicos
      'Boolean', 'Integer', 'Real', 'String', 'Void', 'true', 'false'
    ],

    // Operadores
    operators: [
      '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
      '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
      '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
      '%=', '<<=', '>>=', '>>>='
    ],

    // Símbolos
    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    // Definição das regras de tokenização
    tokenizer: {
      root: [
        // Identificadores e palavras-chave
        [/[a-zA-Z_$][\w$]*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],

        // Comentários de linha
        [/\/\/.*$/, 'comment'],

        // Comentários de bloco
        [/\/\*/, 'comment', '@comment'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],  // string não terminada
        [/"/, 'string', '@string'],

        // Números
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],

        // Delimitadores e operadores
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],

        // Whitespace
        { include: '@whitespace' },

        // Delimitadores
        [/[;,.]/, 'delimiter'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],    // comentário aninhado
        ["\\*/", 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],

      string: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
    },

    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  });

  // Configurar auto-complete e intellisense
  monaco.languages.registerCompletionItemProvider('sysadl', {
    provideCompletionItems: function(model, position) {
      const suggestions = [];
      
      // Palavras-chave básicas
      const keywords = [
        'Model', 'package', 'component', 'connector', 'port', 'configuration',
        'environment', 'scenario', 'entity', 'event', 'scene', 'execution',
        'import', 'from', 'to', 'delegate', 'bind', 'equation'
      ];

      keywords.forEach(keyword => {
        suggestions.push({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          documentation: `SysADL keyword: ${keyword}`
        });
      });

      // Templates básicos
      const templates = [
        {
          label: 'model',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            'Model ${1:ModelName};',
            '',
            'configuration {',
            '\t${2:// components and connectors}',
            '}'
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Basic SysADL model template'
        },
        {
          label: 'component',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'component ${1:ComponentType} ${2:instanceName};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Component declaration'
        },
        {
          label: 'connector',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'connector ${1:ConnectorType} ${2:instanceName} (${3:from.out} -> ${4:to.in});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Connector declaration'
        }
      ];

      suggestions.push(...templates);

      return { suggestions: suggestions };
    }
  });

  // Configurar validação de colchetes/parênteses
  monaco.languages.setLanguageConfiguration('sysadl', {
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    }
  });

  console.log('✅ SysADL language registered in Monaco Editor');
}

// Export for use in other modules
export default { registerSysADLLanguage };