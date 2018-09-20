import {Variable} from "./Variable"
import {Func} from "./Func"
import {Operator} from "./tokens/Operator"
import { Token } from "./tokens/Token";
import { TokenType } from "./tokens/TokenType";

export class MemoryHandler {

    public constructor() {
        this.InitOps();
        this.variables = new Array<Variable>();
        this.functions = new Array<Func>();
    }

    public variables : Variable[];
    public functions : Func[];

    public isFunc(str : string) : boolean {
        for(const a of this.functions) {
            if(str === a.name) return true;
        }

        return false;
    }

    public isVar(str : string) : boolean {
        for(const a of this.variables) {
            if(str === a.name) return true;
        }

        return false;
    }

    private identifierRegex = /^[a-zA-Z][_\w]$/.compile();
    private numberRegex = /^\d+$/.compile();

    public isCorrectIdentifier(str : string) : boolean {
        return str.match(this.identifierRegex) != null;
    }

    public isCorrectNumber(str : string) : boolean {
        return str.split("").every(p => ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "."].
            indexOf(p) != -1);
    }

    private operators : Array<Operator> = [
        new Operator("*", 2, false, (a : Token, b : Token) => {
            let value = a.parse() + b.parse();
            return new Token(`C:${value.toString()}`, TokenType.s_Number);
        }, null),

        new Operator("/", 1, false, (a : Token, b : Token) => {
            let value = a.parse() / b.parse();
            return new Token(`C:${value.toString()}`, TokenType.s_Number);
        }, null),

        new Operator("+", 1, false, (a : Token, b : Token) => {
            let value = a.parse() + b.parse();
            return new Token(`C:${value.toString()}`, TokenType.s_Number);
        }, null),

        new Operator("-", 1, false, (a : Token, b : Token) => {
            let value = a.parse() - b.parse();
            return new Token(`C:${value.toString()}`, TokenType.s_Number);
        }, null),

        new Operator("=", 2, false, (a : Token, b : Token) => {
            if(!this.isVar(a.rawValue)) {
                return null;
            }

            let value = b.parse();
            this.variables[this.variables.map(p => p.name).lastIndexOf(a.rawValue)].value =
                value;

            return new Token(`C:${value.toString()}`, TokenType.s_Number);
        }, null),
    ]

    private InitOps() {
        this.operators.forEach(p => {
            let chars = p.value.split("");
            chars.forEach(j => {
                if(this.opChars.lastIndexOf(j) == -1)
                    this.opChars.push(j);
            });
            this.maxPriop = Math.max(this.maxPriop, p.priority);
        })
    }

    private opChars = new Array<string>();
    private maxPriop : number = 0;

    private isOpChar(c : string) {
        return this.opChars.lastIndexOf(c) != -1;
    }

    public HasOnlyOperatorChars(s : string) : boolean {
        return s.split("").every(p => this.isOpChar(p));
    }

    public findOp(s : string, unary : boolean) : Operator {
        return this.operators.filter(p => p.isUnary == unary && p.value == s)[0];;
    }
}