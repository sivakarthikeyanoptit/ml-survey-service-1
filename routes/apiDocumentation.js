/**
 * @api {get} /assessment/api/v1/assessments/list?type={assessment}&subType={individual}&status={active} Individual assessment list
 * @apiVersion 0.0.1
 * @apiName Individual assessment list
 * @apiGroup IndividualAssessments
 *
 * @apiParam {String} type Type.
 * @apiParam {String} subType SubType.
 * @apiParam {String} status Status.
 * @apiHeader {String} X-authenticated-user-token Authenticity token
 * @apiSampleRequest /assessment/api/v1/assessments/list
 * @apiSuccess {String} message
 * @apiSuccess {String} status
 * @apiSuccess {String} result
 */

/**
* @api {get} /assessment/api/v1/assessments/details/{programID}?assessmentId={assessmentID} Detailed assessments
* @apiVersion 0.0.1
* @apiName Individual assessment details
* @apiGroup IndividualAssessments
* @apiParam {String} assessmentId Assessment ID.
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/assessments/details/:programID
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/feedback/form Feedback form
* @apiVersion 0.0.1
* @apiName Feedback form
* @apiGroup Feedback
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/feedback/form
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/schools/find School find
* @apiVersion 0.0.1
* @apiName School find
* @apiGroup School
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/schools/find
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/schools/assessments/:schoolID School assessments
* @apiVersion 0.0.1
* @apiName School assessments
* @apiGroup School
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/schools/assessments/5bebcfcf92ec921dcf11482b
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/parentRegistry/list/:schoolId Parent Registry list
* @apiVersion 0.0.1
* @apiName Parent Registry list
* @apiGroup ParentRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/parentRegistry/list/5bebcfcf92ec921dcf114827
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/parentRegistry/fetch/:schoolId Parent profile
* @apiVersion 0.0.1
* @apiName Parent Registry profile
* @apiGroup ParentRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/parentRegistry/fetch/5c48875a4196bd6d6904c2c3
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/parentRegistry/form Parent registry form
* @apiVersion 0.0.1
* @apiName Parent Registry form
* @apiGroup ParentRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/parentRegistry/form
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {post} /assessment/api/v1/parentRegistry/add Parent registry add
* @apiVersion 0.0.1
* @apiName Parent Registry add
* @apiGroup ParentRegistry
* @apiParamExample {json} Request-Body:
* {
*	"parents": [
*       {
*	        "studentName" : "Student 1",
*	        "grade" : "1",
*	        "name" : "Parent of student 1",
*	        "gender" : "M",
*   		"type": "SCM",
*  		    "typeLabel":"School committe member",
* 		    "phone1": "1234567890",
* 		    "phone2": "",
* 		    "address": "Address of student 1",
*	        "schoolId" : "5b98f3b19f664f7e1ae74988",
*   		"schoolName": "School of student 1",
*  		"programId": "5b98f3b19f664f7e1ae74988"
*      },
*      {
*	        "studentName" : "Student 2",
*	        "grade" : "2",
*	        "name" : "Parent of student 2",
*	        "gender" : "F",
*   		"type": "SCF",
*   		"phone1": "9898989898",
*   		"phone2": "",
*   		"address": "Address of student 2",
*	        "schoolId" : "5b98f3b19f664f7e1ae74988",
*   		"schoolName": "School of student 1",
*  		"programId": "5b98f3b19f664f7e1ae74988"
*       }
*	]
*}
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {post} /assessment/api/v1/parentRegistry/update/:parentRegistryId Update Parent Information
* @apiVersion 0.0.1
* @apiName Update Parent Information
* @apiGroup ParentRegistry
* @apiParamExample {json} Request-Body:
* 	{
*	        "studentName" : "Student Name",
*	        "grade" : "1",
*	        "name" : "Parent of student",
*	        "gender" : "F",
*   		"type": "SCM",
*  		    "typeLabel":"School committe member",
*  		    "phone1": "232233223",
*  	    	"phone2": "",
*     		"address": "Address of student 1",
*	        "schoolId" : "5b98f3b19f664f7e1ae74988",
*    		"schoolName": "School of student 1",
*    		"programId": "5b98f3b19f664f7e1ae74988",
*    		"callResponse":"R2"
*   }
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {post} /assessment/api/v1/parentRegistry/upload Upload Parent Information CSV
* @apiVersion 0.0.1
* @apiName Upload Parent Information CSV
* @apiGroup ParentRegistry
* @apiParamExample {json} Request-Body:
* 	Upload CSV
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/teacherRegistry/list/:schoolId Teacher Registry list
* @apiVersion 0.0.1
* @apiName Teacher Registry list
* @apiGroup TeacherRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/teacherRegistry/list/5bebcfcf92ec921dcf114827
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/teacherRegistry/fetch/:schoolId Teacher profile
* @apiVersion 0.0.1
* @apiName Teacher Registry profile
* @apiGroup TeacherRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/teacherRegistry/fetch/5c54058ae2008330cc2de9ae
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/teacherRegistry/form Teacher registry form
* @apiVersion 0.0.1
* @apiName Teacher Registry form
* @apiGroup TeacherRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/teacherRegistry/form
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {post} /assessment/api/v1/teacherRegistry/add Teacher registry add
* @apiVersion 0.0.1
* @apiName Teacher Registry add
* @apiGroup TeacherRegistry
* @apiParamExample {json} Request-Body:
*{
*	"teachers": [
*       {
*        	"name": "E",
*        	"qualifications": "Bachelor",
*        	"yearsOfExperience": "3",
*        	"yearsInCurrentSchool": "5",
*        	"schoolId": "5bebcfcf92ec921dcf114827",
*        	"schoolName": "GHPS, Muttanallur",
*        	"programId": "5b98d7b6d4f87f317ff615ee"
*        },
*        {
*        	"name": "F",
*        "qualifications": "Master",
*        "yearsOfExperience": "5",
*        "yearsInCurrentSchool": "6",
*        "schoolId": "5bebcfcf92ec921dcf114827",
*        "schoolName": "GHPS, Muttanallur",
*        "programId": "5b98d7b6d4f87f317ff615ee"
*        }
*	]
*}
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {post} /assessment/api/v1/teacherRegistry/update/:TeacherRegistryId Update Teacher Information
* @apiVersion 0.0.1
* @apiName Update teacher Information
* @apiGroup TeacherRegistry
* @apiParamExample {json} Request-Body:
* 	{
*	        "name" : "Name of the teacher",
*	        "gender" : "F",
*   }
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {post} /assessment/api/v1/teacherRegistry/upload Upload Teacher Information CSV
* @apiVersion 0.0.1
* @apiName Upload Teacher Information CSV
* @apiGroup TeacherRegistry
* @apiParamExample {json} Request-Body:
* 	Upload CSV
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/schoolLeadersRegistry/list/:schoolId School Leaders Registry list
* @apiVersion 0.0.1
* @apiName School Leaders Registry list
* @apiGroup SchoolLeadersRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/schoolLeadersRegistry/list/5bebcfcf92ec921dcf114827
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/schoolLeadersRegistry/fetch/:schoolId School Leaders Registry profile
* @apiVersion 0.0.1
* @apiName School Leaders Registry Profile
* @apiGroup SchoolLeadersRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/schoolLeadersRegistry/fetch/5c540f88e2008330cc2de9b3
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/schoolLeadersRegistry/form School Leaders Registry form
* @apiVersion 0.0.1
* @apiName School Leaders Registry form
* @apiGroup SchoolLeadersRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/schoolLeadersRegistry/form
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {post} /assessment/api/v1/schoolLeadersRegistry/add School Leaders Registry add
* @apiVersion 0.0.1
* @apiName School Leaders Registry add
* @apiGroup SchoolLeadersRegistry
* @apiParamExample {json} Request-Body:
*{
*	"schoolLeaders": [
*        {
*       	"name": "Nishant",
*        "age": "23",
*        "gender": "Male",
*        "description": "Principal",
*        "experienceInEducationSector": "5",
*        "experienceInCurrentSchool": "2",
*        "experienceAsSchoolLeaders": "7",
*        "dutiesOrResponsibility": "Yes sometimes i used to teach",
*        "timeOfDiscussion": "Between 6 to 7",
*        "nonTeachingHours": "7 to 8",
*        "bestPart": "Encourage hard working people",
*        "challenges": "Many ups and down ",
*        "schoolId": "5bebcfcf92ec921dcf114827",
*        "schoolName": "GHPS, Muttanallur",
*        "programId": "5b98d7b6d4f87f317ff615ee"
*        },
*        {
*        		"name": "Raunak",
*        "age": "23",
*        "gender": "Male",
*        "description": "Coordinator",
*        "experienceInEducationSector": "6",
*        "experienceInCurrentSchool": "7",
*        "experienceAsSchoolLeaders": "1",
*        "dutiesOrResponsibility": "Yes sometimes i used to teach",
*        "timeOfDiscussion": "Between 5 to 6",
*        "nonTeachingHours": "8 to 9",
*        "bestPart": "Encourage hard working people",
*        "challenges": "Many ups and down ",
*        "schoolId": "5bebcfcf92ec921dcf114827",
*        "schoolName": "GHPS, Muttanallur",
*        "programId": "5b98d7b6d4f87f317ff615ee"
*        }
*	]
*}
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {post} /assessment/api/v1/schoolLeadersRegistry/update/:SchoolLeadersRegistryId Update Teacher Information
* @apiVersion 0.0.1
* @apiName Update teacher Information
* @apiGroup SchoolLeadersRegistry
* @apiParamExample {json} Request-Body:
* 	{
*	        "name" : "Name of the teacher",
*	        "gender" : "F",
*   }
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {post} /assessment/api/v1/parentRegistry/upload Upload School Leader Registry Information CSV
* @apiVersion 0.0.1
* @apiName Upload School Leader Registry Information CSV
* @apiGroup SchoolLeadersRegistry
* @apiParamExample {json} Request-Body:
* 	Upload CSV
* @apiSuccess {String} status 200
* @apiSuccess {String} result Data
*/

