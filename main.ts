import { MemoryHandler } from "./parser/MemoryHandler";
import { StringToken } from "./tokens/StringToken";
import { Func } from "./parser/Func";
import { StringTokenType } from "./tokens/StringTokenType";
import { Token } from "./tokens/Token";
import { SyntaxLogic } from "./parser/SyntaxLogic";
import { allowedTypes } from "./parser/allowedTypes";
import { ListeningType } from "./parser/ListeningType";
import { TokenType } from "./tokens/TokenType";
import { TokenDataComplex } from "./tokens/tokenData/TokenDataComplex";
import { TokenDataNumber } from "./tokens/tokenData/TokenDataNumber";
import { TokenDataFunction } from "./tokens/tokenData/TokenDataFunction";

export class interpreter {
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
