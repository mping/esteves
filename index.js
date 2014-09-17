'use strict';

var intercept = require('./lib/interceptor');

module.exports =  {
    createMiddleware: function(proxy, opts) {
        return new intercept.Middleware(proxy, opts);
    }
};