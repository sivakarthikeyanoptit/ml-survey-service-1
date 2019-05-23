
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

  static getSchools(req, pagination = false, assessorIds) {
    return new Promise(async (resolve, reject) => {
      try {

        let programDocument = await this.getProgram(req.params._id);

        let queryObject = [
          { $project: { userId: 1, parentId: 1, name: 1, schools: 1, programId: 1, updatedAt: 1 } },
          { $match: { userId: req.userDetails.id, programId: programDocument._id } },
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

        let entityAssessorsTrackers = new entityAssessorsTrackersBaseController;

        let schoolIds = await entityAssessorsTrackers.filterByDate(req.query, userIds, programDocument._id);

        schoolIds = schoolIds.map(schoolId=>schoolId.toString());

        let entityObjectIds = _.uniq(schoolIds).map(schoolId => ObjectId(schoolId));

        let entitisQueryObject = {};
        entitisQueryObject._id = { $in: entityObjectIds };

        _.merge(entitisQueryObject, this.getQueryObject(req.query))

        let totalCount = database.models.entities.countDocuments(entitisQueryObject).exec();
        
        let filteredEntityDocument;

        let limitValue = (pagination == false) ? "" : req.pageSize;
        let skipValue = (pagination == false) ? "" : (req.pageSize * (req.pageNo - 1));

        filteredEntityDocument = database.models.entities.find(entitisQueryObject, { _id: 1, "metaInformation.name": 1, "metaInformation.externalId": 1 }).limit(limitValue).skip(skipValue).lean().exec();

        [filteredEntityDocument, totalCount] = await Promise.all([filteredEntityDocument, totalCount])

        let schoolDocumentFilteredObject = filteredEntityDocument.map(school => {
          return {
            id: school._id,
            name: school.name,
            externalId: school.externalId
          }
        });

        return resolve({ result: schoolDocumentFilteredObject, totalCount: totalCount });

      } catch (error) {
        return reject({
          status: error.status || 500,
          message: error.message || "Oops! Something went wrong!",
          errorObject: error
        });
      }
    })
  }

  static getProgram(programExternalId, needEntities = true) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!programExternalId)
          throw { status: 400, message: 'Program id required.' }

        let programDocument = await database.models.programs.findOne({ externalId: programExternalId }, {
          name: 1, components: 1
        }).lean();

        if (!programDocument) {
          throw { status: 400, message: 'Program not found for given params.' }
        }

        if (needEntities) {

          let solutionDocument = await database.models.solutions.find({ _id: programDocument.components }, {
            "entities": 1
          }).lean();

          programDocument["entities"] = _.flattenDeep(solutionDocument.map(solution => solution.entities))

        }

        return resolve(programDocument);


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
    let filteredQueries = _.pullAll(queries, ['csv', 'fromDate', 'toDate', 'assessorName', 'linkId', 'ProgramId']);

    filteredQueries.forEach(query => {
      if (query == "area") {
        queryObject["$or"] = [{ zoneId: new RegExp(requestQuery.area, 'i') }, { districtName: new RegExp(requestQuery.area, 'i') }];
      } else if (query == "schoolName") {
        queryObject["name"] = new RegExp(requestQuery.schoolName, 'i')
      } else {
        if (requestQuery[query]) queryObject[query] = requestQuery[query];
      }
    })
    return queryObject;
  }

  static checkUserAuthorization(userDetails, programExternalId) {
    let userRole = gen.utils.getUserRole(userDetails, true);
    if (userRole == "assessors") throw { status: 400, message: "You are not authorized to take this report." };
    if (userDetails.accessiblePrograms.length) {
      let userProgramExternalIds = userDetails.accessiblePrograms.map(program => program.programExternalId);
      if (!userProgramExternalIds.includes(programExternalId)) throw { status: 400, message: "You are not part of this program." };
    }
    return
  }

  static sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

};