import { StringTokenType, TokenType } from "./tokens/TokenType"
import { MemoryHandler } from "./MemoryHandler"
import { Func } from "./Func"
import { Token } from "./tokens/Token";
import { TokenDataFunction } from "./tokens/tokenData/TokenDataFunction";
import { SyntaxLogic } from "./SyntaxLogic";
import { FunctionAccumulator } from "./FunctionAccumulator";
import { TokenDataComplex } from "./tokens/tokenData/TokenDataComplex";
import { StringToken } from "./StringToken";
import { Operator } from "./tokens/Operator";

enum ListeningType {
    FunctionName,
    FunctionParamDeclarationOrSymbol,
    FunctionArgument,
    AnyNumericToken,
    Operator,

    Undef
}

class allowedTypes
{
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

class Interpreter
{
    private static ErrMessages = 
    {
        wrongToken : "Wrong token recieved",
        unknownToken : "Unknown identifier",
        unexpectedToken : "Unexpected token",
        wrongFuncSyntax : "Wrong function syntax"
    }

    public static memHandler : MemoryHandler = new MemoryHandler();

    public static getTypedTokes(input : string) : StringToken[]  {
        
        let tokens = this.Tokenize(input);
        let result = new Array<StringToken>();

        for(const token of tokens) 
        {   
            if(token === Func.fnSymbol) 
                result.push(new StringToken(token, StringTokenType.FnSymbol));
            else if(token === "(") 
                result.push(new StringToken(token, StringTokenType.BrOpened));

            else if(token === ")") 
                result.push(new StringToken(token, StringTokenType.BrClosed));

            else if(this.memHandler.HasOnlyOperatorChars(token))
                result.push(new StringToken(token, StringTokenType.Operator));

            else if(token === Func.fnKeyword)                 
                result.push(new StringToken(token, StringTokenType.FnKeyword));
            
            else if(this.memHandler.isCorrectNumber(token))
                result.push(new StringToken(token, StringTokenType.Number));
            
            else if(this.memHandler.isCorrectIdentifier(token)) {
                
                if(this.memHandler.isVar(token)) 
                    result.push(new StringToken(token, StringTokenType.Variable));
                else if(this.memHandler.isFunc(token)) 
                    result.push(new StringToken(token, StringTokenType.Function));
                else {
                    result.push(new StringToken(token, StringTokenType.Identifier));
                }
            }
            else {
                console.log(this.ErrMessages.wrongToken);
                return null;
            }
        }
        return result;
    }

    public static getTokenTree(tokens : StringToken[], offset : number) : [ StringToken[], string ] {
        
        let skiping = false;
        let skipingToDepth = -1;
        let depth = 0;
        let tokenStr = "";
        let currTokens = new Array<StringToken>();

        for(let i = offset; i < tokens.length; i++) {
            let token = tokens[i];
            switch (token.type) {
                case StringTokenType.BrOpened: {
                    
                    if(!skiping) {
                        skiping = true;
                        skipingToDepth = depth;
                        currTokens.push(this.parseTokenTree(tokens, i + 1));
                    };
                    depth++;
                    break;
                }

                case StringTokenType.BrClosed: {
                    depth--;
                    if(depth == skipingToDepth) {
                        skiping = false;
                    }
                    if(depth < 0)
                        return [currTokens, tokenStr];
                    break;
                }

                default: {
                    if(!skiping) {
                        currTokens.push(token);
                    }
                    break;
                }
            }
            tokenStr += ` ${token.strVal}`;
        }
        return [currTokens, tokenStr]
    }

    public static parseTokenTree(tokens : StringToken[], index : number = 0) {
        let res = this.getTokenTree(tokens, index);
        return new StringToken(res["1"], StringTokenType._Complex, res["0"]);
    }

