import { TokenData } from "./TokenData";

export class TokenDataNumber extends TokenData {
    public intValue: number;
    public constructor(value: number) {
        super();
        this.intValue = value;
    }
    public clone(): TokenDataNumber {
        return new TokenDataNumber(this.intValue);
    }
}