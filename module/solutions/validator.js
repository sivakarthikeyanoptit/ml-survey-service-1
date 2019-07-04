module.exports = (req) => {

    let solutionValidator = {
        uploadThemes: function () {
            req.checkParams('_id').exists().withMessage("required solution id");
        }
    }

    if (solutionValidator[req.params.method]) solutionValidator[req.params.method]();

};