    public static resolveTokenSyntax(tokenToParse : StringToken) : Token {
        console.log(`resolveTokenSyntax call on "${tokenToParse.strVal}"`);
        

        let syntaxLogic = new SyntaxLogic();
    
        let expectedTokens = allowedTypes.all;
        let currentListening = ListeningType.Undef;
        
        let fnName : string = null;
        let fnArgs = new Array<string>();
        
        let lastTokenType : StringTokenType;


        for(let i = 0; i < tokenToParse.subTokens.length; i++) {
            
            let token = tokenToParse.subTokens[i];
            console.log(`Token: ${token.strVal}, type: ${token.type}. Listening for: ${currentListening}. Allowed: [${expectedTokens.sort().join(', ')}]. Curr Func: ${syntaxLogic.expression.rawValue}`);

            switch (token.type) {
                case StringTokenType._Complex: {
                    
                    let tk = this.resolveTokenSyntax(token);

                    if(lastTokenType == StringTokenType.Number ||
                        lastTokenType == StringTokenType.Identifier ||
                        lastTokenType == StringTokenType.Variable ||
                        lastTokenType == StringTokenType._Complex)
                    {
                        if(syntaxLogic.expression.type == TokenType.Complex &&
                            (syntaxLogic.expression.data as TokenDataComplex).subTokens.length == 0) {
                            syntaxLogic.pushToken(tk);
                            syntaxLogic.tokenSwitch();           
                        } else{
                            syntaxLogic.tokenSwitch();   
                            syntaxLogic.pushToken(tk);
                        }

                    } else if(syntaxLogic.currFunc() != null) {

                        expectedTokens = allowedTypes.numMetButSwitchAllowed;
                        syntaxLogic.pushToken(tk);

                    } else {

                        expectedTokens = allowedTypes.numMet;
                        syntaxLogic.pushToken(tk);
                    }
                    break;
                }

                case StringTokenType.FnKeyword: 
                {
                    currentListening = ListeningType.FunctionName;
                }
                break;
                case StringTokenType.FnSymbol: 
                {
                    expectedTokens = allowedTypes.fnSymbolMet;
                    //syntaxLogic.registerFunction(fnName, fnArgs, 
                    //    syntaxLogic.expression);
                }
                break; 
                case StringTokenType.Function:
                {
                    syntaxLogic.remFunc(token.strVal, this.memHandler.functions);                        
                    expectedTokens = allowedTypes.fnSymbolMet;
                    currentListening = ListeningType.FunctionArgument;                    
                }
                break;

                case StringTokenType.Identifier:
                case StringTokenType.Variable:
                case StringTokenType.Number:
                {
                    if(currentListening == ListeningType.FunctionName) {
                        
                        currentListening = ListeningType.FunctionParamDeclarationOrSymbol;
                        expectedTokens = allowedTypes.operatorMet;
                        fnName = token.strVal;
                    } 
                    else if(currentListening == ListeningType.FunctionParamDeclarationOrSymbol) {
                        
                        fnArgs.push(token.strVal);
                    } 
                    else if(lastTokenType == StringTokenType.Number ||
                            lastTokenType == StringTokenType.Identifier ||
                            lastTokenType == StringTokenType.Variable ||
                            lastTokenType == StringTokenType._Complex)
                    {
                        if(syntaxLogic.expression.type == TokenType.Complex &&
                            (syntaxLogic.expression.data as TokenDataComplex).subTokens.length == 0) {
                            syntaxLogic.tokenRegister(token);
                            syntaxLogic.tokenSwitch();           
                        } else{
                            syntaxLogic.tokenSwitch();   
                            syntaxLogic.tokenRegister(token);
                        }

                    } else if(syntaxLogic.currFunc() != null) {

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

        if(syntaxLogic.currFunc() != null) {
            syntaxLogic.tokenSwitch();

            if(syntaxLogic.currFunc() != null) {
                
                console.log(this.ErrMessages.wrongFuncSyntax);
                return null;
            }
        }   

        return syntaxLogic.expression;
    }

    public static input(params: string) : any {
        console.log(`== Parsing "${params}" ==`);
        
        let tokens = this.getTypedTokes(params);
        if(tokens == null) return null;

        let tree = this.parseTokenTree(tokens);
        if(tree == null) return null;

        let token = this.resolveTokenSyntax(tree);
        if(token == null) return null;

        return token;
    }

    public static Tokenize(input: string) : string[] {
        
        if (input === "")
            return [];

        var regex = /\s*(=>|[-+*\/\%=\(\)]|[A-Za-z_][A-Za-z0-9_]*|[0-9]*\.?[0-9]+)\s*/g;    
        return input.split(regex).filter(function (s) { return !s.match(/^\s*$/); });
    }
}

Interpreter.memHandler.functions.push(new Func("func1", new Token("{someToken}", TokenType.Complex), ["a", "b"]));

// == PARSE ==
// 1. Tokenizing
// 2. Determining token types
// 3. Building recursive string-token tree
// 4. Resolving recursive tree syntax logic
// 6. Resolving operators
// 5. Linking tokens

// == EVALUATE ==

console.log(Interpreter.input("func1 2 (5+4)"));
//console.log(Interpreter.input("2 + (3 + 4) - 5"));
//console.log(Interpreter.input("1 + (2 + (3 + (a) + 3) + 2) + 1"));
//console.log(Interpreter.input("2 * (func1 4 (10 + 6) + 2)"));
//console.log(Interpreter.input("func1 func1 10 20 30 + 2"));
//console.log(Interpreter.input("(func1 (func1 (func 10 20) 30) 40) + 2"));
//console.log(Interpreter.input("func1 func1 func 10 20 30 40 + 2"));


//console.log(Interpreter.input("fn func1 a b => 2 + a + b"));
//console.log(Interpreter.input("fn func2 => func1 3"));