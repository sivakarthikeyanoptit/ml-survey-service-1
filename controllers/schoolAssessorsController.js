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
  
  find(req) {
    // req.db = "cassandra";
    req.query = { userId: req.userDetails.userId };
    //req.populate = "schools";
    
    req.populate = {
      path: 'schools',
      select: ["name","externalId"]
    };

    // return super.find(req);
    return super.populate(req);
  }

};
