// Message parser
import { URI } from 'es6/fosp/uri';
import { Message } from 'es6/fosp/message';
import { Request } from 'es6/fosp/request';
import { Response } from 'es6/fosp/response';
import { Notification } from 'es6/fosp/notification';

var parseHead = function(string) {
  var message = {type: null, seq: null, request: null, response: null, event: null, uri: null, status: null, headers: {}, body: null};
  var lines = string.split("\r\n");
  var main_line = lines.shift();
  var main = main_line.split(" ");

  // Identify the typ of the message
  var identifier = main[0];
  console.debug('Identifier is ' + identifier);
  if (Message.REQUESTS.indexOf(identifier) >= 0) {
    message.type = Message.REQUEST;
    message.request = identifier;
  } else if (Message.RESPONSES.indexOf(identifier) >= 0) {
    message.type = Message.RESPONSE;
    message.response = identifier;
  } else if (Message.EVENTS.indexOf(identifier) >= 0) {
    message.type = Message.NOTIFICATION;
    message.event = identifier;
  } else {
    throw new Error("Type of message unknown: " + identifier);
  }

  // Read the URI
  if ((message.type == Message.REQUEST || message.type == Message.NOTIFICATION) && main.length >= 2) {
    if (message.type == Message.REQUEST && ['CONNECT', 'REGISTER', 'AUTHENTICATE'].indexOf(message.request) < 0) {
      message.uri = new URI(main[1]);
    }
    else if (message.type === Message.NOTIFICATION) {
      message.uri = new URI(main[1]);
    }
    else {
      message.uri = null;
    }
  }

  // Read the status code
  if (message.type == Message.RESPONSE && main.length >= 2) {
    message.status = parseInt(main[1], 10);
  }

  // Read sequence number
  if ((message.type == Message.REQUEST || message.type == Message.RESPONSE) && main.length == 3) {
    if (typeof main[2] === 'string')
      message.seq = parseInt(main[2], 10);
    else
      message.seq = main[2];
  }

  // Read headers
  var tmp = lines.shift();
  while (typeof tmp  === "string" && tmp !== "") {
    var header = tmp.split(": ");
    if (header.length === 2) {
      message.headers[header[0]] = header[1];
    }
    else {
      throw new Error("Bad header format");
    }
    tmp = lines.shift();
  }

  return message
}

// Message serialization and parsing
var parseMessageString = function(string) {
  console.debug('Parsing message string');
  var parts = string.split("\r\n\r\n"), head = parts.shift()
  var message = parseHead(head)

  // Read body
  if (parts instanceof Array && parts.length > 0) {
    var body = parts.join("\r\n");
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

var messageHashToObject = function( msg) {
    if (msg.type === Message.REQUEST)
      return new Request(msg)
    if (msg.type === Message.RESPONSE)
      return new Response( msg)
    if (msg.type === Message.NOTIFICATION)
      return new Notification(msg)
}

export class Parser {}

Parser.parseMessage = (raw) => {
  var defer = {}, promise = new Promise((res,rej) => { defer.resolve = res; defer.reject = rej })
  try {
    var msg = null;
    if ( raw instanceof ArrayBuffer ) {
      msg = parseMessageBuffer(raw)
      defer.resolve(messageHashToObject(msg))
    }
    else if ( typeof raw === 'string' ) {
      msg = parseMessageString(raw)
      defer.resolve(messageHashToObject(msg))
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
