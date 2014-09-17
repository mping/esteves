var http      = require('http'),
    httpProxy = require('http-proxy'),
    fs        = require('fs'),
    intercept = require('../')

// so that node doesn't hang on conn refused
process.on('uncaughtException', function(err) {
  console.log('uncaughtException: ', err);
});


var imgHeaders = {'Content-Type': 'image/gif', 'Pragma-directive': 'no-cache','Cache-directive': 'no-cache','Cache-control': 'no-cache','Pragma': 'no-cache','Expires': '0'};

var proxy = new httpProxy.createProxyServer();
var mware = new intercept.createMiddleware(proxy, {userAgent: 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36',
												   acceptEncoding: false});


mware.replaceSelection('http://www.sapo.pt/', 'h1#logo', function(cb){
	cb(null, 'My Sapo');
});


var server = http.createServer(mware.middleware());
server.listen(9000);
console.log('listening on 9000');