/**
 * name : formsController.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : All forms related information.
 */

/**
    * Forms
    * @class
*/
module.exports = class Forms extends Abstract {

  constructor() {
    super(formsSchema);
  }

  static get name() {
    return "forms";
  }

};
