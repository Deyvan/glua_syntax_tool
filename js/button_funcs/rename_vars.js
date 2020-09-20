let find_vars
let find_vars_in_exp

let code

let find_vars_in_var = (var_) => {
    let out = []

    for(let index in var_[1]){
        let name = var_[1][index][0]
        if(name === "<prefix>"){
            out = out.concat(find_vars_in_exp(var_[1][index][1]))
        }else if(name === "<name>"){
            let start = var_[3] + lua_parser.parse_whitespace(code.substr(var_[3]))[1]
            let end = start + lua_parser.parse_word(code.substr(start))[1]

            out.push(["var", var_[1][index][1], start, end])
        }else if(name === "[]"){
            out = out.concat(find_vars_in_exp(var_[1][index][1]))
        }else if(name === "<tblcall>"){
            out = out.concat(find_vars_in_exp(["<exp>", [["<table>", var_[1][index][1]]]]))
        }else if(name === "<call>"){
            for(let index_ in var_[1][index][1]){
                out = out.concat(find_vars_in_exp(var_[1][index][1][index_]))
            }
        }else if(name === "<class_call>"){
            for(let index_ in var_[1][index][2]){
                out = out.concat(find_vars_in_exp(var_[1][index][2][index_]))
            }
        }
    }

    return out
}

find_vars_in_exp = (exp) => {
    let out = []
    for(let index in exp[1]){
        let under_exp = exp[1][index]

        if(under_exp[0] === "<var>"){
            out = out.concat(find_vars_in_var(under_exp))
        }else if(under_exp[0] === "<table>"){
            for(let index in under_exp[1][0]){
                let key = under_exp[1][0][index]
                let val = under_exp[1][1][index]
                out = out.concat(find_vars_in_exp(key))
                out = out.concat(find_vars_in_exp(val))
            }
        }else if(under_exp[0] === "<function>"){
            
            let offset = under_exp[3]
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 8
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 1
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]

            let start = offset
            let [words, len] = parse_wordlist(code.substr(offset))
            offset += len

            let iter_list = ["<arg>", words, start, offset]

            out = out.concat(["in_block", iter_list])
            out = out.concat(find_vars(under_exp[2][1]).slice(1))
        }

    }
    return out
}

let parse_wordlist = (code, offset_) => {
    let tokenizer = new lua_parser.tokenizer(code)

    let out = []
    let words = lua_parser.parse_parlist(tokenizer)
    let offset = 0

    for(let index in words){
        let word = words[index]
        offset = code.substr(offset).indexOf(word)

        let len = word.length

        out.push([word, offset_+offset, offset_+offset+len])

        offset += len
    }

    return [out, tokenizer.index]
}

let parse_funcname = (code) => {
    let tokenizer = new lua_parser.tokenizer(code)
    return [lua_parser.parse_funcname(tokenizer), tokenizer.index]
}

find_vars = (block) => {

    let out = []

    out.push("in_block")

    for(let index in block){
        let state = block[index]

        if(state[0] === "<for in>"){

            for(let index in state[2]){out = out.concat(find_vars_in_exp(state[2][index]))}

            let offset = state[4]
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 3 // for
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]

            let start = offset

            let [words, len] = parse_wordlist(code.substr(offset), offset)
            offset += len

            let iter_list = ["<iter>", words, start, offset]

            out = out.concat(["in_block", iter_list])
            out = out.concat(find_vars(state[3][1]).slice(1))

        }else if(state[0] === "<for>"){

            out = out.concat(find_vars_in_exp(state[2]))
            out = out.concat(find_vars_in_exp(state[3]))
            out = out.concat(find_vars_in_exp(state[4]))

            let offset = state[6]
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 3 // for
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]

            let start = offset

            let [words, len] = parse_wordlist(code.substr(offset), offset)
            offset += len

            out = out.concat(["in_block", ["<iter>", [[words[0]], start, offset]]].concat(find_vars(state[5][1]).slice(1)))

        }else if(state[0] === "<do>"){
            out = out.concat(find_vars(state[1][1]))
        }else if(state[0] === "<function>"){

            let offset = state[4]
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 8
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]

            let name_start = offset
            let [name, len] = parse_funcname(code.substr(offset))
            name = name[0][1]

            offset += len
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 1
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]

            let start = offset
            let [words, len_] = parse_wordlist(code.substr(offset), offset)
            offset += len_

            let arg_list = ["<arg>", words, start, offset]

            out = out.concat([["var", name, name_start, name_start+name.length], "in_block", arg_list])
            out = out.concat(find_vars(state[3][1]).slice(1))

        }else if(state[0] === "<while>"){
            out = out.concat(find_vars_in_exp(state[1]))
            out = out.concat(find_vars(state[2][1]))
        }else if(state[0] === "<repeat>"){
            out = out.concat(find_vars_in_exp(state[1]))
            out = out.concat(find_vars(state[2][1]))
        }else if(state[0] === "<local function>"){

            let offset = state[4]
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 5
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 8
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]

            let name_start = offset
            let [name, len] = parse_funcname(code.substr(offset))
            name = name[0][1]

            offset += len
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 1
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]

            let start = offset
            let [words, len_] = parse_wordlist(code.substr(offset), offset)
            offset += len_

            let arg_list = ["<arg>", words, start, offset]

            out = out.concat([["<func>", name, name_start, name_start+name.length], "in_block", arg_list])
            out = out.concat(find_vars(state[3][1]).slice(1))
        }else if(state[0] === "<if>"){
            for(let index in state){
                if(state[index][0] === "<if>") continue
                if(state[index][0] === "<first>"){
                    out = out.concat(find_vars_in_exp(state[index][1]))
                    out = out.concat(find_vars(state[index][2][1]))
                }else if(state[index][0] === "<elseif>"){
                    out = out.concat(find_vars_in_exp(state[index][1]))
                    out = out.concat(find_vars(state[index][2][1]))
                }else if(state[index][0] === "<else>"){
                    out = out.concat(find_vars(state[index][1][1]))
                }
            }
        }else if(state[0] === "<local>"){
            console.log(code.substr(state[3]))
            let offset = state[3]
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            offset += 5
            offset += lua_parser.parse_whitespace(code.substr(offset))[1]
            let start = offset
            let [words, len] = parse_wordlist(code.substr(offset), offset)
            offset += len

            out = out.concat([["<var>", words, start, offset]])
            for(let index in state[2]){out = out.concat(find_vars_in_exp(state[2][index]))}
        }else if(state[0] === "<return>"){
            for(let index in state[1]){out = out.concat(find_vars_in_exp(state[1][index]))}
        }else if(state[0] === "<global>"){
            for(let index in state[2]){out = out.concat(find_vars_in_exp(state[2][index]))}
            for(let index in state[1]){out = out.concat(find_vars_in_exp(state[1][index]))}
        }else if(state[0] === "<call>"){
            out = out.concat(find_vars_in_var(["<var>", state[1], true, state[2]]))
        }
    }

    out.push("out_block")

    return out
}


export function main(){
    
    code = editor.getValue()
    let ast = lua_parser.parser(code)

    console.log(find_vars(ast))
}
