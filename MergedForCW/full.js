var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

var Variable = /** @class */ (function () {
    function Variable(name, value) {
        this.name = name;
        this.value = value;
    }
    return Variable;
}());

var SyntaxLogic = /** @class */ (function () {
    function SyntaxLogic(name) {
        if (name === void 0) { name = ""; }
        this.expression = new Token("=ROOT" + (name == "" ? "" : "(of " + name + ")") + "=", TokenType.Complex);
        this.functionsToParse = new Array();
        this.expressionStack = new Array();
    }

    SyntaxLogic.prototype.pushOp = function (op) {
        this.expression.data.subTokenOperators.push(op);
    };

    SyntaxLogic.prototype.pushToken = function (tk) {
        if (this.expression.type == TokenType.Complex) {
            this.expression.data.subTokens.push(tk);
        }

        else if (this.expression.type == TokenType.s_FnCall) {
            this.expression.data.arguments.push(tk);
        }
    };

    SyntaxLogic.prototype.currFunc = function () {
        if (this.functionsToParse.length == 0)
            return null;
        return this.functionsToParse[this.functionsToParse.length - 1];
    };
    
    SyntaxLogic.prototype.remFunc = function (fnName, funcs) {
    
        this.functionsToParse.push(new FunctionAccumulator(new TokenDataFunction(this.expression, funcs.filter(function (p) { return p.name == fnName; })[0])));
        var funcCall = new Token("==FUNC-CALL(" + this.currFunc().id + ")==", TokenType.s_FnCall);
        funcCall.data = this.currFunc().data;
    
        this.pushToken(funcCall);
        this.expressionStack.push(this.expression);
        this.expressionStack.push(funcCall);
        var tk = new Token("=FUNC-ARG(" + this.currFunc().id + ")(" + this.currFunc().count + ")=", TokenType.Complex);
        this.expression = tk;
    };

    SyntaxLogic.prototype.tokenSwitch = function () {
        if (interpreter.debug)
            console.log("!!!!!!!SWITCHED!!!!!!");
        if (this.functionsToParse.length == 0) {
            throw ("Unexpected token");
        }

        this.currFunc().push(this.expression);
        this.expression = this.expressionStack.pop();
        var f = false;
        while (this.functionsToParse.length != 0 && this.currFunc().full()) {

            f = true;

            if (interpreter.debug)
                console.log("===============FUNC END==================");

            this.functionsToParse.pop();
            this.expression = this.expressionStack.pop();
            if (this.currFunc() != null) {
                this.currFunc().push(this.expression);
                this.expression = this.expressionStack.pop();
                var tk = new Token("=FUNC-ARG(" + this.currFunc().id + ")(" + this.currFunc().count + ")=", TokenType.Complex);
                this.expressionStack.push(this.expression);
                this.expression = tk;
            }
        }

        if (!f) {
            var tk = new Token("=FUNC-ARG(" + this.currFunc().id + ")(" + this.currFunc().count + ")=", TokenType.Complex);
            this.expressionStack.push(this.expression);
            this.expression = tk;
        }
        return true;
    };

    SyntaxLogic.prototype.tokenRegister = function (token) {
        this.pushToken(new Token(token.strVal, TokenType.s_Number));
    };

    SyntaxLogic.prototype.operatorRegsiter = function (memHandle, token) {
        if (this.expression.data.subTokens.length == 0) {
            throw "Nowhere to put token :/";
        }
        this.pushOp(memHandle.findOp(token.strVal, false));
    };

    SyntaxLogic.prototype.finalize = function () {
        if (this.currFunc() != null) {
            this.tokenSwitch();
            while (this.expressionStack.length != 0)
                this.expression = this.expressionStack.pop();
            //Trying to correct some syntax errors
            if (this.currFunc() != null) {
                throw ("Wrong function param count or wrong syntax count");
            }
        }
        this.expression.data.resolveOps();
        return true;
    };

    return SyntaxLogic;
}());

var StringToken = /** @class */ (function () {

    function StringToken(token, type, sub) {
        if (sub === void 0) { sub = null; }
        this.strVal = token;
        this.type = type;
        this.subTokens = sub;
    }

    return StringToken;
}());

