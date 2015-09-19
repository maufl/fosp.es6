// Message parser
import { URI } from './uri';
import { Message } from './message';
import { Request, Methods } from './request';
import { Response, Statuses } from './response';
import { Notification, Events } from './notification';

var parseHead = function(string) {
  var message = null;
  var lines = string.split("\r\n");
  var main_line = lines.shift();
  var main = main_line.split(" ");

  // Identify the typ of the message
  var identifier = main[0];
  console.debug('Identifier is ' + identifier);
  if (Methods.indexOf(identifier) >= 0) {
    if (main.length !== 3) {
      throw new Error("Request line does not consist of three parts")
    }
    message = new Request({method: identifier});
    if (main[1] !== '*') {
      message.uri = new URI(main[1]);
    }
    message.seq = parseInt(main[2], 10);
  } else if (Statuses.indexOf(identifier) >= 0) {
    if (main.length !== 3) {
      throw new Error("Request line does not consist of three parts")
    }
    message = new Response({status: identifier});
    message.status = parseInt(main[1], 10);
    message.seq = parseInt(main[2], 10);
  } else if (Events.indexOf(identifier) >= 0) {
    if (main.length !== 2) {
      throw new Error("Request line does not consist of two parts")
    }
    message = new Notification({event: identifier});
    message.uri = new URI(main[1]);
  } else {
    throw new Error("Type of message unknown: " + identifier);
  }

  // Read headers
  var currentLine = lines.shift();
  while (typeof currentLine  === "string" && currentLine !== "") {
    [key, value, ...rest] = currentLine.split(": ");
    if (typeof key === 'string' && typeof value === 'string' && typeof rest === 'undefined') {
      message.header[key] = value;
    }
    else {
      throw new Error("Bad header format");
    }
    currentLine = lines.shift();
  }

  return message
}

// Message serialization and parsing
var parseMessageString = function(string) {
  console.debug('Parsing message string');
  [head, ...body] = string.split("\r\n\r\n");
  var message = parseHead(head)

  // Read body
  if (body instanceof Array && body.length > 0) {
    body = body.join("\r\n");
    if (body !== '') {
      try {
        message.body = JSON.parse(body);
      }
      catch(e) {
        message.body = body;
      }
    }
  }

  return message;
};

var parseMessageBuffer = function(buffer) {
  console.debug('Parsing message buffer');
  var message = null
  var string = '', buffer_length = buffer.byteLength, i = 0, new_buffer = null
  buffer = new Uint8Array(buffer)
  console.debug('Buffer length is ' + buffer_length)
  while (i < buffer_length) {
    var b0 = buffer[i], b1 = buffer[i+1], b2 = buffer[i+2], b3 = buffer[i+3]
    if ((b0 & 0x80) === 0) {
      string += String.fromCharCode(b0)
      i += 1
    }
    else if ((b0 & 0xE0) === 0xC0) {
      string += String.fromCharCode( (b0 << 6) + (b1 & 0x3F) )
      i += 2
    }
    else if ((b0 & 0xF0) === 0xE0) {
      string += String.fromCharCode( (b0 << 12) + ((b1 & 0x3F) << 6) + (b2 & 0x3F) )
      i += 3
    }
    else if ((b0 & 0xF8) === 0xF0) {
      string += String.fromCharCode( (b0 << 18) + ((b1 & 0x3F) << 12) + ((b2 & 0x3F) << 6) + (b3 & 0x3F) )
      i += 4
    }
    else {
      throw new Error('UTF-8 Encoding error!')
    }

    if (string.length >= 4 && string.substring(string.length - 4) === "\r\n\r\n") {
      break
    }
  }
  console.debug('First ' + i + ' bytes form head ' + string)
  if (i < buffer_length) {
    console.debug('Binary message has body')
    new_buffer = buffer.subarray(i)
  }
  message = parseHead(string)
  message.body = new_buffer

  return message
}

export class Parser {

  parseMessage(raw) {
    var defer = {}, promise = new Promise((res,rej) => { defer.resolve = res; defer.reject = rej })
    try {
      var msg = null;
      if ( raw instanceof ArrayBuffer ) {
        msg = parseMessageBuffer(raw)
        defer.resolve(msg)
      }
      else if ( typeof raw === 'string' ) {
        msg = parseMessageString(raw)
        defer.resolve(msg)
      }
      else {
        defer.reject(new Error('Unable to parse ' + raw.toString() + ' of type ' + typeof raw))
      }
    }
    catch (e) {
      defer.reject(e)
    }
    return promise
  }

}
