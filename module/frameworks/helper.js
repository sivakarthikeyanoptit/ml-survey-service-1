module.exports = class frameworksHelper {
    static mandatoryField() {
        let mandatoryFields = {
            author: "",
            resourceType: ["Assessment Framework"],
            language: ["English"],
            keywords: ["Framework", "Assessment"],
            concepts: [],
            createdFor: [],
            isRubricDriven: true,
            isDeleted: false,
            parentId: null,
        }

        return mandatoryFields

    }
}