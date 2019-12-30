module.exports = (req) => {

    let solutionValidator = {
        uploadThemes: function () {
            req.checkParams('_id').exists().withMessage("required solution id");
        },
        update: function () {
            req.checkQuery('solutionExternalId').exists().withMessage("required solution externalId");
        },
        questionList: function () {
            req.checkParams('_id').exists().withMessage("required solution id");
        },
        details: function () {
            req.checkParams('_id').exists().withMessage("required solution id");
        },
    }

    if (solutionValidator[req.params.method]) solutionValidator[req.params.method]();

};