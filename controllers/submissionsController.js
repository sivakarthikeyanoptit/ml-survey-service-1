module.exports = class Submission extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "submissions";
  }
  insert(req) {
    return super.insert(req);
  }
  async findBySchoolProgram(req) {
    var query = {},
      update = req.body,
      options = { upsert: true, new: true, setDefaultsOnInsert: true };
console.log(update)
    let result = await database.models.submissions.findOneAndUpdate(
      query,
      update,
      options
    );

    return {
      message: "submission found",
      result: result
    };
  }

  async make(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};

      let queryObject = {
        _id: ObjectId(req.params._id)
      }
      let updateObject = {}
      let result = {}

      if(req.body.schoolProfile) {
        updateObject.$set = { schoolProfile : req.body.schoolProfile }
      }
      
      if(req.body.evidence) {
        updateObject.$push = { evidenceSubmissions: { $each: req.body.evidence }}
      }
      

      result = await database.models.submissions.findOneAndUpdate(
        queryObject,
        updateObject
      );

      let response = {
        message: "Submission completed successfully"
      };

      return resolve(response);

      
    }).catch(error => {
      reject(error);
    });
  }
};
