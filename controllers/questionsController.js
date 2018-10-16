module.exports = class Questions extends Abstract {
  constructor(schema) {
    super(schema);
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
      let instanceQuestionsArray = [];
      let questions = await database.models.questions.find({
        _id: { $in: req.body.created }
      });
      async.forEach(
        questions,
        (question, cb1) => {
          if (question.instanceQuestions) {
            let ids = question.instanceQuestions.match(
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
                    instanceQuestionsArray.push(ques._id);
                    cb2();
                  },
                  error => {
                    database.models.questions
                      .updateOne(
                        { _id: question._id },
                        {
                          $set: {
                            instanceQuestionsArray: instanceQuestionsArray
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
};
