module.exports = class observationsHelper {

    static create(solutionId, data, userDetails) {
        return new Promise(async (resolve, reject) => {
            try {

                let solutionDocument = await database.models.solutions.findOne({
                    _id: ObjectId(solutionId),
                    isReusable: true
                }, {
                        _id: 1,
                        frameworkId: 1,
                        frameworkExternalId: 1,
                        externalId: 1,
                        entityTypeId: 1,
                        entityType: 1
                    }).lean();

                if (!solutionDocument) throw "No solution id found."

                let observationData = await database.models.observations.create(
                    _.merge(data, {
                        "solutionId": solutionDocument._id,
                        "solutionExternalId": solutionDocument.externalId,
                        "frameworkId": solutionDocument.frameworkId,
                        "frameworkExternalId": solutionDocument.frameworkExternalId,
                        "entityTypeId": solutionDocument.entityTypeId,
                        "entityType": solutionDocument.entityType,
                        "author": userDetails.id,
                        "updatedBy": userDetails.id,
                        "createdBy": userDetails.id
                    })
                );

                return resolve(_.pick(observationData, ["_id", "name", "description"]));

            } catch (error) {
                return reject(error);
            }
        })

    }

    static list(entityType, entityId) {
        return new Promise(async (resolve, reject) => {
            try {

                let queryObject = { _id: ObjectId(entityId) };
                let projectObject = { [`groups.${entityType}`]: 1 };

                let result = await database.models.entities.findOne(queryObject, projectObject).lean();

                let entityIds = result.groups[entityType];

                let entityData = await database.models.entities.find({ _id: { $in: entityIds } }, {
                    metaInformation: 1
                }).lean();

                result = entityData.map(entity => {
                    return {
                        entityId: entity._id,
                        ...entity.metaInformation
                    }
                })

                return resolve(result);

            } catch (error) {
                return reject(error);
            }
        })


    }

    static findSubmission(document) {

        return new Promise(async (resolve, reject) => {

            try {

                let submissionDocument = await database.models.observationSubmissions.findOne(
                    {
                        entityId: document.entityId,
                        solutionId: document.solutionId,
                        observationId: document.observationId,
                        submissionNumber: document.submissionNumber
                    }
                ).lean();

                if (!submissionDocument) {

                    submissionDocument = await database.models.observationSubmissions.create(
                        document
                    );

                }

                return resolve({
                    message: "Submission found",
                    result: submissionDocument
                });


            } catch (error) {
                return reject(error);
            }

        })

    }

    static upload(observationData, solution, entityDocument, userId) {
        return new Promise(async (resolve, reject) => {
            try {

                let csvResult = {}

                Object.keys(observationData).forEach(eachObservationData => {
                    csvResult[eachObservationData] = observationData[eachObservationData]
                })

                if (entityDocument !== undefined && solution !== undefined && userId !== "inValid") {

                    let observationDocument = await database.models.observations.findOne({
                        solutionExternalId: solution.externalId,
                        createdBy: userId
                    }, { _id: 1 }).lean()

                    if (observationDocument) {
                        let updateObservationData = await database.models.observations.findOneAndUpdate({ _id: observationDocument._id }, {
                            $addToSet: { entities: entityDocument._id }
                        }).lean();
                        updateObservationData ? csvResult["status"] = `${updateObservationData._id.toString()} Updated Successfully` : csvResult["status"] = `${updateObservationData._id.toString()} Could not be Updated`
                    } else {

                        let observation = {}

                        observation["status"] = "published"
                        observation["deleted"] = "false"
                        observation["solutionId"] = solution._id
                        observation["solutionExternalId"] = solution.externalId
                        observation["frameworkId"] = solution.frameworkId
                        observation["frameworkExternalId"] = solution.frameworkExternalId
                        observation["entityTypeId"] = entityDocument.entityTypeId
                        observation["entityType"] = entityDocument.entityType
                        observation["parentId"] = entityDocument.parentId ? entityDocument.parentId : ""
                        observation["createdBy"] = userId
                        observation["name"] = observationData.name ? observationData.name : "Default Observation"
                        observation["description"] = observationData.description ? observationData.description : "Default description"
                        observation["entities"] = []
                        observation["entities"].push(entityDocument._id)

                        let observationDocument = await database.models.observations.create(
                            observation
                        );
                        observationDocument._id ? csvResult["status"] = `${observationDocument._id} created` : csvResult["status"] = `${observationDocument._id} could not be created`

                    }
                } else {
                    csvResult["status"] = "Entity Id or User or solution is not present"
                }

                return resolve({
                    csvResult: csvResult
                })

            } catch (error) {
                return reject(error)
            }
        })
    }

};