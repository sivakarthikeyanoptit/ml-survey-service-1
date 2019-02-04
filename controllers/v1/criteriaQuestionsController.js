module.exports = class CriteriaQuestions extends Abstract {

    constructor() {
      super(criteriaQuestionsSchema);
    }

    static get name() {
        return "criteria-questions";
    }


};
