module.exports = class Criterias extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "criterias";
  }

  insert(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    return super.insert(req);
  }

  find(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    console.log();

    return super.find(req);
  }
  async getEvidence(req) {
    let criteria = await this.getCriterias(req);
    // log.debug(criteria);
    // return criteria;
    return new Promise(async function(resolve, reject) {
      var evidences = [],
        merged = [],
        query = [];

      await criteria.forEach(function(value, i) {
        query.push({ _id: ObjectId(value) });
      });

      criteria = await database.models.criterias.find({ $or: query });

      // log.debug(criteria);

      await criteria.forEach(async function(crit, i) {
        evidences = evidences.concat(crit.evidences);
        // await crit.evidences.forEach(async function(evidence, i) {
        //   log.debug(evidence.externalId);
        // });
      });
      return resolve(evidences);
    });
  }
  async getCriterias(req) {
    return new Promise(function(resolve, reject) {
      return database.models["evaluation-frameworks"]
        .findOne({ _id: ObjectId(req.body.evaluationFramework) })
        .then(async eF => {
          let criteria = [];

          _.forEachRight(eF.themes, theme => {
            _.forEachRight(theme.aoi, aoi => {
              _.forEachRight(aoi.indicators, indicator => {
                criteria = criteria.concat(indicator.criteria);
              });
            });
          });
          return resolve(criteria);
        })
        .catch(error => {
          log.error(error);
        });
    });
    // return req.body.evaluationFramework;
  }
};
