function resize_editor(){
    document.getElementById("editor").style.width = window.innerWidth - 200 + "px"
}

function load(){
    resize_editor()
}

function rename_variables(){
}

function strings_to_hex(){
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

            if(char == "/"){
                while(true){
                    if(source[index] == "\n" || index >= source.length){break}
                    index++
                }
            }else if(char == "*"){
                while(true){
                    if((source[index] == "*" && source[index+1]=="/") || index >= source.length){index+=2; break}
                    index++
                }
            }

        }else if(char1 == "-" && char2 == "-"){
            index += 2
            var char = source[index]

            if(char == "["){

                var sep_count = 0

                while(true){
                    var char = source[index]
                    if(char!="="){index++; break}
                    index++
                    sep_count++
                }

                var end = "]" + "=".repeat(sep_count) + "]"

                while(true){
                    if(source.substr(index, end.length) == end || index >= source.length){index += end.length; break}
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

    editor.setValue(newsource)
    editor.focus()
    editor.scrollToLine(0)
}