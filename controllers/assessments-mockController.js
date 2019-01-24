module.exports = class AssessmentsMock {

    async list(req) {

        return new Promise(async (resolve, reject) => {

            let result = [
                {
                    "_id": "5c486dbe691959f86afdc0e9",
                    "externalId": "PROGID01",
                    "evaluationFrameWorks": [
                        {
                            "type": "assessment",
                            "id": "5b98fa069f664f7e1ae7498d",
                            "externalId": "EF-DCPCR-2018-001",
                            "name": "DCPCR Assessment Framework 2018",
                            "description": "DCPCR Assessment Framework 2018",
                            "author": "a082787f-8f8f-42f2-a706-35457ca6f1fd"
                        }
                    ]
                }
            ]

            return resolve({
                result: result
            })

        })

    }

    async details(req) {

        return new Promise(async (resolve, reject) => {

            let result = {
                "entityProfile": {
                    "_id": "5bebcfcf92ec921dcf114827",
                    "form": [
                        {
                            "field": "externalId",
                            "label": "External Id",
                            "value": "Chandapura01",
                            "visible": true,
                            "editable": false,
                            "input": "text"
                        }
                    ]
                },
                "program": {
                    "_id": "5b98d7b6d4f87f317ff615ee",
                    "externalId": "PROGID01",
                    "name": "DCPCR",
                    "description": "DCPCR Program 2018",
                    "imageCompression": {
                        "quality": 10
                    },
                    "projectManagers": {
                        "userId": "c045ff0d-6bcf-4ea4-88aa-e129a18751a9",
                        "externalId": "PM01"
                    },
                    "leadAssessors": {
                        "userId": "7516521b-3be6-445e-bfe3-8bcef87f00dc",
                        "externalId": "LA01"
                    }
                },
                "assessments": [
                    {
                        "name": "DCPCR Assessment Framework 2018",
                        "description": "DCPCR Assessment Framework 2018",
                        "externalId": "EF-DCPCR-2018-001",
                        "submissionId": "5c480e355aa4805080dae4d3",
                        "evidences": [
                            {
                                "name": "Assessment- Class 3",
                                "externalId": "AC3",
                                "tip": "Some tip at evidence level.",
                                "description": "Some description about evidence",
                                "startTime": "",
                                "endTime": "",
                                "isSubmitted": false,
                                "modeOfCollection": "onfield",
                                "canBeNotApplicable": true,
                                "sections": [
                                    {
                                        "name": "Data to be Filled",
                                        "questions": [
                                            {
                                                "_id": "5c0130ebaf0065f0e0a664bf",
                                                "question": [
                                                    "Reading assessment:",
                                                    ""
                                                ],
                                                "options": [],
                                                "children": [],
                                                "questionGroup": [
                                                    "A1"
                                                ],
                                                "fileName": [],
                                                "instanceQuestions": [
                                                    {
                                                        "_id": "5be8e4482d325f5b71da4e03",
                                                        "question": [
                                                            "Student Name",
                                                            ""
                                                        ],
                                                        "options": [],
                                                        "children": [],
                                                        "questionGroup": [
                                                            "A1"
                                                        ],
                                                        "fileName": [],
                                                        "instanceQuestions": [],
                                                        "deleted": false,
                                                        "tip": "",
                                                        "externalId": "AS/TL/01a",
                                                        "visibleIf": "",
                                                        "file": "",
                                                        "responseType": "text",
                                                        "validation": {
                                                            "required": true
                                                        },
                                                        "showRemarks": false,
                                                        "isCompleted": false,
                                                        "remarks": "",
                                                        "value": "",
                                                        "canBeNotApplicable": "false",
                                                        "usedForScoring": "",
                                                        "modeOfCollection": "onfield",
                                                        "questionType": "auto",
                                                        "accessibility": "local",
                                                        "updatedAt": "2018-11-12T02:24:08.052Z",
                                                        "createdAt": "2018-11-12T02:24:08.052Z",
                                                        "__v": 0,
                                                        "evidenceMethod": "AC3",
                                                        "payload": {
                                                            "criteriaId": "5be1801f5e852b0e920ad154",
                                                            "responseType": "text",
                                                            "evidenceMethod": "AC3"
                                                        },
                                                        "startTime": "",
                                                        "endTime": ""
                                                    }
                                                ],
                                                "deleted": false,
                                                "tip": "Collect multiple reading assessment data",
                                                "externalId": "AS/TL/01",
                                                "visibleIf": "",
                                                "file": "",
                                                "responseType": "matrix",
                                                "validation": {
                                                    "required": true
                                                },
                                                "showRemarks": false,
                                                "isCompleted": false,
                                                "remarks": "",
                                                "value": "",
                                                "canBeNotApplicable": "false",
                                                "notApplicable": "",
                                                "usedForScoring": "",
                                                "modeOfCollection": "onfield",
                                                "questionType": "auto",
                                                "accessibility": "local",
                                                "instanceIdentifier": "Class 3 student",
                                                "updatedAt": "2018-12-04T02:39:59.453Z",
                                                "createdAt": "2018-11-12T02:57:08.350Z",
                                                "__v": 0,
                                                "isAGeneralQuestion": true,
                                                "evidenceMethod": "AC3",
                                                "payload": {
                                                    "criteriaId": "5be1801f5e852b0e920ad154",
                                                    "responseType": "matrix",
                                                    "evidenceMethod": "AC3",
                                                    "isAGeneralQuestion": true
                                                },
                                                "startTime": "",
                                                "endTime": ""
                                            }
                                        ]
                                    }
                                ],
                                "notApplicable": false,
                                "canBeNotAllowed": true,
                                "remarks": ""
                            }
                        ],
                        "submissions": {
                            "CO": {
                                "externalId": "CO",
                                "answers": {
                                    "5be2c09942059f313f3df85d": {
                                        "qid": "5be2c09942059f313f3df85d",
                                        "value": [
                                            {
                                                "5be2c11042059f313f3df85e": {
                                                    "qid": "5be2c11042059f313f3df85e",
                                                    "value": 3,
                                                    "remarks": "",
                                                    "fileName": [],
                                                    "payload": {
                                                        "question": [
                                                            "Grade",
                                                            ""
                                                        ],
                                                        "labels": [
                                                            3
                                                        ],
                                                        "responseType": "slider"
                                                    },
                                                    "startTime": 1548306563792,
                                                    "endTime": 1548306565271,
                                                    "criteriaId": "5be15bfb49e0121f01b21804",
                                                    "responseType": "slider",
                                                    "evidenceMethod": "CO"
                                                }
                                            }
                                        ],
                                        "remarks": "",
                                        "fileName": [],
                                        "payload": {
                                            "question": [
                                                "Classroom Observation - Observe the classroom and mention the Grade and Section",
                                                ""
                                            ],
                                            "labels": [
                                                [
                                                    [
                                                        {
                                                            "_id": "5be2c11042059f313f3df85e",
                                                            "question": [
                                                                "Grade",
                                                                ""
                                                            ],
                                                            "options": [],
                                                            "children": [],
                                                            "questionGroup": [
                                                                "A1"
                                                            ],
                                                            "fileName": [],
                                                            "instanceQuestions": [],
                                                            "deleted": false,
                                                            "tip": "",
                                                            "externalId": "CO/01",
                                                            "visibleIf": "",
                                                            "file": "",
                                                            "responseType": "slider",
                                                            "validation": {
                                                                "required": "true",
                                                                "regex": "^[0-9s]*$",
                                                                "max": 9,
                                                                "min": 1
                                                            },
                                                            "showRemarks": false,
                                                            "isCompleted": true,
                                                            "remarks": "",
                                                            "value": 3,
                                                            "canBeNotApplicable": "false",
                                                            "usedForScoring": "",
                                                            "modeOfCollection": "onfield",
                                                            "questionType": "auto",
                                                            "accessibility": "global",
                                                            "updatedAt": "2018-11-07T10:40:16.565Z",
                                                            "createdAt": "2018-11-07T10:40:16.565Z",
                                                            "__v": 0,
                                                            "evidenceMethod": "CO",
                                                            "payload": {
                                                                "criteriaId": "5be15bfb49e0121f01b21804",
                                                                "responseType": "slider",
                                                                "evidenceMethod": "CO"
                                                            },
                                                            "startTime": 1548306563792,
                                                            "endTime": 1548306565271
                                                        }
                                                    ]
                                                ]
                                            ],
                                            "responseType": "matrix",
                                            "filesNotUploaded": []
                                        },
                                        "startTime": 1548306561648,
                                        "endTime": 1548306608000,
                                        "criteriaId": "5be15bfb49e0121f01b21804",
                                        "responseType": "matrix",
                                        "evidenceMethod": "CO",
                                        "isAGeneralQuestion": true,
                                        "countOfInstances": 1
                                    }
                                },
                                "startTime": 1548306559921,
                                "endTime": 1548306615183,
                                "gpsLocation": "0,0",
                                "submittedBy": "e97b5582-471c-4649-8401-3cc4249359bb",
                                "submittedByName": "Sandeep ",
                                "submittedByEmail": "a1@shikshalokamdev.dev",
                                "submissionDate": "2019-01-24T05:10:17.015Z",
                                "isValid": true
                            }
                        },
                        "generalQuestions": [
                            {
                                "_id": "5c0130ebaf0065f0e0a664bf",
                                "question": [
                                    "Reading assessment:",
                                    ""
                                ],
                                "options": [],
                                "children": [],
                                "questionGroup": [
                                    "A1"
                                ],
                                "fileName": [],
                                "instanceQuestions": [
                                    {
                                        "_id": "5be8e4482d325f5b71da4e03",
                                        "question": [
                                            "Student Name",
                                            ""
                                        ],
                                        "options": [],
                                        "children": [],
                                        "questionGroup": [
                                            "A1"
                                        ],
                                        "fileName": [],
                                        "instanceQuestions": [],
                                        "deleted": false,
                                        "tip": "",
                                        "externalId": "AS/TL/01a",
                                        "visibleIf": "",
                                        "file": "",
                                        "responseType": "text",
                                        "validation": {
                                            "required": true
                                        },
                                        "showRemarks": false,
                                        "isCompleted": false,
                                        "remarks": "",
                                        "value": "",
                                        "canBeNotApplicable": "false",
                                        "usedForScoring": "",
                                        "modeOfCollection": "onfield",
                                        "questionType": "auto",
                                        "accessibility": "local",
                                        "updatedAt": "2018-11-12T02:24:08.052Z",
                                        "createdAt": "2018-11-12T02:24:08.052Z",
                                        "__v": 0,
                                        "evidenceMethod": "AC3",
                                        "payload": {
                                            "criteriaId": "5be1801f5e852b0e920ad154",
                                            "responseType": "text",
                                            "evidenceMethod": "AC3"
                                        },
                                        "startTime": "",
                                        "endTime": ""
                                    }
                                ],
                                "deleted": false,
                                "tip": "Collect multiple reading assessment data",
                                "externalId": "AS/TL/01",
                                "visibleIf": "",
                                "file": "",
                                "responseType": "matrix",
                                "validation": {
                                    "required": true
                                },
                                "showRemarks": false,
                                "isCompleted": false,
                                "remarks": "",
                                "value": "",
                                "canBeNotApplicable": "false",
                                "notApplicable": "",
                                "usedForScoring": "",
                                "modeOfCollection": "onfield",
                                "questionType": "auto",
                                "accessibility": "local",
                                "instanceIdentifier": "Class 3 student",
                                "updatedAt": "2018-12-04T02:39:59.453Z",
                                "createdAt": "2018-11-12T02:57:08.350Z",
                                "__v": 0,
                                "isAGeneralQuestion": true,
                                "evidenceMethod": "AC3",
                                "payload": {
                                    "criteriaId": "5be1801f5e852b0e920ad154",
                                    "responseType": "matrix",
                                    "evidenceMethod": "AC3",
                                    "isAGeneralQuestion": true
                                },
                                "startTime": "",
                                "endTime": ""
                            }
                        ]
                    }
                ]
            }
            let responceMessage = "Assessment fetched successfully";
            return resolve({
                message: responceMessage,
                result: result
            })

        })

    }

}