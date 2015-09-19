//Everything message related
import { EventEmitter } from 'es6/events';

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
    this.type = msg.type
    this.seq = msg.seq
    this.request = msg.request
    this.response = msg.response
    this.event = msg.event
    this.uri = msg.uri
    this.status = msg.status
    this.headers = msg.headers || {}
    this.body = msg.body || null
  }

  serializeHeadersToString() {
    var raw = ''
    for (k in this.headers) {
      raw += k + ": " + this.headers[k] + "\r\n";
    }
    return raw;
  }

  serializeBodyToString() {
    if (typeof this.body !== 'undefined' && this.body !== null)
      return "\r\n" + JSON.stringify(this.body);
    return '';
  }

  serialize() {
    console.debug("Serializing " + Message.TYPES[this.type]);
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
      serializedMessage[i] = headUTF8Array[i]
    for (var i=0; i<body_length; i++)
      serializedMessage[i+head_length] = body[i]
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

Message.REQUESTS = ["CONNECT", "AUTHENTICATE", "REGISTER", "CREATE", "UPDATE", "DELETE", "SELECT", "LIST", "READ", "WRITE"];
Message.RESPONSES = ["SUCCEEDED", "FAILED"];
Message.EVENTS = ["CREATED", "UPDATED", "DELETED"];
Message.REQUEST = 1;
Message.RESPONSE = 2;
Message.NOTIFICATION = 3;
Message.TYPES = ['','request', 'response', 'notification'];
