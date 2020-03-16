/**
 * name : questions/helper.js
 * author : Akash
 * created-date : 20-Jan-2019
 * Description : All questions related helper functionality.
 */

// Dependencies

/**
    * Questions
    * @class
*/
module.exports = class QuestionsHelper {

  /**
   * create questions.
   * @method
   * @name createQuestions
   * @param {Object} parsedQuestion -parsed question.
   * @param {Object} questionCollection - question data if it exists in the database.
   * @param {Object} criteriaObject - question criteria.
   * @param {Object} evidenceCollectionMethodObject - question evidence method
   * @param {Object} questionSection - question section          
   * @returns {Object} consisting of SYSTEM_ID(if question is created than SYSTEM_ID
   * will have value else error message will be present in SYSTEM_ID)  
   */

  static createQuestions(parsedQuestion, questionCollection, criteriaObject, evidenceCollectionMethodObject, questionSection) {

    let csvArray = new Array;

    return new Promise(async (resolve, reject) => {

      try {

        let questionDataModel = Object.keys(questionsSchema.schema);

        let includeFieldByDefault = {
          "remarks": "",
          "value": "",
          "usedForScoring": "",
          "questionType": "auto",
          "deleted": false,
          "canBeNotApplicable": "false",
          "isCompleted": false,
          "value": ""
        };

        let fieldNotIncluded = ["instanceIdentifier", "dateFormat", "autoCapture", "isAGeneralQuestion"];

        let resultQuestion;

        let csvResult = {};

        if (questionCollection && questionCollection[parsedQuestion["externalId"]]) {
          csvResult["internal id"] = "Question already exists";
        } else {

          let allValues = {};

          Object.keys(includeFieldByDefault).forEach(eachFieldToBeIncluded => {
            allValues[eachFieldToBeIncluded] = includeFieldByDefault[eachFieldToBeIncluded];
          })

          allValues["visibleIf"] = new Array;
          allValues["question"] = new Array;

          let evidenceMethod = parsedQuestion["evidenceMethod"];

          if (parsedQuestion["hasAParentQuestion"] !== "YES") {
            allValues.visibleIf = "";
          } else {

            let operator = parsedQuestion["parentQuestionOperator"] == "EQUALS" ? parsedQuestion["parentQuestionOperator"] = "===" : parsedQuestion["parentQuestionOperator"];

            allValues.visibleIf.push({
              operator: operator,
              value: parsedQuestion.parentQuestionValue,
              _id: questionCollection[parsedQuestion["parentQuestionId"]]._id
            });

          }

          allValues.question.push(
            parsedQuestion["question0"],
            parsedQuestion["question1"]
          );

          // Generate Validation
          if (parsedQuestion["responseType"] !== "") {
            allValues["validation"] = {};
            allValues["validation"]["required"] = this.convertStringToBoolean(gen.utils.lowerCase(parsedQuestion["validation"]));

            if (parsedQuestion["responseType"] == "matrix") {
              allValues["instanceIdentifier"] = parsedQuestion["instanceIdentifier"];
            }
            if (parsedQuestion["responseType"] == "date") {
              allValues["dateFormat"] = parsedQuestion.dateFormat;
              allValues["autoCapture"] = this.convertStringToBoolean(gen.utils.lowerCase(parsedQuestion.autoCapture));
              allValues["validation"]["max"] = parsedQuestion.validationMax;
              allValues["validation"]["min"] = parsedQuestion.validationMin ? parsedQuestion.validationMin : parsedQuestion.validationMin = "";
            }

            if (parsedQuestion["responseType"] == "number") {

              allValues["validation"]["IsNumber"] = gen.utils.lowerCase(parsedQuestion["validationIsNumber"]);

              if (parsedQuestion["validationRegex"] == "IsNumber") {
                allValues["validation"]["regex"] = "^[0-9s]*$";
              }

            }

            if (parsedQuestion["responseType"] == "slider") {
              if (parsedQuestion["validationRegex"] == "IsNumber") {
                allValues["validation"]["regex"] = "^[+-]?\d+(\.\d+)?$";
              }
              allValues["validation"]["max"] = parsedQuestion.validationMax;
              allValues["validation"]["min"] = parsedQuestion.validationMin ? parsedQuestion.validationMin : parsedQuestion.validationMin = "";
            }

          }

          allValues["fileName"] = [];
          allValues["file"] = {};

          if (parsedQuestion["file"] != "NA") {

            allValues.file["required"] = this.convertStringToBoolean(gen.utils.lowerCase(parsedQuestion["fileIsRequired"]));
            allValues.file["type"] = new Array;
            let allowedFileUploads = this.allowedFileUploads();
            parsedQuestion["fileUploadType"].split(",").forEach(fileType => {
              if (allowedFileUploads[fileType] && allowedFileUploads[fileType] != "") {
                allValues.file.type.push(allowedFileUploads[fileType]);
              }
            })
            allValues.file["minCount"] = parseInt(parsedQuestion["minFileCount"]);
            allValues.file["maxCount"] = parseInt(parsedQuestion["maxFileCount"]);
            allValues.file["caption"] = parsedQuestion["caption"];
          }

          allValues["questionGroup"] = parsedQuestion["questionGroup"].split(',');
          
          let allowedBlankValueCount = 10;
          let blankValueCount = 0;

          allValues["options"] = new Array;

          // Adding data in options field
          for (let pointerToResponseCount = 1; pointerToResponseCount < 1000; pointerToResponseCount++) {
            let optionValue = "R" + pointerToResponseCount;
            let optionHint = "R" + pointerToResponseCount + "-hint";
            let optionScore = "R" + pointerToResponseCount + "-score";

            if (parsedQuestion[optionValue] && parsedQuestion[optionValue] != "") {
              let eachOption = {
                value: optionValue,
                label: parsedQuestion[optionValue]
              };
              if (parsedQuestion[optionHint] && parsedQuestion[optionHint] != "") {
                eachOption.hint = parsedQuestion[optionHint];
              }

              if (parsedQuestion[optionScore] && !isNaN(Math.round(parsedQuestion[optionScore]))) {
                eachOption.score = Math.round(parsedQuestion[optionScore]);
              }

              allValues.options.push(eachOption);
            } else {
              blankValueCount += 1;
              if(blankValueCount >= allowedBlankValueCount) {
                break;
              }
            }
          }


          allValues["sliderOptions"] = new Array;
          blankValueCount = 0;
          // Adding data in slider options field
          for (let pointerToResponseCount = 1; pointerToResponseCount < 1000; pointerToResponseCount++) {
            let optionValue = "slider-value-" + pointerToResponseCount;
            let optionScore = "slider-value-" + pointerToResponseCount + "-score";

            if (parsedQuestion[optionValue] && parsedQuestion[optionValue] != "") {
              let eachOption = {
                value: parseFloat(parsedQuestion[optionValue])
              };
              if (parsedQuestion[optionScore] && !isNaN(Math.round(parsedQuestion[optionScore]))) {
                eachOption.score = Math.round(parsedQuestion[optionScore]);
              }

              allValues.sliderOptions.push(eachOption);
            } else {
              blankValueCount += 1;
              if(blankValueCount >= allowedBlankValueCount) {
                break;
              }
            }
          }

          Object.keys(parsedQuestion).forEach(parsedQuestionData => {
            if (!fieldNotIncluded.includes(parsedQuestionData) && !allValues[parsedQuestionData] && questionDataModel.includes(parsedQuestionData)) {
              if (this.booleanData().includes(parsedQuestionData)) {
                allValues[parsedQuestionData] = this.convertStringToBoolean(parsedQuestion[parsedQuestionData]);
              } else {
                allValues[parsedQuestionData] = parsedQuestion[parsedQuestionData];
              }
            }
          })

          let createQuestion = await database.models.questions.create(
            allValues
          );

          if (!createQuestion._id) {
            csvResult["_SYSTEM_ID"] = "Not Created";
          } else {
            resultQuestion = createQuestion
            csvResult["_SYSTEM_ID"] = createQuestion._id;

            if (parsedQuestion["parentQuestionId"] != "") {

              let queryParentQuestionObject = {
                _id: questionCollection[parsedQuestion["parentQuestionId"]]._id
              };

              let updateParentQuestionObject = {};

              updateParentQuestionObject.$push = {
                ["children"]: createQuestion._id
              };

              await database.models.questions.findOneAndUpdate(
                queryParentQuestionObject,
                updateParentQuestionObject
              );
            }

            if (parsedQuestion["instanceParentQuestionId"] != "NA") {

              let queryInstanceParentQuestionObject = {
                _id: questionCollection[parsedQuestion["instanceParentQuestionId"]]._id
              };

              let updateInstanceParentQuestionObject = {};

              updateInstanceParentQuestionObject.$push = {
                ["instanceQuestions"]: createQuestion._id
              };

              await database.models.questions.findOneAndUpdate(
                queryInstanceParentQuestionObject,
                updateInstanceParentQuestionObject
              );

            }

            let newCriteria = await database.models.criteria.findOne(
              {
                _id: criteriaObject[parsedQuestion["criteriaExternalId"]]._id
              },
              {
                evidences: 1
              }
            );

            let criteriaEvidences = newCriteria.evidences;
            let indexOfEvidenceMethodInCriteria = criteriaEvidences.findIndex(evidence => evidence.code === evidenceMethod);

            if (indexOfEvidenceMethodInCriteria < 0) {
              evidenceCollectionMethodObject[evidenceMethod]["sections"] = new Array;
              criteriaEvidences.push(evidenceCollectionMethodObject[evidenceMethod]);
              indexOfEvidenceMethodInCriteria = criteriaEvidences.length - 1;
            }

            let indexOfSectionInEvidenceMethod = criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.findIndex(section => section.code === questionSection);

            if (indexOfSectionInEvidenceMethod < 0) {
              criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.push({ code: questionSection, questions: new Array });
              indexOfSectionInEvidenceMethod = criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.length - 1;
            }

            criteriaEvidences[indexOfEvidenceMethodInCriteria].sections[indexOfSectionInEvidenceMethod].questions.push(createQuestion._id);

            let queryCriteriaObject = {
              _id: newCriteria._id
            };

            let updateCriteriaObject = {};
            updateCriteriaObject.$set = {
              ["evidences"]: criteriaEvidences
            };

            await database.models.criteria.findOneAndUpdate(
              queryCriteriaObject,
              updateCriteriaObject
            );

          }

        }

        csvResult["Question External Id"] = parsedQuestion["externalId"];
        csvResult["Question Name"] = parsedQuestion["question0"];
        csvArray.push(csvResult);

        return resolve({
          total: csvArray,
          result: resultQuestion
        });

      } catch (error) {
        return reject(error);
      }
    })

  }

  /**
   * update questions.
   * @method
   * @name updateQuestion
   * @param {Object} parsedQuestion -parsed question.         
   * @returns {Object} consisting of UPDATE_STATUS  
   */

  static updateQuestion(parsedQuestion) {

    return new Promise(async (resolve, reject) => {

      try {

        let questionDataModel = Object.keys(questionsSchema.schema);

        let existingQuestion = await database.models.questions
          .findOne(
            { _id: ObjectId(parsedQuestion["_SYSTEM_ID"]) }, {
              createdAt: 0,
              updatedAt: 0
            }
          )
          .lean();

        if (parsedQuestion["_parentQuestionId"] == "") {
          existingQuestion.visibleIf = "";
        } else {

          let operator = parsedQuestion["parentQuestionOperator"] == "EQUALS" ? parsedQuestion["parentQuestionOperator"] = "===" : parsedQuestion["parentQuestionOperator"];

          existingQuestion.visibleIf = new Array;

          existingQuestion.visibleIf.push({
            operator: operator,
            value: parsedQuestion.parentQuestionValue,
            _id: ObjectId(parsedQuestion["_parentQuestionId"])
          });

        }

        if (parsedQuestion["question0"]) {
          existingQuestion.question[0] = parsedQuestion["question0"];
        }

        if (parsedQuestion["question1"]) {
          existingQuestion.question[1] = parsedQuestion["question1"];
        }

        // if (parsedQuestion["isAGeneralQuestion"] && (parsedQuestion["isAGeneralQuestion"] == "true" || parsedQuestion["isAGeneralQuestion"] == "TRUE")) {
        //   existingQuestion["isAGeneralQuestion"] = parsedQuestion["isAGeneralQuestion"] = true
        // } else {
        //   existingQuestion["isAGeneralQuestion"] = parsedQuestion["isAGeneralQuestion"] = false
        // }

        if (parsedQuestion["responseType"] !== "") {

          existingQuestion["responseType"] = parsedQuestion["responseType"];
          existingQuestion["validation"] = {};
          existingQuestion["validation"]["required"] = this.convertStringToBoolean(gen.utils.lowerCase(parsedQuestion["validation"]));

          if (parsedQuestion["responseType"] == "matrix") {
            existingQuestion["instanceIdentifier"] = parsedQuestion["instanceIdentifier"];
          }

          if (parsedQuestion["responseType"] == "date") {
            existingQuestion["dateFormat"] = parsedQuestion.dateFormat;
            existingQuestion["autoCapture"] = this.convertStringToBoolean(gen.utils.lowerCase(parsedQuestion.autoCapture));
            existingQuestion["validation"]["max"] = parsedQuestion.validationMax;
            existingQuestion["validation"]["min"] = parsedQuestion.validationMin ? parsedQuestion.validationMin : parsedQuestion.validationMin = "";
          }

          if (parsedQuestion["responseType"] == "number") {

            existingQuestion["validation"]["IsNumber"] = gen.utils.lowerCase(parsedQuestion["validationIsNumber"]);

            if (parsedQuestion["validationRegex"] == "IsNumber") {
              existingQuestion["validation"]["regex"] = "^[0-9s]*$";
            }

          }

          if (parsedQuestion["responseType"] == "slider") {
            if (parsedQuestion["validationRegex"] == "IsNumber") {
              existingQuestion["validation"]["regex"] = "^[+-]?\d+(\.\d+)?$";
            }
            existingQuestion["validation"]["max"] = parsedQuestion.validationMax;
            existingQuestion["validation"]["min"] = parsedQuestion.validationMin ? parsedQuestion.validationMin : "";
          }

          delete parsedQuestion["validation"];

        }

        existingQuestion["fileName"] = new Array;
        existingQuestion["file"] = {};

        if (parsedQuestion["file"] != "NA") {

          existingQuestion.file["required"] = this.convertStringToBoolean(gen.utils.lowerCase(parsedQuestion["fileIsRequired"]));
          existingQuestion.file["type"] = new Array;
          let allowedFileUploads = this.allowedFileUploads();
          parsedQuestion["fileUploadType"].split(",").forEach(fileType => {
            if (allowedFileUploads[fileType] && allowedFileUploads[fileType] != "") {
              existingQuestion.file.type.push(allowedFileUploads[fileType]);
            }
          })
          existingQuestion.file["minCount"] = parseInt(parsedQuestion["minFileCount"]);
          existingQuestion.file["maxCount"] = parseInt(parsedQuestion["maxFileCount"]);
          existingQuestion.file["caption"] = parsedQuestion["caption"];

          parsedQuestion["file"] = existingQuestion.file;
        } else {
          existingQuestion["file"] = parsedQuestion["file"] = {};
        }

        // if (parsedQuestion["showRemarks"] && (parsedQuestion["showRemarks"] == "true" || parsedQuestion["showRemarks"] == "TRUE")) {
        //   existingQuestion["showRemarks"] = parsedQuestion["showRemarks"] = true
        // } else {
        //   existingQuestion["showRemarks"] = parsedQuestion["showRemarks"] = false
        // }


        if (parsedQuestion["questionGroup"]) {
          existingQuestion["questionGroup"] = parsedQuestion["questionGroup"] = parsedQuestion["questionGroup"].split(',');
        }

        let allowedBlankValueCount = 10;
        let blankValueCount = 0;

        existingQuestion["options"] = new Array;
        
        // Adding data in options field
        for (let pointerToResponseCount = 1; pointerToResponseCount < 1000; pointerToResponseCount++) {
          let optionValue = "R" + pointerToResponseCount;
          let optionHint = "R" + pointerToResponseCount + "-hint";
          let optionScore = "R" + pointerToResponseCount + "-score";

          if (parsedQuestion[optionValue] && parsedQuestion[optionValue] != "") {
            let eachOption = {
              value: optionValue,
              label: parsedQuestion[optionValue]
            };
            if (parsedQuestion[optionHint] && parsedQuestion[optionHint] != "") {
              eachOption.hint = parsedQuestion[optionHint];
            }
            if (parsedQuestion[optionScore] && !isNaN(Math.round(parsedQuestion[optionScore]))) {
              eachOption.score = Math.round(parsedQuestion[optionScore]);
            }
            existingQuestion.options.push(eachOption);
          } else {
            blankValueCount += 1;
            if(blankValueCount >= allowedBlankValueCount) {
              break;
            }
          }

        }


        existingQuestion["sliderOptions"] = new Array;
        
        blankValueCount = 0;
        // Adding data in slider options field
        for (let pointerToResponseCount = 1; pointerToResponseCount < 1000; pointerToResponseCount++) {
          let optionValue = "slider-value-" + pointerToResponseCount;
          let optionScore = "slider-value-" + pointerToResponseCount + "-score";

          if (parsedQuestion[optionValue] && parsedQuestion[optionValue] != "") {
            let eachOption = {
              value: parseFloat(parsedQuestion[optionValue])
            };
            if (parsedQuestion[optionScore] && !isNaN(Math.round(parsedQuestion[optionScore]))) {
              eachOption.score = Math.round(parsedQuestion[optionScore]);
            }
            existingQuestion.sliderOptions.push(eachOption);
          } else {
            blankValueCount += 1;
            if(blankValueCount >= allowedBlankValueCount) {
              break;
            }
          }
        }

        Object.keys(parsedQuestion).forEach(parsedQuestionData => {
          if (!_.startsWith(parsedQuestionData, "_") && questionDataModel.includes(parsedQuestionData)) {
            if (this.booleanData().includes(parsedQuestionData)) {
              existingQuestion[parsedQuestionData] = this.convertStringToBoolean(parsedQuestion[parsedQuestionData]);
            } else {
              existingQuestion[parsedQuestionData] = parsedQuestion[parsedQuestionData];
            }
            // existingQuestion[parsedQuestionData] = parsedQuestion[parsedQuestionData]
          }
        })

        let updateQuestion = await database.models.questions.findOneAndUpdate(
          { _id: existingQuestion._id },
          existingQuestion,
          { _id: 1 }
        );

        if (!updateQuestion._id) {
          parsedQuestion["UPDATE_STATUS"] = "Question Not Updated";
        } else {

          parsedQuestion["UPDATE_STATUS"] = "Success";

          if (parsedQuestion["_parentQuestionId"] != "") {

            await database.models.questions.findOneAndUpdate(
              {
                _id: parsedQuestion["_parentQuestionId"]
              },
              {
                $addToSet: {
                  ["children"]: updateQuestion._id
                }
              }, {
                _id: 1
              }
            );

          }


          if (parsedQuestion["_instanceParentQuestionId"] != "" && parsedQuestion["responseType"] != "matrix") {

            await database.models.questions.findOneAndUpdate(
              {
                _id: parsedQuestion["_instanceParentQuestionId"],
                responseType: "matrix"
              },
              {
                $addToSet: {
                  ["instanceQuestions"]: updateQuestion._id
                }
              }, {
                _id: 1
              }
            );

          }

          if (parsedQuestion["_setQuestionInCriteria"] && parsedQuestion["_criteriaInternalId"] != "" && parsedQuestion["_evidenceMethodCode"] != "" && parsedQuestion["_sectionCode"] != "") {

            let criteriaToUpdate = await database.models.criteria.findOne(
              {
                _id: ObjectId(parsedQuestion["_criteriaInternalId"])
              },
              {
                evidences: 1
              }
            );

            let evidenceMethod = parsedQuestion["_evidenceMethodCode"];

            let criteriaEvidences = criteriaToUpdate.evidences;
            let indexOfEvidenceMethodInCriteria = criteriaEvidences.findIndex(evidence => evidence.code === evidenceMethod);

            if (indexOfEvidenceMethodInCriteria < 0) {
              criteriaEvidences.push({
                code: evidenceMethod,
                sections: new Array
              });
              indexOfEvidenceMethodInCriteria = criteriaEvidences.length - 1;
            }

            let questionSection = parsedQuestion["_sectionCode"];

            let indexOfSectionInEvidenceMethod = criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.findIndex(section => section.code === questionSection);

            if (indexOfSectionInEvidenceMethod < 0) {
              criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.push({ code: questionSection, questions: new Array });
              indexOfSectionInEvidenceMethod = criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.length - 1;
            }

            criteriaEvidences[indexOfEvidenceMethodInCriteria].sections[indexOfSectionInEvidenceMethod].questions.push(updateQuestion._id);

            let queryCriteriaObject = {
              _id: criteriaToUpdate._id
            };

            let updateCriteriaObject = {};
            updateCriteriaObject.$set = {
              ["evidences"]: criteriaEvidences
            };

            await database.models.criteria.findOneAndUpdate(
              queryCriteriaObject,
              updateCriteriaObject
            );

          }


        }

        return resolve(parsedQuestion);

      } catch (error) {
        return reject(error);
      }
    })

  }

  /**
   * Default boolean data needed for creating question.
   * @method
   * @name booleanData         
   * @returns {Array} Boolean data.
   */

  static booleanData() {
    let booleanData = ["allowAudioRecording", "showRemarks", "isAGeneralQuestion", "autoCapture"];
    return booleanData;
  }

   /**
   * Convert string to boolean.
   * @method
   * @name convertStringToBoolean
   * @param {String} stringData -String data.         
   * @returns {Boolean}  
   */

  static convertStringToBoolean(stringData) {
    let stringToBoolean = (stringData === "TRUE" || stringData === "true");
    return stringToBoolean;
  }

   /**
   * Default file types.
   * @method
   * @name allowedFileUploads
   * @param {String} stringData -String data.         
   * @returns {Oject} all file types  
   */

  static allowedFileUploads() {

    // Key is what is supplied in CSV and value is what is sent to app
    let fileTypes = {
      "image/jpeg": "image/jpeg",
      "aif": "aif",
      "cda": "cda",
      "mp3": "mp3",
      "mpa": "mpa",
      "ogg": "ogg",
      "wav": "wav",
      "wma": "wma",
      "mp4": "mp4",
      "mp3": "mp3",
      "wmv": "wmv",
      "webm": "webm",
      "flv": "flv",
      "avi": "avi",
      "3gp": "3gp",
      "ogg": "ogg",
      "ppt": "ppt",
      "pptx": "pptx",
      "pps": "pps",
      "ppsx": "ppsx",
      "pdf": "pdf",
      "docx": "docx",
      "doc": "doc",
      "docm": "docm",
      "dotx": "dotx",
      "xls": "xls",
      "xlsx": "xlsx"
    }

    return fileTypes

  }

   /**
   * Question data from database.
   * @method
   * @name questionDocument
   * @param {String} [questionFilter = "all"] -filter query.
   * @param {Array} [fieldsArray = "all"] -projected fields.          
   * @returns {Array} question data.  
   */

  static questionDocument(questionFilter = "all", fieldsArray = "all") {
    return new Promise(async (resolve, reject) => {
      try {

        let queryObject = (questionFilter != "all") ? questionFilter : {};


        let projectionObject = {};

        if (fieldsArray != "all") {
          fieldsArray.forEach(field => {
            projectionObject[field] = 1;
          });
        }

        let questionDocuments = await database.models.questions.find(queryObject, projectionObject).lean();
        
        return resolve(questionDocuments);
        
      } catch (error) {
        return reject(error);
      }
    });
  }

  /**
   * Create Question data.
   * @method
   * @name create
   * @param {Object} questionData -question documents         
   * @returns {Array} question data.  
   */

  static make(questionData) {
    return new Promise(async (resolve, reject) => {
      try {
        let createQuestion;
        if( Array.isArray(questionData) && questionData.length > 0 ) {
          let questions = await database.models.questions.insertMany(
            questionData
          );
          createQuestion = questions;
        } else {
          createQuestion = await database.models.questions.create(
            questionData
          );
        }
        return resolve(createQuestion);
      } catch(error) {
        return reject(error);
      }
    }) 
  }

};