esteves - add, remove or inject content for a given webpage
--------------------------------------------------

> Afterwards I lean back in the chair <br>
> And keep smoking. <br>
> As long as Destiny allows, I will keep smoking. <br>
> (If I married my washwoman's daughter <br>
> I might conceivably be happy.) <br>
> Given this, I rise and go to the window. <br>
> The man has come out of the Tobacco Shop (putting change into his pocket?). <br>
> Ah, I know him: he is Esteves without methaphysics. <br>
> (The Tobacco Shop owner has come to the door.) <br>
> As if by a divine instinct, Esteves turned around and saw me. <br>
> He waved hello, I shouted back "Hello there, Esteves!" and the universe <br>
> Reconstructed itself to me, without ideals or hope, and the owner of the Tobacco Shop smiled.

[Tobacco Shop](http://www.ronnowpoetry.com/contents/pessoa/TobaccoShop.html) by Fernando Pessoa

Esteves is a small lib that allows for easy html rewriting as well as serving new resources.
It builds upon [node-http-proxy](https://github.com/nodejitsu/node-http-proxy/) and [trumpet](https://github.com/substack/node-trumpet).

The feature set is quite basic, but the src is very easy to read. Fork and change at will.

All my node projects will have a completely unrelated name, and I will further accompany the readme with a poem.

### Is it any good?

[Yes](http://news.ycombinator.com/item?id=3067434)

### Similar Projects

 * [Harmon](https://github.com/No9/harmon/)
 * [Oxy](https://github.com/JosePedroDias/oxy)
 * [nProxy](https://github.com/goddyZhao/nproxy)
 * [magicProxy](https://github.com/fabiosantoscode/magicProxy)

### TODO

 * Support external config
 * ~~Support regexes in uri definition~~
 * Support HTTPS

#### Example

```

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

//accept-encoding must be false, currently content-encoding is not supported (gzip)
var mware = new intercept.createMiddleware(proxy, {userAgent: 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36',
												   acceptEncoding: false});

mware.afterSelection('http://my.site.pt/', 'head', function(cb){
	cb(null, '\n\t<script src="/myCustomScript.js"></script>\n');
});

mware.replaceSelection('http://my.site.pt/', 'h1#logo', function(cb){
	cb(null, '<img id="ad_logo" src="/random_img.gif" onload="this.src=\'/asset/ad/logo.svg\';">');
});

mware.whenUri('http://my.site.pt/myCustomScript.js', function(cb){
	cb(null, {code: 200, headers: imgHeaders, response: fs.readFileSync('examples/wwwroot/myCustomScript.js')});
});

mware.whenUri('http://my.site.pt/random_img.gif', function(cb){
	cb(null, {code: 200, headers: imgHeaders, response: fs.readFileSync('examples/wwwroot/1x1.gif')});
});

```



#### License

MIT License.

