module.exports = class Assessors {
  async schools(req) {
    req.query = { userId: req.userDetails.userId };
    req.populate = "schools";
    let result = await controllers.schoolAssessorsController.populate(req);
    result.data = await result.data;
    return result;
  }
};
