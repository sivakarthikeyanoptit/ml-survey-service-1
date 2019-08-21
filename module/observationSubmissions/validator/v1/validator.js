module.exports = (req) => {

    let observationSubmissionValidator = {

        isAllowed: function () {
            req.checkParams('_id').exists().withMessage("required observation submission id")
            req.checkQuery('evidenceId').exists().withMessage("required evidenceId")
        },

        makePdf: function () {
            req.checkParams('_id').exists().withMessage("required observation submission id")
        },

    }

    if (observationSubmissionValidator[req.params.method]) observationSubmissionValidator[req.params.method]();

};