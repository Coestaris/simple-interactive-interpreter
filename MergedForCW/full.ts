class Variable {
    public name: string;
    public value: number;

    public constructor(name: string, value: number) {
        this.name = name;
        this.value = value;
    }
}

class SyntaxLogic {

    public expressionStack: Token[];

    public expression: Token;
    public functionsToParse: FunctionAccumulator[];

    private pushOp(op: Operator) {
        (this.expression.data as TokenDataComplex).subTokenOperators.push(op);
    }

    public pushToken(tk: Token) {
        if (this.expression.type == TokenType.Complex) {
            (this.expression.data as TokenDataComplex).subTokens.push(tk);
        } else if (this.expression.type == TokenType.s_FnCall) {
            (this.expression.data as TokenDataFunction).arguments.push(tk);
        }
    }

    public constructor(name: string = "") {
        this.expression = new Token(`=ROOT${name == "" ? "" : `(of ${name})`}=`, TokenType.Complex);
        this.functionsToParse = new Array<FunctionAccumulator>();
        this.expressionStack = new Array<Token>();
    }

    public currFunc(): FunctionAccumulator {
        if (this.functionsToParse.length == 0) return null;
        return this.functionsToParse[this.functionsToParse.length - 1];
    }

    public remFunc(fnName: string, funcs: Func[]) {

        this.functionsToParse.push(new FunctionAccumulator(
            new TokenDataFunction(this.expression, funcs.filter(p => p.name == fnName)[0]),
        ));

        let funcCall = new Token(`==FUNC-CALL(${this.currFunc().id})==`, TokenType.s_FnCall);
        funcCall.data = this.currFunc().data;
        this.pushToken(funcCall);

        this.expressionStack.push(this.expression);
        this.expressionStack.push(funcCall);


        let tk = new Token(`=FUNC-ARG(${this.currFunc().id})(${this.currFunc().count})=`, TokenType.Complex);
        this.expression = tk;
    }

    public tokenSwitch(): boolean {
        if (interpreter.debug) console.log("!!!!!!!SWITCHED!!!!!!");

        if (this.functionsToParse.length == 0) {

            throw ("Unexpected token");
        }

        this.currFunc().push(this.expression);
        this.expression = this.expressionStack.pop();

        let f = false;

        while (this.functionsToParse.length != 0 && this.currFunc().full()) {

            f = true;
            if (interpreter.debug) console.log("===============FUNC END==================");

            this.functionsToParse.pop();
            this.expression = this.expressionStack.pop();

            if (this.currFunc() != null) {

                this.currFunc().push(this.expression);
                this.expression = this.expressionStack.pop();

                let tk = new Token(`=FUNC-ARG(${this.currFunc().id})(${this.currFunc().count})=`, TokenType.Complex);
                this.expressionStack.push(this.expression);
                this.expression = tk;
            }
        };

        if (!f) {
            let tk = new Token(`=FUNC-ARG(${this.currFunc().id})(${this.currFunc().count})=`, TokenType.Complex);
            this.expressionStack.push(this.expression);
            this.expression = tk;
        }

        return true;
    }

    public tokenRegister(token: StringToken) {
        this.pushToken(
            new Token(token.strVal, TokenType.s_Number)
        );
    }

    public operatorRegsiter(memHandle: MemoryHandler, token: StringToken) {
        if((this.expression.data as TokenDataComplex).subTokens.length == 0) {
            throw "Nowhere to put token :/"
        }
        
        this.pushOp(memHandle.findOp(token.strVal, false));
    }

    public finalize(): boolean {

        if (this.currFunc() != null) {
            this.tokenSwitch();

            while (this.expressionStack.length != 0)
                this.expression = this.expressionStack.pop();
            //Trying to correct some syntax errors

            if (this.currFunc() != null) {
                throw ("Wrong function param count or wrong syntax count");
            }
        }

        (this.expression.data as TokenDataComplex).resolveOps();
        return true;
    }
}

class StringToken {
    strVal: string;
    type: StringTokenType;

    constructor(token: string, type: StringTokenType, sub: StringToken[] = null) {
        this.strVal = token;
        this.type = type;

        this.subTokens = sub;
    }

    subTokens: StringToken[];
}

class MemoryHandler {

