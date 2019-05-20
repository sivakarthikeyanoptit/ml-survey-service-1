module.exports = (req) => {

    let entityAssessorValidator = {

        entities: function () {
        },
        
        uploadForPortal: function () {
            req.checkQuery('programId').exists().withMessage("required programId")
            req.checkQuery('solutionId').exists().withMessage("required solutionId")
        }


    }

    if (entityAssessorValidator[req.params.method]) entityAssessorValidator[req.params.method]();

};