module.exports = class Entities extends Abstract {
  constructor() {
    super(entitiesSchema);
    this.entitiesHelper = new entitiesHelper;
  }

  static get name() {
    return "entities";
  }

  /**
* @api {get} /assessment/api/v1/entities/list/:entityId Entity list
* @apiVersion 0.0.1
* @apiName Entity list
* @apiGroup entities
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/entities/list/5c533ae82ffa8f30d7d7e55e
* @apiUse successBody
* @apiUse errorBody
*/
  list(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entitiesHelper.list(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }


  /**
  * @api {get} /assessment/api/v1/entities/form Entity form
  * @apiVersion 0.0.1
  * @apiName Entity form
  * @apiGroup entities
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entities/form
  * @apiUse successBody
  * @apiUse errorBody
  */
  form(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entitiesHelper.form(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }

  /**
  * @api {get} /assessment/api/v1/entities/fetch/:entityId Entity profile
  * @apiVersion 0.0.1
  * @apiName Entity profile
  * @apiGroup entities
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entities/fetch/5c48875a4196bd6d6904c2c3
  * @apiUse successBody
  * @apiUse errorBody
  */
  fetch(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entitiesHelper.fetch(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }


  /**
  * @api {post} /assessment/api/v1/entities/add Entity add
  * @apiVersion 0.0.1
  * @apiName Entity add
  * @apiGroup entities
  * @apiParamExample {json} Request-Body:
  * {
  *	"parents": [
  *       {
  *	        "studentName" : "",
  *	        "grade" : "",
  *	        "name" : "",
  *	        "gender" : "",
  *   		  "type": "",
  *  		    "typeLabel":"",
  * 		    "phone1": "Phone",
  * 		    "phone2": "",
  * 		    "address": "",
  *	        "schoolId" : "",
  *   		  "schoolName": "",
  *  		    "programId": ""
  *      },
  *	]
  *}
  * @apiUse successBody
  * @apiUse errorBody
  */
  add(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entitiesHelper.add(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }

  /**
* @api {post} /assessment/api/v1/entities/update/:entitiesId Update Entity Information
* @apiVersion 0.0.1
* @apiName Update Entity Information
* @apiGroup entities
* @apiParamExample {json} Request-Body:
* 	{
*	        "studentName" : "",
*	        "grade" : "",
*	        "name" : "",
*	        "gender" : "",
*   		  "type": "",
*  		    "typeLabel":"",
*  		    "phone1": "",
*  	    	"phone2": "",
*     		"address": "",
*	        "schoolId" : "",
*    		  "schoolName": "",
*    		  "programId": "",
*    		  "callResponse":""
*   }
* @apiUse successBody
* @apiUse errorBody
*/
  update(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entitiesHelper.update(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }

  /**
* @api {post} /assessment/api/v1/entities/upload Upload Entity Information CSV
* @apiVersion 0.0.1
* @apiName Upload Entity Information CSV
* @apiGroup entities
* @apiParamExample {json} Request-Body:
* 	Upload CSV
* @apiUse successBody
* @apiUse errorBody
*/
  upload(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entitiesHelper.upload(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }

    /**
* @api {post} /assessment/api/v1/entities/uploadForPortal Upload Entity Information CSV Using Portal
* @apiVersion 0.0.1
* @apiName Upload Entity Information CSV Using Portal
* @apiGroup entities
* @apiParamExample {json} Request-Body:
* 	Upload CSV
* @apiUse successBody
* @apiUse errorBody
*/
  uploadForPortal(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entitiesHelper.uploadForPortal(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }

   /**
* @api {get} /assessment/api/v1/entities/assessments/:entityID Entity assessments
* @apiVersion 0.0.1
* @apiName Entity assessments
* @apiGroup entities
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/entities/assessments/5beaa888af0065f0e0a10515
* @apiUse successBody
* @apiUse errorBody
*/
  assessments(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entitiesHelper.assessments(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }

};
