function Binary (arg) {
    var words = [];
    var len = 0;
    var pos = 0;
    var type = 'pack';
    var buffer;

    if (arg) {
        type = 'unpack';
        buffer = arg;
        len = buffer.length;
    }

    this.bin = function (arg) {
        if (type === 'pack') {
            //arg : binary
            words.push({ buffer : arg });
            len += arg.length;
        } else {
            //arg : number(length)
            words.push(buffer.slice(pos, pos + arg));
            pos += arg;
        }
        return this;
    };

    this.str = function (arg) {
        if (type === 'pack') {
            //arg : string
            var buf = new Buffer(arg);
            words.push({ buffer : buf });
            len += buf.length;
        } else {
            //arg : number(length)
            words.push(buffer.slice(pos, pos + arg).toString());
            pos += arg;
        }
        return this;
    };
    
    this.int8 = this.byte = function (arg) {
        if (type === 'pack') {
            //arg : number
            words.push({ bytes : 1, value : arg });
            len += 1;
        } else {
            //arg {val:...} : output
            var x = buffer.slice(pos, pos + 1).readInt8(0);
            words.push(x);
            pos += 1;
            if (arg && (typeof(arg) === 'object')) {
                arg.val = x;
            }
        }
        return this;
    };
    
    this.floatle = function (x) {
        if (type === 'pack') {
            //x : number
            words.push({ bytes : 'float', endian : 'little', value : x });
            len += 4;
        } else {
            //x : do not needed
            words.push(buffer.slice(pos, pos + 4).readFloatLE(0));
            pos += 4;
        }
        return this;
    };

    this.floatbe = function (x) {
        if (type === 'pack') {
            //x : number
            words.push({ bytes : 'float', endian : 'big', value : x });
            len += 4;
        } else {
            //x : do not needed
            words.push(buffer.slice(pos, pos + 4).readFloatBE(0));
            pos += 4;
        }
        return this;
    };
    
    [ 16, 24, 32 ].forEach((function (bits) {
        this['int' + bits + 'be'] = function (arg) {
            if (type === 'pack') {
                //arg : number
                words.push({ endian : 'big', bytes : bits / 8, value : arg });
                len += bits / 8;
            } else {
                //arg {val:...} : output
                var x = buffer.slice(pos, pos + bits / 8)['readInt' + bits + 'BE'](0);
                words.push(x);
                pos += bits / 8;
                if (arg && (typeof(arg) === 'object')) {
                    arg.val = x;
                }
            }
            return this;
        };
        
        this['int' + bits + 'le'] = function (arg) {
            if (type === 'pack') {
                //arg : number
                words.push({ endian : 'little', bytes : bits / 8, value : arg });
                len += bits / 8;
            } else {
                //arg {val:...} : output
                var x = buffer.slice(pos, pos + bits / 8)['readInt' + bits + 'LE'](0);
                words.push(x);
                pos += bits / 8;
                if (arg && (typeof(arg) === 'object')) {
                    arg.val = x;
                }
            }
            return this;
        };
    }).bind(this));
    
    this.skip = function (bytes) {
        if (type === 'pack') {
            //bytes : number
            words.push({ endian : 'big', bytes : bytes, value : 0 });
            len += bytes;
        } else {
            //bytes : do not needed
            pos += bytes;
        }
        return this;
    };
    
    this.length = function () {
        return len;
    };
    
    this.do = function () {
        console.log('DEBUG >>>>> ' + 'do ' + type);
        if (type === 'unpack') {
            return words;
        } else {
            var buf = new Buffer(len);
            var offset = 0;
            words.forEach(function (word) {
                if (word.buffer) {
                    word.buffer.copy(buf, offset, 0);
                    offset += word.buffer.length;
                } else if (word.bytes == 'float') {
                    // s * f * 2^e
                    var v = Math.abs(word.value);
                    var s = (word.value >= 0) * 1;
                    var e = Math.ceil(Math.log(v) / Math.LN2);
                    var f = v / (1 << e);
                    console.dir([s,e,f]);
                    
                    // s:1, e:7, f:23
                    // [seeeeeee][efffffff][ffffffff][ffffffff]

                    if (word.endian === 'little') {
                        buf[offset++] = (s << 7) & ~~(e / 2);
                        buf[offset++] = ((e & 1) << 7) & ~~(f / (1 << 16));
                        buf[offset++] = 0;
                        buf[offset++] = 0;
                    } else {
                        buf[offset++] = 0;
                        buf[offset++] = 0;
                        buf[offset++] = ((e & 1) << 7) & ~~(f / (1 << 16));
                        buf[offset++] = (s << 7) & ~~(e / 2);
                    }
                    offset += 4;
                } else {
                    var big = word.endian === 'big';
                    var ix = big ? [ (word.bytes - 1) * 8, -8 ] : [ 0, 8 ];
                    
                    for (
                        var i = ix[0];
                        big ? i >= 0 : i < word.bytes * 8;
                        i += ix[1]
                    ) {
                        if (i >= 32) {
                            buf[offset++] = Math.floor(word.value / Math.pow(2, i)) & 0xff;
                        } else {
                            buf[offset++] = (word.value >> i) & 0xff;
                        }
                    }
                }
            });
            return buf;
        }
    };
}

exports.Binary = Binary;
