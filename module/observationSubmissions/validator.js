module.exports = (req) => {

    let entityValidator = {

        isAllowed: function () {
            req.checkParams('_id').exists().withMessage("required observation submission id")
            req.checkQuery('evidenceId').exists().withMessage("required evidenceId")
        },

    }

    if (entityValidator[req.params.method]) entityValidator[req.params.method]();

};