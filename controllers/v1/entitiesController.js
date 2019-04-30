const csv = require("csvtojson");

module.exports = class Entities extends Abstract {
    constructor() {
      super(entitiesSchema);
    }
  
    static get name() {
      return "entities";
    }

    async upload(req) {
      return new Promise(async (resolve, reject) => {
          try {
              let assessorUploadData = await csv().fromString(
                  req.files.assessments.data.toString()
              );

              let programQueryList = {};
              let evaluationFrameworkQueryList = {};

              assessorUploadData.forEach(assessor => {
                  programQueryList[assessor.externalId] = assessor.programId;
                  evaluationFrameworkQueryList[assessor.externalId] = assessor.frameworkId;
              });

              let evaluationFrameworksFromDatabase = await database.models[
                  "evaluationFrameworks"
              ].find(
                  {
                      externalId: { $in: Object.values(evaluationFrameworkQueryList) }
                  },
                  {
                      externalId: 1
                  }
              );

              let programsFromDatabase = await database.models.programs.find({
                  externalId: { $in: Object.values(programQueryList) }
              });

              const programsData = programsFromDatabase.reduce(
                  (ac, program) => ({ ...ac, [program.externalId]: program }),
                  {}
              );

              const evaluationFrameworksData = evaluationFrameworksFromDatabase.reduce(
                  (ac, evaluationFramework) => ({
                      ...ac,
                      [evaluationFramework.externalId]: evaluationFramework._id
                  }),
                  {}
              );

              const schoolUploadedData = await Promise.all(
                  assessorUploadData.map(async assessor => {
                      let entityAssessorsDocument = {}
                      entityAssessorsDocument.programId = programsData[assessor.programId];
                      entityAssessorsDocument.assessmentStatus = "pending";
                      entityAssessorsDocument.parentId = "";
                      entityAssessorsDocument["entities"] = [assessor.userId];
                      entityAssessorsDocument.frameworkId = assessor.frameworkId;
                      entityAssessorsDocument.role = assessor.role;
                      entityAssessorsDocument.userId = assessor.userId;
                      entityAssessorsDocument.externalId = assessor.externalId;
                      entityAssessorsDocument.name = assessor.name;
                      entityAssessorsDocument.email = assessor.email;
                      entityAssessorsDocument.createdBy = assessor.createdBy;
                      entityAssessorsDocument.createdBy = assessor.createdBy;
                      entityAssessorsDocument.updatedBy = assessor.updatedBy;
                      await database.models.entityAssessors.findOneAndUpdate(
                          { userId: entityAssessorsDocument.userId },
                          entityAssessorsDocument,
                          {
                              upsert: true,
                              new: true,
                              setDefaultsOnInsert: true,
                              returnNewDocument: true
                          }
                      );

                      let componentsIndex = programsData[assessor.programId].components.findIndex(component => {
                          return component.id.toString() == evaluationFrameworksData[assessor.frameworkId].toString()
                      });

                      let entities = programsData[assessor.programId].components[componentsIndex]['entities'];

                      if (!entities.includes(assessor.userId)) {
                          entities.push(assessor.userId)
                      }

                      programsData[assessor.programId].components[componentsIndex]['entities'] = entities;

                      await database.models.programs.findOneAndUpdate(
                          { externalId: assessor.programId },
                          programsData[assessor.programId],
                          {
                              upsert: true,
                              new: true,
                              setDefaultsOnInsert: true,
                              returnNewDocument: true
                          }
                      )

                      await database.models.entities.findOneAndUpdate(
                          {
                              "userId": assessor.userId
                          },
                          {
                              "name": assessor.name,
                              "userId": assessor.userId,
                              "externalId": assessor.externalId
                          },
                          {
                              upsert: true,
                              new: true,
                              setDefaultsOnInsert: true,
                              returnNewDocument: true
                          }
                      )
                      return

                  })
              );

              let responseMessage = "Assessor record created successfully.";

              let response = { message: responseMessage };

              return resolve(response);
          } catch (error) {
              return reject({
                  status: 500,
                  message: error,
                  errorObject: error
              });
          }
      });
  }

  };
  