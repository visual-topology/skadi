console.log("hi there")


let binary_ops = {
    "*": 8,
    "/": 8,
    "+": 7,
    "-": 7
}

let op_list = [];
for(let op in binary_ops) {
    op_list.push(op);
}

function compare( op1, op2 ) {
    let p1 = binary_ops[op1];
    let p2 = binary_ops[op2];
    if ( p1 < p2 ){
        return -1;
    }
    if ( p1 > p2){
        return 1;
    }
    return 0;
}


let precedence = op_list.sort(compare);
console.log(precedence);

let test_expr = [{"expression":{"number":1}},{"operator":"*"},{"expression":{"number":2}},{"operator":"*"},{"expression":{"number":3}}];

function refine(expr) {
    for(let precedence_idx=0; precedence_idx < precedence.length; precedence_idx++) {
        let operator = precedence[precedence_idx];
        for(let idx=expr.length-1; idx>=0; idx--) {
            let subexpr = expr[idx];
            if (subexpr.operator == operator) {
                let lhs = expr.slice(0,idx);
                let rhs = expr.slice(idx+1,expr.length);
                return {"binary_op":{"operator":operator,"lhs":refine(lhs),"rhs":refine(rhs)}};
            }
        }
    }
    return expr;
}

console.log(JSON.stringify(refine(test_expr),null,2));