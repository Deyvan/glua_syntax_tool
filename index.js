function resize_editor(){
    document.getElementById("editor").style.width = window.innerWidth - 200 + "px"
}

function setvalue_and_focus(aue){
    editor.setValue(aue)
    editor.focus()
    editor.scrollToLine(0)
}

function charToHex(num){
    var out = num.toString(16)
    if(out.length==1) out = "0" + out
    return out
}

function calculateStringSize(code){
    var end = code[0]
    var index = 1
    var out = 0

    while(true){
        if(code.length <= index){break}

        if(code[index] == "\\" && code[index+1] == end){
            index += 2
            out += 2
            continue
        }

        if(code[index] == end){
            break
        }

        index++
        out++
    }

    return out
}

function parseString(code){
    var end = code[0]
    var index = 1
    var out = []

    while(true){
        if(code.length <= index){break}
        var char = code[index]
        
        if(char == 92){ // if char == \
            index++
            char = code[index]

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
                    index++; out.push(parseInt(String.fromCharCode(code[index])+String.fromCharCode(code[index+1]), 16)); index += 2; break
            }

            if(48 <= char && 57 >= char){ // \NNN
                index++
                var byte = char-48

                if(48 <= code[index] && 57 >= code[index]){
                    byte = byte * 10 + (code[index]-48)
                    index++
                }

                if(48 <= code[index] && 57 >= code[index]){
                    byte = byte * 10 + (code[index]-48)
                    index++
                }

                out.push(byte)
            }
        }else if(char == end){
            index++
            break
        }else{
            out.push(code[index])
            index++
        }
        
    }

    return out
}

function parseMultiLineString(code){
    var sep_count = 0
    var index = 0
    var out = ""

    index++

    while(true){
        var char = code[index]
        if(char!="="){index++; break}
        index++
        sep_count++
    }

    var end = "]" + "=".repeat(sep_count) + "]"

    while(true){
        if(code.substr(index, end.length) == end || index >= code.length){index += end.length; break}
        out += code[index]
        index++
    }

    return [out, index]
}

