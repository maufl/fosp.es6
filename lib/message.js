//Everything message related
import { EventEmitter } from './events';

var stringToUTF8Array = function(str) {
  var utf8 = [];
  for (var i=0; i < str.length; i++) {
    var charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6),
          0x80 | (charcode & 0x3f));
    }
    else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12),
          0x80 | ((charcode>>6) & 0x3f),
          0x80 | (charcode & 0x3f));
    }
    else {
      // let's keep things simple and only handle chars up to U+FFFF...
      utf8.push(0xef, 0xbf, 0xbd); // U+FFFE "replacement character"
    }
  }
  return utf8;
}

export class Message extends EventEmitter {
  constructor(msg) {
    this.header = msg.header || {}
    this.body = msg.body || null
  }

  serializeHeadersToString() {
    var raw = ''
    for (var k in this.header) {
      raw += k + ": " + this.header[k] + "\r\n";
    }
    return raw;
  }

  serializeBodyToString() {
    if (typeof this.body !== 'undefined' && this.body !== null)
      return "\r\n" + JSON.stringify(this.body);
    return '';
  }

  serialize() {
    this.validate();

    var head = this.serializeScalpToString() + "\r\n" + this.serializeHeadersToString();

    // Serialize body to string
    if (! (this.body instanceof ArrayBuffer))
      return  head + this.serializeBodyToString();

    console.debug('Is binary message, serializing to buffer')
    // Serialize body to buffer
    var body_length = (this.body.byteLength || this.body.length)
    if ( body_length > 0)
      head += "\r\n"
    var headUTF8Array = stringToUTF8Array(head), head_length = headUTF8Array.length
    var serializedMessage = new Uint8Array(new ArrayBuffer(head_length + body_length))
    var body = new Uint8Array(this.body)
    for (var i=0; i<head_length; i++)
      serializedMessage[i] = headUTF8Array[i];
    for (var i=0; i<body_length; i++)
      serializedMessage[i+head_length] = body[i];
    return serializedMessage;
  }

  serializeScalpToString() {
    throw new Error('Scalp serializing not implemented!')
  }

  toString() {
    if (this.body instanceof ArrayBuffer || this.body instanceof Uint8Array)
      return this.short() + ' :: [binary data]'
    return this.short() + ' :: ' + JSON.stringify(this.body);
  }
}