var MemoryHandler = /** @class */ (function () {

    function MemoryHandler() {
        var _this = this;
        this.identifierRegex = /^[a-zA-Z][_\w]$/.compile();
        this.numberRegex = /^\d+$/.compile();
        this.operators = [
            new Operator("*", 3, false, function (a, b) { return a.parse() * b.parse(); }, null),
            new Operator("%", 3, false, function (a, b) { return a.parse() % b.parse(); }, null),
            new Operator("/", 3, false, function (a, b) { return a.parse() / b.parse(); }, null),
            new Operator("+", 2, false, function (a, b) { return a.parse() + b.parse(); }, null),
            new Operator("-", 2, false, function (a, b) { return a.parse() - b.parse(); }, null),
            new Operator("=", 1, false, function (a, b) {

                var value = b.parse();
                if (!_this.isVar(a.rawValue)) {
                    _this.variables.push(new Variable(a.rawValue, value));
                    return value;
                }
                _this.variables[_this.variables.map(function (p) { return p.name; }).lastIndexOf(a.rawValue)].value =
                    value;
                return value;
            }, null),
        ];

        this.opChars = new Array();
        this.variables = new Array();
        this.functions = new Array();
        this.maxPriop = 0;
        this.InitOps();
    }

    MemoryHandler.prototype.getVarVal = function (str) {
        return this.variables.filter(function (p) { return p.name == str; })[0].value;
    };
    
    MemoryHandler.prototype.isFunc = function (str) {
        for (var _i = 0, _a = this.functions; _i < _a.length; _i++) {
            var a = _a[_i];
            if (str === a.name)
                return true;
        }
        return false;
    };

    MemoryHandler.prototype.isVar = function (str) {
        for (var _i = 0, _a = this.variables; _i < _a.length; _i++) {
            var a = _a[_i];
            if (str === a.name)
                return true;
        }
        return false;
    };

    MemoryHandler.prototype.isCorrectIdentifier = function (str) {
        return str.match(this.identifierRegex) != null;
    };

    MemoryHandler.prototype.isCorrectNumber = function (str) {
        return str.split("").every(function (p) { return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "."].indexOf(p) != -1; });
    };
    
    MemoryHandler.prototype.InitOps = function () {
        var _this = this;
        this.operators.forEach(function (p) {
            var chars = p.value.split("");
            chars.forEach(function (j) {
                if (_this.opChars.lastIndexOf(j) == -1)
                    _this.opChars.push(j);
            });
            _this.maxPriop = Math.max(_this.maxPriop, p.priority);
        });
    };

    MemoryHandler.prototype.isOpChar = function (c) {
        return this.opChars.lastIndexOf(c) != -1;
    };

    MemoryHandler.prototype.HasOnlyOperatorChars = function (s) {
        var _this = this;
        return s.split("").every(function (p) { return _this.isOpChar(p); });
    };

    MemoryHandler.prototype.findOp = function (s, unary) {
        return this.operators.filter(function (p) { return p.isUnary == unary && p.value == s; })[0];
    };

    return MemoryHandler;
}());

var FunctionAccumulator = /** @class */ (function () {

    function FunctionAccumulator(expression, brDepth) {
        if (brDepth === void 0) { brDepth = 0; }
        this.data = expression;
        this.max = expression.func.args.length;
        this.count = 0;
        this.brDepth = brDepth;
        this.id = FunctionAccumulator.gId++;
    }

    FunctionAccumulator.prototype.full = function () {
        return this.count >= this.max;
    };

    FunctionAccumulator.prototype.push = function (token) {
        this.count++;
        this.data.arguments.push(token);
    };

    FunctionAccumulator.gId = 0;
    return FunctionAccumulator;
}());

var Func = /** @class */ (function () {

    function Func(name, exp, args) {
        this.name = name;
        this.expression = exp;
        this.args = args;
    }

    Func.prototype.call = function (args) {
        //if (args.length != this.args.length) {
        //    throw "Unexpected length difference";
        //}
        var copy = this.expression.deepClone();
        for (var i = 0; i < this.args.length; i++) {
            this.findAndReplace(copy, this.args[i], args[i]);
        }
        return Token.calc(copy);
    };

    Func.prototype.findAndReplace = function (whereToFind, toFind, toReplace) {
        for (var _i = 0, _a = whereToFind.data.subTokens; _i < _a.length; _i++) {
            var tk = _a[_i];
            if (tk.type == TokenType.Complex)
                this.findAndReplace(tk, toFind, toReplace);
            else {
                if (tk.rawValue.trim() == toFind) {
                    tk.changeType(TokenType.Complex, new TokenDataComplex(tk, [toReplace]));
                    tk.rawValue = "{changed-type}";
                }
            }
        }
    };

    Func.fnKeyword = "fn";
    Func.fnSymbol = "=>";
    return Func;
}());

