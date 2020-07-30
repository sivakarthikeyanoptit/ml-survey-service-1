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
        importFromSolution: function () {
            req.checkQuery('solutionId').exists().withMessage("required solution externalId");
            req.checkBody('externalId').exists().withMessage("required new solution externalId")
            req.checkBody('name').exists().withMessage("required new solution name")
            req.checkBody('description').exists().withMessage("required new solution description")
            req.checkBody('programExternalId').exists().withMessage("required programExternalId")
        },
        externalIdsToInternalIds : function () {
            req.checkBody('solutionIds').exists().withMessage("required solution external Ids");
        }
    }

    if (solutionValidator[req.params.method]) solutionValidator[req.params.method]();

};