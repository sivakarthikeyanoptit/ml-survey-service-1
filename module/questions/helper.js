
module.exports = class questionsHelper {

  static createQuestions(parsedQuestion, questionCollection, criteriaObject, evidenceCollectionMethodObject, questionSection) {

    let csvArray = new Array

    return new Promise(async (resolve, reject) => {

      try {

        let questionDataModel = Object.keys(questionsSchema.schema)

        let includeFieldByDefault = {
          "remarks": "",
          "value": "",
          "usedForScoring": "",
          "questionType": "auto",
          "deleted": false,
          "canBeNotApplicable": "false"
        }

        let fieldNotIncluded = ["instanceIdentifier", "dateFormat", "autoCapture", "isAGeneralQuestion"]

        let resultQuestion

        let csvResult = {}

        if (questionCollection && questionCollection[parsedQuestion["externalId"]]) {
          csvResult["internal id"] = "Question already exists"
        } else {

          let allValues = {}

          Object.keys(includeFieldByDefault).forEach(eachFieldToBeIncluded => {
            allValues[eachFieldToBeIncluded] = includeFieldByDefault[eachFieldToBeIncluded]
          })

          allValues["visibleIf"] = new Array
          allValues["question"] = new Array

          let evidenceMethod = parsedQuestion["evidenceMethod"]

          if (parsedQuestion["hasAParentQuestion"] !== "YES") {
            allValues.visibleIf = ""
          } else {

            let operator = parsedQuestion["parentQuestionOperator"] == "EQUALS" ? parsedQuestion["parentQuestionOperator"] = "===" : parsedQuestion["parentQuestionOperator"]

            allValues.visibleIf.push({
              operator: operator,
              value: parsedQuestion.parentQuestionValue,
              _id: questionCollection[parsedQuestion["parentQuestionId"]]._id
            })

          }

          allValues.question.push(
            parsedQuestion["question0"],
            parsedQuestion["question1"]
          )

          // if (parsedQuestion["isAGeneralQuestion"] && (parsedQuestion["isAGeneralQuestion"] == "true" || parsedQuestion["isAGeneralQuestion"] == "TRUE")) {
          //   allValues["isAGeneralQuestion"] = true
          // } else {
          //   allValues["isAGeneralQuestion"] = false
          // }

          allValues["externalId"] = parsedQuestion["externalId"]

          if (parsedQuestion["responseType"] !== "") {
            allValues["responseType"] = parsedQuestion["responseType"]
            allValues["validation"] = {}
            allValues["validation"]["required"] = gen.utils.lowerCase(parsedQuestion["validation"])

            if (parsedQuestion["responseType"] == "matrix") {
              allValues["instanceIdentifier"] = parsedQuestion["instanceIdentifier"]
            }
            if (parsedQuestion["responseType"] == "date") {
              allValues["dateFormat"] = parsedQuestion.dateFormat
              allValues["autoCapture"] = gen.utils.lowerCase(parsedQuestion.autoCapture)
              allValues["validation"]["max"] = parsedQuestion.validationMax
              allValues["validation"]["min"] = parsedQuestion.validationMin ? parsedQuestion.validationMin : parsedQuestion.validationMin = ""
            }

            if (parsedQuestion["responseType"] == "number") {

              allValues["validation"]["IsNumber"] = gen.utils.lowerCase(parsedQuestion["validationIsNumber"])

              if (parsedQuestion["validationRegex"] == "IsNumber") {
                allValues["validation"]["regex"] = "^[0-9s]*$"
              }

            }

            if (parsedQuestion["responseType"] == "slider") {
              if (parsedQuestion["validationRegex"] == "IsNumber") {
                allValues["validation"]["regex"] = "^[0-9s]*$"
              }
              allValues["validation"]["max"] = parsedQuestion.validationMax
              allValues["validation"]["min"] = parsedQuestion.validationMin ? parsedQuestion.validationMin : parsedQuestion.validationMin = ""
            }

          }

          allValues["fileName"] = []
          allValues["file"] = {}

          if (parsedQuestion["file"] != "NA") {

            allValues.file["required"] = gen.utils.lowerCase(parsedQuestion["fileIsRequired"])
            allValues.file["type"] = new Array
            let allowedFileUploads = this.allowedFileUploads()
            parsedQuestion["fileUploadType"].split(",").forEach(fileType => {
              if (allowedFileUploads[fileType] && allowedFileUploads[fileType] != "") {
                allValues.file.type.push(allowedFileUploads[fileType])
              }
            })
            allValues.file["minCount"] = parseInt(parsedQuestion["minFileCount"])
            allValues.file["maxCount"] = parseInt(parsedQuestion["maxFileCount"])
            allValues.file["caption"] = parsedQuestion["caption"]
          }

          // if (parsedQuestion["showRemarks"] && (parsedQuestion["showRemarks"] == "true" || parsedQuestion["showRemarks"] == "TRUE")) {
          //   allValues["showRemarks"] = true
          // } else {
          //   allValues["showRemarks"] = false
          // }

          allValues["tip"] = parsedQuestion["tip"]

          allValues["questionGroup"] = parsedQuestion["questionGroup"].split(',')

          allValues["modeOfCollection"] = parsedQuestion["modeOfCollection"]
          allValues["accessibility"] = parsedQuestion["accessibility"]

          allValues["options"] = new Array
          allValues["isCompleted"] = false
          allValues["value"] = ""

          for (let pointerToResponseCount = 1; pointerToResponseCount < 10; pointerToResponseCount++) {
            let optionValue = "R" + pointerToResponseCount
            let optionHint = "R" + pointerToResponseCount + "-hint"

            if (parsedQuestion[optionValue] && parsedQuestion[optionValue] != "") {
              let eachOption = {
                value: optionValue,
                label: parsedQuestion[optionValue]
              }
              if (parsedQuestion[optionHint] && parsedQuestion[optionHint] != "") {
                eachOption.hint = parsedQuestion[optionHint]
              }
              allValues.options.push(eachOption)
            }
          }

          Object.keys(parsedQuestion).forEach(parsedQuestionData => {
            if (!fieldNotIncluded.includes(parsedQuestionData) && !allValues[parsedQuestionData] && questionDataModel.includes(parsedQuestionData)) {
              if (this.booleanData().includes(parsedQuestionData)) {
                allValues[parsedQuestionData] = this.convertStringToBoolean(parsedQuestion[parsedQuestionData])
              } else {
                allValues[parsedQuestionData] = parsedQuestion[parsedQuestionData]
              }
            }
          })
          let createQuestion = await database.models.questions.create(
            allValues
          )

          if (!createQuestion._id) {
            csvResult["_SYSTEM_ID"] = "Not Created"
          } else {
            resultQuestion = createQuestion
            csvResult["_SYSTEM_ID"] = createQuestion._id

            if (parsedQuestion["parentQuestionId"] != "") {

              let queryParentQuestionObject = {
                _id: questionCollection[parsedQuestion["parentQuestionId"]]._id
              }

              let updateParentQuestionObject = {}

              updateParentQuestionObject.$push = {
                ["children"]: createQuestion._id
              }

              await database.models.questions.findOneAndUpdate(
                queryParentQuestionObject,
                updateParentQuestionObject
              )
            }

            if (parsedQuestion["instanceParentQuestionId"] != "NA") {

              let queryInstanceParentQuestionObject = {
                _id: questionCollection[parsedQuestion["instanceParentQuestionId"]]._id
              }

              let updateInstanceParentQuestionObject = {}

              updateInstanceParentQuestionObject.$push = {
                ["instanceQuestions"]: createQuestion._id
              }

              await database.models.questions.findOneAndUpdate(
                queryInstanceParentQuestionObject,
                updateInstanceParentQuestionObject
              )

            }

            let newCriteria = await database.models.criteria.findOne(
              {
                _id: criteriaObject[parsedQuestion["criteriaExternalId"]]._id
              },
              {
                evidences: 1
              }
            )

            let criteriaEvidences = newCriteria.evidences
            let indexOfEvidenceMethodInCriteria = criteriaEvidences.findIndex(evidence => evidence.code === evidenceMethod);

            if (indexOfEvidenceMethodInCriteria < 0) {
              evidenceCollectionMethodObject[evidenceMethod]["sections"] = new Array
              criteriaEvidences.push(evidenceCollectionMethodObject[evidenceMethod])
              indexOfEvidenceMethodInCriteria = criteriaEvidences.length - 1
            }

            let indexOfSectionInEvidenceMethod = criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.findIndex(section => section.code === questionSection)

            if (indexOfSectionInEvidenceMethod < 0) {
              criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.push({ code: questionSection, questions: new Array })
              indexOfSectionInEvidenceMethod = criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.length - 1
            }

            criteriaEvidences[indexOfEvidenceMethodInCriteria].sections[indexOfSectionInEvidenceMethod].questions.push(createQuestion._id)

            let queryCriteriaObject = {
              _id: newCriteria._id
            }

            let updateCriteriaObject = {}
            updateCriteriaObject.$set = {
              ["evidences"]: criteriaEvidences
            }

            await database.models.criteria.findOneAndUpdate(
              queryCriteriaObject,
              updateCriteriaObject
            )

          }

        }

        csvResult["Question External Id"] = parsedQuestion["externalId"]
        csvResult["Question Name"] = parsedQuestion["question0"]
        csvArray.push(csvResult)

        return resolve({
          total: csvArray,
          result: resultQuestion
        })

      } catch (error) {
        return reject(error);
      }
    })

  }


  static updateQuestion(parsedQuestion) {

    return new Promise(async (resolve, reject) => {

      try {

        let questionDataModel = Object.keys(questionsSchema.schema)

        let existingQuestion = await database.models.questions
          .findOne(
            { _id: ObjectId(parsedQuestion["_SYSTEM_ID"]) }, {
              createdAt: 0,
              updatedAt: 0
            }
          )
          .lean();

        if (parsedQuestion["_parentQuestionId"] == "") {
          existingQuestion.visibleIf = ""
        } else {

          let operator = parsedQuestion["parentQuestionOperator"] == "EQUALS" ? parsedQuestion["parentQuestionOperator"] = "===" : parsedQuestion["parentQuestionOperator"]

          existingQuestion.visibleIf = new Array

          existingQuestion.visibleIf.push({
            operator: operator,
            value: parsedQuestion.parentQuestionValue,
            _id: ObjectId(parsedQuestion["_parentQuestionId"])
          })

        }

        if (parsedQuestion["question0"]) {
          existingQuestion.question[0] = parsedQuestion["question0"]
        }

        if (parsedQuestion["question1"]) {
          existingQuestion.question[1] = parsedQuestion["question1"]
        }

        // if (parsedQuestion["isAGeneralQuestion"] && (parsedQuestion["isAGeneralQuestion"] == "true" || parsedQuestion["isAGeneralQuestion"] == "TRUE")) {
        //   existingQuestion["isAGeneralQuestion"] = parsedQuestion["isAGeneralQuestion"] = true
        // } else {
        //   existingQuestion["isAGeneralQuestion"] = parsedQuestion["isAGeneralQuestion"] = false
        // }

        if (parsedQuestion["responseType"] !== "") {

          existingQuestion["responseType"] = parsedQuestion["responseType"]
          existingQuestion["validation"] = {}
          existingQuestion["validation"]["required"] = gen.utils.lowerCase(parsedQuestion["validation"])

          if (parsedQuestion["responseType"] == "matrix") {
            existingQuestion["instanceIdentifier"] = parsedQuestion["instanceIdentifier"]
          }

          if (parsedQuestion["responseType"] == "date") {
            existingQuestion["dateFormat"] = parsedQuestion.dateFormat
            existingQuestion["autoCapture"] = gen.utils.lowerCase(parsedQuestion.autoCapture)
            existingQuestion["validation"]["max"] = parsedQuestion.validationMax
            existingQuestion["validation"]["min"] = parsedQuestion.validationMin ? parsedQuestion.validationMin : parsedQuestion.validationMin = ""
          }

          if (parsedQuestion["responseType"] == "number") {

            existingQuestion["validation"]["IsNumber"] = gen.utils.lowerCase(parsedQuestion["validationIsNumber"])

            if (parsedQuestion["validationRegex"] == "IsNumber") {
              existingQuestion["validation"]["regex"] = "^[0-9s]*$"
            }

          }

          if (parsedQuestion["responseType"] == "slider") {
            if (parsedQuestion["validationRegex"] == "IsNumber") {
              existingQuestion["validation"]["regex"] = "^[0-9s]*$"
            }
            existingQuestion["validation"]["max"] = parsedQuestion.validationMax
            existingQuestion["validation"]["min"] = parsedQuestion.validationMin ? parsedQuestion.validationMin : ""
          }

        }

        existingQuestion["fileName"] = new Array
        existingQuestion["file"] = {}

        if (parsedQuestion["file"] != "NA") {

          existingQuestion.file["required"] = gen.utils.lowerCase(parsedQuestion["fileIsRequired"])
          existingQuestion.file["type"] = new Array
          let allowedFileUploads = this.allowedFileUploads()
          parsedQuestion["fileUploadType"].split(",").forEach(fileType => {
            if (allowedFileUploads[fileType] && allowedFileUploads[fileType] != "") {
              existingQuestion.file.type.push(allowedFileUploads[fileType])
            }
          })
          existingQuestion.file["minCount"] = parseInt(parsedQuestion["minFileCount"])
          existingQuestion.file["maxCount"] = parseInt(parsedQuestion["maxFileCount"])
          existingQuestion.file["caption"] = parsedQuestion["caption"]

          parsedQuestion["file"] = existingQuestion.file
        }

        // if (parsedQuestion["showRemarks"] && (parsedQuestion["showRemarks"] == "true" || parsedQuestion["showRemarks"] == "TRUE")) {
        //   existingQuestion["showRemarks"] = parsedQuestion["showRemarks"] = true
        // } else {
        //   existingQuestion["showRemarks"] = parsedQuestion["showRemarks"] = false
        // }


        if (parsedQuestion["questionGroup"]) {
          existingQuestion["questionGroup"] = parsedQuestion["questionGroup"] = parsedQuestion["questionGroup"].split(',')
        }

        existingQuestion["options"] = new Array

        for (let pointerToResponseCount = 1; pointerToResponseCount < 10; pointerToResponseCount++) {
          let optionValue = "R" + pointerToResponseCount
          let optionHint = "R" + pointerToResponseCount + "-hint"

          if (parsedQuestion[optionValue] && parsedQuestion[optionValue] != "") {
            let eachOption = {
              value: optionValue,
              label: parsedQuestion[optionValue]
            }
            if (parsedQuestion[optionHint] && parsedQuestion[optionHint] != "") {
              eachOption.hint = parsedQuestion[optionHint]
            }
            existingQuestion.options.push(eachOption)
          }

        }

        Object.keys(parsedQuestion).forEach(parsedQuestionData => {
          if (!_.startsWith(parsedQuestionData, "_") && questionDataModel.includes(parsedQuestionData)) {
            if (this.booleanData().includes(parsedQuestionData)) {
              existingQuestion[parsedQuestionData] = this.convertStringToBoolean(parsedQuestion[parsedQuestionData])
            } else {
              existingQuestion[parsedQuestionData] = parsedQuestion[parsedQuestionData]
            }
            // existingQuestion[parsedQuestionData] = parsedQuestion[parsedQuestionData]
          }
        })

        let updateQuestion = await database.models.questions.findOneAndUpdate(
          { _id: existingQuestion._id },
          existingQuestion,
          { _id: 1 }
        )

        if (!updateQuestion._id) {
          parsedQuestion["UPDATE_STATUS"] = "Question Not Updated"
        } else {

          parsedQuestion["UPDATE_STATUS"] = "Success"

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
            )

            let evidenceMethod = parsedQuestion["_evidenceMethodCode"]

            let criteriaEvidences = criteriaToUpdate.evidences
            let indexOfEvidenceMethodInCriteria = criteriaEvidences.findIndex(evidence => evidence.code === evidenceMethod);

            if (indexOfEvidenceMethodInCriteria < 0) {
              criteriaEvidences.push({
                code: evidenceMethod,
                sections: new Array
              })
              indexOfEvidenceMethodInCriteria = criteriaEvidences.length - 1
            }

            let questionSection = parsedQuestion["_sectionCode"]

            let indexOfSectionInEvidenceMethod = criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.findIndex(section => section.code === questionSection)

            if (indexOfSectionInEvidenceMethod < 0) {
              criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.push({ code: questionSection, questions: new Array })
              indexOfSectionInEvidenceMethod = criteriaEvidences[indexOfEvidenceMethodInCriteria].sections.length - 1
            }

            criteriaEvidences[indexOfEvidenceMethodInCriteria].sections[indexOfSectionInEvidenceMethod].questions.push(updateQuestion._id)

            let queryCriteriaObject = {
              _id: criteriaToUpdate._id
            }

            let updateCriteriaObject = {}
            updateCriteriaObject.$set = {
              ["evidences"]: criteriaEvidences
            }

            await database.models.criteria.findOneAndUpdate(
              queryCriteriaObject,
              updateCriteriaObject
            )

          }


        }

        return resolve(parsedQuestion)

      } catch (error) {
        return reject(error);
      }
    })

  }

  static booleanData() {
    let booleanData = ["allowAudioRecording", "showRemarks", "isAGeneralQuestion"]
    return booleanData
  }

  static convertStringToBoolean(stringData) {
    let stringToBoolean = (stringData === "TRUE" || stringData === "true")
    return stringToBoolean
  }

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

};