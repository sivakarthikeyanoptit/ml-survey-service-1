module.exports = {
  async up(db) {
    global.migrationMsg = "Created entity types"

    let schoolEntity = {
      name : "school",
      regsitryDetails : {
          name : "schoolRegsitry"
      },
      createdAt : new Date,
      profileForm : [],
      profileFields : [
        "externalId",
        "addressLine1",
        "addressLine2",
        "city",
        "country",
        "createdBy",
        "createdDate",
        "gpsLocation",
        "isDeleted",
        "name",
        "phone",
        "principalName",
        "state",
        "status",
        "updatedBy",
        "updatedDate",
        "pincode",
        "districtId",
        "districtName",
        "zoneId",
        "blockId",
        "administration",
        "gender",
        "shift",
        "schoolTypes",
        "totalStudents",
        "totalGirls",
        "totalBoys",
        "lowestGrade",
        "highestGrade",
        "totalEnglishTeachers",
        "totalHindiTeachers",
        "totalMathsTeachers",
        "totalScienceTeachers",
        "totalSocialTeachers",
        "totalSocialScienceTeachers",
        "totalComputerTeachers",
        "mediumOfInstruction",
        "totalPhysicsTeachers",
        "totalChemistryTeachers",
        "totalBiologyTeachers",
        "totalEconomicsTeachers",
        "totalPoliticalScienceTeachers",
        "totalAccountsTeachers",
        "totalBusinessStudiesTeachers",
        "totalHistoryTeachers",
        "totalGeographyTeachers",
        "streamOffered",
        "emailId",
        "presenceOfSignMarkingSchoolEntrance",
        "schoolTiming",
        "isPrePrimaryPresentOrNot",
        "totalSections",
        "totalStudentsInPrePrimary",
        "totalStudentsInPrimary",
        "totalStudentsInMiddleAndSecondarySchool",
        "averageStudentsPerSection",
        "totalStudentsGrade1",
        "totalStudentsGrade2",
        "totalStudentsGrade3",
        "totalStudentsGrade4",
        "totalStudentsGrade5",
        "totalStudentsGrade6",
        "totalStudentsGrade7",
        "totalStudentsGrade8",
        "totalStudentsGrade9",
        "totalStudentsGrade10",
        "totalStudentsGrade11",
        "totalStudentsGrade12",
        "totalNoOfTeachers",
        "totalNoOfPrincipal",
        "totalNoOfHMsOrCoordinators",
        "presenceOfSchoolBoardOrManagement",
        "briefHistoryOfTheSchool",
        "descriptionOfCommunityAroundSchool",
        "studentBackground",
        "stateOfStudentDropout",
        "issuesWithTeachersLeavingSchool",
        "teacherAttendanceInTheSchool",
        "adminOrHelpingStaff"
      ]
    }

    let parentEntity = {
      name : "parent",
      regsitryDetails : {
          name : "parentsRegsitry"
      },
      createdAt: new Date,
      profileFields : [
        "studentName",
        "grade",
        "name",
        "gender",
        "type",
        "phone1",
        "phone2",
        "address",
        "schoolId",
        "schoolName",
        "programId",
        "callResponse",
        "callResponseUpdatedTime"
      ],
      profileForm : [
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
                value: "1",
                label: 1
              },
              {
                value: "2",
                label: 2
              },
              {
                value: "3",
                label: 3
              },
              {
                value: "4",
                label: 4
              },
              {
                value: "5",
                label: 5
              },
              {
                value: "6",
                label: 6
              },
              {
                value: "7",
                label: 7
              },
              {
                value: "8",
                label: 8
              },
              {
                value: "9",
                label: 9
              },
              {
                value: "10",
                label: 10
              },
              {
                value: "11",
                label: 11
              },
              {
                value: "12",
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
            input: "multiselect",
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
    }

    let teacherEntity = {
      name : "teacher",
      regsitryDetails : {
          name : "teacherRegsitry"
      },
      createdAt: new Date,
      profileFields : [
        "name",
        "qualifications",
        "yearsOfExperience",
        "yearsInCurrentSchool",
        "schoolId",
        "schoolName",
        "programId"
      ],
      profileForm : [
        {
            field: "name",
            label: "Name",
            value: "",
            visible: true,
            editable: true,
            input: "text",
            validation: {
                required: true
            }
        },
        {
            field: "qualifications",
            label: "Qualifications",
            value: "",
            visible: true,
            editable: true,
            input: "text",
            validation: {
                required: true
            }
        },
        {
            field: "yearsOfExperience",
            label: "Years Of Experience",
            value: "",
            visible: true,
            editable: true,
            input: "number",
            validation: {
                required: true
            }
        },
        {
            field: "yearsInCurrentSchool",
            label: "Number of years in this school",
            value: "",
            visible: true,
            editable: true,
            input: "number",
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
    }

  
    let schoolLeaderEntity = {
      name : "schoolLeader",
      regsitryDetails : {
          name : "schoolLeaderRegsitry"
      },
      createdAt : new Date,
      profileFields : [
        "name",
        "age",
        "gender",
        "bio",
        "experienceInEducationSector",
        "experienceInCurrentSchool",
        "experienceAsSchoolLeader",
        "dutiesOrResponsibility",
        "timeOfAvailability",
        "nonTeachingHours",
        "bestPart",
        "challenges",
        "schoolId",
        "schoolName",
        "programId",
      ],
      profileForm: [
        {
            field: "name",
            label: "Name",
            tip: "",
            value: "",
            visible: true,
            editable: true,
            input: "text",
            validation: {
                required: true
            }
        },
        {
            field: "age",
            label: "Age",
            tip: "Need not ask. Write an approximation",
            value: "",
            visible: true,
            editable: true,
            input: "number",
            validation: {
                required: true
            }
        },
        {
            field: "gender",
            label: "Gender",
            tip: "",
            value: "",
            visible: true,
            editable: true,
            input: "radio",
            options: [
                {
                  value: "R1",
                  label: "Male"
                },
                {
                  value: "R2",
                  label: "Female"
                },
                {
                  value: "R3",
                  label: "Other"
                }
            ],
            validation: {
                required: true
            }
        },
        {
            field: "bio",
            label: "Can you tell me a little about yourself?",
            tip: "",
            value: "",
            visible: true,
            editable: true,
            input: "text",
            validation: {
                required: true
            }
        },
        {
            field: "experienceInEducationSector",
            label: "No. of years in education sector",
            tip: "Enter number in terms of years",
            value: "",
            visible: true,
            editable: true,
            input: "number",
            validation: {
                required: true
            }
        },
        {
            field: "experienceInCurrentSchool",
            label: "No. of years in this school",
            tip: "Enter number in terms of years",
            value: "",
            visible: true,
            editable: true,
            input: "number",
            validation: {
                required: true
            }
        },
        {
            field: "experienceAsSchoolLeader",
            label: "No. of years as school leader here",
            tip: "Enter number in terms of years",
            value: "",
            visible: true,
            editable: true,
            input: "number",
            validation: {
                required: true
            }
        },
        {
            field: "dutiesOrResponsibility",
            label: "Roles and responsibilities",
            tip: "Also find out how often they come to school",
            value: "",
            visible: true,
            editable: true,
            input: "text",
            validation: {
                required: true
            }
        },
        {
            field: "timeOfAvailability",
            label: "Time for planning during school hours",
            tip: "",
            value: "",
            visible: true,
            editable: true,
            input: "text",
            validation: {
                required: true
            }
        },
        {
            field: "nonTeachingHours",
            label: "Number of non-teaching hours in a day:",
            tip: "",
            value: "",
            visible: true,
            editable: true,
            input: "number",
            validation: {
                required: true
            }
        },
        {
            field: "bestPart",
            label: "Best thing about the profession",
            tip: "",
            value: "",
            visible: true,
            editable: true,
            input: "text",
            validation: {
                required: true
            }
        },
        {
            field: "challenges",
            label: "Challenges in the profession",
            tip: "",
            value: "",
            visible: true,
            editable: true,
            input: "text",
            validation: {
                required: true
            }
        },
        {
            field: "schoolId",
            label: "School ID",
            tip: "",
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
            tip: "",
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
            tip: "",
            value: "",
            visible: false,
            editable: false,
            input: "text",
            validation: {
                required: true
            }
        }
      ]
    }

    let studentEntity = {
      name : "student",
      regsitryDetails : {
          name : "studentRegsitry"
      },
      profileFields : [

      ],
      profileForm: [

      ],
      createdAt : new Date
    }

  
    let blockEntity = {
      name : "block",
      regsitryDetails : {
          name : "blockRegsitry"
      },
      profileFields : [
        "name",
        "blockId",
        "districtName",
        "state",
        "region"
      ],
      profileForm: [

      ],
      createdAt : new Date 
    }

    let districtEntity = {
      name : "district",
      regsitryDetails : {
          name : "districtRegsitry"
      },
      profileFields : [],
      profileForm: [
        "name",
        "state",
        "districtId",
        "region"
      ],
      createdAt : new Date 
    }

    
    return await db.collection('entityTypes').insertMany( [
      schoolEntity,
      parentEntity,
      teacherEntity,
      studentEntity,
      schoolLeaderEntity,
      blockEntity,
      districtEntity
    ]);

  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
