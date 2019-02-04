module.exports = class SchoolAssessments extends Abstract {
  constructor() {
    super(schoolAssessmentsSchema);
  }

  static get name() {
    return "schoolAssessments";
  }
  
};
