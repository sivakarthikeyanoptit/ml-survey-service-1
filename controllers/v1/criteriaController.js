/**
 * name : criteriaController.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : Criteria related information.
 */

// Dependencies
const csv = require("csvtojson");
const FileStream = require(ROOT_PATH + "/generics/fileStream");
const criteriaHelper = require(MODULES_BASE_PATH + "/criteria/helper");

 /**
    * Criteria
    * @class
*/
module.exports = class Criteria extends Abstract {

  constructor() {
    super(criteriaSchema);
  }

  static get name() {
    return "criteria";
  }

  /**
  * @api {post} /assessment/api/v1/criteria/upload Upload Criteria CSV
  * @apiVersion 1.0.0
  * @apiName Upload Criteria CSV
  * @apiGroup Criteria
  * @apiParam {File} criteria Mandatory criteria file of type CSV.
  * @apiUse successBody
  * @apiUse errorBody
  */

  /**
   * Insert bulk criteria.
   * @method
   * @name upload
   * @param {Object} req - All requested Data.
   * @param {Object} req.files - requested files.
   * @returns {CSV} A CSV with name Criteria-Upload is saved inside 
   * public/reports/currentDate
   */

  async upload(req) {
    return new Promise(async (resolve, reject) => {
      try {
        
        if (!req.files || !req.files.criteria) {
          throw messageConstants.apiResponses.CRITERIA_FILE_NOT_FOUND;
        }

        let criteriaData = 
        await csv().fromString(req.files.criteria.data.toString());

        const fileName = `Criteria-Upload`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        let updatedCriteria = await criteriaHelper.upload(
          criteriaData,
          req.userDetails.id,
          req.userDetails.userToken
        );

        if( updatedCriteria.length > 0 ) {
          updatedCriteria.forEach(criteria=>{
            input.push(criteria);
          })
        }

        input.push(null);

      }
      catch (error) {
        return reject({
          status: error.status || httpStatusCode.internal_server_error.status,
          message: error.message || httpStatusCode.internal_server_error.message,
          errorObject: error
        });
      }
    })
  }

  /**
   * @api {post} /assessment/api/v1/criteria/create Create Questions 
   * @apiVersion 1.0.0
   * @apiName Create criteria
   * @apiGroup Criteria
   * @apiUse successBody
   * @apiUse errorBody
   */

  /**
   * create criteria.
   * @method
   * @name create
   * @param {Object} req - requested data.
   * @param {Object} req.body - requested body data. 
   * @returns {Object} 
   */

  create(req){
    return new Promise(async (resolve, reject) => {
      try {
        let criteriaDocuments = await criteriaHelper.create(req.body);
        return resolve({
          result : criteriaDocuments
        });

      } catch (error) {
        reject({
          message: error
        });
      }
    });
  }

    /**
   * @api {post} /assessment/api/v1/criteria/update Create Questions 
   * @apiVersion 1.0.0
   * @apiName Update criteria
   * @apiGroup Criteria
   * @apiUse successBody
   * @apiUse errorBody
   */

  /**
   * Update criteria.
   * @method
   * @name create
   * @param {Object} req - requested data.
   * @param {Object} req.body - requested criteria update data. 
   * @returns {Object} 
   */

  async update(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let queryObject = {
          externalId: req.query.externalId
        }

        if(req.query.frameworkIdExists) {
          queryObject["frameworkCriteriaId"] = {
            $exists : true
          }
        };

        let updateObject = {
          "$set" : {}
        };

        let criteriaUpdateData = req.body;

        Object.keys(criteriaUpdateData).forEach(criteriaData=>{
          updateObject["$set"][criteriaData] = criteriaUpdateData[criteriaData];
        })

        updateObject["$set"]["updatedBy"] = req.userDetails.id;

        await database.models.criteria.findOneAndUpdate(queryObject, updateObject)

        return resolve({
          status: httpStatusCode.ok.status,
          message: messageConstants.apiResponses.CRITERIA_UPDATED
        });
      }
      catch (error) {
        reject({
          status: error.status || httpStatusCode.internal_server_error.status,
          message: error.message || httpStatusCode.internal_server_error.message,
          errorObject: error
        })
      }
    })
  } 

};



