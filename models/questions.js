module.exports = {
  name: "questions",
  schema: {
    externalId: {
      type: "String",
      index: true,
      unique: true
    },
    question: "Array",
    tip: "String",
    hint: "String",
    responseType: "String",
    value: "String",
    isCompleted: { type : "Boolean", default: false },
    showRemarks: { type : "Boolean", default: false },
    remarks: "String",
    visibleIf: "Object",
    createdBy: "String",
    updatedBy: "String",
    options: "Array",
    sliderOptions: "Array",
    children: "Array",
    questionGroup: "Array",
    questionType: "String",
    modeOfCollection: "String",
    usedForScoring: "String",
    file: "Object",
    fileName: "Array",
    validation: "Object",
    accessibility: "String",
    instanceIdentifier: "String",
    noOfInstances: "Number",
    notApplicable: "String",
    canBeNotApplicable: "String",
    instanceQuestionsString: "String",
    instanceQuestions: "Array",
    isAGeneralQuestion: { type : "Boolean", default: false },
    dateFormat: "String",
    autoCapture: { type : "Boolean", default: false },
    rubricLevel: "String",
    sectionHeader: "String",
    allowAudioRecording: "Boolean",
    page: "String",
    questionNumber: "String",
    weightage: { type : "Number", default: 1 },
    prefillFromEntityProfile : { type : "Boolean", default : false },
    entityFieldName : { type : "String", default : "" } ,
    isEditable : { type : "Boolean", default : false }
  }
};
