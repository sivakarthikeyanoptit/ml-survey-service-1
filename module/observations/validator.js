module.exports = (req) => {

    let entityValidator = {

        add: function () {
            req.checkParams('_id').exists().withMessage("required solution id")
            req.checkBody('data').exists().withMessage("required data")
        }


    }

    if (entityValidator[req.params.method]) entityValidator[req.params.method]();

};