/**
* @api {get} /assessment/api/v1/reports/programsSubmissionStatus/:programId Fetch program submission status
* @apiVersion 0.0.1
* @apiName Fetch program submission status
* @apiGroup Report
* @apiParam {String} evidenceId Evidence ID.
*/

/**
* @api {get} /assessment/api/v1/reports/teacherRegistry/:programId Fetch School Leader Registry
* @apiVersion 0.0.1
* @apiName Fetch School Leader Registry
* @apiGroup Report
* @apiParam {String} fromDate From Date
* @apiParam {String} toDate To Date
*/

/**
* @api {get} /assessment/api/v1/reports/assessorSchools/ Fetch assessors reports for school
* @apiVersion 0.0.1
* @apiName Fetch assessors reports for school
* @apiGroup Report
*/

/**
* @api {get} /assessment/api/v1/reports/teacherRegistry/:programId Fetch Teacher Registry
* @apiVersion 0.0.1
* @apiName Fetch Teacher Registry
* @apiGroup Report
* @apiParam {String} fromDate From Date
* @apiParam {String} toDate To Date
*/

/**
* @api {get} /assessment/api/v1/reports/generateCriteriasBySchoolId/:schoolExternalId Fetch criterias based on schoolId
* @apiVersion 0.0.1
* @apiName Fetch criterias based on schoolId
* @apiGroup Report
*/