var TokenType;

(function (TokenType) {
    TokenType[TokenType["s_Number"] = 0] = "s_Number";
    TokenType[TokenType["s_Variable"] = 1] = "s_Variable";
    TokenType[TokenType["s_FnCall"] = 2] = "s_FnCall";
    TokenType[TokenType["Complex"] = 3] = "Complex";
})(TokenType || (TokenType = {}));

var StringTokenType;
(function (StringTokenType) {
    StringTokenType[StringTokenType["FnKeyword"] = 0] = "FnKeyword";
    StringTokenType[StringTokenType["FnSymbol"] = 1] = "FnSymbol";
    StringTokenType[StringTokenType["Number"] = 2] = "Number";
    StringTokenType[StringTokenType["Variable"] = 3] = "Variable";
    StringTokenType[StringTokenType["Function"] = 4] = "Function";
    StringTokenType[StringTokenType["Identifier"] = 5] = "Identifier";
    StringTokenType[StringTokenType["Operator"] = 6] = "Operator";
    StringTokenType[StringTokenType["BrOpened"] = 7] = "BrOpened";
    StringTokenType[StringTokenType["BrClosed"] = 8] = "BrClosed";
    StringTokenType[StringTokenType["_Complex"] = 9] = "_Complex";
})(StringTokenType || (StringTokenType = {}));

var Token = /** @class */ (function () {

    function Token(value, type, intValue) {
        if (intValue === void 0) { intValue = null; }
        this.rawValue = value == null ? "" : value;
        this.type = type;
        switch (type) {
            case TokenType.Complex:
                this.data = new TokenDataComplex(this);
                break;
            case TokenType.s_Number:
                this.data = new TokenDataNumber(intValue);
                break;
            case TokenType.s_FnCall:
                this.data = new TokenDataFunction(this, null);
                break;
        }
    }

    Token.prototype.toString = function () {
        return "" + this.rawValue;
    };

    Token.prototype.changeType = function (tokenType, data) {
        this.type = tokenType;
        this.data = data;
        return this;
    };

    Token.prototype.calcSubs = function () {
        if (this.type == TokenType.Complex) {
            var sub = this.data.subTokens;
            if (sub == null || sub.length == 0) {
                var value = this.parse();
                this.changeType(TokenType.s_Number, new TokenDataNumber(value));
                return value;
            }
            if (sub.length == 1) {
                var value = sub[0].parse();
                this.changeType(TokenType.s_Number, new TokenDataNumber(value));
                return value;
            }
            while (sub.length != 1) {
                var index = 0;
                var maxPriority = 0;
                if (this.data.isChainAssigment()) {
                    for (var i = sub.length - 1; i >= 0; i--) {
                        if (sub[i].operator != null && sub[i].operator.priority > maxPriority) {
                            maxPriority = sub[i].operator.priority;
                            index = i;
                        }
                    }
                }
                else {
                    for (var i = 0; i < sub.length - 1; i++) {
                        if (sub[i].operator.priority > maxPriority) {
                            maxPriority = sub[i].operator.priority;
                            index = i;
                        }
                    }
                }
                var newTk = new Token("[calculated]", TokenType.s_Number, sub[index].operator.function(sub[index], sub[index + 1]));
                newTk.operator = sub[index + 1].operator;
                sub.splice(index, 2, newTk);
            }
            var val = sub[0].data.intValue;
            this.rawValue = val.toString();
            this.changeType(TokenType.s_Number, new TokenDataNumber(val));
            return val;
        }
        else if (this.type == TokenType.s_FnCall) {
            //?!
        }
        else {
            return this.parse();
        }
    };
    
    Token.prototype.useUnary = function (n) {
        //this.unary.forEach(p => {
        //// n = p.unaryFunc(n);
        //});
        return n;
    };

    Token.prototype.parse = function () {
        if (interpreter.memHandler.isVar(this.rawValue)) {
            return interpreter.memHandler.getVarVal(this.rawValue);
        }
        else {
            var stored = this.data.intValue;
            if (stored != null)
                return stored;
            else {
                var val = parseInt(this.rawValue);
                this.data.intValue = val;
                return val;
            }
        }
    };
    
    Token.prototype.deepClone = function () {
        var a = new Token(this.rawValue, this.type);
        a.data = this.data.clone();
        a.unary = this.unary;
        a.operator = this.operator;
        return a;
    };
    
    Token.calc = function (token) {
        var _this = this;
        if (token.type == TokenType.Complex) {
            var data = token.data;
            if (data.canBeCalculated()) {
                return token.calcSubs();
            }
            data.subTokens.forEach(function (p) {
                _this.calc(p);
            });
            if (data.canBeCalculated()) {
                return token.calcSubs();
            }
            else {
                throw ("Cant calculate token " + token);
            }
        }
        else if (token.type == TokenType.s_FnCall) {
            var data = token.data;
            data.arguments.forEach(function (p) {
                _this.calc(p);
            });
            return data.call();
        }
        else
            return token.parse();
    };
    return Token;
}());

