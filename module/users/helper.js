/**
 * name : helper.js
 * author : Aman
 * created-date : 20-May-2020
 * Description : All users helper functionality.
 */

 // Dependencies 

 let entityAssessorsHelper = require(MODULES_BASE_PATH + "/entityAssessors/helper");
 let programsHelper = require(MODULES_BASE_PATH + "/programs/helper");
 let solutionsHelper = require(MODULES_BASE_PATH + "/solutions/helper");
 let observationsHelper = require(MODULES_BASE_PATH + "/observations/helper");
 let submissionsHelper = require(MODULES_BASE_PATH + "/submissions/helper");
 let entitiesHelper = require(MODULES_BASE_PATH + "/entities/helper");
 let observationSubmissionsHelper = require(MODULES_BASE_PATH + "/observationSubmissions/helper");

/**
    * UserHelper
    * @class
*/
module.exports = class UserHelper {

     /**
   * Details user information. 
   * @method
   * @name userDetailsInformation
   * @param {String} userId 
   * @returns {Object} consists of observation,solutions,entities,programs and assessorData,submissions and observation submissions data.
   * associated to the user. 
   */

    static userDetailsInformation( userId ) {
        return new Promise(async (resolve, reject) => {
            try {

                let assessorsData = 
                await entityAssessorsHelper.assessorsDocument({
                    userId : userId
                },[
                    "programId",
                    "solutionId",
                    "entities",
                    "createdAt"
                ]);
                
                let programIds = [];
                let solutionIds = [];
                let entityIds = [];
                
                if( assessorsData.length > 0 ) {
                    
                    assessorsData.forEach(assessor=>{
                        
                        programIds.push(assessor.programId);
                        solutionIds.push(assessor.solutionId);
                        entityIds = entityIds.concat(assessor.entities);
                    })

                }

                let submissions = await submissionsHelper.submissionDocuments({
                    solutionId : { $in : solutionIds },
                    entityId : { $in : entityIds }
                },[
                    "status",
                    "_id",
                    "entityId",
                    "solutionId",
                    "title",
                    "submissionNumber",
                    "completedDate",
                    "createdAt",
                    "updatedAt"
                ],"none",
                {
                    createdAt : -1
                });
                
                let observationsData = 
                await observationsHelper.observationDocuments({
                    createdBy : userId,
                    status : messageConstants.common.PUBLISHED
                },[
                    "entities",
                    "solutionId",
                    "programId",
                    "entityId",
                    "name",
                    "description",
                    "status",
                    "observationId",
                    "createdAt",
                    "updatedAt"
                ]);

                let observationIds = [];
                let observationSolutions = [];
                let observationEntities = [];
                
                if ( observationsData.length > 0 ) {
                    
                    observationsData.forEach(observation=>{
                        observationIds.push(observation._id);
                        observation["isObservation"] = true;
                        programIds.push(observation.programId);
                        observationSolutions.push(observation.solutionId);
                        observationEntities = observationEntities.concat(observation.entities);
                    });
                }

                let observationSubmissions = 
                await observationSubmissionsHelper.observationSubmissionsDocument({
                    observationId : { $in : observationIds },
                    entityId : { $in : observationEntities }
                },[
                    "status",
                    "submissionNumber",
                    "entityId",
                    "createdAt",
                    "updatedAt",
                    "observationInformation.name",
                    "observationId", 
                    "title",
                    "completedDate",
                    "ratingCompletedAt"   
                ],{
                    createdAt : -1
                });

                solutionIds = solutionIds.concat(observationSolutions);
                entityIds = entityIds.concat(observationEntities);

                if ( !programIds.length > 0 ) {
                    throw {
                        status : httpStatusCode.ok.status,
                        message : messageConstants.apiResponses.PROGRAM_NOT_MAPPED_TO_USER
                    }
                }

                if( !solutionIds.length > 0 ) {
                    throw {
                        status : httpStatusCode.ok.status,
                        message : messageConstants.apiResponses.SOLUTION_NOT_MAPPED_TO_USER
                    }
                }
                
                let programs = 
                await programsHelper.programDocument(
                    programIds,
                    ["name","externalId","description"]
                );
                
                if ( !programs.length > 0 ) {
                    throw {
                        status : httpStatusCode.ok.status,
                        message : messageConstants.apiResponses.PROGRAM_NOT_FOUND
                    }
                }
                
                let programsData = programs.reduce(
                    (ac, program) => ({
                        ...ac,
                        [program._id.toString()]: program
                }), {});
                
                let solutions = 
                await solutionsHelper.solutionDocuments(
                    {
                        _id : { $in : solutionIds }
                    },[
                        "name",
                        "description",
                        "externalId",
                        "type",
                        "subType",
                        "solutionId",
                        "allowMultipleAssessemts"
                    ]
                );

                if ( !solutions.length > 0 ) {
                    throw {
                        status : httpStatusCode.ok.status,
                        message : messageConstants.apiResponses.SOLUTION_NOT_FOUND
                    }
                }

                let solutionsData = solutions.reduce(
                    (ac, solution) => ({
                        ...ac,
                        [solution._id.toString()]: solution
                    }), {});

                for (var i in solutionsData) {

                    var removedId = solutionsData[i]._id;
                    var checkRemoved =  await database.models.userExtension.findOne({
                        userId : userId,
                        removedFromHomeScreen: {$exists: true, $in: [removedId]},
                    }).count();

                    if(checkRemoved > 0){
                        solutionsData[i].showInHomeScreen = false;
                    }else{
                        solutionsData[i].showInHomeScreen = true;
                    }
                }

                let entitiesData = {};
                if( entityIds.length > 0 ) {


                    let entities = await entitiesHelper.entityDocuments({
                        _id : { $in : entityIds }
                    }, [
                        "_id",
                        "metaInformation.externalId",
                        "metaInformation.name",
                        "metaInformation.city",
                        "metaInformation.state",
                        "entityType"
                    ]);

                    if ( entities.length > 0 ) {
                        
                        entitiesData = entities.reduce(
                            (ac, entity) => ({
                                ...ac,
                                [entity._id.toString()]: entity
                        }), {});
                    }

                }

                return resolve({
                    entityAssessors : assessorsData,
                    observations : observationsData,
                    programsData : programsData,
                    solutionsData : solutionsData,
                    entitiesData : entitiesData,
                    submissions : submissions,
                    observationSubmissions : observationSubmissions
                });
                    
            } catch(error) {
                return reject(error);
            }
        })
    }

     /**
   * list user programs.
   * @method
   * @name programs
   * @param {String} userId - logged in user id
   * @returns {Object} list of user programs. 
   */

    static programs( userId ) {
        return new Promise(async (resolve, reject) => {
            try {

                let userDetails = await this.userDetailsInformation(
                    userId
                );

                let users = userDetails.entityAssessors.concat(
                    userDetails.observations
                );

                users = users.sort((a,b) => b.createdAt - a.createdAt);

                let submissions = {};
                let observationSubmissions = {};

                if( userDetails.submissions.length > 0 ) {
                    submissions =  _submissions(userDetails.submissions);
                };

                if( userDetails.observationSubmissions.length > 0 ) {
                    
                    observationSubmissions = _observationSubmissions(
                        userDetails.observationSubmissions
                    );
                }

                let result = [];
                 
                for( let user = 0 ; user < users.length ; user ++ ) {
                   
                    let program = 
                    users[user].programId && 
                    userDetails.programsData[users[user].programId.toString()];

                    let solution = 
                    users[user].solutionId &&
                    userDetails.solutionsData[users[user].solutionId.toString()];

                    if ( program && solution ) {

                        let programIndex = result.findIndex(programData =>
                            programData.externalId === program.externalId
                        );

                        if ( programIndex < 0 ) {

                            result.push(_programInformation(program));
                            programIndex = result.length - 1;
                        }

                        let solutionIndex = 
                        result[programIndex].solutions.findIndex(
                            solutionData => solutionData.externalId === solution.externalId
                        );

                        if( solutionIndex < 0 ) {

                            let solutionOrObservationInformation = 
                            users[user].isObservation ? 
                            _observationInformation(
                                program,
                                users[user],
                                solution
                            ) : _solutionInformation(program,solution); 
                            
                            solutionOrObservationInformation["entities"] = [];
                            result[programIndex].solutions.push(
                                solutionOrObservationInformation
                            );

                            solutionIndex = 
                            result[programIndex].solutions.length - 1;
                        }

                        let solutionOrObservationId = 
                        users[user].isObservation ?
                        users[user]._id 
                        : solution._id;

                        let submissionData = 
                        users[user].isObservation ? 
                        observationSubmissions : submissions;

                        result[programIndex].solutions[solutionIndex].entities = 
                        _entities(
                            users[user].entities,
                            userDetails.entitiesData,
                            solutionOrObservationId,
                            submissionData,
                            users[user].isObservation ? true : false
                        );
                    }
                }

                return resolve({
                    message : messageConstants.apiResponses.USER_PROGRAMS_FETCHED,
                    result : result
                });


            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
   * Entity types and entities detail information
   * @method
   * @name entities
   * @param {string} userId - logged in user Id.
   * @returns {Array} - Entity types and entities detail information.
   */

    static entities( userId ) {
        return new Promise(async (resolve, reject) => {
            try {

                let userDetails = await this.userDetailsInformation(
                    userId
                );

                let submissions = {};
                let observationSubmissions = {};

                if( userDetails.submissions.length > 0 ) {
                    submissions =  _submissions(userDetails.submissions);
                };

                if( userDetails.observationSubmissions.length > 0 ) {
                    
                    observationSubmissions = _observationSubmissions(
                        userDetails.observationSubmissions
                    );
                }

                let result = {
                    entityTypes : 
                    _entityTypesKeyValue(
                        Object.values(userDetails.entitiesData)
                    ),
                    entities : {}
                }

                let users = userDetails.entityAssessors.concat(
                    userDetails.observations
                );

                for ( let user = 0 ; user < users.length ; user++) {

                    let userData = users[user];
                    let program = 
                    users[user].programId &&
                    userDetails.programsData[users[user].programId.toString()];
                    
                    let solution = 
                    users[user].solutionId &&
                    userDetails.solutionsData[users[user].solutionId.toString()];

                    if ( solution && program && userData.entities.length > 0 ) {

                        userData.entities.forEach(entity => {

                            let entitiesData = userDetails.entitiesData;
            
                            if ( entitiesData[entity.toString()] ) {
                        
                                if (
                                    !result.entities[entitiesData[entity.toString()].entityType]
                                ) {
                                    result.entities[entitiesData[entity.toString()].entityType] = [];
                                }
                        
                                let entityExternalId =  
                                entitiesData[entity.toString()]["metaInformation"]["externalId"];
                        
                                let entityIndex =  
                                result.entities[entitiesData[entity.toString()].entityType].findIndex(
                                    entity => entity.externalId === entityExternalId
                                );
                        
                                if ( entityIndex < 0 ) {

                                    let entityInformation =  _entityInformation(userDetails.entitiesData[entity.toString()]);
                                    entityInformation["solutions"] = [];

                                    result.entities[entitiesData[entity.toString()].entityType].push(entityInformation);
                                    
                                    entityIndex = 
                                    result.entities[entitiesData[entity.toString()].entityType].length -1 ;
                                }
                        
                                let solutionIndex = 
                                result.entities[entitiesData[entity.toString()].entityType][entityIndex].solutions.findIndex(
                                    solutionData => solutionData._id.toString() === solution._id.toString()
                                )
                        
                                if( solutionIndex < 0 ) {

                                    let solutionOrObservationInformation = 
                                    users[user].isObservation ? 
                                    _observationInformation(
                                        program,
                                        users[user],
                                        solution
                                    ) : _solutionInformation(program,solution);
                                    
                                    let submission;

                                    if( users[user].isObservation ) {
                                        submission = 
                                         _observationSubmissionInformation(
                                            observationSubmissions,
                                            users[user]._id,
                                            entity.toString()
                                        ) 
                                    } else {
                                        submission = 
                                        _submissionInformation(
                                            submissions,
                                            solution._id,
                                            entity
                                        );
                                    }

                                    let solutionData = {
                                        ...solutionOrObservationInformation,
                                        ...submission
                                    }

                                    result.entities[entitiesData[entity.toString()].entityType][entityIndex].solutions.push(
                                        solutionData
                                    );
                                }
                            }
                        });
                    }

                }

                return resolve({
                    message : 
                    messageConstants.apiResponses.USER_ENTITIES_FETCHED_SUCCESSFULLY,

                    result : result
                })

            } catch (error) {
                return reject(error);
            }
        })
    }

     /**
   * List of all private programs created by user
   * @method
   * @name privatePrograms
   * @param {string} userId - logged in user Id.
   * @returns {Array} - List of all private programs created by user.
   */

  static privatePrograms( userId ) {
    return new Promise(async (resolve, reject) => {
        try {

            let userPrivatePrograms = 
            await programsHelper.userPrivatePrograms(
                userId
            );

            return resolve({
                message : 
                messageConstants.apiResponses.PRIVATE_PROGRAMS_LIST,

                result : userPrivatePrograms
            })

        } catch (error) {
            return reject(error);
        }
    })
  }

};

  /**
   * Entity types .
   * @method
   * @name _entityTypesKeyValue - submission helper functionality
   * @param {Array} entities - list of entities.
   * @returns {Array} - Entity types key-value pair.
   */

  function _entityTypesKeyValue(entities) {

      let result = [];
    
      entities.forEach(entity => {
        
        let findEntityTypesIndex = 
        result.findIndex(
            type => type.key === entity.entityType
        );

        if( findEntityTypesIndex < 0 ) {
            
            result.push({
                "name" : gen.utils.camelCaseToTitleCase(entity.entityType),
                "key" : entity.entityType
            })
        }
      });
    
    return result;
  }

  /**
   * observations submissions data.
   * @method
   * @name _observationSubmissions - observations helper functionality
   * @param {Array} observationSubmissions - observation submissions.
   * @returns {Array} - observations submissions data.
   */

function _observationSubmissions(observationSubmissions) {

    let submissions = {};

    observationSubmissions.forEach(submission=>{
        
        if ( !submissions[submission.observationId.toString()] ) {
            submissions[submission.observationId.toString()] =  {};
        }

        if( !submissions[submission.observationId.toString()][submission.entityId.toString()] ) {
            submissions[submission.observationId.toString()][submission.entityId.toString()] = {};
            submissions[submission.observationId.toString()][submission.entityId.toString()]["submissions"] = [];
        }
            
        submissions[submission.observationId.toString()][submission.entityId.toString()]["submissions"].push(
            {
                "_id" : submission._id,
                "status" : submission.status,
                "submissionNumber" : submission.submissionNumber,
                "entityId" : submission.entityId,
                "createdAt" : submission.createdAt,
                "updatedAt" : submission.updatedAt,
                "observationName" : 
                submission.observationInformation && submission.observationInformation.name ? 
                submission.observationInformation.name : "",
                "observationId" : submission.observationId,
                "title" : submission.title,
                "submissionDate" : submission.completedDate ? submission.completedDate : "",
                "ratingCompletedAt" : submission.ratingCompletedAt ? submission.ratingCompletedAt : ""
            }
        );
    })

    return submissions;
}

  /**
   * observations submissions information.
   * @method
   * @name _observationSubmissionInformation - observations helper functionality
   * @param {Object} submissions - observation submissions key-value pair.
   * @param {String} observationId - solution internal id.
   * @param {String} entityId - entity internal id.
   * @returns {Object} - observations submissions information.
   */

function _observationSubmissionInformation(submissions,observationId,entityId) {
    return {
        totalSubmissionCount : 
        submissions[observationId] && submissions[observationId][entityId] && submissions[observationId][entityId].submissions.length > 0 ? 
        submissions[observationId][entityId].submissions.length  : 
        0,

        submissions : 
        submissions[observationId] && submissions[observationId][entityId] && submissions[observationId][entityId].submissions.length > 0 ? 
        submissions[observationId][entityId].submissions.slice(0,10) : 
        []

    };
}

  /**
   * list of submissions.
   * @method
   * @name _submissions
   * @param {Array} submissions - list of submissions.
   * @returns {Array} - submissions data.
   */

  function _submissions(submissions) {

    let submissionData = {};

    submissions.forEach(submission=>{
        
        if ( !submissionData[submission.solutionId.toString()] ) {
            submissionData[submission.solutionId.toString()] =  {};
        }

        if( !submissionData[submission.solutionId.toString()][submission.entityId.toString()] ) {
            submissionData[submission.solutionId.toString()][submission.entityId.toString()] = {};
            submissionData[submission.solutionId.toString()][submission.entityId.toString()]["submissions"] = [];
        }
            
        submissionData[submission.solutionId.toString()][submission.entityId.toString()]["submissions"].push(
            {
                submissionNumber : submission.submissionNumber,
                title : submission.title,
                _id : submission._id,
                status : submission.status,
                createdAt : submission.createdAt,
                updatedAt : submission.updatedAt,
                submissionDate : 
                submission.completedDate ? 
                submission.completedDate : ""
            }
        );
    })

    return submissionData;
}

/**
   * submissions information
   * @method
   * @name _submissionInformation
   * @param {Array} submissions - list of submissions.
   * @param {String} solutionId - solution id.
   * @param {String} entityId - entity id.
   * @returns {Array} - submissions data.
   */

function _submissionInformation(submissions,solutionId,entityId) {
    return {
        totalSubmissionCount : 
        submissions[solutionId] && submissions[solutionId][entityId] && submissions[solutionId][entityId].submissions.length > 0 ? 
        submissions[solutionId][entityId].submissions.length  : 
        0,

        submissions : 
        submissions[solutionId] && submissions[solutionId][entityId] && submissions[solutionId][entityId].submissions.length > 0 ? 
        submissions[solutionId][entityId].submissions.slice(0,10) : 
        []

    };
}

 /**
   * program information
   * @method
   * @name _programInformation - program information
   * @param {Object} program - program data.
   * @param {String} program._id - program internal id.
   * @param {String} program.name - program name.
   * @param {String} program.description - program description.
   * @returns {Object} - program information
   */

function _programInformation(program) {
    return {
        _id : program._id,
        name : program.name,
        externalId : program.externalId,
        description : program.description,
        solutions : []
    }
}

 /**
   * solution information
   * @method
   * @name _solutionInformation - program information
   * @param {Object} program - program data.
   * @param {String} program._id - program internal id.
   * @param {String} program.name - program name.
   * @param {Object} solution - solution data.
   * @param {String} solution.externalId - solution external id.
   * @param {String} solution._id - solution internal id.
   * @param {String} solution.name - solution name.
   * @param {String} solution.description - solution description.
   * @param {String} solution.type - solution type.
   * @param {String} solution.subType - solution subType.
   * @returns {Object} - solution information
   */

function _solutionInformation(program,solution) {
    return {
        programName : program.name,
        programId : program._id,
        _id : solution._id,
        name : solution.name,
        externalId : solution.externalId,
        description : solution.description,
        type : solution.type,
        subType : solution.subType,
        allowMultipleAssessemts : solution.allowMultipleAssessemts ? solution.allowMultipleAssessemts : false,
        showInHomeScreen : solution.showInHomeScreen ? solution.showInHomeScreen : false
    }
}

/**
   * observation information
   * @method
   * @name _observationInformation - observation information
   * @param {Object} program - program data.
   * @param {String} program._id - program internal id.
   * @param {String} program.name - program name.
   * @param {Object} observation - observation data.
   * @param {String} observation.externalId - observation external id.
   * @param {String} observation._id - observation internal id.
   * @param {String} observation.name - observation name.
   * @param {String} observation.description - observation description.
   * @returns {Object} - observation information
   */

function _observationInformation(program,observation,solution) {
    return {
        programName : program.name,
        programId : program._id,
        _id : observation._id,
        name : observation.name,
        externalId : observation.externalId,
        description : observation.description,
        type : solution.type,
        subType : solution.subType,
        solutionExternalId : solution.externalId,
        solutionId : solution._id
    }
}

/**
   * Entities data
   * @method
   * @name _entities - Entities data
   * @param {Array} entities - entities
   * @param {Object} entitiesData - entity internalId to data.
   * @param {String} solutionOrObservationId - solution or observation id.
   * @param {Object} submissions - submissions data.
   * @param {Object} [observation = false] - either observation submissions or submissions.
   * @returns {Array} - Entities data
   */

function _entities(
    entities,
    entitiesData,
    solutionOrObservationId,
    submissions,
    observation = false
) {

    let result = [];

    if( entities.length > 0 ) {

        entities.forEach(entityId=>{

            if( entitiesData[entityId.toString()] ) {
                
                let entityIndex = 
                result.findIndex(entity=>
                    entity.externalId === entitiesData[entityId.toString()].externalId
                );
        
                if( entityIndex < 0 ) {
        
                    let entityObj = _entityInformation(
                        entitiesData[entityId.toString()]
                    );
        
                    let submission;
        
                    if( observation ) {
        
                        submission = 
                        _observationSubmissionInformation(
                            submissions,
                            solutionOrObservationId,
                            entityId
                        );
        
                    } else {
                        submission =
                        _submissionInformation(
                            submissions,
                            solutionOrObservationId,
                            entityId
                        );
                    }
        
                    entityObj = {
                        ...entityObj,
                        ...submission
                    }
        
                    result.push(
                        entityObj
                    );
                }

            }
        })

    }

    return result;

}

 /**
   * entity information
   * @method
   * @name _entityInformation 
   * @param {Object} entityDetails - entity details key-value pair.
   * @returns {Object} - entity information
   */

function _entityInformation(entityDetails) {
    return {
        _id : entityDetails._id,
        name : entityDetails.metaInformation.name ? entityDetails.metaInformation.name : "",
        externalId : entityDetails.metaInformation.externalId,
        entityType : entityDetails.entityType
    }
}