    public constructor() {
        this.InitOps();
        this.variables = new Array<Variable>();
        this.functions = new Array<Func>();
    }

    public variables: Variable[];
    public functions: Func[];

    public getVarVal(str: string): number {
        return this.variables.filter(p => p.name == str)[0].value;
    }

    public isFunc(str: string): boolean {
        for (const a of this.functions) {
            if (str === a.name) return true;
        }

        return false;
    }

    public isVar(str: string): boolean {
        for (const a of this.variables) {
            if (str === a.name) return true;
        }

        return false;
    }

    private identifierRegex = /^[a-zA-Z][_\w]$/.compile();
    private numberRegex = /^\d+$/.compile();

    public isCorrectIdentifier(str: string): boolean {
        return str.match(this.identifierRegex) != null;
    }

    public isCorrectNumber(str: string): boolean {
        return str.split("").every(p => ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "."].indexOf(p) != -1);
    }

    private operators: Array<Operator> = [
        new Operator("*", 3, false, (a: Token, b: Token): number => a.parse() * b.parse(), null),
        new Operator("%", 3, false, (a: Token, b: Token): number => a.parse() % b.parse(), null),
        new Operator("/", 3, false, (a: Token, b: Token): number => a.parse() / b.parse(), null),
        new Operator("+", 2, false, (a: Token, b: Token): number => a.parse() + b.parse(), null),
        new Operator("-", 2, false, (a: Token, b: Token): number => a.parse() - b.parse(), null),
        new Operator("=", 1, false, (a: Token, b: Token): number => {
            let value = b.parse();

            if (!this.isVar(a.rawValue)) {
                this.variables.push(
                    new Variable(
                        a.rawValue,
                        value
                    )
                );

                return value;
            }

            this.variables[this.variables.map(p => p.name).lastIndexOf(a.rawValue)].value =
                value;

            return value;
        }, null),
    ]

    private InitOps() {
        this.operators.forEach(p => {
            let chars = p.value.split("");
            chars.forEach(j => {
                if (this.opChars.lastIndexOf(j) == -1)
                    this.opChars.push(j);
            });
            this.maxPriop = Math.max(this.maxPriop, p.priority);
        })
    }

    private opChars = new Array<string>();
    private maxPriop: number = 0;

    private isOpChar(c: string) {
        return this.opChars.lastIndexOf(c) != -1;
    }

    public HasOnlyOperatorChars(s: string): boolean {
        return s.split("").every(p => this.isOpChar(p));
    }

    public findOp(s: string, unary: boolean): Operator {
        return this.operators.filter(p => p.isUnary == unary && p.value == s)[0];;
    }
}

class FunctionAccumulator {

    private static gId: number = 0;

    public count: number; //current accumulated tokens
    public max: number; //maximum tokens 
    public data: TokenDataFunction; //expression to accumulate
    public brDepth: number;
    public id: number;

    constructor(expression: TokenDataFunction, brDepth: number = 0) {
        this.data = expression;
        this.max = expression.func.args.length;
        this.count = 0;
        this.brDepth = brDepth;

        this.id = FunctionAccumulator.gId++;
    }

    public full(): boolean {
        return this.count >= this.max;
    }

    public push(token: Token) {
        this.count++;
        this.data.arguments.push(token);
    }
}

class Func {

    public name: string;
    public expression: Token;
    public args: string[];

    public static fnKeyword: string = "fn";
    public static fnSymbol: string = "=>";

    public constructor(name: string, exp: Token, args: string[]) {
        this.name = name;
        this.expression = exp;
        this.args = args;
    }

    public call(args: Token[]): number {
        //if (args.length != this.args.length) {
        //    throw "Unexpected length difference";
        //}

        let copy = this.expression.deepClone();

        for (let i = 0; i < this.args.length; i++) {
            this.findAndReplace(copy, this.args[i], args[i]);
        }

        return Token.calc(copy);
    }

    private findAndReplace(whereToFind: Token, toFind: string, toReplace: Token) {
        for (const tk of (whereToFind.data as TokenDataComplex).subTokens) {
            if (tk.type == TokenType.Complex) this.findAndReplace(tk, toFind, toReplace);
            else {

                if (tk.rawValue.trim() == toFind) {
                    tk.changeType(TokenType.Complex, new TokenDataComplex(tk, [toReplace]));
                    tk.rawValue = "{changed-type}"
                }
            }
        }
    }
}

