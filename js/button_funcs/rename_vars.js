let var_renamer
var_renamer = function(){
    this.upvalues = []

    this.varindex_for_rename = 0
    this.varfuncindex_for_rename = 0
    this.argindex = 0
    this.iterindex = 0

    this.deep = 0

    this.into_in_block = () => {
        this.argindex = 0
        this.iterindex = 0
        this.upvalues.push([])
        this.deep++
    }

    this.exit_from_block = () => {
        this.upvalues.pop()
        this.deep--
    }

    // types:
    //      var
    //      func
    //      arg
    //      iter

    this.rename = (varname, type) => {

        let newname = ""

        if(varname === "...") return "..."

        if(type.substr(-3, 3) === "var"){

            newname += "var_" + this.varindex_for_rename
            this.varindex_for_rename++

        }else if(type.substr(-4, 4) === "func"){

            newname += "func_" + this.varfuncindex_for_rename
            this.varfuncindex_for_rename++

        }else if(type === "arg"){
            newname += "arg_" + this.argindex
            this.argindex++
        }else if(type === "iter"){
            newname += "iter_" + this.iterindex
            this.iterindex++
        }

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

export function main(){
    let code = editor.getValue()
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
                newcode += renamer.rename(name, "var")
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
                newcode += renamer.rename(name, "arg")
                offset = end
            }
        }else if(name[0] === "<iter>"){
            for(let index_ in vars[index][1][0]){
                let [name, start, end] = vars[index][1][0][index_]
                newcode += code.substring(offset, start)
                newcode += renamer.rename(name, "iter")
                offset = end
            }
        }else if(name[0] === "<iter_>"){
            for(let index_ in vars[index][1][0]){
                let [name, start, end] = vars[index][1][0][index_]
                renamer.rename(name, "iter")
            }
        }else if(name[0] === "<func>"){
            let [_, name, start, end] = vars[index]
            if(!renamer.is_local(name)){
                newcode += code.substring(offset, start)
                newcode += renamer.rename(name, "func")
                offset = end
            }else{
                newcode += code.substring(offset, start)
                newcode += renamer.get_renamed(name)
                offset = end
            }
        }
    }
    
    newcode += code.substr(offset)

    editor.setValue(newcode)
}