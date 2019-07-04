module.exports = (req) => {

    let frameworkValidator = {
        uploadThemes: function () {
            req.checkParams('_id').exists().withMessage("required framework id");
        }
    }

    if (frameworkValidator[req.params.method]) frameworkValidator[req.params.method]();

};