enum TokenType {
    s_Number,
    s_Variable,
    s_FnCall,
    Complex
}

enum StringTokenType {
    FnKeyword,
    FnSymbol,

    Number,
    Variable,
    Function,
    Identifier,

    Operator,
    BrOpened,
    BrClosed,

    _Complex
}

class Token {
    public type: TokenType;
    public rawValue: string;
    public data: TokenData;
    public unary: Operator[];
    public operator: Operator;

    public toString(): string {
        return `${this.rawValue}`;
    }

    public constructor(value: string, type: TokenType, intValue: number = null) {
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

    public changeType(tokenType: TokenType, data: TokenData): Token {
        this.type = tokenType;
        this.data = data;
        return this;
    }

    public calcSubs(): number {

        if (this.type == TokenType.Complex) {
            let sub = (this.data as TokenDataComplex).subTokens;
            if (sub == null || sub.length == 0) {

                let value = this.parse();
                this.changeType(TokenType.s_Number, new TokenDataNumber(value));
                return value;

            }

            if (sub.length == 1) {

                let value = sub[0].parse();
                this.changeType(TokenType.s_Number, new TokenDataNumber(value));
                return value;
            }

            while (sub.length != 1) {
                let index = 0;
                let maxPriority = 0;

                if ((this.data as TokenDataComplex).isChainAssigment()) {

                    for (let i = sub.length - 1; i >= 0; i--) {
                        if (sub[i].operator != null && sub[i].operator.priority > maxPriority) {
                            maxPriority = sub[i].operator.priority;
                            index = i;
                        }
                    }

                } else {

                    for (let i = 0; i < sub.length - 1; i++) {
                        if (sub[i].operator.priority > maxPriority) {
                            maxPriority = sub[i].operator.priority;
                            index = i;
                        }
                    }
                }

                let newTk = new Token(
                    "[calculated]",
                    TokenType.s_Number,
                    sub[index].operator.function(
                        sub[index],
                        sub[index + 1]));
                newTk.operator = sub[index + 1].operator;

                sub.splice(index, 2, newTk);
            }

            let val = (sub[0].data as TokenDataNumber).intValue;
            this.rawValue = val.toString();
            this.changeType(TokenType.s_Number, new TokenDataNumber(val));
            return val;
        }
        else if (this.type == TokenType.s_FnCall) {

        }
        else {

            return this.parse();
        }


    }

    private useUnary(n: number): number {
        //this.unary.forEach(p => {
        //// n = p.unaryFunc(n);
        //});
        return n;
    }

    public parse(): number {

        if (interpreter.memHandler.isVar(this.rawValue)) {
            return interpreter.memHandler.getVarVal(this.rawValue);
        } else {

            let stored = (this.data as TokenDataNumber).intValue;
            if (stored != null) return stored;
            else {
                let val = parseInt(this.rawValue);
                (this.data as TokenDataNumber).intValue = val;
                return val;
            }
        }
    }

    public deepClone(): Token {
        let a = new Token(
            this.rawValue,
            this.type
        );
        a.data = this.data.clone();
        a.unary = this.unary;
        a.operator = this.operator;

        return a;
    }

    public static calc(token: Token): number {

        if (token.type == TokenType.Complex) {

            let data = (token.data as TokenDataComplex);
            if (data.canBeCalculated()) {
                return token.calcSubs();
            }

            data.subTokens.forEach(p => {
                this.calc(p);
            });

            if (data.canBeCalculated()) {

                return token.calcSubs();
            } else {
                throw (`Cant calculate token ${token}`);
            }

        } else if (token.type == TokenType.s_FnCall) {

            let data = (token.data as TokenDataFunction);
            data.arguments.forEach(p => {
                this.calc(p);
            })

            return data.call();

        } else return token.parse();
    }
}

class Operator {
    public value: string;
    public priority: number;
    public isUnary: boolean;

    public unaryFunc: (x: Token) => number;
    public function: (x: Token, y: Token) => number;

    constructor(val: string, pri: number, isUnary: boolean, biFunc, unaryFunc) {
        this.value = val;
        this.priority = pri;
        this.isUnary = isUnary;
        this.function = biFunc;
        this.unaryFunc = unaryFunc;
    }
}

class TokenData {
    public clone(): TokenData {
        return null;
    }
}

class TokenDataNumber extends TokenData {
    public intValue: number;

