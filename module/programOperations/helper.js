const moment = require("moment");
const entityAssessorsTrackers = require(MODULES_BASE_PATH + "/entityAssessorTracker/helper");
module.exports = class programOperationsHelper {

  static constructResultObject(graphName, value, totalCount, userDetails, programName, queryParams) {
    return new Promise(async (resolve, reject) => {
      let reportOptions = await database.models.reportOptions.findOne({ name: graphName }).lean();
      let headers = reportOptions.results.sections[0].tabularData.headers.map(header => header.name)
      let data = value.map(singleValue => {
        let resultObject = {}
        headers.forEach(singleHeader => {
          resultObject[singleHeader] = singleValue[singleHeader];
        })
        return resultObject;
      })
      reportOptions.results.sections[0].data = data;
      reportOptions.results.sections[0].totalCount = totalCount;
      reportOptions.results.isShareable = (queryParams && queryParams.linkId) ? false : true;
      reportOptions.results.title = `Program Operations Report for ${programName}`;
      return resolve(reportOptions.results);
    })

  }

  static getEntities(userDetails, queryParams, pageSize, pageNo, pagination = false, assessorIds, solutionId) {
    return new Promise(async (resolve, reject) => {
      try {

        let queryObject = [
          { $project: { userId: 1, parentId: 1, name: 1, entities: 1, programId: 1, updatedAt: 1, solutionId: 1 } },
          { $match: { userId: userDetails.id, solutionId: ObjectId(solutionId) } },
          {
            $graphLookup: {
              from: 'entityAssessors',
              startWith: '$userId',
              connectFromField: 'userId',
              connectToField: 'parentId',
              maxDepth: 20,
              as: 'children'
            }
          },
          {
            $project: { entities: 1, userId: 1, "children.entities": 1, "children.userId": 1 }
          }
        ];

        let entityAssessorDocuments = await database.models.entityAssessors.aggregate(queryObject);

        if (entityAssessorDocuments.length < 1) {
          return resolve([]);
        }

        let userIds = [];

        if (assessorIds.length) {
          userIds = assessorIds;
        } else {
          userIds.push(entityAssessorDocuments[0].userId);

          entityAssessorDocuments[0].children.forEach(child => {
            userIds.push(child.userId)
          })

          userIds = _.uniq(userIds);
        }

        let entityIds = await entityAssessorsTrackers.filterByDate(queryParams, userIds, solutionId);

        entityIds = entityIds.map(entityId => entityId.toString());

        let entityObjectIds = _.uniq(entityIds).map(entityId => ObjectId(entityId));

        let entitisQueryObject = {};
        entitisQueryObject._id = { $in: entityObjectIds };

        _.merge(entitisQueryObject, this.getQueryObject(queryParams))

        let totalCount = database.models.entities.countDocuments(entitisQueryObject).exec();

        let filteredEntityDocument;

        let limitValue = (pagination == false) ? "" : pageSize;
        let skipValue = (pagination == false) ? "" : (pageSize * (pageNo - 1));

        filteredEntityDocument = database.models.entities.find(entitisQueryObject, { _id: 1, "metaInformation.name": 1, "metaInformation.externalId": 1 }).limit(limitValue).skip(skipValue).lean().exec();

        [filteredEntityDocument, totalCount] = await Promise.all([filteredEntityDocument, totalCount])

        let entityDocumentFilteredObject = filteredEntityDocument.map(entity => {
          return {
            id: entity._id,
            name: entity.metaInformation.name,
            externalId: entity.metaInformation.externalId
          }
        });

        return resolve({ result: entityDocumentFilteredObject, totalCount: totalCount });

      } catch (error) {
        return reject({
          status: error.status || 500,
          message: error.message || "Oops! Something went wrong!",
          errorObject: error
        });
      }
    })
  }

  static getQueryObject(requestQuery) {
    let queryObject = {};
    let queries = Object.keys(requestQuery);
    let filteredQueries = _.pullAll(queries, ['csv', 'fromDate', 'toDate', 'assessorName', 'linkId', 'ProgramId', 'solutionId']);

    filteredQueries.forEach(query => {
      if (query == "area") {
        queryObject["$or"] = [{ "metaInformation.zoneId": new RegExp(requestQuery.area, 'i') }, { "metaInformation.districtName": new RegExp(requestQuery.area, 'i') }];
      } else if (query == "schoolName") {
        queryObject["metaInformation.name"] = new RegExp(requestQuery.schoolName, 'i')
      } else if (query == "schoolTypes") {
        queryObject["metaInformation.types"] = new RegExp(requestQuery.schoolTypes, 'i')
      } else {
        if (requestQuery[query]) queryObject[`metaInformation.${query}`] = requestQuery[query];
      }
    })

    return queryObject;
  }

  static checkUserAuthorization(userDetails, solutionId) {
    let userRole = gen.utils.getUserRole(userDetails, true);
    if (userRole == "assessors") throw { status: 400, message: "You are not authorized to take this report." };
    if (userDetails.accessiblePrograms.length) {
      let userProgramExternalIds = userDetails.accessiblePrograms.find(solution => solution._id.toString() == solutionId);
      if (!userProgramExternalIds) throw { status: 400, message: "You are not part of this program." };
    }
    return
  }

  static sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  static getAssessmentCompletionPercentage(evidencesStatus) {
    let isSubmittedArray = evidencesStatus.filter(singleEvidencesStatus => singleEvidencesStatus.isSubmitted == true);
    return parseFloat(((isSubmittedArray.length / evidencesStatus.length) * 100).toFixed(2));
  }

  static getAverageTimeTaken(submissionData) {
    let result = submissionData.filter(data => data.status == 'completed');
    if (result.length) {
      let dayDifference = []
      result.forEach(singleResult => {
        let startedDate = moment(singleResult.createdAt);
        let completedDate = moment(singleResult.completedDate);
        dayDifference.push(completedDate.diff(startedDate, 'days'))
      })
      let averageTimeTaken = dayDifference.reduce((a, b) => a + b, 0) / dayDifference.length;
      return parseFloat(averageTimeTaken.toFixed(2))
    } else {
      return ''
    }
  }

  static getSubmissionByAssessor(assessorId, entitySubmissionMap, assessorEntityMap) {
    let assessorEntity = assessorEntityMap[assessorId].entities;
    let entitySubmissions = [];
    assessorEntity.forEach(entityId => {
      entitySubmissions.push(entitySubmissionMap[entityId.toString()])
    });
    return _.compact(entitySubmissions);
  }

};