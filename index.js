let OnClickButton
let lua_parser
let lua_str_utils

let normalize_strings
let strings_to_hex
let remove_comments

function loaded(){

    OnClickButton("normalize_strings", () => {normalize_strings(); editor.focus()})
    OnClickButton("strings_to_hex", () => {strings_to_hex(); editor.focus()})
    OnClickButton("remove_comments", () => {remove_comments(); editor.focus()})

    // зуминг редактора
    if(localStorage.getItem("fontSize") === null){
        localStorage.setItem("fontSize", 12)
    }

    let fontSize = Number.parseInt(localStorage.getItem("fontSize"))
    editor.setFontSize(fontSize)

    document.onkeydown = (event) => {
        if(event.ctrlKey && event.key === "="){
            fontSize = (fontSize+2.5 > 200) ? 200 : fontSize+2.5

            editor.setFontSize(fontSize)
            localStorage.setItem("fontSize", fontSize)

            return false
        }else if(event.ctrlKey && event.key === "-"){
            fontSize = (fontSize-2.5 <= 0) ? 2.5 : fontSize-2.5
            
            editor.setFontSize(fontSize)
            localStorage.setItem("fontSize", fontSize)

            return false
        }else if(event.ctrlKey && event.key === "s"){

            var element = document.createElement('a');
            element.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(editor.getValue()));
            element.setAttribute('download', "file.lua");
              
            element.style.display = 'none';
            document.body.appendChild(element);
              
            element.click();
              
            document.body.removeChild(element);

            return false
        }else if(event.altKey && event.key === "z"){
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

function setvalue_and_focus(aue){
    editor.setValue(aue)
    editor.focus()
    editor.scrollToLine(0)
}

/////////////////////////////////////////////// load

let count_modules = 3
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
    import("./js/lua_parser.js").then((exports) => {lua_parser = exports.parser; loaded_modules++; loadedChanged()})
    import("./js/lua_string_utils.js").then((exports) => {lua_str_utils = exports; loaded_modules++; loadedChanged()})

    resize_editor()
    document.getElementById("body").onresize = resize_editor
}

/////////////////////////////////////////////// funcs

let is_comment = (code, offset) =>
    (code[offset] === "/" && code[offset+1] === "*") ||
    (code[offset] === "-" && code[offset+1] === "-")

let skip_comment = (code, offset) => {
    if(code[offset] === "/" && code[offset+1] === "*"){
        offset += 2 // /*
        while(offset < code.length && !(code[offset] === "*" && code[offset+1] === "/")) offset++
        offset += 2  // */
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

let parse_string=e=>{let r=e.substr(0,2);if('"'!==r[0]&&"'"!==r[0]&&("["!==r[0]||"["!==r[1]&&"="!=r[1]))return[!1,0];let s=[],a=0;if('"'===r[0]||"'"===r[0]){let r=new TextEncoder("utf8").encode(e),h=r.length,u=1;{let r=e[0],s=1,t=0;for(;s<e.length;)if("\\"!=e[s]||"\\"!=e[s+1])if("\\"!=e[s]||e[s+1]!=r){if(e[s]==r)break;s++,t++}else s+=2,t+=2;else s+=2,t+=2;a=t+2}for(;u<h;){let e=r[u];if(92==e){switch(e=r[++u]){case 97:s.push(7),u++;break;case 98:s.push(8),u++;break;case 102:s.push(12),u++;break;case 110:s.push(10),u++;break;case 114:s.push(13),u++;break;case 116:s.push(9),u++;break;case 118:s.push(11),u++;break;case 92:s.push(92),u++;break;case 34:s.push(34),u++;break;case 39:s.push(39),u++;break;case 120:u++,s.push(parseInt(String.fromCharCode(r[u])+String.fromCharCode(r[u+1]),16)),u+=2}if(48<=e&&57>=e){var t=e-48;48<=r[++u]&&57>=r[u]&&(t=10*t+(r[u]-48),u++),48<=r[u]&&57>=r[u]&&(t=10*t+(r[u]-48),u++),s.push(t)}}else{if(e==r[0]){u++;break}s.push(r[u]),u++}}}else{if("["!==r[0]||"["!==r[1]&&"="!=r[1])return[!1,0];{let r=e.length,t=1,h="",u=0;for(;"="===e[t];)t++,u++;t++;let n="]"+"=".repeat(u)+"]";for(a+=2*n.length;t<r&&e.substr(t,n.length)!==n;)h+=e[t],a++,t++;s=new TextEncoder("utf8").encode(h)}}return[s,a]};

let is_spec = (char) => ("!#%&()*+,-./:;<=>?[\\]^{|}~\"\'").includes(char)

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

        let [str, len] = parse_string(code.substr(offset))
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

        let [str, len] = parse_string(code.substr(offset))
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

        let [str, len] = parse_string(code.substr(offset))
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