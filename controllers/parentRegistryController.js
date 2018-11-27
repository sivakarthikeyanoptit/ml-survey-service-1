module.exports = class ParentRegistry extends Abstract {

  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "parentRegistry";
  }


  add(req) {

    return new Promise(async (resolve, reject) => {

      try {

        if(req.body.parents) {
          let addParentsQuery = await database.models["parent-registry"].insertMany(
            req.body.parents
          );
          if(addParentsQuery.length != req.body.parents.length) {
            throw "Some parent information was not inserted!"
          }
        } else {
          throw "Bad Request"
        }

        let responseMessage = "Parent information added successfully."

        let response = { message: responseMessage};

        return resolve(response);
      } catch (error) {
        return reject({message:error});
      }

    })
  }

  list(req) {

    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let result = {}

        if(req.params._id) {
    
          let queryObject = {
            schoolId: req.params._id
          }

          result = await database.models["parent-registry"].find(
            queryObject
          );

        } else {
          throw "Bad Request"
        }

        let responseMessage = "Parent information fetched successfully."

        let response = { message: responseMessage,result: result};

        return resolve(response);
      } catch (error) {
        return reject({message:error});
      }

    })
  }



  async form(req) {
    return new Promise(async function(resolve, reject) {

      let result = [
        {
          field: "studentName",
          label: "Student Name",
          value: "",
          visible: true,
          editable: true,
          input: "text",
          validation: {
            required: true
          }
        },
        {
          field: "grade",
          label: "Grade",
          value: "",
          visible: true,
          editable: true,
          input: "radio",
          options: [
            {
              value: "nursery",
              label: "Nursery"
            },
            {
              value: "lowerKG",
              label: "Lower KG"
            },
            {
              value: "upperKG",
              label: "Upper KG"
            },
            {
              value: "kindergarten",
              label: "Kindergarten"
            },
            {
              value: 1,
              label: 1
            },
            {
              value: 2,
              label: 2
            },
            {
              value: 3,
              label: 3
            },
            {
              value: 4,
              label: 4
            },
            {
              value: 5,
              label: 5
            },
            {
              value: 6,
              label: 6
            },
            {
              value: 7,
              label: 7
            },
            {
              value: 8,
              label: 8
            },
            {
              value: 9,
              label: 9
            },
            {
              value: 10,
              label: 10
            },
            {
              value: 11,
              label: 11
            },
            {
              value: 12,
              label: 12
            }
          ],
          validation: {
            required: true
          }
        },
        {
          field: "section",
          label: "Section",
          value: "",
          visible: true,
          editable: true,
          input: "text",
          validation: {
            required: false,
            regex: "^[a-zA-Z]+$"
          }
        },
        {
          field: "name",
          label: "Parent Name",
          value: "",
          visible: true,
          editable: true,
          input: "text",
          validation: {
            required: false
          }
        },
        {
          field: "gender",
          label: "Parent Gender",
          value: "",
          visible: true,
          editable: true,
          input: "radio",
          options: [
            {
              value: "M",
              label: "Male"
            },
            {
              value: "F",
              label: "Female"
            }
          ],
          validation: {
            required: false
          }
        },
        {
          field: "type",
          label: "Parent Type",
          value: "",
          visible: true,
          editable: true,
          input: "radio",
          options: [
            {
              value: "P1",
              label: "Parent only"
            },
            {
              value: "P2",
              label: "SMC Parent Member"
            },
            {
              value: "P3",
              label: "Safety Committee Member"
            },
            {
              value: "P4",
              label: "EWS-DG Parent"
            },
            {
              value: "P5",
              label: "Social Worker"
            },
            {
              value: "P6",
              label: "Elected Representative Nominee"
            }
          ],
          validation: {
            required: false
          }
        },
        {
          field: "phone1",
          label: "Phone Number",
          value: "",
          visible: true,
          editable: true,
          input: "number",
          validation: {
            required: true,
            regex: "^[0-9]{10}+$"
          }
        },
        {
          field: "phone2",
          label: "Additional Phone Number",
          value: "",
          visible: true,
          editable: true,
          input: "number",
          validation: {
            required: false,
            regex: "^[0-9]{10}+$"
          }
        },
        {
          field: "address",
          label: "Residential Address",
          value: "",
          visible: true,
          editable: true,
          input: "textarea",
          validation: {
            required: true
          }
        },
        {
          field: "schoolId",
          label: "School ID",
          value: "",
          visible: false,
          editable: false,
          input: "text",
          validation: {
            required: true
          }
        },
        {
          field: "schoolName",
          label: "School Name",
          value: "",
          visible: false,
          editable: false,
          input: "text",
          validation: {
            required: true
          }
        },
        {
          field: "programId",
          label: "Program ID",
          value: "",
          visible: false,
          editable: false,
          input: "text",
          validation: {
            required: true
          }
        }
      ]

      let responseMessage = "Parent registry from fetched successfully."

      let response = { message: responseMessage, result: result };
      return resolve(response);

    }).catch(error => {
      reject(error);
    });
  }

};
