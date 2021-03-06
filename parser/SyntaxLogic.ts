import { FunctionAccumulator } from "./FunctionAccumulator";
import { Token } from "../tokens/Token";
import { Operator } from "../tokens/Operator";
import { TokenDataComplex } from "../tokens/tokenData/TokenDataComplex";
import { TokenType } from "../tokens/TokenType";
import { TokenDataFunction } from "../tokens/tokenData/TokenDataFunction";
import { Func } from "./Func";
import { interpreter } from "../main";
import { StringToken } from "../tokens/StringToken";
import { MemoryHandler } from "./MemoryHandler";

export class SyntaxLogic {
    public expressionStack: Token[];
    public expression: Token;
    public functionsToParse: FunctionAccumulator[];

    private pushOp(op: Operator) {
        (this.expression.data as TokenDataComplex).subTokenOperators.push(op);
    }

    public pushToken(tk: Token) {
        if (this.expression.type == TokenType.Complex) {
            (this.expression.data as TokenDataComplex).subTokens.push(tk);
        }
        else if (this.expression.type == TokenType.s_FnCall) {
            (this.expression.data as TokenDataFunction).arguments.push(tk);
        }
    }

    public constructor(name: string = "") {
        this.expression = new Token(`=ROOT${name == "" ? "" : `(of ${name})`}=`, TokenType.Complex);
        this.functionsToParse = new Array<FunctionAccumulator>();
        this.expressionStack = new Array<Token>();
    }

    public currFunc(): FunctionAccumulator {
        if (this.functionsToParse.length == 0)
            return null;
        return this.functionsToParse[this.functionsToParse.length - 1];
    }

    public remFunc(fnName: string, funcs: Func[]) {
    
        this.functionsToParse.push(new FunctionAccumulator(new TokenDataFunction(this.expression, funcs.filter(p => p.name == fnName)[0])));
        let funcCall = new Token(`==FUNC-CALL(${this.currFunc().id})==`, TokenType.s_FnCall);
        funcCall.data = this.currFunc().data;
    
        this.pushToken(funcCall);
    
        this.expressionStack.push(this.expression);
        this.expressionStack.push(funcCall);
        let tk = new Token(`=FUNC-ARG(${this.currFunc().id})(${this.currFunc().count})=`, TokenType.Complex);
        this.expression = tk;
    }

    public tokenSwitch(): boolean {
        if (interpreter.debug)
            console.log("!!!!!!!SWITCHED!!!!!!");
        
        if (this.functionsToParse.length == 0) {
            throw ("Unexpected token");
        }

        this.currFunc().push(this.expression);
        this.expression = this.expressionStack.pop();
        let f = false;
        
        while (this.functionsToParse.length != 0 && this.currFunc().full()) {
            f = true;
            if (interpreter.debug)
                console.log("===============FUNC END==================");
        
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
        this.pushToken(new Token(token.strVal, TokenType.s_Number));
    }

    public operatorRegsiter(memHandle: MemoryHandler, token: StringToken) {
        if ((this.expression.data as TokenDataComplex).subTokens.length == 0) {
            throw "Nowhere to put token :/";
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