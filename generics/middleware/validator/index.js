module.exports = (req, res, next) => {

    if(req.params.controller == "entities" ) require("../../../module/entitiesModule/entitiesValidator")(req);

    next();

    return

}