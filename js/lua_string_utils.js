let verify_utf8 = (utf8array, offset = 0) => {
    let octals = 0

    let char0 = utf8array[offset]
    let char1 = utf8array[offset+1]
    let char2 = utf8array[offset+2]
    let char3 = utf8array[offset+3]

    if(char0 >= 0x80 && char0 <= 0xC1) return [false, 1]
    if(char0 > 0xF7) return [false, 1]


    if (char0 < 0x80){
        
        octals = 1

    }else if(char0 < 0xE0){

        if(char1 === undefined) return [false, 1]
        octals = 2 

    }else if(char0 < 0xF0){

        if(char1 === undefined) return [false, 1]
        if(char2 === undefined) return [false, 2]

        let code = (char0 & 0xF) << 12 | (char1 & 0x3F) << 6 | (char2 & 0x3F)

        if(0x200b <= code && code <= 0x202e) return [false, 3] // символы с нулевой длиной
        if(0x2060 <= code && code <= 0x206f) return [false, 3]

        octals = 3

    }else {

        if(char1 === undefined) return [false, 1]
        if(char2 === undefined) return [false, 2]
        if(char3 === undefined) return [false, 3]

        let code = (char0 & 0x7) << 18 | (char1 & 0x3F) << 12 | (char2 & 0x3F) << 6 | (char3 & 0x3F)

        if(0xE0000 <= code) return [false, 4]

        octals = 4

    }


    for(let index = 1; index < octals; index++){
        if(!(utf8array[offset+index] <= 0xBF && utf8array[offset+index] >= 0x80)) return [false, index]
    }
    
    return [true, octals]
}

let lua_normalize_str = (utf8array) => {
    let out = []
    let index = 0

    while(index < utf8array.length){

        let [valid_utf8, len] = verify_utf8(utf8array.slice(index, utf8array.length))

        if(utf8array[index] === undefined) break

        if(valid_utf8 && len === 1){
            if(utf8array[index] === 0){out.push(92); out.push(120); out.push(48); out.push(48); index++; continue}
            if(utf8array[index] === 9){out.push(92); out.push(116); index++; continue}
            if(utf8array[index] === 7){out.push(92); out.push(97); index++; continue}
            if(utf8array[index] === 8){out.push(92); out.push(98); index++; continue}
            if(utf8array[index] === 10){out.push(92); out.push(110); index++; continue}
            if(utf8array[index] === 11){out.push(92); out.push(118); index++; continue}
            if(utf8array[index] === 12){out.push(92); out.push(102); index++; continue}
            if(utf8array[index] === 13){out.push(92); out.push(114); index++; continue}
            if(utf8array[index] === 34){out.push(92); out.push(34); index++; continue}
            if(utf8array[index] === 39){out.push(92); out.push(39); index++; continue}
            if(utf8array[index] === 92){out.push(92); out.push(92); index++; continue}
            if(utf8array[index] >= 0x20 && utf8array[index] <= 0x7E){out.push(utf8array[index]); index++; continue}
            out.push(92)
            out.push(120)
            out.push((utf8array[index] >> 4).toString(16).charCodeAt(0))
            out.push((utf8array[index] & 0xF).toString(16).charCodeAt(0))
            index++
        }else if(valid_utf8){
            out = out.concat(utf8array.slice(index, index + len))
            index += len
        }else{
            for(let offset = 0; offset < len; offset++){
                out.push(92)
                out.push(120)
                out.push((utf8array[index] >> 4).toString(16).charCodeAt(0))
                out.push((utf8array[index] & 0xF).toString(16).charCodeAt(0))
                index++;
            }
        }
        
    }

    return out
}

let lua_hex_str = (utf8array) => {
    let out = []
    let index = 0

    while(index < utf8array.length){
        out.push(92)
        out.push(120)
        out.push((utf8array[index] >> 4).toString(16).charCodeAt(0))
        out.push((utf8array[index] & 0xF).toString(16).charCodeAt(0))
        index++
    }

    return out
}

export function normalize(utf8array){return lua_normalize_str(utf8array)}
export function tohex(utf8array){return lua_hex_str(utf8array)}