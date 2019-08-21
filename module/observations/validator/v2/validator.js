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
            // req.checkQuery('observationId').exists().withMessage("required solution or observation Id")
        }

    }

    if (entityValidator[req.params.method]) entityValidator[req.params.method]();

};