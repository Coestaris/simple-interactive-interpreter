import {TokenType} from "./TokenType"
import {TokenData} from "./tokenData/TokenData"
import {Operator} from "./Operator"
import { TokenDataComplex } from "./tokenData/TokenDataComplex";
import { TokenDataNumber } from "./tokenData/TokenDataNumber";
import { TokenDataFunction } from "./tokenData/TokenDataFunction";

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
                this.data = new TokenDataComplex();
                break;
            case TokenType.s_Number:
                this.data = new TokenDataNumber(intValue);
                break;
            case TokenType.s_FnCall:
                this.data = new TokenDataFunction(null); 
                break;
        }
    }
    
    public calc(): number {
        return null; //TODO: VARS
    }

    private useUnary(n: number): number {
        //this.unary.forEach(p => {
           //// n = p.unaryFunc(n);
        //});
        return n;
    }

    public parse(): number {
        return null; //TODO VARS
    }
}