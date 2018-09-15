let ObjectId = require("mongoose").Types.ObjectId;

module.exports = class SchoolAssessments extends AbstractController {
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
        //           ] = await controllers.evaluationFrameworksController.mongoModel.findOne(
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
        await _.forEachRight(programs.data, async function(value, key) {
          await _.forEachRight(programs.data[key].components, async function(
            value,
            key2
          ) {
            if (
              programs.data[key].components[key2].type == "evaluationFramework"
            ) {
              let eF = await controllers.evaluationFrameworksController.mongoModel.findOne(
                {
                  _id: ObjectId(programs.data[key].components[key2].id)
                }
              );
              programs.data[key].components[key2][
                "evaluationFramework"
              ] = await eF;

              // return await programs;
              await _.forEachRight(eF.themes, async (theme, key3) => {
                await _.forEachRight(eF.themes[key3].aoi, async (aoi, key4) => {
                  await _.forEachRight(
                    eF.themes[key3].aoi[key4].indicators,
                    async (indicator, key6) => {
                      await _.forEachRight(
                        eF.themes[key3].aoi[key4].indicators[key6].criteria,
                        async (criteria, key7) => {
                          let criteriaData = await controllers.criteriasController.mongoModel.findOne(
                            {
                              _id: ObjectId(criteria)
                            }
                          );
                          console.log(key7, ":", criteria, criteriaData, {
                            _id: ObjectId(criteria)
                          });
                        }
                      );
                    }
                  );
                });
              });
            }
          });
        });
        // console.log(
        //   await controllers.criteriasController.mongoModel.findOne({
        //     _id: ObjectId("5b98f4069f664f7e1ae7498b")
        //   })
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
