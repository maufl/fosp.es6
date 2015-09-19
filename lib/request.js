// Request class
import { Message } from './message';
import { Response } from './response';

export const OPTIONS = "OPTIONS",
AUTH = "AUTH",
GET = "GET",
LIST = "LIST",
CREATE = "CREATE",
PATCH = "PATCH",
DELETE = "DELETE",
READ = "READ",
WRITE = "WRITE";

export var Methods = [OPTIONS, AUTH, GET, LIST, CREATE, PATCH, DELETE, READ, WRITE];

export default class Request extends Message {
  constructor(msg) {
    super(msg);
    this.method = '';
    this.url = null;
    this.seq = 0;

    this.timeoutHandle = null;
    this.timeout = 15000;
    this.defer = {};
    this.promise = new Promise((res, rej) => { this.defer.resolve = res; this.defer.reject = rej; });
  }

  serializeScalpToString() {
    var url = this.url ? this.url.toString() : '*';
    return [this.request, url, this.seq].join(" ");
  }

  validate() {
    // Sanity check of message
    if (!this instanceof Request)
      throw new Error("This request is no request!");

    if (typeof(this.method) !== "string" || Methods.indexOf(this.method < 0))
      throw new Error("Unknown request: " + this.request);

    if (this.method === WRITE && this.body !== null && ! (this.body instanceof ArrayBuffer))
      throw new Error("Invalid body for WRITE request: " + typeof this.body);

    if (typeof this.url !== "object")
      throw new Error("Invalid request uri: " + this.uri);

    if (typeof this.seq !== 'number' || this.seq <= 0)
      throw new Error("Missing request sequence number: " + this.seq);

    if (typeof(this.headers) !== 'object')
      throw new Error("Invalid headers object: " + this.headers);

  }

  short() {
    var str = this.request + ' ';
    str += this.url ? this.url.toString() : '*';
    str += ' ' + this.seq;
    return str;
  }

}
