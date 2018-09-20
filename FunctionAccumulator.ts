import { Token } from "./tokens/Token";
import { TokenDataFunction } from "./tokens/tokenData/TokenDataFunction";

export class FunctionAccumulator {

    private static gId : number = 0; 

    public count: number; //current accumulated tokens
    public max: number; //maximum tokens 
    public data: TokenDataFunction; //expression to accumulate
    public brDepth: number;
    public id : number;

    constructor(expression: TokenDataFunction, brDepth: number = 0) {
        this.data = expression;
        this.max = expression.func.args.length;
        this.count = 0;
        this.brDepth = brDepth;

        this.id = FunctionAccumulator.gId++;
    }

    public full(): boolean {
        return this.count == this.max;
    }

    public push(token: Token) {
        this.count++;
        this.data.arguments.push(token);
    }
}