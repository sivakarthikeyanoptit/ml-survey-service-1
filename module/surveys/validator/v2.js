module.exports = (req) => {

    let surveysValidator = {
        details : function() {
            req.checkQuery('solutionId')
            .exists()
            .withMessage("required solution id")
            .isMongoId().withMessage("Invalid solution id");
        }
    }

    if (surveysValidator[req.params.method]) {
        surveysValidator[req.params.method]();
    }
};