module.exports = class Solutions extends Abstract {

    /**
        * @apiDefine errorBody
        * @apiError {String} status 4XX,5XX
        * @apiError {String} message Error
        */

    /**
        * @apiDefine successBody
        *  @apiSuccess {String} status 200
        * @apiSuccess {String} result Data
        */
       
    constructor() {
      super(solutionsSchema);
    }

    static get name() {
      return "solutions";
    }

    /**
    * @api {get} /assessment/api/v1/solutions/details/:solutionInternalId
    * @apiVersion 0.0.1
    * @apiName Framework & Rubric Details of a Solution
    * @apiGroup Solutions
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/solutions/details/5b98fa069f664f7e1ae7498c
    * @apiUse successBody
    * @apiUse errorBody
    */

    async details(req) {
      return new Promise(async (resolve, reject) => {
        try {

          if (!req.params._id || req.params._id == "" ) {
            throw "Invalid parameters."
          }

          let findQuery = {
            _id: req.params._id
          }

          let solutionDocument = await database.models.solutions.findOne(findQuery,{themes:1,levelToScoreMapping:1,name:1}).lean()

          let criteriasIdArray = gen.utils.getCriteriaIds(solutionDocument.themes);
          let criteriaDocument = await database.models.criterias.find({_id: { $in: criteriasIdArray } },{"name":1,"rubric.levels":1}).lean()

          let criteriaObject = {}

          criteriaDocument.forEach(eachCriteria=>{
            let levelsDescription = {}

            for(let k in eachCriteria.rubric.levels){
              levelsDescription[k] = eachCriteria.rubric.levels[k].description
            }

            criteriaObject[eachCriteria._id.toString()] =_.merge({
              name:eachCriteria.name
            },levelsDescription) 
          })

          let responseObject = {}
          responseObject.heading = "Solution Framework + rubric for - "+solutionDocument.name

          responseObject.sections = new Array

          let levelValue = {}

          let sectionHeaders = new Array

          sectionHeaders.push({
            name:"criteriaName",
            value:"Domain"
          })

          for(let k in solutionDocument.levelToScoreMapping){
            levelValue[k]=""
            sectionHeaders.push({name: k,value:solutionDocument.levelToScoreMapping[k].label})
          }

          let generateCriteriaThemes =  function (themes,parentData = []) {

            themes.forEach(theme => {

              if (theme.children) {
                let hierarchyTrackToUpdate = [...parentData]
                hierarchyTrackToUpdate.push(_.pick(theme,["type","label","externalId","name"]))

                generateCriteriaThemes(theme.children,hierarchyTrackToUpdate)
                
              } else {

                let tableData = new Array
                let levelObjectFromCriteria={}

                let hierarchyTrackToUpdate = [...parentData]
                hierarchyTrackToUpdate.push(_.pick(theme,["type","label","externalId","name"]))

                theme.criteria.forEach(criteria => {

                  if(criteriaObject[criteria.criteriaId.toString()]) {

                    Object.keys(levelValue).forEach(eachLevel=>{
                      levelObjectFromCriteria[eachLevel] = criteriaObject[criteria.criteriaId.toString()][eachLevel]
                    })

                    tableData.push(_.merge({
                      criteriaName:criteriaObject[criteria.criteriaId.toString()].name,
                    },levelObjectFromCriteria))
                  }

                })

                let eachSection = {
                  table: true,
                  data: tableData,
                  tabularData: {
                    headers: sectionHeaders
                  },
                  summary:hierarchyTrackToUpdate
                }

                responseObject.sections.push(eachSection)
              }
            })

          }

          generateCriteriaThemes(solutionDocument.themes)

          let response = {
            message: "Solution framework + rubric fetched successfully.",
            result: responseObject
          };

          return resolve(response);

        } catch (error) {
          return reject({
            status: 500,
            message: error,
            errorObject: error
          });
        }
      });
    }

};