var Operator = /** @class */ (function () {

    function Operator(val, pri, isUnary, biFunc, unaryFunc) {
        this.value = val;
        this.priority = pri;
        this.isUnary = isUnary;
        this.function = biFunc;
        this.unaryFunc = unaryFunc;
    }
    return Operator;
}());

var TokenData = /** @class */ (function () {

    function TokenData() {
    }

    TokenData.prototype.clone = function () {
        return null;
    };

    return TokenData;
}());

var TokenDataNumber = /** @class */ (function (_super) {
    __extends(TokenDataNumber, _super);

    function TokenDataNumber(value) {
        var _this = _super.call(this) || this;
        _this.intValue = value;
        return _this;
    }

    TokenDataNumber.prototype.clone = function () {
        return new TokenDataNumber(this.intValue);
    };
    return TokenDataNumber;
}(TokenData));

var TokenDataFunction = /** @class */ (function (_super) {
    __extends(TokenDataFunction, _super);

    function TokenDataFunction(parrentToken, func, args) {
        if (args === void 0) { args = new Array(); }
        var _this = _super.call(this) || this;
        _this.func = func;
        _this.arguments = args;
        _this.parrentToken = parrentToken;
        return _this;
    }

    TokenDataFunction.prototype.call = function () {
        var val = this.func.call(this.arguments);
        this.parrentToken.changeType(TokenType.s_Number, new TokenDataNumber(val));
        this.parrentToken.rawValue = val.toString();
        return val;
    };

    TokenDataFunction.prototype.clone = function () {
        return new TokenDataFunction(this.parrentToken, this.func, this.arguments);
    };

    return TokenDataFunction;
}(TokenData));

var TokenDataComplex = /** @class */ (function (_super) {
    __extends(TokenDataComplex, _super);

    function TokenDataComplex(parrent, subTokens, subTokenOperators) {
        if (subTokens === void 0) { subTokens = new Array(); }
        if (subTokenOperators === void 0) { subTokenOperators = new Array(); }
        var _this = _super.call(this) || this;
        _this.subTokenOperators = subTokenOperators;
        _this.subTokens = subTokens;
        _this.parrentToken = parrent;
        return _this;
    }

    TokenDataComplex.prototype.isChainAssigment = function () {
        return this.subTokenOperators.every(function (p) { return p.value === "="; });
    };

    TokenDataComplex.prototype.canBeCalculated = function () {
        return this.isSimple() || this.subTokens.every(function (p) { return p.type == TokenType.s_Number; });
    };

    TokenDataComplex.prototype.isSimple = function () {
        return this.parrentToken.type == TokenType.s_Number;
    };

    TokenDataComplex.prototype.resolveOps = function () {
        for (var i = 0; i < this.subTokenOperators.length; i++) {
            this.subTokens[i].operator = this.subTokenOperators[i];
        }
        this.subTokens.forEach(function (p) {
            if (p.type == TokenType.Complex) {
                p.data.resolveOps();
            }
            else if (p.type == TokenType.s_FnCall) {
                p.data.arguments.forEach(function (j) {
                    j.data.resolveOps();
                });
            }
        });
    };

    TokenDataComplex.prototype.clone = function () {
        return new TokenDataComplex(this.parrentToken, this.subTokens.map(function (p) { return p.deepClone(); }), this.subTokenOperators);
    };

    return TokenDataComplex;
}(TokenData));


