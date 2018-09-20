import { TokenData } from "./TokenData";
import { Func } from "../../Func";
import { Token } from "../Token";

export class TokenDataFunction extends TokenData {
    public func : Func;
    public arguments : Token[];

    public constructor(func : Func, args : Token[] = new Array<Token>()) {
        super();
        this.func = func;
        this.arguments = args;
    }

    public call() : number {
        return this.func.call(this.arguments);
    }

    public clone() : TokenDataFunction {
        return new TokenDataFunction(this.func, this.arguments);
    }
}