function renamer(){ // полезная вещ кста
    this.upvalues = []

    this.varindex_for_rename = 0
    this.varfuncindex_for_rename = 0
    this.argindex = 0

    this.deep = 0

    this.into_in_block = () => {
        this.argindex = 0
        this.upvalues.push([])
        this.deep++
    }

    this.exit_from_block = () => {
        this.upvalues.pop()
        this.deep--
    }

    // types:
    //      global_var
    //      local_var
    //      global_func
    //      local_func
    //      arg

    this.rename = (varname, type) => {

        if(type === "global_var" || type === "global_func"){
            if(this.get_renamed(varname) === varname) return varname
        }

        let newname = ""

        if(type.substr(-3, 3) === "var"){

            newname += "var_" + this.varindex_for_rename
            this.varindex_for_rename++

        }else if(type.substr(-4, 4) === "func"){

            newname += "func_" + this.varfuncindex_for_rename
            this.varfuncindex_for_rename++

        }else if(type === "arg"){
            newname += "arg_" + this.argindex
            this.argindex++
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
}