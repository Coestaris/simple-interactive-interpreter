import { StringTokenType } from "../tokens/StringTokenType";

export class allowedTypes {
    public static all = [
        StringTokenType.FnKeyword,
        StringTokenType.Function,
        StringTokenType.Variable,
        StringTokenType.Number,
        StringTokenType.Identifier,
        StringTokenType.BrOpened
    ];
    public static fnKeywordMet = [
        StringTokenType.FnSymbol,
        StringTokenType.Identifier
    ];
    public static operatorMet = [
        StringTokenType.BrOpened,
        StringTokenType.Function,
        StringTokenType.Identifier,
        StringTokenType.Number,
        StringTokenType.Variable,
    ];
    public static fnSymbolMet = allowedTypes.operatorMet;
    public static numMet = [
        StringTokenType.Operator,
        StringTokenType.BrClosed
    ];
    public static numMetButSwitchAllowed = [
        StringTokenType.Operator,
        StringTokenType.BrClosed,
        StringTokenType.BrOpened,
        StringTokenType.Function,
        StringTokenType.Identifier,
        StringTokenType.Number,
        StringTokenType.Variable,
    ];
}