module.exports = class frameworksHelper {
    static mandatoryField() {
        let mandatoryFields = {
            assessmentType: "individual",
            sections: [
                "Data to be filled"
            ],
            author: "",
            resourceType: ["Assessment Framework"],
            language: ["English"],
            keywords: ["Framework", "Assessment"],
            concepts: [],
            createdFor: [],
            noOfRatingLevels: 4,
            isRubricDriven: true,
            isDeleted: false,
            parentId: null,
            levelToScoreMapping: {
                "L1": {
                    "points": 25,
                    "label": "Not Good"
                },
                "L2": {
                    "points": 50,
                    "label": "Decent"
                },
                "L3": {
                    "points": 75,
                    "label": "Good"
                },
                "L4": {
                    "points": 100,
                    "label": "Best"
                }
            },
            scoringSystem: "percentage"
        }

        return mandatoryFields

    }
}