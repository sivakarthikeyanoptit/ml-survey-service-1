module.exports = (req) => {

    let programOperationsValidator = {

        reportFilters: function () {
            req.checkParams('_id').exists().withMessage("required program id")
        },
        managerProfile: function () {
            req.checkParams('_id').exists().withMessage("required program id")
        },
        searchEntity: function () {
            req.checkParams('_id').exists().withMessage("required program id")
            req.checkQuery('id').exists().withMessage("required entity id")
        },
        entityReport: function () {
            req.checkParams('_id').exists().withMessage("required program id")
            req.checkQuery('fromDate').exists().withMessage("required from date")
            req.checkQuery('solutionId').exists().withMessage("required solution id")
        },
        entitySummary: function () {
            req.checkParams('_id').exists().withMessage("required program id")
            req.checkQuery('fromDate').exists().withMessage("required from date")
            req.checkQuery('solutionId').exists().withMessage("required solution id")
        },
        assessorReport: function () {
            req.checkParams('_id').exists().withMessage("required program id")
            req.checkQuery('fromDate').exists().withMessage("required from date")
            req.checkQuery('solutionId').exists().withMessage("required solution id")
        }

    }

    if (programOperationsValidator[req.params.method]) programOperationsValidator[req.params.method]();

};