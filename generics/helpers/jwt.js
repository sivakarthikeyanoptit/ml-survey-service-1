const JWT = require('jsonwebtoken');
let secret = process.env.secret || "logisure";

module.exports = {
    issue : function(payload) {
        return JWT.sign(payload, this.secret);
    },
    verify : function(token, callback) {
        return JWT.verify(token, this.secret, callback);
    }
}