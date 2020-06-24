let improvementProjectService = require(ROOT_PATH+"/generics/services/improvement-project");
let criteriaQuestionsHelper = require(MODULES_BASE_PATH + "/criteriaQuestions/helper");

module.exports = class criteriaHelper {

    static setCriteriaRubricExpressions(criteriaId, existingCriteria, criteriaRubricData) {
        return new Promise(async (resolve, reject) => {
            try {
                
                let expressionVariables = {};
                let expressionVariablesArray = criteriaRubricData.expressionVariables.split("###");
                
                expressionVariablesArray.forEach(expressionVariable => {
                    let tempExpressionVariableArray = expressionVariable.split("=");
                    let expressionVariableArray = new Array;
                    expressionVariableArray.push(tempExpressionVariableArray.shift());
                    expressionVariableArray.push(tempExpressionVariableArray.join('='));
                    let defaultVariableArray = expressionVariableArray[0].split("-");
                    if (defaultVariableArray.length > 1) {
                        if (!expressionVariables.default) {
                            expressionVariables.default = {};
                        }
                        expressionVariables.default[defaultVariableArray[0]] = expressionVariableArray[1];
                    } else {
                        expressionVariables[expressionVariableArray[0]] = expressionVariableArray[1];
                    }
                })

                let rubric = {
                    name: existingCriteria.name,
                    description: existingCriteria.description,
                    type: existingCriteria.criteriaType,
                    expressionVariables: expressionVariables,
                    levels: {}
                };

                let existingCriteriaRubricLevels;

                if (Array.isArray(existingCriteria.rubric.levels)) {
                    existingCriteriaRubricLevels = existingCriteria.rubric.levels;
                } else {
                    existingCriteriaRubricLevels = Object.values(existingCriteria.rubric.levels);
                }

                existingCriteriaRubricLevels.forEach(levelObject => {

                  rubric.levels[levelObject.level] = {};

                  Object.keys(levelObject).forEach(level=>{
                    rubric.levels[levelObject.level][level] = levelObject[level];
                  })

                  rubric.levels[levelObject.level].expression = criteriaRubricData[levelObject.level];
                })

                 await database.models.criteria.findOneAndUpdate(
                    {_id : criteriaId},
                    {
                        rubric: rubric,
                        criteriaType : "auto"
                    }
                );

                await criteriaQuestionsHelper.createOrUpdate(
                  criteriaId
                );

                return resolve({
                    success: true,
                    message : messageConstants.apiResponses.CRITERIA_RUBRIC_UPDATE
                });

            } catch (error) {
                return reject(error);
            }
        })

    }

    static criteriaDocument(criteriaFilter = "all", fieldsArray = "all") {
        return new Promise(async (resolve, reject) => {
            try {
        
                let queryObject = (criteriaFilter != "all") ? criteriaFilter : {};
        
        
                let projectionObject = {};
        
                if (fieldsArray != "all") {
                    fieldsArray.forEach(field => {
                        if(typeof field === "string") {
                            projectionObject[field] = 1;
                        } else {
                            if(Object.keys(field).length >0) {
                                for (let [key, value] of Object.entries(field)) {
                                    projectionObject[key] = value;
                              }
                            }
                        }
                    });
                }
        
                let criteriaDocuments = await database.models.criteria.find(queryObject, projectionObject).lean();
                
                return resolve(criteriaDocuments);
                
            } catch (error) {
                return reject(error);
            }
        });
    }

     /**
    * Create criteria
    * @method
    * @name create
    * @param {Object} criteriaData - criteria data to insert 
    * @returns {Array} - returns created criteria.
    */

    static create(criteriaData) {
        return new Promise(async (resolve, reject) => {
          try {
            let criteriaDocuments;
            if( Array.isArray(criteriaData) && criteriaData.length > 0 ) {
              criteriaDocuments = await database.models.criteria.insertMany(
                criteriaData
              );

            } else {
              criteriaDocuments = await database.models.criteria.create(
                criteriaData
              );
            }

            return resolve(criteriaDocuments);
            
          } catch (error) {
            return reject(error)
          }
        })
    }

     /**
    * Upload criteria
    * @method
    * @name upload
    * @param {Object} criteriaData - criteria data to insert
    * @param {String} userId - logged in user id
    * @param {String} token - logged in user token    
    * @returns {Array} - returns created criteria.
    */

   static upload(criteriaData,userId,token) {
    return new Promise(async (resolve, reject) => {
      try {

        let improvementProjectIds = [];
        let improvementObj = {};

        for( let criteria = 0; criteria < criteriaData.length ; criteria ++ ) {

          let parsedCriteria = gen.utils.valueParser(criteriaData[criteria]);

          let parsedCriteriaKeys = Object.keys(parsedCriteria);

          for( let key = 0; key < parsedCriteriaKeys.length ; key ++ ) {
            
            let improvement = 
            parsedCriteriaKeys[key].endsWith("-improvement-projects");

            if( improvement ) {

              if( !improvementObj[improvement] ) {
                improvementObj[parsedCriteria[parsedCriteriaKeys[key]]] = [];
              }

              let improvements = 
              parsedCriteria[parsedCriteriaKeys[key]].split(",");

              improvementProjectIds = _.concat(improvementProjectIds,improvements);

            }
          }

        }

        if ( improvementProjectIds.length > 0 ) {
          
          let improvementProjects = await improvementProjectService.getImprovementProjects(
            improvementProjectIds,
            token
          );

          if( improvementProjects.result && improvementProjects.result.length > 0 ) {
          
            let improvements = improvementProjects.result.reduce((ac, improvementProject) => ({
              ...ac, [improvementProject.externalId]: improvementProject
            }), {});
  
            Object.keys(improvementObj).forEach(improvement=>{
            
              let improvementsArr = improvement.split(",");
    
              let result = [];
    
              if( improvementsArr.length > 0 ) {
                
                improvementsArr.forEach(eachImprovement=>{
                  result = _.concat(
                    result,
                    improvements[eachImprovement] ? improvements[eachImprovement] : []
                  );
  
                })
  
              } else {
                result = 
                improvements[improvementsArr[0]] ? improvements[improvementsArr[0]] : [];
              }
  
              improvementObj[improvement] = result;
    
            })
  
          }
          
        }

        let result = [];

        await Promise.all(criteriaData.map(async criteria => {

          let csvData = {};
          let rubric = {};
          let parsedCriteria = gen.utils.valueParser(criteria);

          rubric.name = parsedCriteria.criteriaName;
          rubric.description = parsedCriteria.criteriaName;
          rubric.type = parsedCriteria.type;
          rubric.expressionVariables = {};
          rubric.levels = {};
          let countLabel = 1;

          Object.keys(parsedCriteria).forEach(eachCriteriaKey => {

            let regExpForLevels = /^L+[0-9]/;
            if ( 
              regExpForLevels.test(eachCriteriaKey) && 
              !eachCriteriaKey.includes("-improvement-projects")
            ) {

              let label = "Level " + countLabel++;

              let improvementProject = eachCriteriaKey+"-improvement-projects";

              rubric.levels[eachCriteriaKey] = {
                level: eachCriteriaKey,
                label: label,
                description: parsedCriteria[eachCriteriaKey],
                expression: ""
              };

              if( parsedCriteria[improvementProject] && 
                improvementObj[parsedCriteria[improvementProject]] &&  
                Object.values(improvementObj[parsedCriteria[improvementProject]]).length > 0
              ) {
                
                rubric.levels[eachCriteriaKey]["improvement-projects"] = 
                improvementObj[parsedCriteria[improvementProject]];

              }
            }
          })

          let criteriaStructure = {
            name: parsedCriteria.criteriaName,
            description: parsedCriteria.criteriaName,
            externalId: criteria.criteriaID,
            rubric: rubric
          };

          let criteriaDocuments;

          if( parsedCriteria._SYSTEM_ID ) {
            criteriaDocuments = await database.models.criteria.findOneAndUpdate(
              {
                _id : parsedCriteria._SYSTEM_ID
              },{
                $set : criteriaStructure
              }
            )

            await criteriaQuestionsHelper.createOrUpdate(
              parsedCriteria._SYSTEM_ID
            );

          } else {
            
            criteriaStructure["resourceType"] = [
              "Program",
              "Framework",
              "Criteria"
            ];

            criteriaStructure["language"] = [
              "English"
            ];

            criteriaStructure["keywords"] = [
              "Keyword 1",
              "Keyword 2"
            ];

            criteriaStructure["concepts"] = [
              {
                identifier: "LPD20100",
                name: "Teacher_Performance",
                objectType: "Concept",
                relation: "associatedTo",
                description: null,
                index: null,
                status: null,
                depth: null,
                mimeType: null,
                visibility: null,
                compatibilityLevel: null
              },
              {
                identifier: "LPD20400",
                name: "Instructional_Programme",
                objectType: "Concept",
                relation: "associatedTo",
                description: null,
                index: null,
                status: null,
                depth: null,
                mimeType: null,
                visibility: null,
                compatibilityLevel: null
              },
              {
                identifier: "LPD20200",
                name: "Teacher_Empowerment",
                objectType: "Concept",
                relation: "associatedTo",
                description: null,
                index: null,
                status: null,
                depth: null,
                mimeType: null,
                visibility: null,
                compatibilityLevel: null
              }
            ];

            criteriaStructure["createdFor"] = [
              "0125747659358699520",
              "0125748495625912324"
            ];

            criteriaStructure["evidences"] = [];
            criteriaStructure["deleted"] = false;
            criteriaStructure["owner"] = userId;
            criteriaStructure["timesUsed"] = 12;
            criteriaStructure["weightage"] = 20;
            criteriaStructure["remarks"] = "";
            criteriaStructure["criteriaType"] = "auto";
            criteriaStructure["score"] =  "";
            criteriaStructure["flag"] =  "";

            criteriaDocuments = await database.models.criteria.create(
              criteriaStructure
            );

          }

          csvData["Criteria Name"] = parsedCriteria.criteriaName;
          csvData["Criteria External Id"] = parsedCriteria.criteriaID;

          if (criteriaDocuments._id) {
            csvData["Criteria Internal Id"] = criteriaDocuments._id;
          } else {
            csvData["Criteria Internal Id"] = "Not inserted";
          }

          result.push(csvData);
        }))

        return resolve(result);
        
      } catch (error) {
        return reject(error)
      }
    })
   }

    /**
    * Update criteria
    * @method
    * @name update
    * @param {String} criteriaExternalId - criteria external id.
    * @param {String} frameworkIdExists - Either it is a framework id or not.
    * @param {Object} bodyData - Criteria data to be updated.
    * @param {String} userId - Logged in user id.
    * @returns {Array} - returns updated criteria.
    */

   static update(
     criteriaExternalId,
     frameworkIdExists,
     bodyData,
     userId
    ) {
    return new Promise(async (resolve, reject) => {
      try {

        let queryObject = {
          externalId : criteriaExternalId
        }

        if( frameworkIdExists ) {
          queryObject["frameworkCriteriaId"] = {
            $exists : true
          }
        };

        let updateObject = {
          "$set" : {}
        };

        Object.keys(bodyData).forEach(criteriaData=>{
          updateObject["$set"][criteriaData] = bodyData[criteriaData];
        })

        updateObject["$set"]["updatedBy"] = userId;

        let updatedCriteria = 
        await database.models.criteria.findOneAndUpdate(queryObject, updateObject);

        if( frameworkIdExists ) {
          await criteriaQuestionsHelper.createOrUpdate(
            updatedCriteria._id
          );
        }
        
        return resolve({
          status: httpStatusCode.ok.status,
          message: messageConstants.apiResponses.CRITERIA_UPDATED
        });
        
      } catch (error) {
        return reject(error)
      }
    })
}

};
