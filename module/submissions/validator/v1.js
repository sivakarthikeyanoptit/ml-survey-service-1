module.exports = (req) => {

    let submissionValidator = {

        pushCompletedSubmissionForReporting: function () {
            req.checkParams('_id').exists().withMessage("required submission id")
        },

        pushIncompleteSubmissionForReporting: function () {
            req.checkParams('_id').exists().withMessage("required submission id")
        }
    }

    if (submissionValidator[req.params.method]) submissionValidator[req.params.method]();

};