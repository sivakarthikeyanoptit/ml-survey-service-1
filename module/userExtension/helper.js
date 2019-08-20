const userRolesHelper = require(ROOT_PATH + "/module/userRoles/helper");

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

    static bulkCreateOrUpdate(userRolesCSVData,userDetails) {

        return new Promise(async (resolve, reject) => {
            try {

                let userRolesUploadedData = new Array

                const userRolesArray = await userRolesHelper.list({
                    status : "active",
                    isDeleted : false
                  }, {
                    code : 1,
                    title: 1
                });
                
                let userRoleMap = {}

                userRolesArray.forEach(userRole => {
                    userRoleMap[userRole.code] = {
                        _id:userRole._id,
                        code:userRole.code
                    }
                })

                let usernameToKeycloakIdMap = {}
                
                for (let csvRowNumber = 0; csvRowNumber < userRolesCSVData.length; csvRowNumber++) {
                    
                    let userRole = userRolesCSVData[csvRowNumber];
                    userRole.status = "Failed"
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
                        userRole.status = error.message
                    }


                    userRolesUploadedData.push(userRole) 
                }


                return resolve(userRolesUploadedData);

            } catch (error) {
                return reject(error)
            }
        })

    }

};