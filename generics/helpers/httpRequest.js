var http = require("http");
var https = require("https");
var URL = require('url');
let options = {};

Number.prototype.padLeft = function(base,chr){
    var  len = (String(base || 10).length - String(this).length)+1;
    return len > 0? new Array(len).join(chr || '0')+this : this;
 }
   
 
 let Request = function() {

    function get(url, params){
      let urlOpt = URL.parse(url+params);
      // log.debug(urlOpt);
      
      return new Promise((resolve,reject)=>{
        options.port = urlOpt.protocol == "http:" ? 80 : 443;
        options.host = urlOpt.host;
        options.path = urlOpt.path;
        options.method = "GET";
        options.headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(params)
      }
        // log.debug(options);
        HttpRequest(options, params).then(result=>{
          resolve(result);
        }).catch(err=>{
          // console.error(new Error(err));
          reject(err);
        });
        
      });
    }
  
    function HttpRequest(options, body) {
        var port = options.port == 443 ? https : http;
        options.timeout = 1000; 
        return new Promise((resolve, reject) => {
            var req = port.request(options, function (res) {
                var output = '';
                // log.debug(options.host + ':' + res.statusCode);
                res.setEncoding('utf8');

                res.on('data', function (chunk) {
                    output += chunk;
                });
                res.on('end', function () {
                    // log.debug(res.headers['content-type']);
                    var obj;
                    if(res.headers['content-type']== 'application/json; charset=utf-8' || res.headers['content-type']== 'application/json') {
                        obj = JSON.parse(output);
                    }else{
                       obj = output 
                    }
                    // log.debug('https response--------->',obj);
                    if (req.statusCode == 200) {
                        resolve({ status: res.statusCode, body: obj});
                    } else {
                        resolve({ status: res.statusCode, body: obj});
                    }


                });
            });

            req.on('error', function (err) {
                reject(err)
            });

            req.end(body);
        });
    }

    function currentDateTime(){
        var d = new Date,
        dformat = [ (d.getDate()+1).padLeft(),
                    d.getMonth().padLeft(),
                    d.getFullYear()].join('/')+
                    ' ' +
                  [ d.getHours().padLeft(),
                    (d.getMinutes()).padLeft()].join(':');
        return dformat;
    }

    return {
        get:get
    }
}

module.exports = Request ;