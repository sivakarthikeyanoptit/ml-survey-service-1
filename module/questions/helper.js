
module.exports = class questionsHelper {

    static createQuestions(parsedQuestion,questionCollection,criteriaObject,evidenceCollectionMethodObject,questionSection) {
        
        let csvArray = new Array
        
        return new Promise(async (resolve, reject) => {
            
            try {

                let questionDataModel = Object.keys(questionsSchema.schema)

                let includeFieldByDefault = {
                  "remarks" : "",
                  "value" : "",
                  "usedForScoring" : "",
                  "questionType" : "auto",
                  "deleted" : false,
                  "canBeNotApplicable" : "false"
                }
        
                let fieldNotIncluded = ["instanceIdentifier","dateFormat","autoCapture","isAGeneralQuestion"]
                
                let resultQuestion
        
                let csvResult = {}
                
                if (questionCollection && questionCollection[parsedQuestion["externalId"]]) {
                  csvResult["internal id"] = "Question already exists"
                } else {
            
                  let allValues = {}
        
                  Object.keys(includeFieldByDefault).forEach(eachFieldToBeIncluded=>{
                    allValues[eachFieldToBeIncluded] = includeFieldByDefault[eachFieldToBeIncluded]
                  })
        
                  allValues["visibleIf"]= new Array
                  allValues["question"] = new Array
        
                  let evidenceMethod = parsedQuestion["evidenceMethod"]
        
                  if(parsedQuestion["hasAParentQuestion"] !== "YES") {
                    allValues.visibleIf = ""
                  } else {
        
                    let operator = parsedQuestion["parentQuestionOperator"]="EQUALS"?parsedQuestion["parentQuestionOperator"] = "===":parsedQuestion["parentQuestionOperator"]
                    
                    allValues.visibleIf.push({
                      operator:operator,
                      value:parsedQuestion.parentQuestionValue,
                      _id:questionCollection[parsedQuestion["parentQuestionId"]]._id
                    })
        
                  }
            
                  allValues.question.push(
                    parsedQuestion["question0"],
                    parsedQuestion["question1"]
                  )
                  
                  allValues["isAGeneralQuestion"] = Boolean(gen.utils.lowerCase(parsedQuestion["isAGeneralQuestion"]?parsedQuestion["isAGeneralQuestion"]:""))
        
                  allValues["externalId"] = parsedQuestion["externalId"]
        
                  if(parsedQuestion["responseType"] !== ""){
                    allValues["responseType"] = parsedQuestion["responseType"]
                    allValues["validation"] = {}
                    allValues["validation"]["required"] = gen.utils.lowerCase(parsedQuestion["validation"])
        
                    if(parsedQuestion["responseType"] == "matrix"){
                      allValues["instanceIdentifier"] = parsedQuestion["instanceIdentifier"]
                    }
                    if(parsedQuestion["responseType"] == "date"){
                      allValues["dateFormat"] = parsedQuestion.dateFormat
                      allValues["autoCapture"] = gen.utils.lowerCase(parsedQuestion.autoCapture)
                      allValues["validation"]["max"] = parsedQuestion.validationMax
                      allValues["validation"]["min"] = parsedQuestion.validationMin?parsedQuestion.validationMin:parsedQuestion.validationMin=""
                    }
        
                    if(parsedQuestion["responseType"] == "number"){
        
                      allValues["validation"]["IsNumber"] = gen.utils.lowerCase(parsedQuestion["validationIsNumber"])
                      
                      if(parsedQuestion["validationRegex"] == "IsNumber"){
                          allValues["validation"]["regex"] = "^[0-9s]*$"
                      }
                      
                    }
        
                    if(parsedQuestion["responseType"] == "slider") {
                       if(parsedQuestion["validationRegex"] == "IsNumber") {
                          allValues["validation"]["regex"] = "^[0-9s]*$"
                        }
                      allValues["validation"]["max"] = parsedQuestion.validationMax
                      allValues["validation"]["min"] = parsedQuestion.validationMin?parsedQuestion.validationMin:parsedQuestion.validationMin=""
                    }
        
                  }
        
                  allValues["fileName"] = []
                  allValues["file"] = {}
        
                  if(parsedQuestion["file"] != "NA") {
                
                    allValues.file["required"] = gen.utils.lowerCase(parsedQuestion["fileIsRequired"])
                    allValues.file["type"] = new Array
                    allValues.file.type.push(parsedQuestion["fileUploadType"])
                    allValues.file["minCount"] = parsedQuestion["minFileCount"]
                    allValues.file["maxCount"] = parsedQuestion["maxFileCount"]
                    allValues.file["caption"] = parsedQuestion["caption"]
                  }
        
            
                  allValues["showRemarks"] = Boolean(gen.utils.lowerCase(parsedQuestion["showRemarks"]))
                  allValues["tip"] = parsedQuestion["tip"]
        
                  allValues["questionGroup"] = parsedQuestion["questionGroup"].split(',')
        
                  allValues["modeOfCollection"] = parsedQuestion["modeOfCollection"]
                  allValues["accessibility"] = parsedQuestion["accessibility"]
        
                  allValues["options"] = new Array
                  allValues["isCompleted"] = false
                  allValues["value"] = ""
        
                  for(let pointerToResponseCount=1;pointerToResponseCount<10;pointerToResponseCount++){
                    let responseValue = "R"+pointerToResponseCount
        
                    if(parsedQuestion[responseValue] && parsedQuestion[responseValue] != ""){
                      allValues.options.push({
                        value:responseValue,
                        label:parsedQuestion[responseValue]
                      })
                    }
                  }
            
                  Object.keys(parsedQuestion).forEach(parsedQuestionData=>{
                    if(!fieldNotIncluded.includes(parsedQuestionData) && !allValues[parsedQuestionData] && questionDataModel.includes(parsedQuestionData)){
                      allValues[parsedQuestionData] = parsedQuestion[parsedQuestionData]
                    }
                  })
                  let createQuestion = await database.models.questions.create(
                    allValues
                  )
        
                  if(!createQuestion._id){
                    csvResult["_SYSTEM_ID"] = "Not Created"
                  } else{
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
                        evidences : 1
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
                  total:csvArray,
                  result:resultQuestion
                })

            } catch (error) {
                return reject(error);
            }
        })

    }


    static updateQuestion(parsedQuestion) {
          
        let csvArray = new Array
        
        return new Promise(async (resolve, reject) => {
            
            try {

                let questionDataModel = Object.keys(questionsSchema.schema)

                let includeFieldByDefault = {
                  "remarks" : "",
                  "value" : "",
                  "usedForScoring" : "",
                  "questionType" : "auto",
                  "deleted" : false,
                  "canBeNotApplicable" : "false"
                }
        
                let fieldNotIncluded = ["instanceIdentifier","dateFormat","autoCapture","isAGeneralQuestion"]
                
                let resultQuestion
        
                let csvResult = {}
                
                if (questionCollection && questionCollection[parsedQuestion["externalId"]]) {
                  csvResult["internal id"] = "Question already exists"
                } else {
            
                  let allValues = {}
        
                  Object.keys(includeFieldByDefault).forEach(eachFieldToBeIncluded=>{
                    allValues[eachFieldToBeIncluded] = includeFieldByDefault[eachFieldToBeIncluded]
                  })
        
                  allValues["visibleIf"]= new Array
                  allValues["question"] = new Array
        
                  let evidenceMethod = parsedQuestion["evidenceMethod"]
        
                  if(parsedQuestion["hasAParentQuestion"] !== "YES") {
                    allValues.visibleIf = ""
                  } else {
        
                    let operator = parsedQuestion["parentQuestionOperator"]="EQUALS"?parsedQuestion["parentQuestionOperator"] = "===":parsedQuestion["parentQuestionOperator"]
                    
                    allValues.visibleIf.push({
                      operator:operator,
                      value:parsedQuestion.parentQuestionValue,
                      _id:questionCollection[parsedQuestion["parentQuestionId"]]._id
                    })
        
                  }
            
                  allValues.question.push(
                    parsedQuestion["question0"],
                    parsedQuestion["question1"]
                  )
                  
                  allValues["isAGeneralQuestion"] = Boolean(gen.utils.lowerCase(parsedQuestion["isAGeneralQuestion"]?parsedQuestion["isAGeneralQuestion"]:""))
        
                  allValues["externalId"] = parsedQuestion["externalId"]
        
                  if(parsedQuestion["responseType"] !== ""){
                    allValues["responseType"] = parsedQuestion["responseType"]
                    allValues["validation"] = {}
                    allValues["validation"]["required"] = gen.utils.lowerCase(parsedQuestion["validation"])
        
                    if(parsedQuestion["responseType"] == "matrix"){
                      allValues["instanceIdentifier"] = parsedQuestion["instanceIdentifier"]
                    }
                    if(parsedQuestion["responseType"] == "date"){
                      allValues["dateFormat"] = parsedQuestion.dateFormat
                      allValues["autoCapture"] = gen.utils.lowerCase(parsedQuestion.autoCapture)
                      allValues["validation"]["max"] = parsedQuestion.validationMax
                      allValues["validation"]["min"] = parsedQuestion.validationMin?parsedQuestion.validationMin:parsedQuestion.validationMin=""
                    }
        
                    if(parsedQuestion["responseType"] == "number"){
        
                      allValues["validation"]["IsNumber"] = gen.utils.lowerCase(parsedQuestion["validationIsNumber"])
                      
                      if(parsedQuestion["validationRegex"] == "IsNumber"){
                          allValues["validation"]["regex"] = "^[0-9s]*$"
                      }
                      
                    }
        
                    if(parsedQuestion["responseType"] == "slider") {
                      if(parsedQuestion["validationRegex"] == "IsNumber") {
                          allValues["validation"]["regex"] = "^[0-9s]*$"
                        }
                      allValues["validation"]["max"] = parsedQuestion.validationMax
                      allValues["validation"]["min"] = parsedQuestion.validationMin?parsedQuestion.validationMin:parsedQuestion.validationMin=""
                    }
        
                  }
        
                  allValues["fileName"] = []
                  allValues["file"] = {}
        
                  if(parsedQuestion["file"] != "NA") {
                
                    allValues.file["required"] = gen.utils.lowerCase(parsedQuestion["fileIsRequired"])
                    allValues.file["type"] = new Array
                    allValues.file.type.push(parsedQuestion["fileUploadType"])
                    allValues.file["minCount"] = parsedQuestion["minFileCount"]
                    allValues.file["maxCount"] = parsedQuestion["maxFileCount"]
                    allValues.file["caption"] = parsedQuestion["caption"]
                  }
        
            
                  allValues["showRemarks"] = Boolean(gen.utils.lowerCase(parsedQuestion["showRemarks"]))
                  allValues["tip"] = parsedQuestion["tip"]
        
                  allValues["questionGroup"] = parsedQuestion["questionGroup"].split(',')
        
                  allValues["modeOfCollection"] = parsedQuestion["modeOfCollection"]
                  allValues["accessibility"] = parsedQuestion["accessibility"]
        
                  allValues["options"] = new Array
                  allValues["isCompleted"] = false
                  allValues["value"] = ""
        
                  for(let pointerToResponseCount=1;pointerToResponseCount<10;pointerToResponseCount++){
                    let responseValue = "R"+pointerToResponseCount
        
                    if(parsedQuestion[responseValue] && parsedQuestion[responseValue] != ""){
                      allValues.options.push({
                        value:responseValue,
                        label:parsedQuestion[responseValue]
                      })
                    }
                  }
            
                  Object.keys(parsedQuestion).forEach(parsedQuestionData=>{
                    if(!fieldNotIncluded.includes(parsedQuestionData) && !allValues[parsedQuestionData] && questionDataModel.includes(parsedQuestionData)){
                      allValues[parsedQuestionData] = parsedQuestion[parsedQuestionData]
                    }
                  })
                  let createQuestion = await database.models.questions.create(
                    allValues
                  )
        
                  if(!createQuestion._id){
                    csvResult["_SYSTEM_ID"] = "Not Created"
                  } else{
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
                        evidences : 1
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
                  total:csvArray,
                  result:resultQuestion
                })

            } catch (error) {
                return reject(error);
            }
        })

    }

};