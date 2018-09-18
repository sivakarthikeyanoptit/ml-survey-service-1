module.exports = class SchoolAssessments extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "schoolAssessments";
  }

  async find(req) {
    return new Promise(async (resolve, reject) => {
      let programs = await controllers.programsController.find(req);
      async.forEachOf(
        programs.data,
        (program, key1, cb1) => {
          async.forEachOf(
            programs.data[key1].components,
            (component, key2, cb2) => {
              if (
                programs.data[key1].components[key2].type ==
                "evaluationFramework"
              ) {
                database.models["evaluation-frameworks"]
                  .findOne({
                    _id: ObjectId(programs.data[key1].components[key2].id)
                  })
                  .then(eF => {
                    programs.data[key1].components[
                      key2
                    ].evaluationFramework = eF;
                    async.forEachOf(
                      eF.themes,
                      (theme, key3, cb3) => {
                        // log.debug(theme, key3);
                        async.forEachOf(
                          theme.aoi,
                          (aoi, key4, cb4) => {
                            // log.debug(aoi, key4);
                            async.forEachOf(
                              theme.aoi,
                              (aoi, key4, cb4) => {
                                // log.debug(aoi, key4);
                                async.forEachOf(
                                  aoi.indicators,
                                  (indicator, key5, cb5) => {
                                    // log.debug(indicator, key5);
                                    async.forEachOf(
                                      indicator.criteria,
                                      (criteria, key6, cb6) => {
                                        // log.debug(criteria, key6);
                                        database.models.criterias
                                          .findById(criteria)
                                          .then(criteriaDetails => {
                                            programs.data[key1].components[
                                              key2
                                            ].evaluationFramework.themes[
                                              key3
                                            ].aoi[key4].indicators[
                                              key5
                                            ].criteria[key6] = criteriaDetails;
                                            cb6(null);
                                          })
                                          .catch(error => {
                                            cb6(null);
                                          });
                                      },
                                      error => {
                                        cb5(null);
                                      }
                                    );
                                  },
                                  error => {
                                    cb4(null);
                                  }
                                );
                              },
                              error => {
                                cb3(null);
                              }
                            );
                          },
                          error => {
                            cb3(null);
                          }
                        );
                      },
                      error => {
                        cb2(null);
                      }
                    );
                  })
                  .catch(error => {
                    log.error(error);
                    cb3(null);
                  });
              } else {
                cb2(null);
              }
            },
            error => {
              // log.debug("Second");
              cb1(null);
            }
          );
        },
        error => {
          // log.debug("First");
          return resolve(programs);
        }
      );
    });
  }
};
