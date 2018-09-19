import { Token } from "./tokens/Token";

export class Func {

    public name : string;
    public expression : Token;
    public args : string[];

    public static fnKeyword : string = "fn";
    public static fnSymbol : string = "=>";

    public constructor(name : string, exp : Token, args : string[]) {
        this.name = name;
        this.expression = exp;
        this.args = args;
    }
}