    public constructor(value: number) {
        super();
        this.intValue = value;
    }

    public clone(): TokenDataNumber {
        return new TokenDataNumber(this.intValue);
    }
}

class TokenDataFunction extends TokenData {
    public func: Func;
    public arguments: Token[];
    public parrentToken: Token;

    public constructor(parrentToken: Token, func: Func, args: Token[] = new Array<Token>()) {
        super();
        this.func = func;
        this.arguments = args;
        this.parrentToken = parrentToken;
    }

    public call(): number {
        let val = this.func.call(this.arguments);
        this.parrentToken.changeType(TokenType.s_Number, new TokenDataNumber(val));
        this.parrentToken.rawValue = val.toString();

        return val;
    }

    public clone(): TokenDataFunction {
        return new TokenDataFunction(this.parrentToken, this.func, this.arguments);
    }
}

class TokenDataComplex extends TokenData {
    public subTokens: Token[];
    public subTokenOperators: Operator[];
    public parrentToken: Token;

    constructor(parrent: Token, subTokens = new Array<Token>(), subTokenOperators = new Array<Operator>()) {
        super();
        this.subTokenOperators = subTokenOperators;
        this.subTokens = subTokens;
        this.parrentToken = parrent;
    }

    public isChainAssigment(): boolean {
        return this.subTokenOperators.every(p => p.value === "=");
    }

    public canBeCalculated(): boolean {

        return this.isSimple() || this.subTokens.every(p => p.type == TokenType.s_Number);
    }

    public isSimple(): boolean {
        return this.parrentToken.type == TokenType.s_Number;
    }

    public resolveOps() {
        for (let i = 0; i < this.subTokenOperators.length; i++) {
            this.subTokens[i].operator = this.subTokenOperators[i];
        }

        this.subTokens.forEach(p => {
            if (p.type == TokenType.Complex) {
                (p.data as TokenDataComplex).resolveOps();
            }
            else if (p.type == TokenType.s_FnCall) {
                (p.data as TokenDataFunction).arguments.forEach(j => {
                    (j.data as TokenDataComplex).resolveOps()
                })
            }
        })
    }

    public clone(): TokenDataComplex {
        return new TokenDataComplex(
            this.parrentToken,
            this.subTokens.map(p => p.deepClone()),
            this.subTokenOperators
        );
    }
}

enum ListeningType {
    FunctionName,
    FunctionParamDeclarationOrSymbol,
    FunctionArgument,
    AnyNumericToken,
    Operator,

    Undef
}

class allowedTypes {
    public static all = [
        StringTokenType.FnKeyword,
        StringTokenType.Function,
        StringTokenType.Variable,
        StringTokenType.Number,
        StringTokenType.Identifier,
        StringTokenType.BrOpened
    ]

    public static fnKeywordMet = [
        StringTokenType.FnSymbol,
        StringTokenType.Identifier
    ]

    public static operatorMet = [
        StringTokenType.BrOpened,
        StringTokenType.Function,
        StringTokenType.Identifier,
        StringTokenType.Number,
        StringTokenType.Variable,
    ]

    public static fnSymbolMet = allowedTypes.operatorMet;

    public static numMet = [
        StringTokenType.Operator,
        StringTokenType.BrClosed
    ]

    public static numMetButSwitchAllowed = [
        StringTokenType.Operator,
        StringTokenType.BrClosed,

        StringTokenType.BrOpened,
        StringTokenType.Function,
        StringTokenType.Identifier,
        StringTokenType.Number,
        StringTokenType.Variable,
    ]
}

class interpreter {
    private static ErrMessages =
        {
            wrongToken: "Wrong token recieved",
            unknownToken: "Unknown identifier",
            unexpectedToken: "Unexpected token",
            wrongFuncSyntax: "Wrong function syntax"
        }

    public static debug = false;

    public static memHandler: MemoryHandler = new MemoryHandler();