/**
* @api {get} /assessment/api/v1/reports/schoolAssessors/ Fetch school wise assessor reports
* @apiVersion 0.0.1
* @apiName Fetch school wise assessor reports
* @apiGroup Report
*/

/**
* @api {get} /assessment/api/v1/reports/assessorSchools/ Fetch assessors reports based on program id
* @apiVersion 0.0.1
* @apiName Fetch assessors reports based on program id
* @apiGroup Report
*/

/**
* @api {get} /assessment/api/v1/reports/status/ Fetch submission reports for school
* @apiVersion 0.0.1
* @apiName Fetch submission reports for school
* @apiGroup Report
*/

/**
* @api {get} /assessment/api/v1/reports/programSchoolsStatus/:programId Fetch school status based on program Id
* @apiVersion 0.0.1
* @apiName Fetch school status based on program Id
* @apiGroup Report
*/

/**
* @api {get} /assessment/api/v1/reports/generateSubmissionReportsBySchoolId/:schoolExternalId Fetch school submission status
* @apiVersion 0.0.1
* @apiName Fetch school submission status
* @apiGroup Report
*/

/**
* @api {get} /assessment/api/v1/reports/parentRegistry/:programId Fetch Parent Registry
* @apiVersion 0.0.1
* @apiName Fetch Parent Registry
* @apiGroup Report
* @apiParam {String} fromDate From Date
* @apiParam {String} toDate To Date
*/