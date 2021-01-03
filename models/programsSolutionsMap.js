/**
 * name : programsSolutionsMap.js.
 * author : Aman Karki.
 * created-date : 28-Dec-2020.
 * Description : Programs and solution map.
 */

module.exports = {
    name: "programsSolutionsMap",
    schema: {
        programId : {
            type : "ObjectId",
            index : true
        },
        solutionId : {
            type : "ObjectId",
            index : true,
            unique : true
        },
        scope : Object,
        solutionType : String,
        solutionSubType : String,
        isReusable : Boolean,
        programName : String,
        programExternalId : String,
        programDescription : String,
        solutionExternalId : String,
        solutionName : String,
        solutionDescription : String
    }
};
  