let fs = require("fs");
module.exports = (req, res, next) => {

    let validatorPath = ROOT_PATH + `/module/${req.params.controller}/validator.js`

    if (fs.existsSync(validatorPath)) require(validatorPath)(req);

    next();

    return

}