function normalizeString(str){
    var out = []
    var index = 0

    while(true){
        if(str.length <= index){break}
        
        var char = str[index]

        if(char == 0){
            out.push(92) // \
            out.push(48) // 0
        }else if(char == 10){
            out.push(92) // \
            out.push(110) // n
        }else if(char == 92){
            out.push(92) // \
            out.push(92) // \
        }else if(char == 34){
            out.push(92) // \
            out.push(34) // "
        }else if(char == 39){
            out.push(92) // \
            out.push(39) // '
        }else{
            out.push(char)
        }

        index++
    }

    return out
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function load(){
    resize_editor()
}

function rename_variables(){
}

function normalize_strings(){
    var source = editor.getValue()
    var newsource = ""
    var index = 0

    while(true){
        if(index >= source.length){break}

        var char1 = source[index]
        var char2 = source[index+1]

        if(char1 == "\"" || char1 == "\'"){
            newsource += char1
            var out = parseString(new TextEncoder("utf8").encode(source.substr(index)))

            newsource += new TextDecoder("utf8").decode(new Uint8Array(normalizeString(out)))

            newsource += char1
            index += calculateStringSize(source.substr(index)) + 2
        }else if(char1 == "[" && (char2 == "[" || char2 == "=")){
            newsource += "\""
            var [out, length] = parseMultiLineString(source.substr(index))

            newsource += new TextDecoder("utf8").decode(normalizeString(out))

            newsource += "\""
            index += length
        }else if(char1 == "/"){
            index++
            var char = source[index]
            newsource += char1

            if(char == "/"){
                while(true){
                    if(source[index] == "\n" || index >= source.length){; break}
                    newsource += source[index]
                    index++
                }
            }else if(char == "*"){
                while(true){
                    if((source[index] == "*" && source[index+1]=="/") || index >= source.length){newsource += "*/"; index+=2; break}
                    newsource += source[index]
                    index++
                }
            }

        }else if(char1 == "-" && char2 == "-"){
            index += 2
            var char = source[index]

            newsource += "--"

            if(char == "["){

                var sep_count = 0

                index++
                while(true){
                    var char = source[index]
                    if(char!="="){index++; break}
                    index++
                    sep_count++
                }

                newsource += "[" + "=".repeat(sep_count) + "["
                var end = "]" + "=".repeat(sep_count) + "]"

                while(true){
                    if(source.substr(index, end.length) == end || index >= source.length){index += end.length; break}
                    newsource += source[index]
                    index++
                }

                newsource += end

            }else{
                while(true){
                    if(source[index] == "\n" || index >= source.length){break}
                    newsource += source[index]
                    index++
                }
            }

        }else{
            newsource += source[index]
            index++
        }
    }

    setvalue_and_focus(newsource)
}

function strings_to_hex(){
    var source = editor.getValue()
    var newsource = ""
    var index = 0

    while(true){
        if(index >= source.length){break}

        var char1 = source[index]
        var char2 = source[index+1]

        if(char1 == "\"" || char1 == "\'"){
            newsource += char1
            var out = parseString(new TextEncoder("utf8").encode(source.substr(index)))

            out.forEach(function(char){
                newsource += "\\x" + charToHex(char)
            })

            newsource += char1
            index += calculateStringSize(source.substr(index)) + 2
        }else if(char1 == "[" && (char2 == "[" || char2 == "=")){
            newsource += "\""
            var [out, length] = parseMultiLineString(source.substr(index))

            new TextEncoder("utf8").encode(out).forEach(function(char){
                newsource += "\\x" + charToHex(char)
            })

            newsource += "\""
            index += length
        }else if(char1 == "/"){
            index++
            var char = source[index]
            newsource += char1

            if(char == "/"){
                while(true){
                    if(source[index] == "\n" || index >= source.length){; break}
                    newsource += source[index]
                    index++
                }
            }else if(char == "*"){
                while(true){
                    if((source[index] == "*" && source[index+1]=="/") || index >= source.length){newsource += "*/"; index+=2; break}
                    newsource += source[index]
                    index++
                }
            }

        }else if(char1 == "-" && char2 == "-"){
            index += 2
            var char = source[index]

            newsource += "--"

            if(char == "["){

                var sep_count = 0

                index++
                while(true){
                    var char = source[index]
                    if(char!="="){index++; break}
                    index++
                    sep_count++
                }

                newsource += "[" + "=".repeat(sep_count) + "["
                var end = "]" + "=".repeat(sep_count) + "]"

                while(true){
                    if(source.substr(index, end.length) == end || index >= source.length){index += end.length; break}
                    newsource += source[index]
                    index++
                }

                newsource += end

            }else{
                while(true){
                    if(source[index] == "\n" || index >= source.length){break}
                    newsource += source[index]
                    index++
                }
            }

        }else{
            newsource += source[index]
            index++
        }
    }

    setvalue_and_focus(newsource)
}

function remove_comments(){
    var source = editor.getValue()
    var newsource = ""
    var index = 0

    while(true){
        if(index >= source.length){break}

        var char1 = source[index]
        var char2 = source[index+1]

        if(char1 == "\"" || char1 == "\'"){ //скипануть стринги чтобы небыло такого что в стринге что-то похожее на комент был удалён
            newsource += source[index]
            index++
            var end = char1

            while(true){
                var char1 = source[index]
                var char2 = source[index+1]
                if(char1=="\\" && char2 == end){
                    index += 1
                    newsource += char1 + char2
                }else if(char1 == end){
                    index++
                    newsource += end
                    break
                }else{
                    newsource += source[index]
                }
                index++
            }
            
        }else if(char1 == "[" && (char2 == "[" || char2 == "=")){
            index++
            var sep_count = 0

            while(true){
                var char = source[index]
                if(char!="="){index++; break}
                index++
                sep_count++
            }

            newsource += "[" + "=".repeat(sep_count) + "["

            var end = "]" + "=".repeat(sep_count) + "]"

            while(true){
                if(source.substr(index, end.length) == end || index >= source.length){index += end.length; break}
                newsource += source[index]
                index++
            }

            newsource += end

        }else if(char1 == "/"){ // ну и дальше разное гавно
            index++
            var char = source[index]
            var whitespace_left = source[index-2] === " "

            if(char == "/"){
                while(true){
                    if(source[index] == "\n" || index >= source.length){break}
                    index++
                }
            }else if(char == "*"){
                while(true){
                    if((source[index] == "*" && source[index+1]=="/") || index >= source.length){
                        index+=2
                        if(!(source[index] === " " || whitespace_left))
                            newsource += " "
                        break
                    }
                    index++
                }
            }

        }else if(char1 == "-" && char2 == "-"){
            index += 2
            var char = source[index]

            if(char == "["){

                var sep_count = 0
                var whitespace_left = source[index-3] === " "

                index++
                while(true){
                    var char = source[index]
                    if(char!="="){index++; break}
                    index++
                    sep_count++
                }

                var end = "]" + "=".repeat(sep_count) + "]"

                while(true){
                    if(source.substr(index, end.length) == end || index >= source.length){
                        index += end.length
                        if(!(source[index] === " " || whitespace_left))
                            newsource += " "
                        break
                    }
                    index++
                }

            }else{
                while(true){
                    if(source[index] == "\n" || index >= source.length){break}
                    index++
                }
            }

        }else{
            newsource += source[index]
            index++
        }

    }

    setvalue_and_focus(newsource)
}