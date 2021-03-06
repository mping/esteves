'use strict';

var trumpet = require('trumpet'),
          _ = require('lodash');

/**
 * Main constructor
 * @param {ProxyServer} the node-http-proxy object
 * @param {Object} the options
 * @constructor
 */
function Middleware(proxy, opts) {
    this.logs  = [];
    this.uris  = [];
    this.chain = [];

    this.proxy = proxy;
    this.opts = opts;
}

/**
 * Injects content after a selector expression
 * @param {String} uri
 * @param {Function|String} callback or string
 */
Middleware.prototype.afterSelection = function(uri, selector, fn) {
    this.chain.push({matcher: uri, selector: selector, fn: fn, resolve: 'after'});
};

/**
 * Replaces content from a selector expression
 * @param {String} uri
 * @param {String} uselector
 * @param {Function|String} callback or string
 */
Middleware.prototype.replaceSelection = function(uri, selector, fn) {
    this.chain.push({matcher: uri, selector: selector, fn: fn, resolve: 'replace'});
};

/**
 * Returns content when an uri is hit
 * @param {String} uri
 * @param {String} selector
 * @param {Function|String} callback or string
 */
Middleware.prototype.whenUri = function(uri, fn) {
    this.uris.push({matcher: uri, fn: fn});
};

/**
 * Returns content when an uri is hit
 * @param {String} uri
 * @param {String} selector
 * @param {Function|String} callback or string
 */
Middleware.prototype.logUri = function(uri, fn) {
    this.logs.push({matcher: uri, fn: fn});
};

// helper fn
function resolve(req, res, fnOrString) {
    if(!_.isFunction(fnOrString)) {
        res.writeHead(200);
        return res.end(fnOrString);
    }

    function callback(error, strOrMap) {
        if(error) {
            res.writeHead(500);
            res.end(null);
            return;
        }

        if(_.isString(strOrMap)) {
            res.writeHead(200);
            return res.end(strOrMap);
        } else {
            res.writeHead(strOrMap.code, strOrMap.headers);
            return res.end(strOrMap.response);
        }
    }

    //pass callback to user-defined fn
    fnOrString(callback);
}


function resolveError(req, res, error) {
    res.writeHead(500);
    return res.end(JSON.stringify(error));
}

function isMatch(url, matcher) {
    return _.isRegExp(matcher) ? matcher.test(url)
                               : matcher.toLowerCase() === url.toLowerCase();
}

/**
 * Returns the main middleware function.
 */
Middleware.prototype.middleware = function() {
    var self = this;
    return function(req, res) {
        var url = req.url;

        if(self.opts.userAgent)       req.headers['user-agent'] = self.opts.userAgent;
        if(!self.opts.acceptEncoding) delete req.headers['accept-encoding'];

        //
        // call loggers
        //
        _.forEach(self.logs, function(entry) {
            if(isMatch(url, entry.matcher)) entry.fn(url);
        });

        //
        // if it's an uri, resolve now and return
        //
        var firstHit = _.find(self.uris, function(entry) {
            return isMatch(url, entry.matcher);
        });
        if(firstHit) return resolve(req, res, firstHit.fn);

        //
        // check for selector interception
        //
        var appliableChain = _.filter(self.chain, function(filter){ return isMatch(url, filter.matcher);});

        if(appliableChain.length) {
            //
            // trumpet per request
            //
            var tr = trumpet();

            var resWrite     = res.write.bind(res);
            var resEnd       = res.end.bind(res);
            var resWriteHead = res.writeHead.bind(res);

            //apply trumpet selector for each defined filter
            _.each(appliableChain, function(filter) {

                switch(filter.resolve) {
                    // replace content
                    case 'replace':
                        tr.select(filter.selector, function(node) {
                            filter.fn(function(err, res) {
                                if(err) return resolveError(req, res, err);

                                //TODO handle res as a hashmap
                                node.createWriteStream().end(res);
                            });
                        });
                        break;

                    //append content
                    case 'after':
                        tr.select(filter.selector, function(node) {
                            //todo use concatStream/append and/or pipe
                            var bufs = [];
                            var rs = node.createReadStream();
                            var ws = node.createWriteStream();

                            rs.on('data', function(d,e){
                                bufs.push(d);
                            });

                            rs.on('end', function() {
                                filter.fn(function(err, res) {
                                    if(err) return resolveError(req, res, err);

                                    //TODO handle res as a hashmap
                                    bufs.push(new Buffer(res));
                                    ws.end(Buffer.concat(bufs).toString());
                                });
                            });
                        });
                        break;

                    default:
                        console.log('unknown filter: ', filter);
                }
            });

            tr.on('error', function(){
                console.log('error', arguments);
            });

            tr.on('data', function (buf) {
              resWrite(buf);
            });

            tr.on('end', function () {
              resEnd();
            });


            res.write = function (data, encoding) {
                tr.write(data, encoding);
            };

            res.end = function (data, encoding) {
                tr.end(data, encoding);
            };

            //disable content-length to prevent cut content
            res.writeHead = function (code, headers) {
                res.removeHeader('Content-Length');
                if(headers) delete headers['content-length'];

                resWriteHead.apply(null, arguments);
            };
        }

        //dispatch request to proxy
        self.proxy.web(req, res, {
          target: 'http://'+req.headers.host
        });
    };
};

module.exports =  {
    Middleware: Middleware
};