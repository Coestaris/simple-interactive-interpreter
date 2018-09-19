import { TokenData } from "./TokenData"
import { Token } from "../Token";
import { Operator } from "../Operator";
import { TokenType } from "../TokenType";
import { TokenDataFunction } from "./TokenDataFunction";

export class TokenDataComplex extends TokenData {
    public subTokens : Token[];
    public subTokenOperators : Operator[];

    constructor() {
        super();
        this.subTokenOperators = new Array<Operator>();
        this.subTokens = new Array<Token>();        
    }

    public canBeCalculated(): boolean {
        return false; //TODO: VARS
        //return this.isSimple() || this.subTokens.every(p => p.isSimple());
    }
    public isSimple(): boolean {
        return false; //TODO: VARS
        //return (this.subTokens == null || this.subTokens.length == 0)
    }

    public resolveOps() {
        for(let i = 0; i < this.subTokenOperators.length; i++) {
            this.subTokens[i].operator =  this.subTokenOperators[i];
        }

        this.subTokens.forEach(p => {
            if(p.type == TokenType.Complex) {
                (p.data as TokenDataComplex).resolveOps();
            }
            else if(p.type == TokenType.s_FnCall) {
                (p.data as TokenDataFunction).arguments.forEach(j => {
                    (j.data as TokenDataComplex).resolveOps()
                })
            }
        })
    }
}