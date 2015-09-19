// This object type models a fosp connection
import { EventEmitter } from 'es6/events';
import { URI } from 'es6/fosp/uri';
import { Message } from 'es6/fosp/message';
import { Request } from 'es6/fosp/request';
import { Parser } from 'es6/fosp/parser';

var nextId = 1

export class Connection extends EventEmitter {
  constructor(ws) {
    this.ws = ws;
    this.id = nextId
    nextId += 1
    this.currentSeq = 1;
    this.pendingRequests = {};
    this.pendingRequestNumber = 0;

    var emitMessage = (message) => {
      var data = message.binaryData || message.utf8Data || message.data;
      var msg = Parser.parseMessage(data).then((msg) => {
        console.debug('Recieved new message: ' + msg.toString());
        this.emit('message', msg);
      }).catch((err) => {
        console.error(err.stack)
      })
    }

    this.ws.onmessage = (message) => { emitMessage(message); }
    this.ws.onclose = (ev) => { this.emit('close', ev.code, ev.reason); }
    this.ws.onerror = (err) => { this.emit('error',err); }

    this.on('message', (msg) => {
      switch(msg.type) {
        case Message.REQUEST:
          this.emit('request', msg);
          break;
        case Message.RESPONSE:
          this.emit('response', msg);
          break;
        case Message.NOTIFICATION:
          this.emit('notification', msg);
          break;
        default:
          console.warn('Recieved unknow type of message: ' + msg.type)
          break;
      }
    });

    this.on('response', (msg) => {
      var req = this.pendingRequests[msg.seq];
      this.pendingRequestNumber -= 1;
      delete this.pendingRequests[msg.seq];
      var existsRequest = false;
      if (typeof req !== 'undefined' && req instanceof Request) {
        try { clearTimeout(req.timeoutHandle); }
        catch (e) {}
        existsRequest = true;
        req.emit('response', msg)
      }
      switch(msg.response) {
        case 'SUCCEEDED':
          if (existsRequest) {
            req.emit('succeeded', msg);
            req.defer.resolve(msg);
          }
          this.emit('succeeded', msg);
          break;
        case 'FAILED':
          if (existsRequest) {
            req.emit('failed', msg);
            req.defer.reject(msg)
          }
          this.emit('failed', msg);
          break;
        default:
          console.warn('Recieved unknown response: ' + msg.response)
          break;
      }
    });

    this.on('notification', (msg) => {
      switch(msg.event) {
        case 'CREATED':
          this.emit('created', msg)
          break
        case 'UPDATED':
          this.emit('updated', msg)
          break
        case 'DELETED':
          this.emit('deleted', msg)
          break
        default:
          console.warn('Recieved unknown notification: ' + msg.event)
          break
      }
    })

    this.on('close', (code, reason) => {
      console.info('Connection ' + this.id + ' closed, code ' + code + ': ' + reason)
    })

    this.on('error', (err) => {
      console.error('Fatal! Unrecoverable error occured on connection ' + this.id)
      console.error(err.stack)
    })
  }

  sendMessage(msg) {
    console.debug('Sending ' + Message.TYPES[msg.type])
    try {
      var raw = msg.serialize();
      console.debug("Send message: " + msg.toString());
      this.ws.send(raw);
      if (msg instanceof Request) {
        msg.timeoutHandle = setTimeout(() => {
          msg.emit('timeout');
          msg.defer.reject('timeout')
          delete this.pendingRequests[msg.seq];
        }, msg.timeout);
      }
    }
    catch(e) {
      console.error(e);
    }
    return msg;
  }

  close() {
    this.ws.close();
  }

  // Convinience for sending requests
  sendRequest(request, uri, headers, body) {
    console.debug('Building request')
    if (typeof uri === 'string')
      uri = new URI(uri);
    var msg = new Request({ type: Message.REQUEST, request: request, uri: uri, seq: this.currentSeq, headers: headers, body: body });
    this.currentSeq++;
    this.pendingRequests[msg.seq] = msg;
    this.pendingRequestNumber += 1;
    return this.sendMessage(msg);
  }
  sendConnect(headers, body) {
    return this.sendRequest('CONNECT', null, headers, body)
  }
  sendAuthenticate(headers, body) {
    return this.sendRequest('AUTHENTICATE', null, headers, body)
  }
  sendRegister(headers, body) {
    return this.sendRequest('REGISTER', null, headers, body)
  }
  sendSelect(uri, headers, body) {
    return this.sendRequest('SELECT', uri, headers, body)
  }
  sendCreate(uri, headers, body) {
    return this.sendRequest('CREATE', uri, headers, body)
  }
  sendUpdate(uri, headers, body) {
    return this.sendRequest('UPDATE', uri, headers, body)
  }
  sendDelete(uri, headers, body) {
    return this.sendRequest('DELETE', uri, headers, body)
  }
  sendList(uri, headers, body) {
    return this.sendRequest('LIST', uri, headers, body)
  }
  sendRead(uri, headers, body) {
    return this.sendRequest('READ', uri, headers, body)
  }
  sendWrite(uri, headers, body) {
    return this.sendRequest('WRITE', uri, headers, body)
  }

}
