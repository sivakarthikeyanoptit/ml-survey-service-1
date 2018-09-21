module.exports = class SchoolAssessors extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "schoolAssessors";
  }

  insert(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    return super.insert(req);
  }
  // find(req) {
  //   // req.db = "cassandra";
  //   req.query = { userId: req.userDetails.userId };
  //   req.populate = "schools";
  //   console.log(req.query, req.populate);

  //   // return super.find(req);
  //   return super.populate(req);
  // }

  find(req) {
    return new Promise(async (resolve,reject) => {

      req.query = { userId: req.userDetails.userId };
      req.populate = "schools";
      const queryResult = await super.populate(req)
      let schools = []
      queryResult.result.forEach(assessor => {
        assessor.schools.forEach(assessorSchool => {
          let schoolInfo = {
            "_id":assessorSchool._id
          }
          console.log(assessorSchool)
          assessorSchool.form.forEach(formField => {
            if(formField.field === 'externalId') {
              schoolInfo.externalId = formField.value
            }
            if(formField.field === 'name') {
              schoolInfo.name = formField.value
            }
          })
          schools.push(schoolInfo)
        })
      });
      return resolve({
        message: schools
      });
    })
  }
};
