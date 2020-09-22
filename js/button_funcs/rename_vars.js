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