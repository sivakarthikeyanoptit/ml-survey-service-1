module.exports = class userExtensionHelper {

    static profile(filterQueryObject, projectionQueryObject) {
        return new Promise(async (resolve, reject) => {
            try {

                let userExtensionData = await database.models.userExtension.find(filterQueryObject,projectionQueryObject).lean();

                return resolve(userExtensionData);

            } catch (error) {
                return reject(error);
            }
        })


    }

    static bulkCreate(userRolesCSVData,userDetails) {

        return new Promise(async (resolve, reject) => {
            try {

                const userRolesUploadedData = await Promise.all(
                    userRolesCSVData.map(async userRole => {

                        try {
                            
                            let newRole = await database.models.userRoles.create(
                                _.merge({
                                    "status" : "active",
                                    "updatedBy": userDetails.id,
                                    "createdBy": userDetails.id
                                },gen.utils.valueParser(userRole))
                            );

                            if (newRole._id) {
                                userRole["_SYSTEM_ID"] = newRole._id 
                                userRole.status = "Success"
                            } else {
                                userRole["_SYSTEM_ID"] = ""
                                userRole.status = "Failed"
                            }

                        } catch (error) {
                            userRole["_SYSTEM_ID"] = ""
                            userRole.status = error.message
                        }


                        return userRole
                    })
                )


                return resolve(userRolesUploadedData);

            } catch (error) {
                return reject(error)
            }
        })

    }


    static bulkUpdate(userRolesCSVData,userDetails) {

        return new Promise(async (resolve, reject) => {
            try {

                const userRolesUploadedData = await Promise.all(
                    userRolesCSVData.map(async userRole => {

                        try {
                            
                            let updateRole = await database.models.userRoles.findOneAndUpdate(
                                {
                                    code : userRole.code
                                },
                                _.merge({
                                    "updatedBy": userDetails.id
                                },gen.utils.valueParser(userRole))
                            );

                            if (updateRole._id) {
                                userRole["_SYSTEM_ID"] = updateRole._id 
                                userRole.status = "Success"
                            } else {
                                userRole["_SYSTEM_ID"] = ""
                                userRole.status = "Failed"
                            }

                        } catch (error) {
                            userRole["_SYSTEM_ID"] = ""
                            userRole.status = error.message
                        }


                        return userRole
                    })
                )


                return resolve(userRolesUploadedData);

            } catch (error) {
                return reject(error)
            }
        })

    }

};