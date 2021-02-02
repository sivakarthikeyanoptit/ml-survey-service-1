/**
 * name : healthCheckService.js.
 * author : Aman Karki.
 * created-date : 02-Feb-2021.
 * Description : Health check service helper functionality.
*/

// Dependencies
const { v1 : uuidv1 } = require('uuid');

let healthCheckStatus = function(req,res) {
    let responseData = response(req);
    res.status(200).json(responseData);
}

let response = function ( req,result = {} ) {
    return {
        "id" : "assessmentService.Health.API",
        "ver" : "1.0",
        "ts" : new Date(),
        "params" : {
            "resmsgid" : uuidv1(),
            "msgid" : req.headers['msgid'] || req.headers.msgid || uuidv1(),
            "status" : "successful",
            "err" : "null",
            "errMsg" : "null"
        },
        "status" : 200,
        result : result
    }
}

module.exports = {
    healthCheckStatus : healthCheckStatus
}