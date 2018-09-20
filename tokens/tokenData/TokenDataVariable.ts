import {MemoryHandler} from "../../MemoryHandler"
import {TokenData} from "./TokenData"

export class TokenDataVariable extends TokenData {
    public handler: MemoryHandler;

    public constructor(handler : MemoryHandler) {
        super();
        this.handler = handler;
    }

    public clone() : TokenDataVariable {
        return new TokenDataVariable(this.handler);
    }
}