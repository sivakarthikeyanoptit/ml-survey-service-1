module.exports = (req) => {

    let entityAssessorValidator = {

        update: function () {
        },
        add: function () {
        },
        fetch: function () {
        },
        list: function () {
        }


    }

    if (entityAssessorValidator[req.params.method]) entityAssessorValidator[req.params.method]();

};