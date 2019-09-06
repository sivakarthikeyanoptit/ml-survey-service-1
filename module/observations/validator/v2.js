module.exports = (req) => {

    let entityValidator = {
        searchEntities: function () {
            let existId = "solutionId,observationId"
            if (req.query.solutionId) {
                existId = "solutionId"
            }

            if (req.query.observationId) {
                existId = 'observationId'
            }
            req.checkQuery(existId).exists().withMessage("required solution or observation Id")
        },
        assessment: function () {
            req.checkParams('_id').exists().withMessage("required observation id")
            req.checkQuery('entityId').exists().withMessage("required entity id")
        },

    }

    if (entityValidator[req.params.method]) entityValidator[req.params.method]();

};