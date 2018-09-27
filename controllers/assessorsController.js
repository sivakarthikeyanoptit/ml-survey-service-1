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
      const schools = await controllers.schoolAssessorsController.populate(req)
      //let schools = []
      //console.log(schools)
      // queryResult.result.forEach(assessor => {
      //   assessor.schools.forEach(assessorSchool => {
      //     let schoolInfo = {
      //       "_id":assessorSchool._id
      //     }
      //     console.log(assessorSchool)
      //     assessorSchool.form.forEach(formField => {
      //       if(formField.field === 'externalId') {
      //         schoolInfo.externalId = formField.value
      //       }
      //       if(formField.field === 'name') {
      //         schoolInfo.name = formField.value
      //       }
      //     })
      //     schools.push(schoolInfo)
      //   })
      // });
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
