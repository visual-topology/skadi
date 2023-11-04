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

    get_column_type(column_name) {
        let all_values = this.table.values(column_name);
        for (const value of all_values) {
            if (typeof value === 'number') {
                return "number";
            } else if (typeof value === 'string') {
                return "string";
            } else if (value instanceof Date) {
                return "date";
            }
        }
        return "unknown";
    }

    analyse(column_name, value_count_limit) {
        let type = this.get_column_type(column_name);
        let all_values = this.table.values(column_name);
        if (type === "string") {
            let uncounted = 0;
            let value_counts = {};
            for (const value of all_values) {
                if (typeof value === "string" && !(value in value_counts)) {
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
            return {
                "value_counts": value_counts,
                "uncounted": uncounted
            }
        } else if (type === "number") {
            let numeric_min = null;
            let numeric_max = null;
            for (const value of all_values) {
                if (typeof value === 'number') {
                    if (numeric_min == null || value < numeric_min) {
                        numeric_min = value;
                    }
                    if (numeric_max == null || value > numeric_max) {
                        numeric_max = value;
                    }
                }
            }
            return {
                "range": {
                    "min": numeric_min,
                    "max": numeric_max
                }
            }
        } else if (type === "date") {
            let date_min = null;
            let date_max = null;
            for (const value of all_values) {
                if (value instanceof Date) {
                    if (numeric_date == null || value < date_min) {
                        date_min = value;
                    }
                    if (numeric_date == null || value > date_max) {
                        date_max = value;
                    }
                }
            }
            return {
                "range": {
                    "min": date_min.toISOString(),
                    "max": date_max.toISOString()
                }
            }
        }
    }
}

function parse_custom_date(s, fmt) {
    try {
        let year = null;
        let month = 1;
        let day = 1;
        for(let idx=0; idx < fmt.length; idx++) {
            if (fmt.slice(idx,idx+4) == 'YYYY') {
                year = Number.parseInt(s.slice(idx,idx+4));
                idx += 4;
            } else if (fmt.slice(idx,idx+2) == 'MM') {
                month = Number.parseInt(s.slice(idx,idx+2));
                idx += 2;
            } else if (fmt.slice(idx,idx+2) == 'DD') {
                day = Number.parseInt(s.slice(idx,idx+2));
                idx += 1;
            } else if (fmt.charAt(idx) === s.charAt(idx)) {
                idx += 1;
            } else {
                return null;
            }
        }
        if (year && month && day) {
            return new Date(year,month-1,day);
        }
    } catch(ex) {
        return null;
    }
}

aq.addFunction("parse_date_custom",(s,fmt) => parse_custom_date(s,fmt));
