const spec = "!#%&()*+,-./:;<=>?[\\]^{|}~\"\'"
const white = "\n\t\r "
const reg_number = /^(?:[0-9])*(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?/
const reg_hex = /^0[xX][0-9a-fA-F]+/

let is_spec = (char) => spec.includes(char)
let is_whitespace = (char) => white.includes(char)
let is_number = (char) => char.match(/[0-9]/) != null

const spec_ops = {
    "...": true,
    "<=": true,
    ">=": true,
    "==": true,
    "!=": true,
    "~=": true,
    "..": true,
    "--": true,
    "&&": true,
    "||": true,
}

let parse_number = (input) => { // хаха жди себя на пакетиках чисел
    let reg_result = input.match(reg_hex)
    if(reg_result) if(reg_result[0].length > 0) return [reg_result[0], reg_result[0].length]

    reg_result = input.match(reg_number)
    if(reg_result) if(reg_result[0].length > 0) if(reg_result[0] !== ".") return [reg_result[0], reg_result[0].length]

    return [false, 0]
}

let parse_string = (input) => { // возращает Array utf8
    let prefix = input.substr(0,2)

    if (
        !(
            prefix[0] === "\"" ||
            prefix[0] === "\'" ||
            (prefix[0] === "[" && (prefix[1] === "[" || prefix[1] == "="))
        )
    ) return [false, 0]

    let out = []
    let offset = 0

    if(prefix[0] === "\"" || prefix[0] === "\'"){
        let source = new TextEncoder("utf8").encode(input)
        let length = source.length
        let index = 1

        {//посчитать длинну строки в utf16 (ненавижу js за это)
            let end = input[0]
            let index = 1
            let out = 0

            while(index < input.length){

                if(input[index] == "\\" && input[index+1] == "\\"){
                    index += 2
                    out += 2
                    continue
                }

                if(input[index] == "\\" && input[index+1] == end){
                    index += 2
                    out += 2
                    continue
                }

                if(input[index] == end){
                    break
                }

                index++
                out++
            }

            offset = out+2
        }

        while(index < length){
            let char = source[index]

            if(char == 92){ // if char == \
                index++
                char = source[index]
    
                switch(char){
                    case 97: //  \a
                        out.push(7);  index++; break
                    case 98: //  \b
                        out.push(8);  index++; break
                    case 102: // \f
                        out.push(12); index++; break
                    case 110: // \n
                        out.push(10); index++; break
                    case 114: // \r
                        out.push(13); index++; break
                    case 116: // \t
                        out.push(9);  index++; break
                    case 118: // \v
                        out.push(11); index++; break
                    case 92: //  \\
                        out.push(92); index++; break
                    case 34: // \"
                        out.push(34); index++; break
                    case 39: //  \'
                        out.push(39); index++; break
                    case 120: // \xXX
                        index++; out.push(parseInt(String.fromCharCode(source[index])+String.fromCharCode(source[index+1]), 16)); index += 2; break
                }
    
                if(48 <= char && 57 >= char){ // \NNN
                    index++
                    var byte = char-48
    
                    if(48 <= source[index] && 57 >= source[index]){
                        byte = byte * 10 + (source[index]-48)
                        index++
                    }
    
                    if(48 <= source[index] && 57 >= source[index]){
                        byte = byte * 10 + (source[index]-48)
                        index++
                    }
    
                    out.push(byte)
                }
            }else if(char == source[0]){
                index++
                break
            }else{
                out.push(source[index])
                index++
            }
            
        }
    }else if (prefix[0] === "[" && (prefix[1] === "[" || prefix[1] == "=")){

        let length = input.length
        let index = 1
        let buffer = ""

        let sep_count = 0
        while(input[index] === "="){index++; sep_count++} // я забыл про существование регулярных выраженний в данном фрагменте кода :D
        index++

        let suffix = "]" + "=".repeat(sep_count) + "]"
        offset += suffix.length * 2

        while(index < length){
            if(input.substr(index, suffix.length) === suffix) break
            buffer += input[index]
            offset++
            index++
        }

        out = new TextEncoder("utf8").encode(buffer)

    }else{return [false, 0]}

    return [out, offset]
}

let parse_word = (input) => {
    let out = ""
    let offset = 0

    if(
        is_spec(input[offset]) ||
        is_whitespace(input[offset]) ||
        is_number(input[offset])
    ) return [false, 0]

    while(!(is_spec(input[offset]) || is_whitespace(input[offset])) && offset < input.length){
        out += input[offset]
        offset++
    }

    return [out, offset]
}

let parse_whitespace = (input) => { // дадада
    let out = ""
    let offset = 0

    if(!is_whitespace(input[offset])) return [false, 0]

    while(is_whitespace(input[offset]) && offset < input.length){
        out += input[offset]
        offset++
    }

    return [out, offset]
}

let parse_special = (input) => {
    for(let key in spec_ops){
        if(input.substr(0, key.length) == key){
            return [key, key.length]
        }
    }

    if(is_spec(input[0])) return [input[0], 1]

    return [false, 0]
}

let parse_label = (input) => {
    if(
        input[0] !== ":" ||
        input[1] !== ":"
    ) return [false, 0]

    let offset = 2

    offset += parse_whitespace(input.substr(offset))[1]

    let [out, word_len] = parse_word(input.substr(offset))
    offset += word_len

    offset += parse_whitespace(input.substr(offset))[1]

    offset += 2 //скипать :: в конце

    return [out, offset]
}

function lua_tokenizer(code){
    this.code = code
    this.index = 0

    this.next = () => {

        //скипануть пробелы и коменты

        let removed = false
        do{
            removed = false

            {//пробелы
                let char = this.code[this.index]
                while(char === "\n" || char === "\r" || char === "\t" || char === " "){
                    this.index++
                    char = this.code[this.index]
                    removed = true
                }
            }

            {//коменты
                let char2 = this.code.substr(this.index, 2)
                if(char2 === "/*"){
                    this.index += 2
                    while(this.code.substr(this.index, 2) !== "*/" && this.index < this.code.length){
                        this.index++
                    }
                    this.index += 2
                    removed = true
                }else if(char2 === "--"){
                    this.index += 2
                    if(this.code.substr(this.index).match(/^\[=*\[/)){
                        let suffix = this.code.substr(this.index)
                            .match(/^\[=*\[/)[0]
                            .replace("[", "]")
                            .replace("[", "]")
                        
                        this.index += suffix.length

                        while(this.code.substr(this.index, suffix.length) !== suffix && this.index < this.code.length){
                            this.index++
                        }

                        this.index += suffix.length
                    }else{
                        while(this.code[this.index] !== "\n" && this.index < this.code.length){
                            this.index++
                        }
                    }
                    removed = true
                }
            }

        }while(removed)

        if(this.index >= this.code.length) return ["<eof>"]

        {let [token, offset] = parse_label(code.substr(this.index))
        if(token !== false){this.index += offset; return ["<label>", token]}}

        {let [token, offset] = parse_number(code.substr(this.index))
        if(token !== false){this.index += offset; return ["<number>", token]}}

        {let [token, offset] = parse_string(code.substr(this.index))
        if(token !== false){this.index += offset; return ["<string>", token]}}

        {let [token, offset] = parse_word(code.substr(this.index))
        if(token !== false){this.index += offset; return ["<word>", token]}}

        {let [token, offset] = parse_special(code.substr(this.index))
        if(token !== false){this.index += offset; return ["<special>", token]}}
    }

    this.next_is = (in_token) => {
        let temp_index = this.index
        let [token, data] = this.next()
        this.index = temp_index

        if(in_token === token){
            if(data === undefined){
                return true
            }else{
                return data
            }
        }else{
            return false
        }
    }

    this.current = () => {
        let temp_index = this.index
        let [token, data] = this.next()
        this.index = temp_index

        return [token, data]
    }
}

let parse_exp
let parse_table

let parse_parlist = (tokenizer) => {
    let out = []

    if(tokenizer.next_is("<special>") === "..."){
        tokenizer.next()
        out.push("<vararg>")
        return out
    }

    while(tokenizer.next_is("<word>")){
        out.push(tokenizer.next()[1])
        if(tokenizer.next_is("<special>") === ","){
            tokenizer.next()
            if(tokenizer.next_is("<special>") === "..."){
                tokenizer.next()
                out.push("<vararg>")
                break
            }
        }else{break}
    }
    return out
}

let parse_prefixexp = (tokenizer) => {
    let data = tokenizer.next_is("<special>")
    
    if(data === "("){
        tokenizer.next()
        let exp = parse_exp(tokenizer)
        if(tokenizer.next_is("<special>") === ")"){
            tokenizer.next();
            return ["<prefix>", exp]
        }
    }

    let exp = parse_exp(tokenizer)
    return ["<prefix>", exp]
}

let parse_explist = (tokenizer) => {
    let out = []
    
    if(
        tokenizer.next_is("<special>") &&
        tokenizer.next_is("<special>") !== "{" &&
        tokenizer.next_is("<special>") !== "(" &&
        tokenizer.next_is("<special>") !== "#" &&
        tokenizer.next_is("<special>") !== "-" &&
        tokenizer.next_is("<special>") !== "!" &&
        tokenizer.next_is("<special>") !== "...") return []

    if(
        tokenizer.next_is("<word>") &&
        (
            tokenizer.next_is("<word>") == "end" ||
            tokenizer.next_is("<word>") == "until" ||
            tokenizer.next_is("<word>") == "do"
        ) || tokenizer.next_is("<eof>")
    ) return[]

    out.push(parse_exp(tokenizer))
    
    while(tokenizer.next_is("<special>") === ","){
        tokenizer.next()
        out.push(parse_exp(tokenizer))
    }
    return out
}

let parse_funcname = (tokenizer) => {
    let out = []

    let da = tokenizer.next_is("<word>")

    if(
        da &&
        da !== "nil" &&
        da !== "true" &&
        da !== "false"
    ){
        out.push(["<name>", tokenizer.next()[1]])
    }else{
        out.push(parse_prefixexp(tokenizer))
    }

    while(!tokenizer.next_is("<eof>")){
        let data = tokenizer.next_is("<special>")

        if(data === "."){
            tokenizer.next()
            out.push([".", tokenizer.next()[1]])
            continue
        }

        if(data === ":"){
            tokenizer.next()
            out.push([":", tokenizer.next()[1]])
            continue
        }

        break
    }


    return out
}

let parse_var = (tokenizer) => {
    let out = []

    let da = tokenizer.next_is("<word>")

    if(
        da &&
        da !== "nil" &&
        da !== "true" &&
        da !== "false"
    ){
        out.push(["<name>", tokenizer.next()[1]])
    }else{
        out.push(parse_prefixexp(tokenizer))
    }

    let is_call = false

    while(!tokenizer.next_is("<eof>")){

        let data = tokenizer.next_is("<special>")


        if(data === "."){
            tokenizer.next()
            let [token, data] = tokenizer.next()
            if(token === "<word>") out.push([".", data])
            is_call = false
            continue
        }

        if(data === "["){
            tokenizer.next()
            out.push(["[]", parse_exp(tokenizer)])
            tokenizer.next()
            is_call = false
            continue
        }

        if(data === "("){
            tokenizer.next()
            let explist = parse_explist(tokenizer)
            tokenizer.next()
            out.push(["<call>", explist])
            is_call = true
            continue
        }

        if(data === ":"){
            tokenizer.next()
            let name = tokenizer.next()[1]
            tokenizer.next() // (
            let explist = parse_explist(tokenizer)
            tokenizer.next() // )
            out.push(["<class_call>", name, explist])
            is_call = true
            continue
        }

        if(data === "{"){
            let tbl = parse_table(tokenizer)
            out.push(["<tblcall>", tbl])
            is_call = true
            continue
        }
        
        if(tokenizer.next_is("<string>")){
            let str = tokenizer.next()[1]
            out.push(["<strcall>", str])
            is_call = true
            continue
        }

        break
    }


    return ["<var>", out, is_call]
}

parse_table = (tokenizer) => { // оно на удивление работает
    let data = tokenizer.next_is("<special>")
    let tbl = [[], []]
    let index = 1

    if(data === "{"){
        tokenizer.next()
        while(!tokenizer.next_is("<eof>")){
            let temp_index = tokenizer.index

            if(tokenizer.next_is("<special>") === "}"){
                break
            }

            if(tokenizer.next_is("<special>") === "," || tokenizer.next_is("<special>") === ";"){
                tokenizer.next()
                continue
            }

            let data = tokenizer.next_is("<word>")
            let label = tokenizer.next()[1]

            if(tokenizer.next_is("<special>") === "="){
                tokenizer.next()

                tbl[0].push(["<exp>", [["<string>", label]]])
                tbl[1].push(parse_exp(tokenizer))
            }else{
                tokenizer.index = temp_index
                temp_index = tokenizer.index

                if(tokenizer.next_is("<special>") === "["){
                    tokenizer.next()
                    let label = parse_exp(tokenizer)

                    tokenizer.next()
                    tokenizer.next()

                    let exp = parse_exp(tokenizer)

                    tbl[0].push(label)
                    tbl[1].push(exp)
                }else{
                    tbl[0].push(["<exp>", [["<number>", index.toString()]]])
                    index++
                    tbl[1].push(parse_exp(tokenizer))
                }
            }
        }
    }

    tokenizer.next()

    return tbl
}

let parse_simple_exp = (tokenizer) => {
    
    let temp_index = tokenizer.index
    let [token, data] = tokenizer.next()

    if(token === "<word>" && data === "nil") return ["<nil>"]
    if(token === "<word>" && data === "true") return ["<true>"]
    if(token === "<word>" && data === "false") return ["<false>"]
    if(token === "<word>" && data === "function"){
        tokenizer.next() // (
        let args = parse_parlist(tokenizer)
        tokenizer.next() // )
        let block = parse_block(tokenizer)
        tokenizer.next() // end
        return ["<funciton>", args, block]
    }

    if(token === "<special>" && data === "...") return ["<vararg>"]

    if(token === "<number>") return ["<number>", data]
    if(token === "<string>") return ["<string>", data]

    tokenizer.index = temp_index

    if(token === "<special>" && data === "{") {
        let table = parse_table(tokenizer)
        return ["<table>", table]
    }else{
        return parse_var(tokenizer)
    }

    return false
}

parse_exp = (tokenizer) => {
    
    let out = []

    while(!tokenizer.next_is("<eof>")){

        {//unop
            let temp_index = tokenizer.index
            let [token, data] = tokenizer.next()

            if(token === "<special>"){
                if(data === "-"){
                    out.push(["<unop>", "-"])
                    continue
                }else if(data === "#"){
                    out.push(["<unop>", "#"])
                    continue
                }else if(data === "!"){
                    out.push(["<unop>", "!"])
                    continue
                }else{
                    tokenizer.index = temp_index
                }
            }else if(token === "<word>"){
                if(data === "not"){
                    out.push(["<unop>", "!"])
                    continue
                }else{
                    tokenizer.index = temp_index
                }
            }else{
                tokenizer.index = temp_index
            }
        }

        out.push(parse_simple_exp(tokenizer))

        {//binop
            let temp_index = tokenizer.index
            let [token, data] = tokenizer.next()

            if(token === "<special>"){
                if(data === "+"){
                    out.push(["<binop>", "+"])
                }else if(data === "-"){
                    out.push(["<binop>", "-"])
                }else if(data === "*"){
                    out.push(["<binop>", "*"])
                }else if(data === "/"){
                    out.push(["<binop>", "/"])
                }else if(data === "^"){
                    out.push(["<binop>", "^"])
                }else if(data === "%"){
                    out.push(["<binop>", "%"])
                }else if(data === ".."){
                    out.push(["<binop>", ".."])
                }else if(data === "<"){
                    out.push(["<binop>", "<"])
                }else if(data === ">"){
                    out.push(["<binop>", ">"])
                }else if(data === "<="){
                    out.push(["<binop>", "<="])
                }else if(data === ">="){
                    out.push(["<binop>", ">="])
                }else if(data === "=="){
                    out.push(["<binop>", "=="])
                }else if(data === "!="){
                    out.push(["<binop>", "!="])
                }else if(data === "~="){
                    out.push(["<binop>", "!="])
                }else if(data === "&&"){
                    out.push(["<binop>", "&&"])
                }else if(data === "||"){
                    out.push(["<binop>", "||"])
                }else{
                    tokenizer.index = temp_index
                    break
                }
            }else if(token === "<word>"){
                if(data === "and"){
                    out.push(["<binop>", "&&"])
                }else if(data === "or"){
                    out.push(["<binop>", "||"])
                }else{
                    tokenizer.index = temp_index
                    break
                }
            }else if(token === "<eof>"){
                tokenizer.index = temp_index
                break
            }else{
                tokenizer.index = temp_index
                break
            }
        }
    }

    return ["<exp>", out]
}

let parse_block

let parse_stat = (tokenizer) => {
    if(tokenizer.next_is("<label>") !== false) return tokenizer.next()

    let data = tokenizer.next_is("<word>")

    if(data === "return"){
        tokenizer.next()
        let explist = parse_explist(tokenizer)
        if(tokenizer.next_is("<special>") === ";") tokenizer.next()
        return ["<retrun>", explist]
    }else if(data === "break"){
        tokenizer.next()
        if(tokenizer.next_is("<special>") === ";") tokenizer.next()
        return ["<break>"]
    }else if(data === "goto"){
        tokenizer.next()
        let name = tokenizer.next()[2]
        if(tokenizer.next_is("<special>") === ";") tokenizer.next()
        return ["<goto>", name]
    }else if(data === "continue"){
        tokenizer.next()
        if(tokenizer.next_is("<special>") === ";") tokenizer.next()
        return ["<continue>"]
    }

    if(data === "for"){
        tokenizer.next()

        let temp_index = tokenizer.index
        let with_in = true

        {// проверка на in в for
            tokenizer.next()
            with_in = tokenizer.next_is("<special>") !== "="
        }

        tokenizer.index = temp_index

        if(with_in){
            let namelist = parse_parlist(tokenizer)
            tokenizer.next()
            let explist = parse_explist(tokenizer)
            tokenizer.next()
            let block = parse_block(tokenizer)
            tokenizer.next()
            return ["<for in>", namelist, explist, block]
        }else{
            let name = tokenizer.next()[1]
            tokenizer.next()
            let exp1 = parse_exp(tokenizer)
            let [exp2, exp3] = [[], []]

            if(tokenizer.next_is("<special>") === ","){
                tokenizer.next()
                exp2 = parse_exp(tokenizer)
            }

            if(tokenizer.next_is("<special>") === ","){
                tokenizer.next()
                exp3 = parse_exp(tokenizer)
            }

            tokenizer.next()
            let block = parse_block(tokenizer)
            tokenizer.next()
            return ["<for>", name, exp1, exp2, exp3, block]
        }
        
    }else if(data === "if"){
        tokenizer.next()
        let out = ["<if>"]

        let exp = parse_exp(tokenizer)
        tokenizer.next()
        let block = parse_block(tokenizer)
        out.push(["<first>", exp, block])

        while(!tokenizer.next_is("<eof>")){
            let data = tokenizer.next_is("<word>")
            if(data === "end"){
                tokenizer.next()
                break
            }else if(data === "else"){
                tokenizer.next()
                out.push(["<else>", parse_block(tokenizer)])
            }else if(data === "elseif"){
                tokenizer.next()
                let exp = parse_exp(tokenizer)
                tokenizer.next()
                let block = parse_block(tokenizer)
                out.push(["elseif"], exp, block)
            }
        }

        return out
    }else if(data === "do"){
        tokenizer.next()
        let block = parse_block(tokenizer)
        tokenizer.next() //end

        return ["<do>", block]
    }else if(data === "function"){
        tokenizer.next()
        let funcname = parse_funcname(tokenizer)
        tokenizer.next() //(
        let args = parse_parlist(tokenizer)
        tokenizer.next() //)
        let block = parse_block(tokenizer)
        tokenizer.next() //end

        return ["<function>", funcname, args, block]
    }else if(data === "while"){
        tokenizer.next()
        let exp = parse_exp(tokenizer)
        tokenizer.next() //do
        let block = parse_block(tokenizer)
        tokenizer.next() //end

        return ["<while>", exp, block]
    }else if(data === "repeat"){
        tokenizer.next()
        let block = parse_block(tokenizer)
        tokenizer.next() //until
        let exp = parse_exp(tokenizer)

        return ["<repeat>", exp, block]
    }else if(data === "local"){
        tokenizer.next()

        if(tokenizer.next_is("<word>") === "function"){
            tokenizer.next()

            let name = tokenizer.next()[1]
            
            tokenizer.next() //(
            let args = parse_parlist(tokenizer)
            tokenizer.next() //)

            let block = parse_block(tokenizer)
            tokenizer.next() //end

            return ["<local function>", name, args, block]
        }

        let namelist = parse_parlist(tokenizer)

        if(tokenizer.next_is("<special>") === "="){
            tokenizer.next()
            let explist = parse_explist(tokenizer)
            if(tokenizer.next_is("<special>") === ";") tokenizer.next()
            return ["<local>", namelist, explist]
        }

        if(tokenizer.next_is("<special>") === ";") tokenizer.next()
        return ["<local>", namelist, []]
    }

    
    let temp_index = tokenizer.index
    let var_ = parse_var(tokenizer)

    if(var_[2]){// если var вызывает функци в конце, то это вызов функции, но не присваивание
        if(tokenizer.next_is("<special>") === ";") tokenizer.next()
        return ["<call>", var_[1]]
    } // и дальше обычное присваивание

    tokenizer.index = temp_index

    let varlist = parse_explist(tokenizer)

    if(tokenizer.next_is("<special>") === "="){
        tokenizer.next()
        let explist = parse_explist(tokenizer)
        if(tokenizer.next_is("<special>") === ";") tokenizer.next()
        return ["<global>", varlist, explist]
    }

    if(tokenizer.next_is("<special>") === ";") tokenizer.next()
    return ["<global>", varlist, []]
}

parse_block = (tokenizer) => {
    let out = []

    while(
        tokenizer.next_is("<word>") !== "end" &&
        tokenizer.next_is("<word>") !== "until" &&
        tokenizer.next_is("<word>") !== "else" &&
        tokenizer.next_is("<word>") !== "elseif" &&
        !tokenizer.next_is("<eof>")
    ){
        out.push(parse_stat(tokenizer))
    }

    return ["<block>", out]
}

export {
    lua_tokenizer as tokenizer,
    parse_number,
    parse_string,
    parse_word,
    parse_whitespace,
    parse_special,
    parse_label,
    parse_parlist,
    parse_prefixexp,
    parse_explist,
    parse_funcname,
    parse_var,
    parse_table,
    parse_simple_exp,
    parse_exp,
    parse_stat,
    parse_block
}

export function parser(code){
    let tokenizer = new lua_tokenizer(code)
    return parse_block(tokenizer)[1]
}