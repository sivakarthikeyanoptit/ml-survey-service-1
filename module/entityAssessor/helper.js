const csv = require("csvtojson");

module.exports = class entityAssessorHelper {

    constructor() {

    }

    async createEntityAssessor(programId,solutionId,entityId,userEntityDetails,userDetails) {
        let entityAssessorsDocument = {}
        entityAssessorsDocument.programId = programId;
        entityAssessorsDocument.assessmentStatus = "pending";
        entityAssessorsDocument.parentId = "";
        entityAssessorsDocument["entities"] = entityId;
        entityAssessorsDocument.solutionId = solutionId;
        entityAssessorsDocument.role = userEntityDetails.role;
        entityAssessorsDocument.userId = userEntityDetails.userId;
        entityAssessorsDocument.externalId = userEntityDetails.externalId;
        entityAssessorsDocument.name = userEntityDetails.name;
        entityAssessorsDocument.email = userEntityDetails.email;
        entityAssessorsDocument.createdBy = userDetails.id;
        entityAssessorsDocument.updatedBy = userDetails.id;
        let entityAssessor = await database.models.entityAssessors.findOneAndUpdate(
            {
                userId: entityAssessorsDocument.userId,
                programId: entityAssessorsDocument.programId,
                solutionId: entityAssessorsDocument.solutionId
            },
            entityAssessorsDocument,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                returnNewDocument: true
            }
        );

        return entityAssessor;
    }


};