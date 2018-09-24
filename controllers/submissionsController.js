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
};
