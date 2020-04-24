/**
 * name : impTemplatesController.js
 * author : Aman 
 * created-date : 23-04-2020
 * Description : Improvement project templates.
 */

 /**
    * ImpTemplates
    * @class
*/
module.exports = class ImpTemplates extends Abstract {
    
    constructor() {
        super(impTemplatesSchema);
    }

    static get name() {
        return "impTemplates";
    }

};
