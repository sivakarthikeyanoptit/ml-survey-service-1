module.exports = class Schools extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "schools";
  }

  async userFiledFilter(req, obj) {
    // log.debug(req.userDetails.allRoles);
    await _.forEach(Object.keys(obj.form), key => {
      // log.debug(obj.form[key].visibileTo);
      obj.form[key].visibile =
        obj.form[key].visibileTo.filter(
          value => -1 !== req.userDetails.allRoles.indexOf(value)
        ).length > 0;
      obj.form[key].editable =
        obj.form[key].editableBy.filter(
          value => -1 !== req.userDetails.allRoles.indexOf(value)
        ).length > 0;

      obj.form[key].visibileTo = undefined;
      obj.form[key].editableBy = undefined;
      obj.form[key].input = "text";
    });

    obj.formFields = await obj.form;
    obj.form = undefined;

    return obj;
  }

  async schoolArrayToObject(array) {
    let objs = {};
    await _.forEachRight(array, obj => {
      objs[obj.field] = obj;
    });
    return objs;
  }

  insert(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    return super.insert(req);
  }

  async assessments(req) {
    req.body = req.body || {};
    let response = {
      message: "Assessment fetched successfully",
      result: {}
    };

    // return response;

    return new Promise(async (resolve, reject) => {
      let school = await database.models.schools.findOne({
        _id: ObjectId(req.params._id)
      });
      response.result.SchoolProfile = await _.pick(school, ["_id", "form"]);

      response.result.SchoolProfile = await this.userFiledFilter(
        req,
        response.result.SchoolProfile
      );
      req.body._id = "5b98d7b6d4f87f317ff615ee";
      response.result.program = await controllers.programsController.getProgram(
        req
      );
      req.body.evaluationFramework =
        response.result.program.evaluationFramework;
      response.result.assessments = await controllers.criteriasController.getEvidence(
        req
      );
      response.result.program.evaluationFramework = undefined;
      response.result.program.components = undefined;
      return resolve(response);
    });
  }

  find(req) {
    return super.find(req);
  }


  async fetchAssessments(req) {

    return new Promise(async (resolve, reject) => {

      req.body = req.body || {};
      let response = {
        message: "Assessment fetched successfully",
        result: {}
      };

      let schoolQueryObject = {
        _id: ObjectId(req.params._id)
      }
      let schoolDocument = await database.models.schools.findOne(schoolQueryObject);
      
      let schoolProfileFormFields = []
      schoolDocument.form.forEach(formField => {
            schoolProfileFormFields.push({
              field : formField.field,
              label : formField.label,
              value : formField.value,
              visibile : (_.difference(formField.visibileTo, req.userDetails.allRoles).length < formField.visibileTo.length) ? true :false,
              editable : (_.difference(formField.editableBy, req.userDetails.allRoles).length < formField.editableBy.length) ? true :false,
              input : "text"
            })
      })

      response.result.schoolProfile = {
        "_id":schoolDocument._id,
        form:schoolProfileFormFields
      }

      let programQueryObject = {
        status: "active",
        "components.schools": {$in:[ObjectId(req.params._id)]},
        $or:[
          {"components.users.assessors":{$in:[req.userDetails.id]}},
          {"components.users.leadAssessors":{$in:[req.userDetails.id]}},
          {"components.users.projectManagers":{$in:[req.userDetails.id]}}
        ]
      }
      let programDocument = await database.models.programs.findOne(programQueryObject);
      response.result.program = _.pick(programDocument,["_id","externalId","name","description"])

      let schoolAssessorHierarchyObject = [
        { $match: { userId: req.userDetails.id, programId: programDocument._id} },
        {
          $graphLookup: {
            from: 'school-assessors', // Use the school-assessors collection
            startWith: '$parentId', // Start looking at the document's `parentId` property
            connectFromField: 'parentId', // A link in the graph is represented by the parentId property...
            connectToField: '_id', // ... pointing to another assessor's _id property
            maxDepth: 2, // Only recurse one level deep
            as: 'connections' // Store this in the `connections` property
          }
        }
      ]

      let userHierarchyDocument = await database.models["school-assessors"].aggregate(schoolAssessorHierarchyObject)
      userHierarchyDocument[0].connections.forEach(connection => {
        if(connection.role === 'PROJECT_MANAGER') {
          response.result.program.projectManagers = _.pick(connection,["userId","externalId"])
        }
        if(connection.role === 'LEAD_ASSESSOR') {
          response.result.program.leadAssessors = _.pick(connection,["userId","externalId"])
        }
      })

      let evaluationFrameworkQueryObject = [
        { $match: { _id: ObjectId("5b98fa069f664f7e1ae7498c")} },
        {
          $lookup:
             {
                from: "criterias",
                localField: "themes.aoi.indicators.criteria",
                foreignField: "_id",
                as: "criteriaDocs"
            }
        }
      ]
      
      let evaluationFrameworkDocument = await database.models["evaluation-frameworks"].aggregate(evaluationFrameworkQueryObject)

      let evidenceMethodArray = {}
      evaluationFrameworkDocument[0].criteriaDocs.forEach(criteria => {
        criteria.evidences.forEach(evidenceMethod => {
          if(!evidenceMethodArray[evidenceMethod.externalId]) {
            evidenceMethodArray[evidenceMethod.externalId] = evidenceMethod
          } else {
            // Evidence method already exists
            // Loop through all sections reading evidence method
            evidenceMethod.sections.forEach(evidenceMethodSection => {
              let sectionExisitsInEvidenceMethod = 0
              let existingSectionQuestionsArrayInEvidenceMethod = []
              evidenceMethodArray[evidenceMethod.externalId].sections.forEach( exisitingSectionInEvidenceMethod => {
                if (exisitingSectionInEvidenceMethod.name == evidenceMethodSection.name) {
                  sectionExisitsInEvidenceMethod = 1
                  existingSectionQuestionsArrayInEvidenceMethod = exisitingSectionInEvidenceMethod.questions
                }
              })
              if(!sectionExisitsInEvidenceMethod) {
                evidenceMethodArray[evidenceMethod.externalId].sections.push(evidenceMethodSection)
               } else {
                evidenceMethodSection.questions.forEach(questionInEvidenceMethodSection => {
                  existingSectionQuestionsArrayInEvidenceMethod.push(questionInEvidenceMethodSection)
                })
              }
            })
          }
        })
      })
      //response.result.evaluationFramework = evaluationFrameworkDocument

      response.result.temp = evidenceMethodArray
      // response.result.assessments = await controllers.criteriasController.getEvidence(
      //   req
      // );
      // response.result.program.evaluationFramework = undefined;
      // response.result.program.components = undefined;
      return resolve(response);
    }).catch(error => {
      reject(error)
    });
  }

};
