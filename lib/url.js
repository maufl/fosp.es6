// fosp urls
export class URL {
  constructor(string) {
    var i = string.indexOf("/");
    if (i === -1)
      i = string.length;
    this.user = string.substr(0, i);
    this.path = string.substr(i, string.length);
    if (this.path === '')
      this.path = '/';

    if (! this.user.match(/^[a-zA-Z0-9_\-.]+@[a-zA-Z0-9_\-.]+$/)) {
      console.error('Invalid user in url: ' + string);
      throw new Error("Invalid user");
    }
    i = this.user.indexOf("@");
    this.user = { name: this.user.substr(0, i), domain: this.user.substr(i + 1, this.user.length) };
  }

  toString() {
    return this.user.name + "@" + this.user.domain + this.path;
  }
  fqUser() {
    return this.user.name + "@" + this.user.domain;
  }
  parent() {
    if (this.isRoot())
      return this
    var pathArray = this.path.split('/')
    pathArray.pop()
    return new URL(this.fqUser() + pathArray.join('/'))
  }

  isRoot() {
    return this.path === '/'
  }

}
URL.ancestorOf = function(parent, child) {
  return (child.indexOf(parent) === 0 && child.length > parent.length)
}

URL.parentOf = function(parent, child) {
  if (!URL.ancestorOf(parent,child))
    return false
  console.debug('Is parent ' + parent + ' :: ' + child)
  var tail = child.substring(parent.length + 1)
  console.debug('Tail is ' + tail)
  if (tail.indexOf('/') < 0)
    return true
  return false
}
