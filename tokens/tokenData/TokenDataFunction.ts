import { TokenData } from "./TokenData";
import { Func } from "../../Func";
import { Token } from "../Token";

export class TokenDataFunction extends TokenData {
    public func : Func;
    public arguments : Token[];

    public constructor(func : Func) {
        super();
        this.func = func;
        this.arguments = new Array<Token>();
    }
}