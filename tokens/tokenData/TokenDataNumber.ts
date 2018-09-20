import {TokenData} from "./TokenData"

export class TokenDataNumber extends TokenData {
    public intValue: number;

    public constructor(value : number) {
        super();

        this.intValue = value;
    }
}