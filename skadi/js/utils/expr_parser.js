
var skadi = skadi || {};

skadi.ExpressionParser = class {

    constructor() {
        this.input = undefined;
        this.unary_operators = {};
        this.binary_operators = {};
        this.reset();
    }

    reset() {
        // lexer state
        this.index = 0;
        this.tokens = [];
        this.current_token_type = undefined; // s_string, d_string, string, name, operator, number, open_parenthesis, close_parenthesis, comma
        this.current_token_start = 0;
        this.current_token = undefined;
    }

    add_unary_operator(name) {
        this.unary_operators[name] = true;
    }

    add_binary_operator(name,precedence) {
        this.binary_operators[name] = precedence;
    }

    is_alphanum(c) {
        return (this.is_alpha(c) || (c >= "0" && c <= "9"));
    }

    is_alpha(c) {
        return ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z"));
    }

    flush_token() {
        if (this.current_token_type !== undefined) {
            if (this.current_token_type === "name") {
                // convert to name => operator if the name matches known operators
                if (this.current_token in this.binary_operators || this.current_token in this.unary_operators) {
                    this.current_token_type = "operator";
                }
            }
            this.tokens.push([this.current_token_type, this.current_token, this.current_token_start]);
        }
        this.current_token = "";
        this.current_token_type = undefined;
        this.current_token_start = undefined;
    }

    read_whitespace(c) {
        switch(this.current_token_type) {
            case "s_string":
            case "d_string":
                this.current_token += c;
                break;
            case "name":
            case "operator":
            case "number":
                this.flush_token();
            default:
                break;
        }
    }

    read_doublequote() {
        switch(this.current_token_type) {
            case "d_string":
                this.flush_token();
                break;
            case "s_string":
                this.current_token += '"';
                break;
            default:
                this.flush_token();
                this.current_token_type = "d_string";
                this.current_token_start = this.index;
                break;
        }
    }

    read_singlequote() {
        switch(this.current_token_type) {
            case "s_string":
                this.flush_token();
                break;
            case "d_string":
                this.current_token += "'";
                break;
            default:
                this.flush_token();
                this.current_token_type = "s_string";
                this.current_token_start = this.index;
                break;
        }
    }

    read_digit(c) {
        switch(this.current_token_type) {
            case "operator":
                this.flush_token();
            case undefined:
                this.current_token_type = "number";
                this.current_token_start = this.index;
                this.current_token = c;
                break;
            case "d_string":
            case "s_string":
            case "name":
            case "number":
                this.current_token += c;
                break;
        }
    }

    read_e(c) {
        switch(this.current_token_type) {
            case "number":
                // detect exponential notation E or e
                this.current_token += c;
                // special case, handle negative exponent eg 123e-10
                if (this.input[this.index+1] === "-") {
                    this.current_token += "-";
                    this.index += 1;
                }
                break;

            default:
                this.read_default(c);
                break;
        }
    }

    read_parenthesis(c) {
        switch(this.current_token_type) {
            case "s_string":
            case "d_string":
                this.current_token += c;
                break;
            default:
                this.flush_token();
                this.tokens.push([(c === "(") ? "open_parenthesis" : "close_parenthesis",c, this.index]);
                break;
        }
    }

    read_comma(c) {
        switch(this.current_token_type) {
            case "d_string":
            case "s_string":
                this.current_token += c;
                break;
            default:
                this.flush_token();
                this.tokens.push(["comma",c, this.index]);
                break;
        }
    }

    read_default(c) {
        switch(this.current_token_type) {
            case "d_string":
            case "s_string":
                this.current_token += c;
                break;
            case "name":
                if (this.is_alphanum(c) || c === "_" || c === ".") {
                    this.current_token += c;
                } else {
                    this.flush_token();
                    this.current_token_type = "operator";
                    this.current_token_start = this.index;
                    this.current_token = c;
                }
                break;
            case "number":
                this.flush_token();
                // todo handle exponential notation eg 1.23e10
                if (this.is_alphanum(c)) {
                    throw {"error":"invalid_number","error_pos":this.index,"error_content":c};
                } else {
                    this.flush_token();
                    this.current_token_type = "operator";
                    this.current_token_start = this.index;
                    this.current_token = c;
                }
                break;
            case "operator":
                if (this.is_alphanum(c)) {
                    this.flush_token();
                    this.current_token_type = "name";
                    this.current_token_start = this.index;
                    this.current_token = c;
                } else {
                    if (this.current_token in this.unary_operators || this.current_token in this.binary_operators) {
                        this.flush_token();
                        this.current_token_type = "operator";
                        this.current_token_start = this.index;
                    }
                    this.current_token += c;
                }
                break;
            case undefined:
                this.current_token = c;
                if (this.is_alpha(c)) {
                    this.current_token_type = "name";
                } else {
                    this.current_token_type = "operator";
                }
                this.current_token_start = this.index;
                break;
            default:
                throw {"error":"internal_error","error_pos":this.index};
        }
    }

    read_eos() {
        switch(this.current_token_type) {
            case "d_string":
            case "s_string":
                throw {"error":"unterminated_string","error_pos":this.input.length};
            default:
                this.flush_token();
        }
    }

    merge_string_tokens() {
        let merged_tokens = [];
        let buff = "";
        let buff_pos = -1;
        for(let idx=0; idx<this.tokens.length;idx++) {
            let t = this.tokens[idx];
            let ttype = t[0];
            let tcontent = t[1];
            let tstart = t[2];
            if (ttype === "s_string" || ttype === "d_string") {
                buff += tcontent;
                buff_pos = (buff_pos < 0) ? tstart : buff_pos;
            } else {
                if (buff_pos >= 0) {
                    merged_tokens.push(["string",buff,buff_pos]);
                    buff = "";
                    buff_pos = -1;
                }
                merged_tokens.push(t);
            }
        }
        if (buff_pos >= 0) {
            merged_tokens.push(["string", buff, buff_pos]);
        }
        this.tokens = merged_tokens;
    }

    lex() {
        this.reset();
        this.index = 0;
        while(this.index < this.input.length) {
            let c = this.input.charAt(this.index);
            switch(c) {
                case " ":
                case "\t":
                case "\n":
                    this.read_whitespace(c);
                    break;
                case "\"":
                    this.read_doublequote();
                    break;
                case "'":
                    this.read_singlequote();
                    break;
                case "(":
                case ")":
                    this.read_parenthesis(c);
                    break;
                case ",":
                    this.read_comma(c);
                    break;
                case "0":
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                case ".":
                    this.read_digit(c);
                    break;
                case "e":
                case "E":
                    this.read_e(c);
                    break;
                default:
                    this.read_default(c);
                    break;
            }
            this.index += 1;
        }
        this.read_eos();
        this.merge_string_tokens();
        return this.tokens;
    }

    get_ascending_precedence() {
        let prec_list = [];
        for(let op in this.binary_operators) {
            prec_list.push(this.binary_operators[op]);
        }

        prec_list = [...new Set(prec_list)];

        prec_list = prec_list.sort();

        return prec_list;
    }

    parse(s) {
        this.input = s;
        try {
            this.lex();
            this.token_index = 0;
            let parsed = this.parse_expr();
            this.strip_debug(parsed);
            return parsed;
        } catch(ex) {
            return ex;
        }
    }

    get_parser_context() {
        return {
            "type": this.tokens[this.token_index][0],
            "content": this.tokens[this.token_index][1],
            "pos": this.tokens[this.token_index][2],
            "next_type": (this.token_index < this.tokens.length - 1) ? this.tokens[this.token_index+1][0] : null,
            "last_type": (this.token_index > 0) ? this.tokens[this.token_index-1][0] : null
        }
    }

    parse_function_call(name) {
        let ctx = this.get_parser_context();
        let result = {
            "function": name,
            "args": [],
            "pos": ctx.pos
        }
        // skip over function name and open parenthesis
        this.token_index += 2;

        // special case - no arguments
        ctx = this.get_parser_context();
        if (ctx.type === "close_parenthesis") {
            return result;
        }

        while(this.token_index < this.tokens.length) {
            ctx = this.get_parser_context();
            if (ctx.last_type === "close_parenthesis") {
                return result;
            } else {
                if (ctx.type === "comma") {
                    throw {"error": "comma_unexpected", "error_pos": ctx.pos};
                }
                // read an expression and a following comma or close parenthesis
                result.args.push(this.parse_expr());
            }
        }
        return result;
    }

    parse_expr() {
        let args = [];
        while(this.token_index < this.tokens.length) {
            let ctx = this.get_parser_context();
            switch(ctx.type) {
                case "name":
                    if (ctx.next_type === "open_parenthesis") {
                        args.push(this.parse_function_call(ctx.content));
                    } else {
                        this.token_index += 1;
                        args.push({"name":ctx.content,"pos":ctx.pos});
                    }
                    break;
                case "string":
                    args.push({"literal":ctx.content,"pos":ctx.pos});
                    this.token_index += 1;
                    break;
                case "number":
                    args.push({"literal":Number.parseFloat(ctx.content),"pos":ctx.pos});
                    this.token_index += 1;
                    break;
                case "open_parenthesis":
                    this.token_index += 1;
                    args.push(this.parse_expr());
                    break;
                case "close_parenthesis":
                case "comma":
                    this.token_index += 1;
                    return this.refine_expr(args,this.token_index-1);
                case "operator":
                    args.push({"operator":ctx.content,"pos":ctx.pos});
                    this.token_index += 1;
                    break;
            }
        }
        return this.refine_expr(args,this.token_index);
    }

    refine_binary(args) {
        let precedences = this.get_ascending_precedence();
        for(let precedence_idx=0; precedence_idx < precedences.length; precedence_idx++) {
            let precedence = precedences[precedence_idx];
            for(let idx=args.length-2; idx>=0; idx-=2) {
                let subexpr = args[idx];
                if (subexpr.operator && this.binary_operators[subexpr.operator] === precedence) {
                    let lhs = args.slice(0,idx);
                    let rhs = args.slice(idx+1,args.length);
                    return {"operator":subexpr.operator,"pos":subexpr.pos,"args":[this.refine_binary(lhs),this.refine_binary(rhs)]};
                }
            }
        }
        return args[0];
    }

    refine_expr(args,end_pos) {
        if (args.length === 0) {
            throw {"error": "expression_expected", "pos": end_pos};
        }
        // first deal with unary operators
        for(let i=args.length-1; i>=0; i--) {
            // unary operators
            let arg = args[i];
            let prev_arg = (i>0) ? args[i-1] : undefined;
            let next_arg = (i<args.length-1) ? args[i+1] : undefined;
            if (arg.operator && (arg.operator in this.unary_operators)) {
                if (prev_arg === undefined || prev_arg.operator) {
                    if (next_arg !== undefined) {
                        // special case, convert unary - followed by a number literal to a negative number literal
                        if (arg.operator === "-" && typeof next_arg.literal === "number") {
                            args = args.slice(0, i).concat([{
                                "literal": -1*next_arg.literal,
                                "pos": arg.pos
                            }]).concat(args.slice(i + 2, args.length));
                        } else {
                            args = args.slice(0, i).concat([{
                                "operator": arg.operator,
                                "pos": arg.pos,
                                "args": [next_arg]
                            }]).concat(args.slice(i + 2, args.length));
                        }
                    }
                }
            }
        }

        // check that args are correctly formed, with operators in every second location, ie "e op e op e" and all operators
        // are binary operators with no arguments already assiged
        for(let i=0; i<args.length; i+=1) {
            let arg = args[i];
            if (i % 2 === 1) {
                if (!arg.operator || "args" in arg) {
                    throw {"error": "operator_expected", "error_pos": arg.pos };
                } else {
                    if (!(arg.operator in this.binary_operators)) {
                        throw {"error": "binary_operator_expected", "error_pos": arg.pos};
                    }
                }
            }
            if (i % 2 === 0 || i === args.length-1) {
                if (arg.operator && !("args" in arg)) {
                    throw {"error": "operator_unexpected", "error_pos": arg.pos};
                }
            }
        }

        return this.refine_binary(args);
    }

    strip_debug(expr) {
        if ("pos" in expr) {
            delete expr.pos;
        }
        if ("args" in expr) {
            expr.args.forEach(e => this.strip_debug(e));
        }
    }

}
