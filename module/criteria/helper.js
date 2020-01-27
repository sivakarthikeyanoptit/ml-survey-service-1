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
                    rubric.levels[levelObject.level] = {
                        level: levelObject.level,
                        label: levelObject.label,
                        description: levelObject.description,
                        expression: criteriaRubricData[levelObject.level]
                    };
                })

                 await database.models.criteria.findOneAndUpdate(
                    {_id : criteriaId},
                    {
                        rubric: rubric,
                        criteriaType : "auto"
                    }
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

};