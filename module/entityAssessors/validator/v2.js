/**
 * name : v2.js
 * author : Aman
 * created-date : 17-04-2020
 * Description : Entity Assessors validators.
 */


module.exports = (req) => {

    let entityAssessorValidator = {

        entities: function () {
            req.checkQuery('type').exists().withMessage("required type");
            req.checkQuery('subType').exists().withMessage("required subType");
        }
    }

    if (entityAssessorValidator[req.params.method]) {
        entityAssessorValidator[req.params.method]();
    }

};