module.exports = class Schools extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "schools";
  }

  async addFields(obj, notEditable = [], notVisible = []) {
    await _.forEach(Object.keys(obj), key => {
      if (notVisible.indexOf(key) < 0) {
        obj[key] = {
          label: key,
          value: obj[key],
          editable: notEditable.indexOf(key) > -1 ? false : true,
          input: "text"
        };
      }
    });

    return obj;
  }

  insert(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    return super.insert(req);
  }

  async assessments(req) {
    let response = {
      message: "Assessment fetched successfully",
      result: {}
    };

    // return response;

    return new Promise(async (resolve, reject) => {
      let school = await database.models.schools.findOne({
        _id: ObjectId(req.params._id)
      });
      log.debug(school);
      response.result.profile = school.form;
      // delete (await response.result.form);

      response.result.programs = await database.models.programs.find();
      await _.forEachRight(response.result.programs, value => {
        value.resourceType = undefined;
        value.language = undefined;
        value.keywords = undefined;
        value.concepts = undefined;
        value.createdFor = undefined;
        value.deleted = undefined;
        value.isDeleted = undefined;
        value.externalId = undefined;
        value.owner = undefined;
        value.createdAt = undefined;
        value.updatedAt = undefined;
        value.createdBy = undefined;
        value.updatedBy = undefined;
      });

      // log.debug(response.result.profile);
      response.result.profile = await _.pick(school, ["_id", "form"]);

      // response.result.profile = await this.addFields(
      //   response.result.profile,
      //   ["gpsLocation"],
      //   ["_id", "externalId"]
      // );

      return resolve(response);
    });
  }

  find(req) {
    return super.find(req);
  }
};

// await async.waterfall(
//   [
//     cb1 => {
//       cb1(null, "1");
//     },
//     (data, cb2) => {
//       cb2(null, "a");
//     },
//     (data, cb3) => {
//       cb3(null, "A");
//     }
//   ],
//   function(error, success) {
//     if (error) {
//       log.debug("Something is wrong!");
//     }
//     response = {
//       message: "Assessment fetched successfully",
//       result: success
//     };
//   }
// );
