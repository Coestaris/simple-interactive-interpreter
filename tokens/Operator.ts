export class Operator {
    public value: string;
    public priority: number;
    public isUnary: boolean;
    public unaryFunc: (x: number) => number;
    public function: (x: number, y: number) => number;
    constructor(val: string, pri: number, isUnary: boolean, biFunc, unaryFunc) {
        this.value = val;
        this.priority = pri;
        this.isUnary = isUnary;
        this.function = biFunc;
        this.unaryFunc = unaryFunc;
    }
}