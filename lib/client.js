import { EventEmitter } from 'es6/events';
import { Message } from 'es6/fosp/message';
import { Connection } from 'es6/fosp/connection'

export class Client extends EventEmitter {
  constructor(options) {
    if (typeof options !== 'object' || options === null)
      options = {}
    this.scheme = options.scheme || "wss";
    this.port = options.port || ( this.scheme == 'ws' ? 1337 : 1338 );
    this.host = options.host || 'localhost.localdomain';
    this.connection = null
  }

  openConnection() {
    var defer = {}
    var p = new Promise((res, rej) => { defer.resolve = res; defer.reject = rej });
    var ws = new WebSocket(this.scheme + '://' + this.host + ':' + this.port);
    ws.binaryType = 'arraybuffer'
    ws.onopen = () => {
      this.connection = new Connection(ws);
      this.emit('connect')
      defer.resolve()
    }
    ws.onerror = () => {
      defer.reject()
    }
    return p;
  }
}
