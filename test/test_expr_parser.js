

async function import_json(path,key) {
    let m = await import(path, {
      with: { type: "json" },
    });
    return m.default[key];
}

let basic_tests = await import_json("./test_expr_parser_basic.json","test_cases");
let literals_tests = await import_json("./test_expr_parser_literals.json","test_cases");
let failures_tests = await import_json("./test_expr_parser_failures.json","test_cases");

let test_sets = [basic_tests,literals_tests,failures_tests];

let sep = new skadi.ExpressionParser();

let binary_ops = await import_json("./test_expr_parser_binary_operators.json","binary_operators");
let unary_ops = await import_json("./test_expr_parser_unary_operators.json","unary_operators");
unary_ops.forEach(op => sep.add_unary_operator(op))
for(let op in binary_ops) {
    let precedence = binary_ops[op];
    sep.add_binary_operator(op,precedence);
}

function compare_deep(o1,o2) {
    return JSON.stringify(o1) === JSON.stringify(o2);
}

let pass_count = 0;
let fail_count = 0;

test_sets.forEach(tests => {
    for(let input in tests) {
        let expected_output = tests[input];
        let p = sep.parse(input);
        if (!compare_deep(p,expected_output)) {
           console.log("fail", input,expected_output,p);
           fail_count += 1;
        } else {
           console.log("pass:", input);
           pass_count += 1;
        }
    }
});

console.log("")
console.log("Pass: "+pass_count+", Fail: "+fail_count)
