import {MemoryHandler} from "../../MemoryHandler"
import {TokenData} from "./TokenData"

export class TokenDataVariable extends TokenData {
    public handler: MemoryHandler;

    public constructor() {
        super();
    }
}