    public static getTypedTokes(input: string): StringToken[] {

        let tokens = this.Tokenize(input);
        let result = new Array<StringToken>();

        for (const token of tokens) {
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
    }

    public static getTokenTree(tokens: StringToken[], offset: number): [StringToken[], string] {

        let skiping = false;
        let skipingToDepth = -1;
        let depth = 0;
        let tokenStr = "";
        let currTokens = new Array<StringToken>();

        for (let i = offset; i < tokens.length; i++) {
            let token = tokens[i];
            switch (token.type) {
                case StringTokenType.BrOpened: {

                    if (!skiping) {
                        skiping = true;
                        skipingToDepth = depth;
                        currTokens.push(this.parseTokenTree(tokens, i + 1));
                    };
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
            tokenStr += ` ${token.strVal}`;
        }
        return [currTokens, tokenStr]
    }

    public static parseTokenTree(tokens: StringToken[], index: number = 0) {
        let res = this.getTokenTree(tokens, index);
        return new StringToken(res["1"], StringTokenType._Complex, res["0"]);
    }

    public static resolveTokenSyntax(tokenToParse: StringToken, root : boolean): [Token, string[]] {
        if (this.debug)
            console.log(`resolveTokenSyntax call on "${tokenToParse.strVal}"`);

        let syntaxLogic = new SyntaxLogic(tokenToParse.strVal);

        let expectedTokens = allowedTypes.all;
        let currentListening = ListeningType.Undef;

        let fnName: string = null;
        let fnArgs = new Array<string>();

        let lastTokenType: StringTokenType;

        for (let i = 0; i < tokenToParse.subTokens.length; i++) {

            let token = tokenToParse.subTokens[i];
            if (this.debug)
                console.log(`Token: ${token.strVal}, type: ${token.type}. Listening for: ${currentListening}. Allowed: [${expectedTokens.sort().join(', ')}]. Curr Func: ${syntaxLogic.expression.rawValue}`);

            //if(expectedTokens.indexOf(token.type) == -1)
            //    throw "Unexpected token";

            switch (token.type) {
                case StringTokenType._Complex: {

                    let tk = this.resolveTokenSyntax(token, false);
                    if (tk == null) return null;

                    if (lastTokenType == StringTokenType.Number ||
                        lastTokenType == StringTokenType.Identifier ||
                        lastTokenType == StringTokenType.Variable ||
                        lastTokenType == StringTokenType._Complex) {
                        if (syntaxLogic.expression.type == TokenType.Complex &&
                            (syntaxLogic.expression.data as TokenDataComplex).subTokens.length == 0) {
                            syntaxLogic.pushToken(tk["0"]);
                            if (!syntaxLogic.tokenSwitch()) {
                                return null;
                            }
                        } else {
                            if (!syntaxLogic.tokenSwitch()) {
                                return null;
                            }
                            syntaxLogic.pushToken(tk["0"]);
                        }

                    } else if (syntaxLogic.currFunc() != null) {

                        expectedTokens = allowedTypes.numMetButSwitchAllowed;
                        syntaxLogic.pushToken(tk["0"]);

                    } else {

                        expectedTokens = allowedTypes.numMet;
                        syntaxLogic.pushToken(tk["0"]);
                    }

                    break;
                }

                case StringTokenType.FnKeyword:
                    {
                        if(currentListening != ListeningType.Undef || i != 0 || !root) 
                            throw ("Wrong declar func")

                        currentListening = ListeningType.FunctionName;
                        expectedTokens = allowedTypes.fnKeywordMet;
                    }
                    break;
                case StringTokenType.FnSymbol:
                    {
                        expectedTokens = allowedTypes.fnSymbolMet;
                        currentListening = ListeningType.AnyNumericToken;
                                
                        if(interpreter.memHandler.isVar(fnName)) { 
                            throw "variable with that name already exists"
                        }

                    }
                    break;
                case StringTokenType.Function:
                    {
                        if(currentListening == ListeningType.FunctionName) {

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

                            if(fnArgs.indexOf(token.strVal) != -1) throw "Same param already exists"
                            fnArgs.push(token.strVal);
                        }
                        else if (lastTokenType == StringTokenType.Number ||
                            lastTokenType == StringTokenType.Identifier ||
                            lastTokenType == StringTokenType.Variable ||
                            lastTokenType == StringTokenType._Complex) {
                            if (syntaxLogic.expression.type == TokenType.Complex &&
                                (syntaxLogic.expression.data as TokenDataComplex).subTokens.length == 0) {
                                syntaxLogic.tokenRegister(token);
                                if (!syntaxLogic.tokenSwitch()) {
                                    return null;
                                }

                            } else {
                                if (!syntaxLogic.tokenSwitch()) {
                                    return null;
                                }
                                syntaxLogic.tokenRegister(token);
                            }

                        } else if (syntaxLogic.currFunc() != null) {

                            expectedTokens = allowedTypes.numMetButSwitchAllowed;
                            syntaxLogic.tokenRegister(token);

                        } else {

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

            let fn = new Func(fnName, syntaxLogic.expression, fnArgs);
            if(this.memHandler.isFunc(fnName)) {
                this.memHandler.functions[this.memHandler.functions.map(p => p.name).indexOf(fnName)] = fn 
            } else {
                this.memHandler.functions.push(fn);
            }
        }

        return [syntaxLogic.expression, fnName == null ? null : fnArgs];
    }

    public static input(params: string): any {

        if (params == "") return "";

        if (this.debug)
            console.log(`== Parsing "${params}" ==`);

        let tokens = this.getTypedTokes(params);
        if (tokens == null) return null;

        let tree = this.parseTokenTree(tokens);
        if (tree == null) return null;

        let token = this.resolveTokenSyntax(tree, true);
        if (token == null) return null;

        if (!this.linkTokens(token["0"], 0, null, token["1"]))
            return null;

        if (token["1"] == null) return Token.calc(token["0"]);
        else return "";
    }

    public static linkTokens(token: Token, index: number, tokens: Token[], fnArgs: string[] = null): boolean {

        if (token.type == TokenType.Complex) {

            let sub = (token.data as TokenDataComplex).subTokens;
            for (let i = 0; i < sub.length; i++) {
                if (!this.linkTokens(sub[i], i, sub, fnArgs)) {
                    return false;
                }
            };
        }
        else if (token.type == TokenType.s_FnCall) {

            let sub = (token.data as TokenDataFunction).arguments;
            for (let i = 0; i < sub.length; i++) {
                if (!this.linkTokens(sub[i], i, sub, fnArgs)) {
                    return false;
                }
            };

        } else {

            if (tokens.length != 1 && index == tokens.length - 1 && tokens[index - 1].operator == null) {
                throw ("Unexpected token");
            }

            if (this.memHandler.isCorrectNumber(token.rawValue))
                (token.data as TokenDataNumber).intValue = parseInt(token.rawValue);

            else if (fnArgs == null && this.memHandler.isVar(token.rawValue)) {
                //OK
            }
            else if (fnArgs != null && fnArgs.indexOf(token.rawValue) != -1) {

                if (token.operator != null && token.operator.value == "=") {
                    throw ("You cannot assign value to fnArg");
                }
            } else if (token.operator == null || token.operator.value != "=") { //TODO 
                throw (`Unknown variable ${token.rawValue}`);
            }
        }

        return true;
    }

    public static Tokenize(input: string): string[] {

        if (input === "")
            return [];

        var regex = /\s*(=>|[-+*\/\%=\(\)]|[A-Za-z_][A-Za-z0-9_]*|[0-9]*\.?[0-9]+)\s*/g;
        return input.split(regex).filter(function (s) { return !s.match(/^\s*$/); });
    }
}

function Test(input: string, expected: number = undefined) {
    console.log(`> ${input}`);
    let output : any;
    try {

        output = interpreter.input(input);
    
    } catch(e) {
        console.log("== Error: " + e);
        return;
    }

    console.log(`    ${output}`);
    if (expected == output) {
        console.log("[PASS]");
    } else {
        console.log(`[FAIL]: Expected "${expected}"`);
    }
}

/*Test("1 + 1", 2);
Test("2 - 1", 1);
Test("2 * 3", 6);
Test("8 / 4", 2);
Test("7 % 4", 3);
Test("x = 1", 1);
Test("x", 1);
Test("x + 3", 4);
Test("y");
Test("fn avg x y => (x + y) / 2");
Test("avg 4 2", 3);
Test("avg 7");
Test("avg 7 2 4");
Test("fn x => 0");*/
Test("fn f => 1");
Test("f", 1);
Test("fn f => 0");
Test("f", 0)
