/**
 * name : frameworks/helper.js
 * author : Aman
 * created-date : 22-Dec-2018
 * Description : All frameworks related helper functionality.
 */

 /**
    * FrameworksHelper
    * @class
*/
module.exports = class FrameworksHelper {
    /**
   * Mandatory field required when creating framework.
   * @method
   * @name mandatoryField
   * @returns {Object} - mandatory field.
   */

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