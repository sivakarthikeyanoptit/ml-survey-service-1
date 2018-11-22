module.exports = class Feedback extends Abstract {

  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "feedback";
  }

  async form(req) {
    return new Promise(async function(resolve, reject) {

      let result = [
        {
          field: "q1",
          label: "How was your experience in the school?",
          value: "",
          visible: true,
          editable: true,
          input: "radio",
          showRemarks:false,
          remarks:"",
          visibleIf : "",
          children : [],
          options: [
            {
              value: "veryPoor",
              label: "Very Poor"
            },
            {
              value: "poor",
              label: "Poor"
            },
            {
              value: "average",
              label: "Average"
            },
            {
              value: "good",
              label: "Good"
            },
            {
              value: "excellent",
              label: "Excellent"
            }
          ],
          validation: {
            required: false
          }
        },  
        {
          field: "q2",
          label: "Was the school evaluation done in a smooth and obstacle free way?",
          value: "",
          visible: true,
          editable: true,
          input: "radio",
          showRemarks:false,
          remarks:"",
          visibleIf : "",
          children : ["q3"],
          options: [
            {
              value: "yes",
              label: "Yes"
            },
            {
              value: "no",
              label: "No"
            }
          ],
          validation: {
            required: false
          }
        },  
        {
          field: "q3",
          label: "If no, what was the cause?",
          value: "",
          visible: true,
          editable: true,
          input: "multiselect",
          showRemarks:true,
          remarks:"",
          children : [],
          visibleIf : [ 
            {
                operator : "===",
                value : "no",
                field : "q2"
            }
          ],
          options: [
            {
              value: "principalNotCooperative",
              label: "Principal was not cooperative"
            },
            {
              value: "teachersNotCooperative",
              label: "Teachers were not cooperative"
            },
            {
              value: "schoolManagementHadIssues",
              label: "School management had issues"
            },
            {
              value: "studentsWereAway",
              label: "Students were away for various reasons"
            },
            {
              value: "others",
              label: "Others"
            }
          ],
          validation: {
            required: true
          }
        },
        {
          field: "q4",
          label: "If the school has best practices, share one or two exceptional examples of them?",
          value: "",
          visible: true,
          editable: true,
          input: "textarea",
          showRemarks:false,
          remarks:"",
          visibleIf : "",
          children : [],
          validation: {
            required: false
          }
        },
        {
          field: "schoolId",
          label: "School ID",
          value: "",
          visible: false,
          editable: false,
          input: "text",
          visibleIf : "",
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
          visibleIf : "",
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
          visibleIf : "",
          validation: {
            required: true
          }
        }
      ]

      let responseMessage = "Feedback from fetched successfully."

      let response = { message: responseMessage, result: result };
      return resolve(response);

    }).catch(error => {
      reject(error);
    });
  }

};
