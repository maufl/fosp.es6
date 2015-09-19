// Notification class
import { Message } from 'es6/fosp/message';

export class Notification extends Message {
  constructor(msg) {
    super(msg)
  }

  serializeScalpToString () {
    return [this.event, this.uri.toString()].join(" ")
  }


  validate() {
    // Sanity check of message
    if ( this.type !== Message.NOTIFICATION) {
      throw new Error("This notification is no notification");
    }
    if (typeof(this.event) !== "string" || Message.EVENTS.indexOf(this.event) < 0) {
      throw new Error("Unknown event: " + this.event);
    }
    if (typeof this.uri !== "object") {
      throw new Error("Invalid request uri: " + this.uri);
    }
    if (typeof(this.headers) !== 'object') {
      throw new Error("Invalid headers object: " + this.headers);
    }
  };


  short() {
    return this.event + ' ' + this.uri.toString();
  };

}
