module.exports = {
  name: "questions",
  schema: {
    externalId: {
      type: String,
      index: true,
      unique: true
    },
    question: Array,
    tip: "String",
    responseType: "String",
    value: "String",
    isCompleted:Boolean,
    showRemarks:Boolean,
    remarks:"String",
    visibleIf:"String",
    createdBy: "String",
    createdDate: { type: Date, default: Date.now },
    updatedBy: "String",
    updatedDate: { type: Date, default: Date.now },
    options:Array,
    questionGroup:Array,
    questionType: "String",
    modeOfCollection: "String",
    usedForScoring: "String",
    file: Object,
    validation: Object,
  }
};
