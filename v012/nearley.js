(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.nearley = factory();
    }
}(this, function() {
    function Rule(name, symbols, postprocess) {
        this.id = ++Rule.highestId;
        this.name = name;
        this.symbols = symbols;
        this.postprocess = postprocess;
        return this;
    }
    Rule.highestId = 0;
    Rule.prototype.toString = function(withCursorAt) {
        function stringifySymbolSequence(e) {
            return e.literal ? JSON.stringify(e.literal) : e.toString();
        }
        var symbolSequence = (typeof withCursorAt === "undefined")
                            ? this.symbols.map(stringifySymbolSequence).join(' ')
                            : (this.symbols.slice(0, withCursorAt).map(stringifySymbolSequence).join(' ')
                               + " ● "
                               + this.symbols.slice(withCursorAt).map(stringifySymbolSequence).join(' '));
        return this.name + " → " + symbolSequence;
    }
    function State(rule, dot, reference, wantedBy) {
        this.rule = rule;
        this.dot = dot;
        this.reference = reference;
        this.data = [];
        this.wantedBy = wantedBy;
        this.isComplete = this.dot === rule.symbols.length;
    }
    State.prototype.toString = function() {
        return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
    }
    State.prototype.nextState = function(data) {
        var next = new State(this.rule, this.dot + 1, this.reference, this.wantedBy);
        next.data = this.data.slice(0);
        next.data.push(data);
        return next;
    }
    State.prototype.consumeTerminal = function(inp) {
        var val = false;
        if (this.rule.symbols[this.dot] &&
            (this.rule.symbols[this.dot]).type === "terminal") {
            if (inp === this.rule.symbols[this.dot].literal) {
                val = this.nextState(inp);
            }
        }
        return val;
    }
    function Column(grammar, index) {
        this.grammar = grammar;
        this.index = index;
        this.states = [];
        this.wants = {};
        this.scannable = [];
        this.completed = [];
    }
    Column.prototype.process = function(nextColumn) {
        var states = this.states;
        var wants = this.wants;
        var completed = this.completed;
        for (var w = 0; w < states.length; w++) {
            var state = states[w];
            if (state.isComplete) {
                state.data = state.rule.postprocess ? state.rule.postprocess(state.data, state.reference) : state.data;
                completed.push(state);
                for (var wantedBy = state.wantedBy.length - 1; wantedBy >= 0; wantedBy--) {
                    var left = state.wantedBy[wantedBy];
                    this.check(left, state);
                }
            } else {
                var exp = state.rule.symbols[state.dot];
                if (typeof exp !== 'object') {
                    this.scannable.push(state);
                } else if (exp.type === "nonterminal") {
                    if (!wants[exp.literal]) {
                        wants[exp.literal] = [];
                        var rules = this.grammar[exp.literal] || [];
                        for (var i = 0; i < rules.length; i++) {
                            this.states.push(
                                new State(rules[i], 0, this.index, wants[exp.literal])
                            );
                        }
                    }
                    wants[exp.literal].push(state);
                }
            }
        }
    }
    Column.prototype.check = function(wanted, right) {
        var found = wanted.nextState(right.data[right.data.length - 1]);
        this.states.push(found);
    }
    function Grammar(rules, start) {
        this.rules = rules;
        this.start = start || this.rules[0].name;
        var byName = {};
        this.rules.forEach(function(rule) {
            if (!byName[rule.name]) {
                byName[rule.name] = [];
            }
            byName[rule.name].push(rule);
        });
        this.grammar = byName;
    }
    Grammar.fromCompiled = function(compiled) {
        var rules = compiled.rules.map(function(r) {
            return new Rule(r.name, r.symbols, r.postprocess);
        });
        return new Grammar(rules, compiled.ParserStart);
    }
    function StreamLexer() {
        this.reset("");
    }
    StreamLexer.prototype.reset = function(data, state) {
        this.buffer = data;
        this.index = 0;
        this.line = state ? state.line : 1;
        this.lastLineBreak = state ? -state.col : 0;
        return this;
    }
    StreamLexer.prototype.next = function() {
        if (this.index < this.buffer.length) {
            var ch = this.buffer[this.index++];
            if (ch === '\n') {
                this.line++;
                this.lastLineBreak = this.index;
            }
            return {value: ch};
        }
        return null;
    }
    StreamLexer.prototype.save = function() {
        return {
            line: this.line,
            col: this.index - this.lastLineBreak
        }
    }
    function Parser(rules, start, lexer) {
        if (rules instanceof Grammar) {
            this.grammar = rules.grammar;
            this.start = rules.start;
        } else {
            var grammar = new Grammar(rules, start);
            this.grammar = grammar.grammar;
            this.start = grammar.start;
        }
        this.lexer = lexer || new StreamLexer();
        this.results = null;
        this.init();
    }
    Parser.prototype.init = function() {
        this.table = [new Column(this.grammar, 0)];
        this.current = 0;
        var startState = new State(
            new Rule(this.start, [{type: "nonterminal", literal: this.start}], function(d) { return d[0]; }),
            0,
            0,
            []
        );
        this.table[0].states.push(startState);
        this.table[0].wants[this.start] = [];
        var rules = this.grammar[this.start] || [];
        for (var i = 0; i < rules.length; i++) {
            this.table[0].states.push(new State(rules[i], 0, 0, this.table[0].wants[this.start]));
        }
        this.table[0].process();
    }
    Parser.prototype.feed = function(chunk) {
        this.lexer.reset(chunk, this.lexer.save());
        var token;
        while ((token = this.lexer.next()) !== null) {
            var column = this.table[this.current];
            this.current++;
            this.table[this.current] = new Column(this.grammar, this.current);
            for (var i = 0; i < column.scannable.length; i++) {
                var state = column.scannable[i];
                var next = state.consumeTerminal(token.value);
                if (next) {
                    this.table[this.current].states.push(next);
                }
            }
            this.table[this.current].process();
            if (this.table[this.current].states.length === 0) {
                throw new Error("Parsing error at line " + this.lexer.save().line + ", column " + this.lexer.save().col);
            }
        }
        return this;
    }
    Parser.prototype.finish = function() {
        var lastColumn = this.table[this.table.length - 1];
        var results = [];
        lastColumn.completed.forEach(function(state) {
            if (state.rule.name === this.start && state.reference === 0 && state.data.length === 1) {
                results.push(state.data[0]);
            }
        }, this);
        return results;
    }
    return {
        Rule: Rule,
        Parser: Parser,
        Grammar: Grammar,
        StreamLexer: StreamLexer
    };
}));