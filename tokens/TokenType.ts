export enum TokenType {
    s_Number,
    s_Variable,
    s_FnCall,
    Complex
}

export enum StringTokenType {
    FnKeyword,
    FnSymbol,

    Number,
    Variable,
    Function,
    Identifier,

    Operator,
    BrOpened,
    BrClosed,

    _Complex
}