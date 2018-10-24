const csv = require("csvtojson");

module.exports = class Assessors {

  async schools(req) {
    return new Promise(async (resolve,reject) => {

      req.query = { userId: req.userDetails.userId };
      req.populate = {
        path: 'schools',
        select: ["name","externalId"]
      };
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


  async upload(req) {
    try {
      req.body = await csv().fromString(req.files.assessors.data.toString());
      console.log(req.body);
      return {
        message: "Assessor record created successfully."
      };
      await req.body.forEach(async school => {
        school.schoolType = await school.schoolType.split(",");
        school.createdBy = school.updatedBy = await req.userDetails.id;
        school.gpsLocation = "";
        await database.models.schools.findOneAndUpdate(
          { externalId: school.externalId },
          school,
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          }
        );
      });
      return {
        message: "Assessor record created successfully."
      };
    } catch (error) {
      throw error;
    }
  }

};
