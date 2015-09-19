// Request class
import { Message } from 'es6/fosp/message';
import { Response } from 'es6/fosp/response';

export class Request extends Message {
  constructor(msg) {
    super(msg)
    this.timeoutHandle = null;
    this.timeout = 15000;
    this.defer = {}
    this.promise = new Promise((res, rej) => { this.defer.resolve = res; this.defer.reject = rej });
  }

  serializeScalpToString() {
    var uri = this.uri ? this.uri.toString() : '*'
    return [this.request, uri, this.seq].join(" ")
  }

  validate() {
    // Sanity check of message
    if (this.type !== Message.REQUEST)
      throw new Error("This request is no request!");

    if (typeof(this.request) !== "string" || Message.REQUESTS.indexOf(this.request) < 0)
      throw new Error("Unknown request: " + this.request);

    if ('WRITE' === this.request && this.body !== null && ! (this.body instanceof ArrayBuffer))
      throw new Error("Invalid body for WRITE request: " + typeof this.body)

    if (typeof this.uri !== "object")
      throw new Error("Invalid request uri: " + this.uri);

    if (typeof this.seq !== 'number' || this.seq <= 0)
      throw new Error("Missing request sequence number: " + this.seq);

    if (typeof(this.headers) !== 'object')
      throw new Error("Invalid headers object: " + this.headers);

  }

  short() {
    var str = this.request + ' ';
    str += this.uri ? this.uri.toString() : '*';
    str += ' ' + this.seq;
    return str;
  }

}
