let OnClickButton
let lua_parser
let lua_str_utils
let var_parser
let var_renamer

let normalize_strings
let strings_to_hex
let remove_comments
let rename_vars

function loaded(){

    OnClickButton("normalize_strings", () => {normalize_strings(); editor.focus()})
    OnClickButton("strings_to_hex", () => {strings_to_hex(); editor.focus()})
    OnClickButton("remove_comments", () => {remove_comments(); editor.focus()})
    OnClickButton("rename_vars", () => {rename_vars(); editor.focus()})

    // зуминг редактора
    if(localStorage.getItem("fontSize") === null){
        localStorage.setItem("fontSize", 12)
    }

    let fontSize = Number.parseInt(localStorage.getItem("fontSize"))
    editor.setFontSize(fontSize)

    document.onkeydown = (event) => {
        if(event.ctrlKey && event.keyCode === 61){ // keyCode = +
            fontSize = (fontSize+2.5 > 200) ? 200 : fontSize+2.5

            editor.setFontSize(fontSize)
            localStorage.setItem("fontSize", fontSize)

            return false
        }else if(event.ctrlKey && event.keyCode === 173){ // keyCode = -
            fontSize = (fontSize-2.5 <= 0) ? 2.5 : fontSize-2.5
            
            editor.setFontSize(fontSize)
            localStorage.setItem("fontSize", fontSize)

            return false
        }else if(event.ctrlKey && event.keyCode === 83){ // KeyCode = s

            var element = document.createElement('a');
            element.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(editor.getValue()));
            element.setAttribute('download', "file.lua");
              
            element.style.display = 'none';
            document.body.appendChild(element);
              
            element.click();
              
            document.body.removeChild(element);

            return false
        }else if(event.ctrlKey && event.keyCode === 81){ // KeyCode q
            editor.getSession().setUseWrapMode(!editor.getSession().getUseWrapMode())

            return false
        }
    }

    //сохранение прошлого кода
    let code = localStorage.getItem("code")
    editor.setValue(code === null ? "" : code)
    editor.on("change", () => {localStorage.setItem("code", editor.getValue())})
}

OnClickButton = (id, func) => {
    document.getElementById(id).onclick = func
}

function resize_editor(){
    document.getElementById("editor").style.width = window.innerWidth - 200 + "px"
}

/////////////////////////////////////////////// load

let count_modules = 6
let loaded_modules = 0

let loadedChanged = () => {
    document.getElementById("loadscreenBar").style.width = Math.floor(loaded_modules / count_modules * 100) + "%"
    if(loaded_modules === count_modules){
        document.getElementById("loadscreenBar").remove()
        document.getElementById("loadscreen").remove()
        editor.focus()
        loaded()
    }
}

document.getElementById("body").onload = () => {
    loaded_modules++
    loadedChanged()
    import("./js/lua_parser.js").then((exports) => {lua_parser = exports; loaded_modules++; loadedChanged()})
    import("./js/lua_string_utils.js").then((exports) => {lua_str_utils = exports; loaded_modules++; loadedChanged()})
    import("./js/var_renamer.js").then((exports) => {var_renamer = exports.renamer; loaded_modules++; loadedChanged()})
    import("./js/var_parser.js").then((exports) => {var_parser = exports.parse_vars; loaded_modules++; loadedChanged()})

    import("./js/button_funcs/rename_vars.js").then((exports) => {rename_vars = exports.main; loaded_modules++; loadedChanged()})

    resize_editor()
    document.getElementById("body").onresize = resize_editor
}

/////////////////////////////////////////////// funcs

let is_comment = (code, offset) =>
    (code[offset] === "/" && code[offset+1] === "*") ||
    (code[offset] === "/" && code[offset+1] === "/") ||
    (code[offset] === "-" && code[offset+1] === "-") 

let skip_comment = (code, offset) => {
    if(code[offset] === "/" && code[offset+1] === "*"){
        offset += 2 // /*
        while(offset < code.length && !(code[offset] === "*" && code[offset+1] === "/")) offset++
        offset += 2  // */
        return offset
    }else if(code[offset] === "/" && code[offset+1] === "/"){
        offset += 2 // //
        while(offset < code.length && !(code[offset] === "\n")) offset++
        offset++ // \n
        return offset
    }else{
        offset += 2 // --
        if(code.substr(offset).match(/^\[=*\[/)){
            let suffix = code.substr(offset).match(/^\[=*\[/)[0].replace("[", "]").replace("[", "]")
            offset += suffix.length // prefix
            while(offset < code.length && !(code.substr(offset, suffix.length) === suffix)) offset++
            offset += suffix.length // suffix
            return offset
        }else{
            while(offset < code.length && !(code[offset] === "\n")) offset++
            offset++ // \n
            return offset
        }
    }
}

let is_spec = (char) => ("!#%&()*+,-./:;<=>?[\\]^{|}~\"\'").includes(char) || char === undefined

///////////////////////////////////////////////

normalize_strings = () => {
    let code = editor.getValue()
    let newcode = ""

    let offset = 0

    while(offset < code.length){

        if(is_comment(code, offset)){
            let new_offset = skip_comment(code, offset)
            newcode += code.substr(offset, new_offset - offset)
            offset = new_offset
            continue
        }

        let [str, len] = lua_parser.parse_string(code.substr(offset))
        offset += len

        if(str !== false){
            newcode += "\""

            newcode += new TextDecoder("utf8").decode(
                new Uint8Array(lua_str_utils.normalize(str))
            )

            newcode += "\""
            continue
        }

        newcode += code[offset]
        offset++
    }

    editor.setValue(newcode)
}

///////////////////////////////////////////////

strings_to_hex = () => {
    let code = editor.getValue()
    let newcode = ""

    let offset = 0

    while(offset < code.length){

        if(is_comment(code, offset)){
            let new_offset = skip_comment(code, offset)
            newcode += code.substr(offset, new_offset - offset)
            offset = new_offset
            continue
        }

        let [str, len] = lua_parser.parse_string(code.substr(offset))
        offset += len

        if(str !== false){
            newcode += "\""

            newcode += new TextDecoder("utf8").decode(
                new Uint8Array(lua_str_utils.tohex(str))
            )

            newcode += "\""
            continue
        }

        newcode += code[offset]
        offset++
    }

    editor.setValue(newcode)
}

///////////////////////////////////////////////

remove_comments = () => {
    let code = editor.getValue()
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

    editor.setValue(newcode)
}
