import { Token } from "../Token";
import { TokenData } from "./TokenData";
import { Operator } from "../Operator";
import { TokenType } from "../TokenType";
import { TokenDataFunction } from "./TokenDataFunction";

export class TokenDataComplex extends TokenData {
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
                    (j.data as TokenDataComplex).resolveOps();
                });
            }
        });
    }
    
    public clone(): TokenDataComplex {
        return new TokenDataComplex(this.parrentToken, this.subTokens.map(p => p.deepClone()), this.subTokenOperators);
    }
}