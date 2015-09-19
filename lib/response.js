// Response class
import { Message } from 'es6/fosp/message';

export class Response extends Message {
  constructor(msg) {
    super(msg);
  }

  serializeScalpToString() {
    return [this.response, this.status, this.seq].join(" ");
  }

  validate() {
    // Sanity check of message
    if (this.type !== Message.RESPONSE) {
      throw new Error("This response is no response!");
    }
    if (typeof(this.response) !== "string" || Message.RESPONSES.indexOf(this.response) < 0) {
      throw new Error("Unknown response" + this.response);
    }
    if (typeof(this.status) !== "number" || this.status <= 0) {
      throw new Error("Unknown response status: " + this.status);
    }
    if (typeof this.seq !== 'number' || this.seq <= 0) {
      throw new Error("Missing request sequence number: " + this.seq);
    }
    if (typeof(this.headers) !== 'object') {
      throw new Error("Invalid headers object: " + this.headers);
    }
  }

  short() {
      return this.response + ' ' + this.status + ' ' + this.seq;
  }

}
