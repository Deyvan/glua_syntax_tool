export function renamer(){ // полезная вещ кста
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
        if(this.get_renamed(varname) === varname) return true
    }

    this.is_local = (varname) => !this.is_global(varname)
}