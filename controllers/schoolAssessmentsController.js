module.exports = class SchoolAssessments extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "schoolAssessments";
  }

  async find(req) {
    return await controllers.programsController
      .find(req)
      .then(async programs => {
        // async.forEach(
        //   programs.data,
        //   async (program, cb1) => {
        //     async.forEach(
        //       program.components,
        //       async (component, cb2) => {
        //         if (component.type == "evaluationFramework") {
        //           component[
        //             "evaluationFramework"
        //           ] = await database.models["evaluation-frameworks"].findOne(
        //             {
        //               _id: ObjectId(component.id)
        //             }
        //           );
        //           await cb2();
        //         } else {
        //           await cb2();
        //         }
        //       },
        //       async error => {
        //         await cb1();
        //         console.log("2 Done");
        //       }
        //     );
        //   },
        //   error => {
        //     console.log("1 Done");
        //   }
        // );
        await _.forEachRight(programs.data, async function(program, key) {
          await _.forEachRight(programs.data[key].components, async function(
            component,
            key2
          ) {
            if (
              programs.data[key].components[key2].type == "evaluationFramework"
            ) {
              let eF = await database.models["evaluation-frameworks"].findOne({
                _id: ObjectId(programs.data[key].components[key2].id)
              });
              programs.data[key].components[key2][
                "evaluationFramework"
              ] = await eF;

              // return await programs;
              await _.forEachRight(
                programs.data[key].components[key2]["evaluationFramework"]
                  .themes,
                async (theme, key3) => {
                  await _.forEachRight(
                    programs.data[key].components[key2]["evaluationFramework"]
                      .themes[key3].aoi,
                    async (aoi, key4) => {
                      await _.forEachRight(
                        programs.data[key].components[key2][
                          "evaluationFramework"
                        ].themes[key3].aoi[key4].indicators,
                        async (indicator, key6) => {
                          indicator.criterias = await database.models.criterias.find();
                          await _.forEachRight(
                            indicator.criterias,
                            async (criteria, key7) => {
                              let i = indicator.criteria.indexOf(criteria._id);
                              if (i > -1) indicator.criteria[i] = criteria;
                              log.debug(criteria._id);

                              // let criteriaData = await database.models.criterias.findOne(
                              //   {
                              //     _id: ObjectId(criteria)
                              //   }
                              // );
                              // programs.data[key].components[key2][
                              //   "evaluationFramework"
                              // ].themes[key3].aoi[key4].indicators[
                              //   key6
                              // ].criteria[key7] = await criteriaData;
                              // console.log(key7, ":", criteria, criteriaData, {
                              //   _id: ObjectId(criteria)
                              // });
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          });
        });
        // req.query = "5b98f4069f664f7e1ae7498b";
        // console.log(
        await database.models["criterias"].findOne({
          _id: ObjectId("5b98f4069f664f7e1ae7498b")
        });
        // );
        // console.log(
        await database.models["criterias"].findOne({
          _id: ObjectId("5b98f3e19f664f7e1ae7498a")
        });
        // );
        // console.log(
        req.query = { _id: "5b98f3b19f664f7e1ae74988" };
        database.models["criterias"]
          .findById(ObjectId("5b98f3b19f664f7e1ae74988"))
          .then(data => {
            // console.log("asdfgh", data);
          })
          .catch(error => {
            // console.error("sdfghjkuytghutr4y:", error);
          });
        // );
        // req.query = await "5b98f.4069f664f7e1ae7498b";

        // req.query = {
        //   _id: ObjectId("5b98f4069f664f7e1ae7498b")
        // };
        // console.log("I am here", Object.keys(controllers.criteriasController));
        // await controllers.criteriasController.findOne(req)
        // await controllers.criteriasController.findById(req)

        return await programs;
      })
      .catch(error => {
        return error;
      });
  }
};
