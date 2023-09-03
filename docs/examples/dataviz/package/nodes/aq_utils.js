/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.AqUtils = class {

    constructor(table) {
        this.table = table;
    }

    preprocess_expression(expr) {
        let column_names = this.table.columnNames();
        let tokens = [];
        let token = "";
        let escaped = false;
        let escape_char = "\"";
        for(let idx=0; idx<expr.length; idx++) {
            let ch = expr[idx];
            if (ch === escape_char) {
                if (!escaped) {
                    escaped = true;
                } else {
                    escaped = false;
                    token += ch;
                    tokens.push(token);
                    token = "";
                    continue;
                }
            }
            if (escaped || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')
                || (ch === '_')) {
                token += ch;
            } else {
                if (token.length) {
                    tokens.push(token);
                }
                tokens.push(ch);
                token = "";
            }
        }
        if (token.length) {
            tokens.push(token);
        }
        console.log("tokens:"+JSON.stringify(tokens));
        let processed_expr = "";
        for(let idx=0; idx<tokens.length; idx+=1) {
            let token = tokens[idx];
            if (column_names.includes(token)) {
                processed_expr += "d." + token;
            } else if ((token.length > 2) &&
                token.startsWith(escape_char) &&
                token.endsWith(escape_char) &&
                column_names.includes(token.slice(1,token.length-1))) {
                processed_expr += "d["+token+"]";
            } else {
                processed_expr += token;
            }
        }
        console.log("preprocessed:"+processed_expr);
        return processed_expr;
    }

    analyse(column_name, value_count_limit) {
        let all_values = this.table.values(column_name);
        let count_numeric = 0;
        let numeric_min = null;
        let numeric_max = null;
        let value_counts = {};
        let uncounted = 0;
        for (const value of all_values) {
            if (typeof value === 'number') {
                count_numeric += 1;
                if (numeric_min == null || value < numeric_min) {
                    numeric_min = value;
                }
                if (numeric_max == null || value > numeric_max) {
                    numeric_max = value;
                }
            } else {
                if (!(value in value_counts)) {
                    if (value_count_limit === undefined || value_count_limit > 0) {
                        value_counts[value] = 1;
                        if (value_count_limit) {
                            value_count_limit -= 1;
                        }
                    } else {
                        uncounted += 1;
                    }
                } else {
                    value_counts[value] = value_counts[value]+1;
                }
            }
        }
        return {
            "fraction_numeric": count_numeric/this.table.numRows(),
            "range": {
                "min": numeric_min,
                "max": numeric_max
            },
            "value_counts": value_counts,
            "uncounted": uncounted
        };
    }
}