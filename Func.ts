import { Token } from "./tokens/Token";
import { TokenType } from "./tokens/TokenType";
import { TokenDataComplex } from "./tokens/tokenData/TokenDataComplex";

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

    public call(args : Token[]) : number {
        if(args.length != this.args.length) {
            throw "Unexpected length difference";
        }

        let copy = this.expression.deepClone();

        for(let i = 0; i < args.length; i++) {
            this.findAndReplace(copy, this.args[i], args[i]);
        }

        return Token.calc(copy);
    }

    private findAndReplace(whereToFind : Token, toFind : string, toReplace : Token) {
        for(const tk of (whereToFind.data as TokenDataComplex).subTokens) {
            if(tk.type == TokenType.Complex) this.findAndReplace(tk, toFind, toReplace);
            else {

                if(tk.rawValue.trim() == toFind) {
                    tk.changeType(TokenType.Complex, new TokenDataComplex(tk, [toReplace]));
                    tk.rawValue = "{changed-type}"
                }
            }
        }
    }
}