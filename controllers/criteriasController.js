module.exports = class Criterias extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "criterias";
  }

  insert(req) {
    let qError = {},
      created = [];
    console.log("reached here!");
    return new Promise((resole, reject) => {
      return database.models.questions
        .find({ externalId: { $in: req.body.questionsExtId } })
        .then(result => {
          if (result.length) {
            return resole({
              message: "Questions Already Existed",
              status: 409,
              result: result
            });
          } else {
            delete req.body.questionsExtId;
            async.forEachOf(
              req.body.evidences,
              (evidence, k, cb1) => {
                console.log(evidence, k);

                async.forEachOf(
                  evidence.sections,
                  (section, j, cb2) => {
                    console.log(section, j);

                    async.forEachOf(
                      section.questions,
                      (question, i, cb3) => {
                        console.log(question, i);
                        if (Object.keys(question.visibleIf[0]).length <= 0) {
                          question.visibleIf = "";
                        }
                        if (question.file.required === false) {
                          question.file = "";
                        }
                        question.owner = req.userDetails.id;
                        database.models.questions
                          .create(question)
                          .then(result => {
                            req.body.evidences[k].sections[j].questions[i] =
                              result._id;
                            created.push(result._id);
                            cb3(null);
                          })
                          .catch(error => {
                            qError[question.externalId] = error.message;
                            cb3(error);
                          });
                      },
                      error => {
                        cb2(error);
                      }
                    );
                  },
                  error => {
                    cb1(error);
                  }
                );
              },
              error => {
                if (error) console.log(error);
                console.log("done", JSON.stringify(req.body.evidences, "", 4));
                if (Object.keys(qError).length) {
                  return database.models.questions
                    .deleteMany({
                      externalId: { $in: Object.keys(qError) }
                    })
                    .then(result => {
                      console.log(result, created, typeof created[0]);

                      return resole({
                        status: 400,
                        failed: qError,
                        message: "Criteria can not be created"
                      });
                    })
                    .catch(error => {
                      throw error;
                    });
                } else {
                  return controllers.questionsController
                    .populateChildQuestions({
                      body: { created: created }
                    })
                    .then(result => {
                      req.body.owner = req.userDetails.id;

                      return super
                        .insert(req)
                        .then(criteria => {
                          return resole(criteria);
                        })
                        .catch(error => {
                          return reject(error);
                        });
                    })
                    .catch(error => {
                      console.log(error);
                    });
                }

                // return resole(Object.assign(super.insert(req), { failed: error }));
              }
            );
          }
        })
        .catch(error => {
          throw error;
        });
    });
  }

  find(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    console.log();

    return super.find(req);
  }
  async getEvidence(req) {
    let criteria = await this.getCriterias(req);
    // log.debug(criteria);
    // return criteria;
    return new Promise(async function(resolve, reject) {
      let merged = {},
        query = [],
        sectionData = {};

      await criteria.forEach(function(value, i) {
        query.push({ _id: ObjectId(value) });
      });

      let criterias = await database.models.criterias.find({ $or: query });
      // log.debug(criterias);
      // if (Array.isArray(criterias)) {

      await _.forEachRight(criterias, async function(crit, i) {
        await crit.evidences.forEach(async function(evidence, i) {
          if (!merged[evidence.externalId]) {
            merged[evidence.externalId] = evidence;
          } else {
            log.debug("Already Done");
            merged[evidence.externalId] = Object.assign(
              merged[evidence.externalId],
              evidence
            );
            await _.forEachRight(evidence.sections, (section, i2) => {
              _.forEachRight(
                merged[evidence.externalId].sections,
                (Msection, mi2) => {
                  log.debug(
                    merged[evidence.externalId].sections.length,
                    evidence.sections.length
                  );
                  if (Msection.name == section.name) {
                    log.debug(
                      Msection.name,
                      "-----matched------>",
                      section.name
                    );
                    // log.debug(
                    //   merged[evidence.externalId].sections[mi2],
                    //   section
                    // );

                    merged[evidence.externalId].sections[mi2].questions.concat(
                      section.questions
                    );
                    log.debug(
                      evidence.externalId,
                      "######################################333",
                      merged[evidence.externalId].sections[mi2].questions,
                      "######################################",
                      section.questions
                    );
                  } else {
                    log.debug(
                      Msection.name,
                      "-----not matched------>",
                      section.name
                    );
                  }
                }
              );
            });
          }
        });
      });
      // }

      return resolve(Object.values(merged));
    });
  }

  async getCriteriasParentQuesAndInstParentQues(req) {
    return new Promise(async function(resolve, reject) {
      let criteriaQueryResult = await database.models.criterias.find(
        {},
        {
          _id: 1,
          externalId: 1,
          name: 1
        }
      );

      const questionQueryObject = {
        //responseType: "matrix"
      };
      let questionQueryResult = await database.models["questions"].find(
        questionQueryObject,
        {
          _id: 1,
          externalId: 1,
          name: 1
        }
      );

      let result = {
        criteria: criteriaQueryResult,
        questions: questionQueryResult
      };

      let responseMessage = "Fetched requested data successfully.";

      let response = { message: responseMessage, result: result };
      return resolve(response);
    }).catch(error => {
      reject(error);
    });
  }

  async addQuestion(req) {
    return new Promise(async function(resolve, reject) {
      let criterias = await database.models.criterias.find({});

      let questions = await database.models["questions"].find();

      console.log(criterias);
      console.log(questions);

      let result = {};
      let responseMessage = "Question added data successfully.";

      let response = { message: responseMessage, result: result };
      return resolve(response);
    }).catch(error => {
      reject(error);
    });
  }
};
