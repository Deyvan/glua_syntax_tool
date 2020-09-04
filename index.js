function load(){
    console.log(123)
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

        if(char1 == "/"){
            index++
            var char = source[index]

            index++
            if(char == "/"){
    
                while(true){
                    if(source[index] == "\n" || index >= source.length){break}
                    index++
                }
            }else if(char == "*"){
                while(true){
                    if((source[index] == "*" && source[index+1]=="/") || index >= source.length){break}
                    index++
                }
            }

        }else if(char1 == "-" && char2 == "-"){
            index += 2
            var char = source[index]

            index++
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
                    if(source.substr(index, end.length) == end){index += end.length; break}
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
}