const csv = require("csvtojson");

module.exports = class Questions extends Abstract {
  constructor() {
    super(questionsSchema);
  }

  static get name() {
    return "questions";
  }

  insert(req) {
    return super.insert(req);
  }

  update(req) {
    return super.update(req);
  }

  find(req) {
    return super.find(req);
  }

  populateChildQuestions(req) {
    return new Promise(async (resolve, reject) => {
      let questions = await database.models.questions.find({
        _id: { $in: req.body.created }
      });
      async.forEach(
        questions,
        (question, cb1) => {
          async.forEachOf(
            question.children,
            (child, i, cb2) => {
              let index = questions.findIndex(que => {
                return que.externalId == child;
              });
              question.children[i] = questions[index]._id;
              database.models.questions
                .updateOne(
                  { _id: question._id },
                  { $set: { children: question.children } }
                )
                .then(questionUpdated => {
                  cb2();
                  // console.log(question, questions[index]._id, questionUpdated);
                })
                .catch(error => {
                  cb2();
                });
            },
            error => {
              cb1();
            }
          );
        },
        error => {
          return this.populateVisibleIfQuestions(req)
            .then(result => {
              return resolve({ message: "Done" });
            })
            .catch(error => {
              console.error(error);
              return reject(error);
            });
        }
      );
    });
  }

  populateVisibleIfQuestions(req) {
    return new Promise(async (resolve, reject) => {
      let questions = await database.models.questions.find({
        _id: { $in: req.body.created }
      });
      async.forEach(
        questions,
        (question, cb1) => {
          async.forEachOf(
            question.visibleIf,
            (obj, i, cb2) => {
              if (obj) {
                let index = questions.findIndex(que => {
                  return que.externalId == obj.externalId;
                });
                question.visibleIf[i]._id = questions[index]._id;
                database.models.questions
                  .updateOne(
                    { _id: question._id },
                    { $set: { visibleIf: question.visibleIf } }
                  )
                  .then(questionUpdated => {
                    cb2();
                    // console.log(question, questions[index]._id, questionUpdated);
                  })
                  .catch(error => {
                    cb2();
                  });
              } else {
                cb2();
              }
            },
            error => {
              cb1();
            }
          );
        },
        error => {
          return this.populateInstanceQuestions(req)
            .then(result => {
              return resolve({ message: "Done" });
            })
            .catch(error => {
              console.error(error);
              return reject(error);
            });
        }
      );
    });
  }

  populateInstanceQuestions(req) {
    return new Promise(async (resolve, reject) => {
      let instanceQuestions = [];
      let questions = await database.models.questions.find({
        _id: { $in: req.body.created }
      });
      async.forEach(
        questions,
        (question, cb1) => {
          if (question.instanceQuestionsString) {
            let ids = question.instanceQuestionsString.match(
              /(?=\S)[^,]+?(?=\s*(,|$))/g
            );
            database.models.questions
              .find({
                externalId: { $in: ids }
              })
              .then(instanceQuestion => {
                console.log(instanceQuestion);

                async.forEach(
                  instanceQuestion,
                  (ques, cb2) => {
                    instanceQuestions.push(ques._id);
                    cb2();
                  },
                  error => {
                    database.models.questions
                      .updateOne(
                        { _id: question._id },
                        {
                          $set: {
                            instanceQuestions: instanceQuestions
                          }
                        }
                      )
                      .then(result => {
                        cb1();
                      })
                      .catch(error => {
                        cb1();
                      });
                  }
                );
              })
              .catch(error => {
                cb1();
              });
          } else {
            cb1();
          }
        },
        error => {
          return resolve({ message: "Done" });
        }
      );
    });
  }
  

  async upload(req) {

    return new Promise(async (resolve, reject) => {

      try {
        let questionData = await csv().fromString(req.files.questions.data.toString());

        questionData = await Promise.all(questionData.map(async (question) => {
          if(question.externalId && question.isAGeneralQuestion) {
            question = await database.models.questions.findOneAndUpdate(
              { externalId: question.externalId },
              { $set: { isAGeneralQuestion: (question.isAGeneralQuestion === "TRUE") ? true : false } },
              {
                returnNewDocument : true
              }
            );
            return question
          } else {
            return;
          }
        }));
        

        if (questionData.findIndex( question => question === undefined || question === null) >= 0) {
          throw "Something went wrong, not all records were inserted/updated."
        }

        let responseMessage = "Questions updated successfully."

        let response = { message: responseMessage };

        return resolve(response);

      } catch (error) {
        return reject({
          status:500,
          message:error,
          errorObject: error
        });
      }

    })
  }


};
