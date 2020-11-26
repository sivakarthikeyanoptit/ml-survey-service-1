module.exports = (req) => {

    let entityAssessorValidator = {

        entities: function () {
            req.checkQuery('type').exists().withMessage("required type")
            req.checkQuery('subType').exists().withMessage("required subType")
        },
        
        uploadForPortal: function () {
            req.checkQuery('programId').exists().withMessage("required programId")
            req.checkQuery('solutionId').exists().withMessage("required solutionId")
        },
        completedAssessments : function () {
            req.checkQuery('fromDate').exists().withMessage("required from date");
        },
        create : function () {
            req.checkParams("_id").exists().withMessage("Required program id");
            req.checkQuery("solutionId").exists().withMessage("Required solution id");
        }
    }

    if (entityAssessorValidator[req.params.method]) entityAssessorValidator[req.params.method]();

};