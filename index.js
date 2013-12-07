
/**
 * Module dependencies.
 */

var co = require('co');
var vm = require('vm');
var degenerator = require('degenerator');
var regenerator = require('regenerator');

/**
 * Built-in PAC functions.
 */

var dnsDomainIs = require('./dnsDomainIs');

/**
 * `names` array for `degenerator`.
 */

var builtIns = [
  'isPlainHostName',
  'dnsDomainIs',
  'localHostOrDomainIs',
  'isResolvable',
  'isInNet',
  'dnsResolve',
  'myIpAddress',
  'dnsDomainLevels',
  'shExpMatch',
  'weekdayRange',
  'dateRange',
  'timeRange'
];

/**
 * Module exports.
 */

module.exports = generate;

/**
 * Returns an asyncronous `FindProxyForURL` function from the
 * given JS string (from a PAC file).
 *
 * @param {String} str JS string
 * @return {Function} async resolver function
 */

function generate (str) {

  // convert the JS FindProxyForURL function into
  // a generator function
  var js = degenerator(str, builtIns);

  // use `facebook/regnerator` for node < v0.11 support
  // TODO: don't use regenerator if native generators are supported...
  js = regenerator(js, { includeRuntime: true });

  // the sandbox to use for the vm
  // TODO: make configurable
  var sandbox = {
    dnsDomainIs: dnsDomainIs
  };

  // filename of the pac file for the vm
  // TODO: make configurable
  var filename = 'proxy.pac';

  // evaluate the JS string and extract the FindProxyForURL generator function
  var fn = vm.runInNewContext(js + ';FindProxyForURL', sandbox, filename);
  if ('function' != typeof fn) {
    throw new TypeError('PAC file JavaScript contents must define a `FindProxyForURL` function');
  }

  // return the async resolver function
  var resolver = co(fn);

  return function FindProxyForURL (url, host, fn) {
    resolver(function (err, res) {
      if (err) return fn(err);
      fn(null, res || 'DIRECT');
    });
  };
}
