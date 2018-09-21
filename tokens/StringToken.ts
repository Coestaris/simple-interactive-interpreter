import { StringTokenType } from "./StringTokenType";

export class StringToken {
    strVal: string;
    type: StringTokenType;

    constructor(token: string, type: StringTokenType, sub: StringToken[] = null) {
        this.strVal = token;
        this.type = type;
        this.subTokens = sub;
    }
    subTokens: StringToken[];
}