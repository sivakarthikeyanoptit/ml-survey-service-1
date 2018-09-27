module.exports = class Assessors {
  // async schools(req) {
  //   req.query = { userId: req.userDetails.userId };
  //   req.populate = "schools";
  //   let result = await controllers.schoolAssessorsController.populate(req);
  //   result.data = await result.data;
  //   return result;
  // }

  async schools(req) {
    return new Promise(async (resolve,reject) => {

      req.query = { userId: req.userDetails.userId };
      req.populate = "schools";
      const queryResult = await controllers.schoolAssessorsController.populate(req)
      let schools = []
      queryResult.result.forEach(assessor => {
        assessor.schools.forEach(assessorSchool => {
          schools.push(assessorSchool)
        })
      });
      return resolve({
        message: "School list fetched successfully",
        result:schools
      });
    }).catch(error => {
      reject({
        error: true,
        status: 404,
        message: "No record found"
      });
    })
  }
};
