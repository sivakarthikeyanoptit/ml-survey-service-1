module.exports = class Entities extends Abstract {
  constructor() {
    super(entitiesSchema);
    this.entityHelper = new entityHelper;
  }

  static get name() {
    return "entities";
  }

  list(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entityHelper.list(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }

  form(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entityHelper.form(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }
  
  fetch(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entityHelper.fetch(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }
 
  add(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entityHelper.add(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }
  
  update(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entityHelper.update(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }
  
  upload(req) {
    return new Promise(async (resolve, reject) => {

      let result;

      try {

        result = await this.entityHelper.upload(req);

      } catch (error) {

        return reject(error)

      }

      return resolve(result);

    })
  }

};
