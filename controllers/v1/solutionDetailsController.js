const solutionsHelper = require(ROOT_PATH + "/module/solutions/helper")
const FileStream = require(ROOT_PATH + "/generics/fileStream")

module.exports = class SolutionDetails {

    /**
        * @apiDefine errorBody
        * @apiError {String} status 4XX,5XX
        * @apiError {String} message Error
        */

    /**
        * @apiDefine successBody
        *  @apiSuccess {String} status 200
        * @apiSuccess {String} result Data
        */
       

    static get name() {
      return "solutionDetails";
    }

    /**
    * @api {get} /assessment/api/v1/solutionDetails/entities?programId:programExternalId&solutionId:solutionExternalId&primary:primaryEntityFilter&type:subEntityType Framework & Rubric Details
    * @apiVersion 0.0.1
    * @apiName Entities of a Solution
    * @apiGroup Solution Entity Details
    * @apiParam {String} programId Program External ID.
    * @apiParam {String} solutionId Solution External ID.
    * @apiParam {String} primary 0/1.
    * @apiParam {String} type Type of subentity
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/solutionDetails/entities?programId=PROGID01&solutionId=EF-DCPCR-2018-001&primary=0&type=parent
    * @apiUse successBody
    * @apiUse errorBody
    */

    async entities(req) {
      return new Promise(async (resolve, reject) => {
        try {

          if (!req.query.programId || req.query.programId == "" || !req.query.solutionId || req.query.solutionId == "" ) {
            throw "Invalid parameters."
          }

          let findQuery = {
            externalId: req.query.solutionId,
            programExternalId: req.query.programId
          }

          let entities = new Array

          if(req.query.primary == 0 && req.query.type != "") {
            let allSubEntities = await solutionsHelper.allSubGroupEntityIdsByGroupName(req.query.programId,req.query.type)
            entities = Object.keys(allSubEntities)
          } else {
            let solutionDocument = await database.models.solutions.findOne(findQuery,{entities:1}).lean()
            entities = solutionDocument.entities
          }

          if (!entities.length) {
            return resolve({
              status: 404,
              message: "No entities found."
            });
          } else {

            const fileName = `entityInformation`;
            let fileStream = new FileStream(fileName);
            let input = fileStream.initStream();
  
            (async function () {
              await fileStream.getProcessorPromise();
              return resolve({
                isResponseAStream: true,
                fileNameWithPath: fileStream.fileNameWithPath()
              });
            }());

            let chunkOfEntityIds = _.chunk(entities, 10)
            let entityDocuments
  
            for (let pointerToChunkOfEntityIds = 0; pointerToChunkOfEntityIds < chunkOfEntityIds.length; pointerToChunkOfEntityIds++) {
              
              entityDocuments = await database.models.entities.find(
                {
                  _id: {
                    $in: chunkOfEntityIds[pointerToChunkOfEntityIds]
                  }
                }, {
                  "metaInformation": 1
              }).lean()
  
              await Promise.all(entityDocuments.map(async (entityDocument) => {
                if (entityDocument.metaInformation) {
                  entityDocument.metaInformation['System Id'] = entityDocument._id.toString();
                  input.push(entityDocument.metaInformation);
                }
              }))
            }

            input.push(null);
          }



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