var ListeningType;
(function (ListeningType) {
    ListeningType[ListeningType["FunctionName"] = 0] = "FunctionName";
    ListeningType[ListeningType["FunctionParamDeclarationOrSymbol"] = 1] = "FunctionParamDeclarationOrSymbol";
    ListeningType[ListeningType["FunctionArgument"] = 2] = "FunctionArgument";
    ListeningType[ListeningType["AnyNumericToken"] = 3] = "AnyNumericToken";
    ListeningType[ListeningType["Operator"] = 4] = "Operator";
    ListeningType[ListeningType["Undef"] = 5] = "Undef";
})(ListeningType || (ListeningType = {}));


var allowedTypes = /** @class */ (function () {
    function allowedTypes() {
    }
    allowedTypes.all = [
        StringTokenType.FnKeyword,
        StringTokenType.Function,
        StringTokenType.Variable,
        StringTokenType.Number,
        StringTokenType.Identifier,
        StringTokenType.BrOpened
    ];
    allowedTypes.fnKeywordMet = [
        StringTokenType.FnSymbol,
        StringTokenType.Identifier
    ];
    allowedTypes.operatorMet = [
        StringTokenType.BrOpened,
        StringTokenType.Function,
        StringTokenType.Identifier,
        StringTokenType.Number,
        StringTokenType.Variable,
    ];
    allowedTypes.fnSymbolMet = allowedTypes.operatorMet;
    allowedTypes.numMet = [
        StringTokenType.Operator,
        StringTokenType.BrClosed
    ];
    allowedTypes.numMetButSwitchAllowed = [
        StringTokenType.Operator,
        StringTokenType.BrClosed,
        StringTokenType.BrOpened,
        StringTokenType.Function,
        StringTokenType.Identifier,
        StringTokenType.Number,
        StringTokenType.Variable,
    ];

    return allowedTypes;
}());

