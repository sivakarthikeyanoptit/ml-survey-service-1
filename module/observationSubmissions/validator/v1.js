module.exports = (req) => {

    let observationSubmissionValidator = {

        isAllowed: function () {
            req.checkParams('_id').exists().withMessage("required observation submission id")
            req.checkQuery('evidenceId').exists().withMessage("required evidenceId")
        },

        makePdf: function () {
            req.checkParams('_id').exists().withMessage("required observation submission id")
        },

        create: function () {
            req.checkParams('_id').exists().withMessage("required observation id")
            req.checkQuery('entityId').exists().withMessage("required entity id")
        },

        title: function () {
            req.checkBody('title').exists().notEmpty().withMessage("required observation submission title")
        }

    }

    if (observationSubmissionValidator[req.params.method]) observationSubmissionValidator[req.params.method]();

};