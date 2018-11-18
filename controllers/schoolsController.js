const csv = require("csvtojson");

module.exports = class Schools extends Abstract {
  constructor(schema) {
    super(schema);
    this.roles = {
      ASSESSOR: "assessors",
      LEAD_ASSESSOR: "leadAssessors",
      PROJECT_MANAGER: "projectManagers",
      PROGRAM_MANAGER: "programManagers"
    };
  }

  async getRoll(roles) {
    let role = _.intersection(roles, Object.keys(this.roles))[0];
    return this.roles[role];
  }

  static get name() {
    return "schools";
  }

  async upload (req) {

    return new Promise(async (resolve, reject) => {

      try {
        let schoolsData = await csv().fromString(req.files.schools.data.toString());
        const schoolsUploadCount = schoolsData.length

        let programQueryList = {}
        let evaluationFrameworkQueryList = {}

        schoolsData.forEach(school => {
          programQueryList[school.externalId] = school.programId
          evaluationFrameworkQueryList[school.externalId] = school.frameworkId
        });

        let programsFromDatabase = await database.models.programs.find({
          externalId : { $in: Object.values(programQueryList) }
        });

        let evaluationFrameworksFromDatabase = await database.models["evaluation-frameworks"].find({
          externalId : { $in: Object.values(evaluationFrameworkQueryList) }
        }, {
          externalId: 1
        });

        const programsData = programsFromDatabase.reduce( 
          (ac, program) => ({...ac, [program.externalId]: program }), {} )

        const evaluationFrameworksData = evaluationFrameworksFromDatabase.reduce( 
            (ac, evaluationFramework) => ({...ac, [evaluationFramework.externalId]: evaluationFramework._id }), {} )

        const schoolUploadedData = await Promise.all(schoolsData.map(async (school) => {
          
          school.schoolTypes = await school.schoolType.split(",");
          school.createdBy = school.updatedBy = req.userDetails.id;
          school.gpsLocation = "";
          const schoolCreateObject = await database.models.schools.findOneAndUpdate(
            { externalId: school.externalId },
            school,
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              returnNewDocument : true
            }
          );

          return {
            _id:schoolCreateObject._id,
            externalId:school.externalId,
            programId:school.programId,
            frameworkId:school.frameworkId
          }

        }));

        if(schoolsUploadCount === schoolUploadedData.length) {

          let schoolElement = new Object;
          let indexOfEvaluationFrameworkInProgram
          let schoolProgramComponents = new Array
          let programFrameworkSchools = new Array
          let schoolCsvDataProgramId
          let schoolCsvDataEvaluationFrameworkId

          for (let schoolIndexInData = 0; schoolIndexInData < schoolUploadedData.length; schoolIndexInData++) {
            schoolElement = schoolUploadedData[schoolIndexInData];
            
            schoolCsvDataProgramId = programQueryList[schoolElement.externalId] 
            schoolCsvDataEvaluationFrameworkId = evaluationFrameworkQueryList[schoolElement.externalId] 
            schoolProgramComponents = programsData[schoolCsvDataProgramId].components
            indexOfEvaluationFrameworkInProgram = schoolProgramComponents.findIndex( component => component.id.toString() === evaluationFrameworksData[schoolCsvDataEvaluationFrameworkId].toString() );
            
            if(indexOfEvaluationFrameworkInProgram >= 0) {
              programFrameworkSchools = schoolProgramComponents[indexOfEvaluationFrameworkInProgram].schools
              if (programFrameworkSchools.findIndex( school => school.toString() == schoolElement._id.toString()) < 0) {
                programFrameworkSchools.push(ObjectId(schoolElement._id.toString()))
              }
            }

          }

          await Promise.all(Object.values(programsData).map(async (program) => {

            let queryObject = {
              _id: ObjectId(program._id.toString())
            }
            let updateObject = {}

            updateObject.$set = {
              ["components"]: program.components
            }

            await database.models.programs.findOneAndUpdate(
              queryObject,
              updateObject
            );

            return
          }));

        } else {
          throw "Something went wrong, not all records were inserted/updated."
        }

        let responseMessage = "School record created successfully."

        let response = { message: responseMessage };

        return resolve(response);

      } catch (error) {
        return reject({message:error});
      }

    })
  }


  find(req) {
    req.query.fields = ["name", "externalId"];
    return super.find(req);
  }

  async assessments(req) {
    return new Promise(async (resolve, reject) => {

      try {
        
        req.body = req.body || {};
        let response = { message: "Assessment fetched successfully", result: {} };

        let schoolQueryObject = { _id: ObjectId(req.params._id) };
        let schoolDocument = await database.models.schools.findOne(
          schoolQueryObject
        );
        schoolDocument = await schoolDocument.toObject();

        let programQueryObject = {
          status: "active",
          "components.schools": { $in: [ObjectId(req.params._id)] },
          $or: [
            { "components.roles.assessors.users": { $in: [req.userDetails.id] } },
            {
              "components.roles.leadAssessors.users": {
                $in: [req.userDetails.id]
              }
            },
            {
              "components.roles.projectManagers.users": {
                $in: [req.userDetails.id]
              }
            }
          ]
        };
        let programDocument = await database.models.programs.findOne(
          programQueryObject
        );

        let schoolProfileFormFields = [];
        let accessability =
          programDocument.components[0].roles[
            await this.getRoll(req.userDetails.allRoles)
          ].acl;

        let form = [];
        await _.forEach(Object.keys(schoolDocument), key => {
          // log.debug(accessability.schoolProfile.editable.indexOf("all"));
          // log.debug(accessability.schoolProfile);
          if (
            ["deleted", "_id", "__v", "createdAt", "updatedAt"].indexOf(key) == -1
          ) {
            // log.debug(key);
            form.push({
              field: key,
              label: gen.utils.camelCaseToTitleCase(key),
              value: Array.isArray(schoolDocument[key])
                ? schoolDocument[key].join(", ")
                : schoolDocument[key],
              visible:
                accessability.schoolProfile.visible.indexOf("all") > -1 ||
                accessability.schoolProfile.visible.indexOf(key) > -1,
              editable:
                accessability.schoolProfile.editable.indexOf("all") > -1 ||
                accessability.schoolProfile.editable.indexOf(key) > -1,
              input: "text"
            });
          }
        });
        response.result.schoolProfile = {
          _id: schoolDocument._id,
          // isEditable: accessability.schoolProfile.editable.length > 0,
          form: form
        };

        response.result.program = await _.pick(programDocument, [
          "_id",
          "externalId",
          "name",
          "description",
          "imageCompression"
        ]);

        let schoolAssessorHierarchyObject = [
          {
            $match: { userId: req.userDetails.id, programId: programDocument._id }
          },
          {
            $graphLookup: {
              from: "school-assessors", // Use the school-assessors collection
              startWith: "$parentId", // Start looking at the document's `parentId` property
              connectFromField: "parentId", // A link in the graph is represented by the parentId property...
              connectToField: "userId", // ... pointing to another assessor's _id property
              maxDepth: 2, // Only recurse one level deep
              as: "connections" // Store this in the `connections` property
            }
          }
        ];

        let userHierarchyDocument = await database.models[
          "school-assessors"
        ].aggregate(schoolAssessorHierarchyObject);
        userHierarchyDocument[0].connections.forEach(connection => {
          if (connection.role === "PROJECT_MANAGER") {
            response.result.program.projectManagers = _.pick(connection, [
              "userId",
              "externalId"
            ]);
          }
          if (connection.role === "LEAD_ASSESSOR") {
            response.result.program.leadAssessors = _.pick(connection, [
              "userId",
              "externalId"
            ]);
          }
        });

        let submissionDocument = {
          schoolId: schoolDocument._id,
          programId: programDocument._id,
          evidenceSubmissions: [],
          schoolProfile: {},
          status: "started"
        };
        let assessments = [];
        for (
          let counter = 0;
          counter < programDocument.components.length;
          counter++
        ) {
          let component = programDocument.components[counter];
          let assessment = {};

          let evaluationFrameworkQueryObject = [
            { $match: { _id: ObjectId(component.id) } },
            {
              $lookup: {
                from: "criteria-questions",
                localField: "themes.aoi.indicators.criteria",
                foreignField: "_id",
                as: "criteriaDocs"
              }
            }
          ];

          let evaluationFrameworkDocument = await database.models[
            "evaluation-frameworks"
          ].aggregate(evaluationFrameworkQueryObject);

          assessment.name = evaluationFrameworkDocument[0].name;
          assessment.description = evaluationFrameworkDocument[0].description;
          assessment.externalId = evaluationFrameworkDocument[0].externalId;

          let evidenceMethodArray = {};
          let submissionDocumentEvidences = {};
          let submissionDocumentCriterias = [];

          evaluationFrameworkDocument[0].criteriaDocs.forEach(criteria => {
            submissionDocumentCriterias.push(
              _.omit(criteria, [
                "resourceType",
                "language",
                "keywords",
                "concepts",
                "createdFor",
                "evidences"
              ])
            );
            criteria.evidences.forEach(evidenceMethod => {
              evidenceMethod.notApplicable = false
              if (!evidenceMethodArray[evidenceMethod.externalId] && evidenceMethod.modeOfCollection === "onfield") {
                evidenceMethodArray[evidenceMethod.externalId] = evidenceMethod;
                submissionDocumentEvidences[evidenceMethod.externalId] = _.omit(
                  evidenceMethod,
                  ["sections"]
                );
              } else if (evidenceMethod.modeOfCollection === "onfield") {
                // Evidence method already exists
                // Loop through all sections reading evidence method
                evidenceMethod.sections.forEach(evidenceMethodSection => {
                  let sectionExisitsInEvidenceMethod = 0;
                  let existingSectionQuestionsArrayInEvidenceMethod = [];
                  evidenceMethodArray[evidenceMethod.externalId].sections.forEach(
                    exisitingSectionInEvidenceMethod => {
                      if (
                        exisitingSectionInEvidenceMethod.name ==
                        evidenceMethodSection.name
                      ) {
                        sectionExisitsInEvidenceMethod = 1;
                        existingSectionQuestionsArrayInEvidenceMethod =
                          exisitingSectionInEvidenceMethod.questions;
                      }
                    }
                  );
                  if (!sectionExisitsInEvidenceMethod) {
                    evidenceMethodArray[evidenceMethod.externalId].sections.push(
                      evidenceMethodSection
                    );
                  } else {
                    evidenceMethodSection.questions.forEach(
                      questionInEvidenceMethodSection => {
                        existingSectionQuestionsArrayInEvidenceMethod.push(
                          questionInEvidenceMethodSection
                        );
                      }
                    );
                  }
                });
              } else if (evidenceMethod.modeOfCollection === "oncall") {
                submissionDocumentEvidences[evidenceMethod.externalId] = _.omit(
                  evidenceMethod,
                  ["sections"]
                );
              }
            });
          });

          submissionDocument.evidences = submissionDocumentEvidences;
          submissionDocument.criterias = submissionDocumentCriterias;
          let submissionDoc = await controllers.submissionsController.findSubmissionBySchoolProgram(
            submissionDocument
          );
          assessment.submissionId = submissionDoc.result._id;

          const parsedAssessment = await this.parseQuestions(
            Object.values(evidenceMethodArray),
            schoolDocument.schoolTypes,
            submissionDoc.result.evidences
          );

          assessment.evidences = parsedAssessment.evidences
          assessment.submissions = parsedAssessment.submissions
          assessments.push(assessment);
        }

        response.result.assessments = assessments;

        return resolve(response);
      } catch (error) {
        return reject({
          status:500,
          message:"Oops! Something went wrong!",
          errorObject: error
        });
      }
    })
  }

  async parseQuestions(evidences, schoolTypes, submissionDocEvidences) {

    let schoolFilterQuestionArray = {}
    let sectionQuestionArray = {}
    let questionArray = {}
    let submissionsObjects = {}
    evidences.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)); 

    evidences.forEach(evidence => {

      evidence.startTime = submissionDocEvidences[evidence.externalId].startTime
      evidence.endTime = submissionDocEvidences[evidence.externalId].endTime
      evidence.isSubmitted = submissionDocEvidences[evidence.externalId].isSubmitted
      if(submissionDocEvidences[evidence.externalId].submissions) {
        submissionDocEvidences[evidence.externalId].submissions.forEach(submission => {
          if(submission.isValid) {
            submissionsObjects[evidence.externalId] = submission
          }
        }) 
      }
      
      evidence.sections.forEach(section => {
        section.questions.forEach((question,index,section) => {
          if(_.difference(question.questionGroup, schoolTypes).length < question.questionGroup.length) {
            sectionQuestionArray[question._id] = section
            questionArray[question._id] = question
          } else {
            schoolFilterQuestionArray[question._id] = section
          }
        })
      })
    })
    
    Object.entries(schoolFilterQuestionArray).forEach(schoolFilteredQuestion => {
      schoolFilteredQuestion[1].forEach((questionElm,questionIndexInSection) => {
        if(questionElm._id.toString() === schoolFilteredQuestion[0]) {
          schoolFilteredQuestion[1].splice(questionIndexInSection,1)
        }
      })
    })


    Object.entries(questionArray).forEach(questionArrayElm => {

      questionArrayElm[1]["payload"] = {
        criteriaId:questionArrayElm[1]["criteriaId"],
        responseType:questionArrayElm[1]["responseType"]
      }
      delete questionArrayElm[1]["criteriaId"]

      if(questionArrayElm[1].responseType === "matrix") {
        let instanceQuestionArray = new Array()
        questionArrayElm[1].instanceQuestions.forEach(instanceQuestionId => {
          if(sectionQuestionArray[instanceQuestionId.toString()]) {
            let instanceQuestion = questionArray[instanceQuestionId.toString()]
            instanceQuestionArray.push(instanceQuestion)
            let sectionReferenceOfInstanceQuestion = sectionQuestionArray[instanceQuestionId.toString()]
            sectionReferenceOfInstanceQuestion.forEach((questionInSection,index) => {
              if(questionInSection._id.toString() === instanceQuestionId.toString()) {
                sectionReferenceOfInstanceQuestion.splice(index,1)
              }
            })
          }
        })
        questionArrayElm[1]["instanceQuestions"] = instanceQuestionArray
      }

    });
    return {
      evidences: evidences,
      submissions: submissionsObjects
    };
  }

};
