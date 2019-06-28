module.exports = (req) => {

    let programsValidator = {

        entityList: function () {
            req.checkQuery('solutionId').exists().withMessage("required solution id")
        },
        userEntityList: function () {
            req.checkQuery('solutionId').exists().withMessage("required solution id")
        },
        entityBlocks: function () {
            req.checkQuery('solutionId').exists().withMessage("required solution id")
        },
        userList: function () {
            req.checkQuery('solutionId').exists().withMessage("required solution id")
        },
        blockEntity: function () {
            req.checkQuery('solutionId').exists().withMessage("required solution id")
            req.checkQuery('blockId').exists().withMessage("required block id")
        }

    }

    if (programsValidator[req.params.method]) programsValidator[req.params.method]();

};