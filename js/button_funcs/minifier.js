let prefix_var_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_"
let var_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"

let number_to_valid_varname = (num) => {
    let out = ""

    let temp = prefix_var_chars[num % prefix_var_chars.length] + out
    num = Math.floor(num / prefix_var_chars.length)

    if(num === 1) return temp + var_chars[0]
    num -= 1

    while(num > 0){
        out += var_chars[num % var_chars.length]
        num = Math.floor(num / var_chars.length)
    }

    return temp + out
}

let var_renamer
var_renamer = function(){
    this.upvalues = []
    this.indexs = []

    this.varindex_for_rename = 0
    this.deep = 0

    this.into_in_block = () => {
        this.upvalues.push([])
        this.indexs.push(this.varindex_for_rename)
        this.deep++
    }

    this.exit_from_block = () => {
        this.upvalues.pop([])
        this.varindex_for_rename = this.indexs.pop()
        this.deep--
    }

    this.rename = (varname, type) => {

        if(varname === "...") return "..."

        let newname = number_to_valid_varname(this.varindex_for_rename)
        this.varindex_for_rename++

        let upvalues = this.upvalues[this.deep-1]

        upvalues.push([varname, newname])

        return newname
    }

    this.get_renamed = (varname) => {
        for(var index = this.deep; index > 0; index--){
            let upvalues = this.upvalues[index-1]
            for(var index_ = upvalues.length; index_ > 0; index_--){
                if(upvalues[index_-1][0] === varname) return upvalues[index_-1][1]
            }
        }
        return varname
    }

    this.is_global = (varname) => {
        for(var index = this.deep; index > 0; index--){
            let upvalues = this.upvalues[index-1]
            for(var index_ = upvalues.length; index_ > 0; index_--){
                if(upvalues[index_-1][0] === varname) return false
            }
        }
        return true
    }

    this.is_local = (varname) => !this.is_global(varname)
}

const spec = "!#%&()*+,-./:;<=>?[\\]^{|}~\"\'"
const white = "\n\t\r "

let is_spec = (char) => spec.includes(char)
let is_whitespace = (char) => white.includes(char)

export function main(){
    let code = editor.getValue()

    {// step rename
        let vars = var_parser(code)
        let renamer = new var_renamer()

        let newcode = ""
        let offset = 0

        for(let index in vars){

            let name = vars[index]

            if(name === "in_block"){
                renamer.into_in_block()
            }else if(name === "out_block"){
                renamer.exit_from_block()
            }else if(name[0] === "var"){

                newcode += code.substring(offset, vars[index][2])
                newcode += renamer.get_renamed(vars[index][1])
                offset = vars[index][3]

            }else if(name[0] === "<var>"){
                for(let index_ in vars[index][1]){
                    let [name, start, end] = vars[index][1][index_]
                    newcode += code.substring(offset, start)
                    newcode += renamer.rename(name)
                    offset = end
                }
            }else if(name[0] === "<arg>"){
                for(let index_ in vars[index][1]){
                    let [name, start, end] = vars[index][1][index_]

                    if(name === "<vararg>"){
                        name = "..."
                        end = start + 3
                    }

                    newcode += code.substring(offset, start)
                    newcode += renamer.rename(name)
                    offset = end
                }
            }else if(name[0] === "<iter>"){
                for(let index_ in vars[index][1][0]){
                    let [name, start, end] = vars[index][1][0][index_]
                    newcode += code.substring(offset, start)
                    newcode += renamer.rename(name)
                    offset = end
                }
            }else if(name[0] === "<iter_>"){
                for(let index_ in vars[index][1][0]){
                    let [name, start, end] = vars[index][1][0][index_]
                    renamer.rename(name)
                }
            }else if(name[0] === "<func>"){
                let [_, name, start, end] = vars[index]
                if(!renamer.is_local(name)){
                    newcode += code.substring(offset, start)
                    newcode += renamer.rename(name)
                    offset = end
                }else{
                    newcode += code.substring(offset, start)
                    newcode += renamer.get_renamed(name)
                    offset = end
                }
            }
        }
        
        newcode += code.substr(offset)
        code = newcode
    }

    {//remove comments

        let newcode = ""
        let offset = 0

        while(offset < code.length){

            if(is_comment(code, offset)){

                let back = is_spec(newcode[newcode.length-1])
                    let new_offset = skip_comment(code, offset)
                    offset = new_offset
                let forward = is_spec(code[offset])

                if(!(back || forward)){newcode += " "}

                continue
            }

            let [str, len] = lua_parser.parse_string(code.substr(offset))
            if(str !== false){
                newcode += code.substr(offset, len)
                offset += len
                continue
            }

            newcode += code[offset]
            offset++
        }

        code = newcode

    }

    {//remove white spaces

        let newcode = ""
        let offset = 0

        while(offset < code.length){

            while(is_whitespace(code[offset]) && offset < code.length){
                offset++
            }

            if(offset >= code.length) break

            let [word, wordlen] = lua_parser.parse_word(code.substr(offset))
            if(word !== false){
                if(!is_spec(newcode[newcode.length-1])) newcode += " "
                newcode += word
                offset += wordlen
                continue
            }

            {let [str, len] = lua_parser.parse_string(code.substr(offset))
            if(str !== false){
                newcode += code.substr(offset, len)
                offset += len
                continue
            }}

            {let [number, len] = lua_parser.parse_number(code.substr(offset))
            if(number !== false){
                if(!is_spec(newcode[newcode.length-1])) newcode += " "
                newcode += code.substr(offset, len)
                offset += len
                continue
            }}

            newcode += code[offset]
            offset++
        }

        code = newcode
    }

    editor.setValue(code)
}