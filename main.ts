import { StringTokenType, TokenType } from "./tokens/TokenType"
import { MemoryHandler } from "./MemoryHandler"
import { Func } from "./Func"
import { Token } from "./tokens/Token";
import { TokenDataFunction } from "./tokens/tokenData/TokenDataFunction";
import { SyntaxLogic } from "./SyntaxLogic";
import { FunctionAccumulator } from "./FunctionAccumulator";
import { TokenDataComplex } from "./tokens/tokenData/TokenDataComplex";

export class StringToken { 
    strVal : string;
    type : StringTokenType

    constructor(token : string, type : StringTokenType) {
        this.strVal = token;
        this.type = type;
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

    public static parseTokens(tokens : StringToken[], offset : number) : Token[] {
       
    }

    public static input(params: string) : any {
        console.log(`== Parsing "${params}" ==`);
        
        let tokens = this.getTypedTokes(params);
        if(tokens == null) return null;

        let expression = this.parseTokens(tokens);
        if(expression == null) return null;

        return expression;
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

//console.log(Interpreter.input("(func1 4 2) + 2"));
console.log(Interpreter.input("(func1 10 (20)) + (func1 30 40)"));
//console.log(Interpreter.input("func1 (2+(2+3)) ((((2 - 1) - 2) - 4) - 5) + 2"));
//console.log(Interpreter.input("2 * (func1 4 (10 + 6) + 2)"));
//console.log(Interpreter.input("func1 func1 10 20 30 + 2"));
//console.log(Interpreter.input("(func1 (func1 (func 10 20) 30) 40) + 2"));
//console.log(Interpreter.input("func1 func1 func 10 20 30 40 + 2"));


//console.log(Interpreter.input("fn func1 a b => 2 + a + b"));
//console.log(Interpreter.input("fn func2 => func1 3"));