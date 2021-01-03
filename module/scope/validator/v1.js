/**
 * name : v1.js
 * author : Aman
 * created-date : 28-Dec-2020
 * Description : Programs Solutions map validator.
 */

module.exports = (req) => {

    let programsSolutionsValidator = {
        targetedSolutions : function () {
            req.checkQuery("type").exists().withMessage("Required solution type");
            req.checkQuery("subType").exists().withMessage("Required solution sub type");
        },
        targetedProgramsSolutions : function () {
            req.checkParams('_id').exists().withMessage("required program id");
            req.checkQuery('solutionId').exists().withMessage("required solution id");
        }
    }

    if (programsSolutionsValidator[req.params.method]) {
        programsSolutionsValidator[req.params.method]();
    }

};