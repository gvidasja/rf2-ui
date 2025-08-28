import 'react-app-polyfill/ie11'
import 'react-app-polyfill/stable'

/* eslint-disable */
Array.prototype.at =
  Array.prototype.at ||
  function at(n) {
    return n >= 0 ? this[n] : this[this.length - n]
  }
/* eslint-enable */