var interpreter = /** @class */ (function () {

    function interpreter() {
    }

    interpreter.getTypedTokes = function (input) {
        var tokens = this.Tokenize(input);
        var result = new Array();
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var token = tokens_1[_i];
            if (token === Func.fnSymbol)
                result.push(new StringToken(token, StringTokenType.FnSymbol));
            else if (token === "(")
                result.push(new StringToken(token, StringTokenType.BrOpened));
            else if (token === ")")
                result.push(new StringToken(token, StringTokenType.BrClosed));
            else if (this.memHandler.HasOnlyOperatorChars(token))
                result.push(new StringToken(token, StringTokenType.Operator));
            else if (token === Func.fnKeyword)
                result.push(new StringToken(token, StringTokenType.FnKeyword));
            else if (this.memHandler.isCorrectNumber(token))
                result.push(new StringToken(token, StringTokenType.Number));
            else if (this.memHandler.isCorrectIdentifier(token)) {
                if (this.memHandler.isVar(token))
                    result.push(new StringToken(token, StringTokenType.Variable));
                else if (this.memHandler.isFunc(token))
                    result.push(new StringToken(token, StringTokenType.Function));
                else {
                    result.push(new StringToken(token, StringTokenType.Identifier));
                }
            }
            else {
                throw (this.ErrMessages.wrongToken);
            }
        }
        return result;
    };

    interpreter.getTokenTree = function (tokens, offset) {
        var skiping = false;
        var skipingToDepth = -1;
        var depth = 0;
        var tokenStr = "";
        var currTokens = new Array();
        for (var i = offset; i < tokens.length; i++) {
            var token = tokens[i];
            switch (token.type) {
                case StringTokenType.BrOpened: {
                    if (!skiping) {
                        skiping = true;
                        skipingToDepth = depth;
                        currTokens.push(this.parseTokenTree(tokens, i + 1));
                    }
                    ;
                    depth++;
                    break;
                }
                case StringTokenType.BrClosed: {
                    depth--;
                    if (depth == skipingToDepth) {
                        skiping = false;
                    }
                    if (depth < 0)
                        return [currTokens, tokenStr];
                    break;
                }
                default: {
                    if (!skiping) {
                        currTokens.push(token);
                    }
                    break;
                }
            }
            tokenStr += " " + token.strVal;
        }
        return [currTokens, tokenStr];
    };

    interpreter.parseTokenTree = function (tokens, index) {
        if (index === void 0) { index = 0; }
        var res = this.getTokenTree(tokens, index);
        return new StringToken(res["1"], StringTokenType._Complex, res["0"]);
    };

    interpreter.resolveTokenSyntax = function (tokenToParse, root) {
        if (this.debug)
            console.log("resolveTokenSyntax call on \"" + tokenToParse.strVal + "\"");
        var syntaxLogic = new SyntaxLogic(tokenToParse.strVal);
        var expectedTokens = allowedTypes.all;
        var currentListening = ListeningType.Undef;
        var fnName = null;
        var fnArgs = new Array();
        var lastTokenType;
        for (var i = 0; i < tokenToParse.subTokens.length; i++) {
            var token = tokenToParse.subTokens[i];
            if (this.debug)
                console.log("Token: " + token.strVal + ", type: " + token.type + ". Listening for: " + currentListening + ". Allowed: [" + expectedTokens.sort().join(', ') + "]. Curr Func: " + syntaxLogic.expression.rawValue);
            //if(expectedTokens.indexOf(token.type) == -1)
            //    throw "Unexpected token";
            switch (token.type) {
                case StringTokenType._Complex: {
                    var tk = this.resolveTokenSyntax(token, false);
                    if (tk == null)
                        return null;
                    if (lastTokenType == StringTokenType.Number ||
                        lastTokenType == StringTokenType.Identifier ||
                        lastTokenType == StringTokenType.Variable ||
                        lastTokenType == StringTokenType._Complex) {
                        if (syntaxLogic.expression.type == TokenType.Complex &&
                            syntaxLogic.expression.data.subTokens.length == 0) {
                            syntaxLogic.pushToken(tk["0"]);
                            if (!syntaxLogic.tokenSwitch()) {
                                return null;
                            }
                        }
                        else {
                            if (!syntaxLogic.tokenSwitch()) {
                                return null;
                            }
                            syntaxLogic.pushToken(tk["0"]);
                        }
                    }
                    else if (syntaxLogic.currFunc() != null) {
                        expectedTokens = allowedTypes.numMetButSwitchAllowed;
                        syntaxLogic.pushToken(tk["0"]);
                    }
                    else {
                        expectedTokens = allowedTypes.numMet;
                        syntaxLogic.pushToken(tk["0"]);
                    }
                    break;
                }
                case StringTokenType.FnKeyword:
                    {
                        if (currentListening != ListeningType.Undef || i != 0 || !root)
                            throw ("Wrong declar func");
                        currentListening = ListeningType.FunctionName;
                        expectedTokens = allowedTypes.fnKeywordMet;
                    }
                    break;
                case StringTokenType.FnSymbol:
                    {
                        expectedTokens = allowedTypes.fnSymbolMet;
                        currentListening = ListeningType.AnyNumericToken;
                        if (interpreter.memHandler.isVar(fnName)) {
                            throw "variable with that name already exists";
                        }
                    }
                    break;
                case StringTokenType.Function:
                    {
                        if (currentListening == ListeningType.FunctionName) {
                            currentListening = ListeningType.FunctionParamDeclarationOrSymbol;
                            expectedTokens = allowedTypes.fnKeywordMet;
                            fnName = token.strVal;
                            break;
                        }
                        if (lastTokenType == StringTokenType.Number ||
                            lastTokenType == StringTokenType.Identifier ||
                            lastTokenType == StringTokenType.Variable ||
                            lastTokenType == StringTokenType._Complex) {
                            if (!syntaxLogic.tokenSwitch()) {
                                return null;
                            }
                        }
                        syntaxLogic.remFunc(token.strVal, this.memHandler.functions);
                        expectedTokens = allowedTypes.fnSymbolMet;
                        currentListening = ListeningType.FunctionArgument;
                    }
                    break;
                case StringTokenType.Identifier:
                case StringTokenType.Variable:
                case StringTokenType.Number:
                    {
                        if (currentListening == ListeningType.FunctionName) {
                            currentListening = ListeningType.FunctionParamDeclarationOrSymbol;
                            expectedTokens = allowedTypes.fnKeywordMet;
                            fnName = token.strVal;
                        }
                        else if (currentListening == ListeningType.FunctionParamDeclarationOrSymbol) {
                            if (fnArgs.indexOf(token.strVal) != -1)
                                throw "Same param already exists";
                            fnArgs.push(token.strVal);
                        }
                        else if (lastTokenType == StringTokenType.Number ||
                            lastTokenType == StringTokenType.Identifier ||
                            lastTokenType == StringTokenType.Variable ||
                            lastTokenType == StringTokenType._Complex) {
                            if (syntaxLogic.expression.type == TokenType.Complex &&
                                syntaxLogic.expression.data.subTokens.length == 0) {
                                syntaxLogic.tokenRegister(token);
                                if (!syntaxLogic.tokenSwitch()) {
                                    return null;
                                }
                            }
                            else {
                                if (!syntaxLogic.tokenSwitch()) {
                                    return null;
                                }
                                syntaxLogic.tokenRegister(token);
                            }
                        }
                        else if (syntaxLogic.currFunc() != null) {
                            expectedTokens = allowedTypes.numMetButSwitchAllowed;
                            syntaxLogic.tokenRegister(token);
                        }
                        else {
                            expectedTokens = allowedTypes.numMet;
                            syntaxLogic.tokenRegister(token);
                        }
                    }
                    break;
                case StringTokenType.Operator:
                    {
                        expectedTokens = allowedTypes.operatorMet;
                        syntaxLogic.operatorRegsiter(this.memHandler, token);
                    }
                    break;
            }
            lastTokenType = token.type;
        }
        if (!syntaxLogic.finalize()) {
            return null;
        }
        if (fnName != null) {
            var fn = new Func(fnName, syntaxLogic.expression, fnArgs);
            if (this.memHandler.isFunc(fnName)) {
                this.memHandler.functions[this.memHandler.functions.map(function (p) { return p.name; }).indexOf(fnName)] = fn;
            }
            else {
                this.memHandler.functions.push(fn);
            }
        }
        return [syntaxLogic.expression, fnName == null ? null : fnArgs];
    };

    interpreter.input = function (params) {
        if (params == "")
            return "";
        if (this.debug)
            console.log("== Parsing \"" + params + "\" ==");
        var tokens = this.getTypedTokes(params);
        if (tokens == null)
            return null;
        var tree = this.parseTokenTree(tokens);
        if (tree == null)
            return null;
        var token = this.resolveTokenSyntax(tree, true);
        if (token == null)
            return null;
        if (!this.linkTokens(token["0"], 0, null, token["1"]))
            return null;
        if (token["1"] == null)
            return Token.calc(token["0"]);
        else
            return "";
    };

    interpreter.linkTokens = function (token, index, tokens, fnArgs) {
        if (fnArgs === void 0) { fnArgs = null; }
        if (token.type == TokenType.Complex) {
            var sub = token.data.subTokens;
            for (var i = 0; i < sub.length; i++) {
                if (!this.linkTokens(sub[i], i, sub, fnArgs)) {
                    return false;
                }
            }
            ;
        }
        else if (token.type == TokenType.s_FnCall) {
            var sub = token.data.arguments;
            for (var i = 0; i < sub.length; i++) {
                if (!this.linkTokens(sub[i], i, sub, fnArgs)) {
                    return false;
                }
            }
            ;
        }
        else {
            if (tokens.length != 1 && index == tokens.length - 1 && tokens[index - 1].operator == null) {
                throw ("Unexpected token");
            }
            if (this.memHandler.isCorrectNumber(token.rawValue))
                token.data.intValue = parseInt(token.rawValue);
            else if (fnArgs == null && this.memHandler.isVar(token.rawValue)) {
                //OK
            }
            else if (fnArgs != null && fnArgs.indexOf(token.rawValue) != -1) {
                if (token.operator != null && token.operator.value == "=") {
                    throw ("You cannot assign value to fnArg");
                }
            }
            else if (token.operator == null || token.operator.value != "=") {
                throw ("Unknown variable " + token.rawValue);
            }
        }
        return true;
    };

    interpreter.Tokenize = function (input) {
        if (input === "")
            return [];
        var regex = /\s*(=>|[-+*\/\%=\(\)]|[A-Za-z_][A-Za-z0-9_]*|[0-9]*\.?[0-9]+)\s*/g;
        return input.split(regex).filter(function (s) { return !s.match(/^\s*$/); });
    };

    interpreter.ErrMessages = {
        wrongToken: "Wrong token recieved",
        unknownToken: "Unknown identifier",
        unexpectedToken: "Unexpected token",
        wrongFuncSyntax: "Wrong function syntax"
    };
    interpreter.debug = false;
    interpreter.memHandler = new MemoryHandler();

    return interpreter;
}());
//# sourceMappingURL=full.js.map