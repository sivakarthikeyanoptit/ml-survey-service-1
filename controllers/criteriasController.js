module.exports = class Criterias extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "criterias";
  }

  async insert(req) {
    console.log("reached here!");
    req.body.evidences.forEach((evidence, k) => {
      evidence.sections.forEach((section, j) => {
        section.questions.forEach(async (question, i) => {
          let result = await database.models.questions.create(question);
          req.body.evidences[k].sections[j].questions[i] = result._id;
        });
      });
    });
    await this.sleep(2000);
    return await super.insert(req);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      let merged = {},
        query = [],
        sectionData = {};

      await criteria.forEach(function(value, i) {
        query.push({ _id: ObjectId(value) });
      });

      let criterias = await database.models.criterias.find({ $or: query });
      // log.debug(criterias);
      // if (Array.isArray(criterias)) {

      await _.forEachRight(criterias, async function(crit, i) {
        await crit.evidences.forEach(async function(evidence, i) {
          if (!merged[evidence.externalId]) {
            merged[evidence.externalId] = evidence;
          } else {
            log.debug("Already Done");
            merged[evidence.externalId] = Object.assign(
              merged[evidence.externalId],
              evidence
            );
            await _.forEachRight(evidence.sections, (section, i2) => {
              _.forEachRight(
                merged[evidence.externalId].sections,
                (Msection, mi2) => {
                  log.debug(
                    merged[evidence.externalId].sections.length,
                    evidence.sections.length
                  );
                  if (Msection.name == section.name) {
                    log.debug(
                      Msection.name,
                      "-----matched------>",
                      section.name
                    );
                    // log.debug(
                    //   merged[evidence.externalId].sections[mi2],
                    //   section
                    // );

                    merged[evidence.externalId].sections[mi2].questions.concat(
                      section.questions
                    );
                    log.debug(
                      evidence.externalId,
                      "######################################333",
                      merged[evidence.externalId].sections[mi2].questions,
                      "######################################",
                      section.questions
                    );
                  } else {
                    log.debug(
                      Msection.name,
                      "-----not matched------>",
                      section.name
                    );
                  }
                }
              );
            });
          }
        });
      });
      // }

      return resolve(Object.values(merged));
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
