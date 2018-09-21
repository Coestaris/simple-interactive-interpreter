import { TokenData } from "./TokenData";
import { Func } from "../../parser/Func";
import { Token } from "../Token";
import { TokenType } from "../TokenType";
import { TokenDataNumber } from "./TokenDataNumber";

export class TokenDataFunction extends TokenData {
    public func: Func;
    public arguments: Token[];
    public parrentToken: Token;
    public constructor(parrentToken: Token, func: Func, args: Token[] = new Array<Token>()) {
        super();
        this.func = func;
        this.arguments = args;
        this.parrentToken = parrentToken;
    }
    public call(): number {
        let val = this.func.call(this.arguments);
        this.parrentToken.changeType(TokenType.s_Number, new TokenDataNumber(val));
        this.parrentToken.rawValue = val.toString();
        return val;
    }
    public clone(): TokenDataFunction {
        return new TokenDataFunction(this.parrentToken, this.func, this.arguments);
    }
}