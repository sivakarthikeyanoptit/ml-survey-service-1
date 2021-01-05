module.exports = (req) => {

    let surveysValidator = {
        details : function() {
            req.checkQuery('solutionId')
            .exists()
            .withMessage("required solution id")
            .isMongoId().withMessage("Invalid solution id");

            req.checkQuery('programId')
            .exists()
            .withMessage("required program id")
            .isMongoId().withMessage("Invalid program id");
        }
    }

    if (surveysValidator[req.params.method]) {
        surveysValidator[req.params.method]();
    }
};