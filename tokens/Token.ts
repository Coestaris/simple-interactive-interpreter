import {TokenType} from "./TokenType"
import {TokenData} from "./tokenData/TokenData"
import {Operator} from "./Operator"
import { TokenDataComplex } from "./tokenData/TokenDataComplex";
import { TokenDataNumber } from "./tokenData/TokenDataNumber";
import { TokenDataFunction } from "./tokenData/TokenDataFunction";
import { Interpreter } from "../main";

export class Token {
    public type: TokenType;
    public rawValue: string;
    public data: TokenData;
    public unary: Operator[];
    public operator: Operator;

    public toString(): string {
        return `${this.rawValue}`;
    }

    public constructor(value: string, type : TokenType, intValue : number = null) {
        this.rawValue = value == null ? "" : value;
        this.type = type;
        switch(type) {
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
    
    public changeType(tokenType : TokenType, data : TokenData) : Token {
        this.type = tokenType;
        this.data = data;
        return this;
    }

    public calcSubs(): number {
        
        if(this.type == TokenType.Complex) 
        {
            let sub = (this.data as TokenDataComplex).subTokens; 
            if(sub == null || sub.length == 0) {
                
                let value = this.parse();
                this.changeType(TokenType.s_Number, new TokenDataNumber(value));
                return value;

            }

            if(sub.length == 1) {
                
                let value = sub[0].parse();
                this.changeType(TokenType.s_Number, new TokenDataNumber(value));
                return value;
            }
    
            while(sub.length != 1) {
                let index = 0;
                let maxPriority = 0;
                for(let i = 0; i < sub.length - 1; i++) {
                    if(sub[i].operator.priority > maxPriority) {
                        maxPriority = sub[i].operator.priority;
                        index = i;
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
        else if(this.type == TokenType.s_FnCall) 
        {
            
        } 
        else 
        {

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

        if(Interpreter.memHandler.isVar(this.rawValue)) {
            return Interpreter.memHandler.getVarVal(this.rawValue);
        } else {

            let stored = (this.data as TokenDataNumber).intValue;
            if(stored != null) return stored;
            else {
                let val = parseInt(this.rawValue);
                (this.data as TokenDataNumber).intValue = val;
                return val;
            } 
        }
    }

    public deepClone() : Token {
        let a = new Token(
            this.rawValue,
            this.type
        );
        a.data = this.data.clone();
        a.unary = this.unary;
        a.operator = this.operator;

        return a;
    }

    public static calc(token : Token) : number {
        
        if(token.type == TokenType.Complex) {

            let data = (token.data as TokenDataComplex);
            if(data.canBeCalculated()) {
                return token.calcSubs();
            }
    
            data.subTokens.forEach(p => {
                this.calc(p);
            });
    
            if(data.canBeCalculated()) {

                return token.calcSubs();
            } else {
                console.log(`Cant calculate token ${token}`);
            }

        } else if(token.type == TokenType.s_FnCall) {

            let data = (token.data as TokenDataFunction);
            data.arguments.forEach(p => {
                this.calc(p);
            })

            return data.call();

        } else return token.parse();
    }  
}