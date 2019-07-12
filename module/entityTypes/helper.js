module.exports = class entityTypesHelper {

    static list(queryParameter, projection = {}) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityTypeData = await database.models.entityTypes.find(queryParameter, projection).lean();

                return resolve(entityTypeData);

            } catch (error) {
                return reject(error);
            }
        })

    }

};