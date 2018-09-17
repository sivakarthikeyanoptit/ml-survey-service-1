const fs = require('fs');
const glob = require('glob');
const YAML = require('yaml-js');
const extendify = require('extendify');


let Swagger =  class Swagger {
    constructor(){}

    middleware(req, res, next) {
        glob("./**/*.yaml", function (er, files) {
            const contents = files.map(f => {
              return YAML.load(fs.readFileSync(f).toString());
            });
            const extend = extendify({
              inPlace: false,
              isDeep: true
            });
            const merged = contents.reduce(extend);
            // console.log(merged);
            // console.log("Generating swagger.yaml, swagger.json");
            // fs.existsSync("target") || fs.mkdirSync("target");
            // fs.writeFile("swagger/swagger.yaml", YAML.dump(merged));
            fs.writeFile("swagger/swagger.json", JSON.stringify(merged, null, 2));
            next();
          });
    }

    sendFile(req, res){
        try{
            glob("./**/*.yaml", function (er, files) {
                const contents = files.map(f => {
                  return YAML.load(fs.readFileSync(f).toString());
                });
                const extend = extendify({
                  inPlace: false,
                  isDeep: true
                });
                const merged = contents.reduce(extend);
                merged.host = req.headers.host;
                // console.log(req.headers.host);
                // console.log("Generating swagger.yaml, swagger.json");
                res.status(200).json(merged).end();
              });
        }catch(err){
            throw new Error (err)
        }
    }
}

module.exports = Swagger;