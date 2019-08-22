const userRolesHelper = require(ROOT_PATH + "/module/userRoles/helper");

const shikshalokamGenericHelper = require(ROOT_PATH + "/generics/helpers/shikshalokam");

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
                    title: 1,
                    entityTypes : 1
                });
                
                let userRoleMap = {}
                let userRoleAllowedEntityTypes = {}

                userRolesArray.forEach(userRole => {
                    userRoleMap[userRole.code] = {
                        roleId:userRole._id,
                        code:userRole.code,
                        entities:[]
                    }
                    userRoleAllowedEntityTypes[userRole.code] = new Array
                    if(userRole.entityTypes && userRole.entityTypes.length > 0) {
                        userRole.entityTypes.forEach(entityType => {
                            userRoleAllowedEntityTypes[userRole.code].push(entityType.entityTypeId)
                        })
                    }
                })

                let entityOperation = {
                    "ADD":1,
                    "APPEND":1,
                    "REMOVE":1,
                    "OVERRIDE":1
                }

                let userToKeycloakIdMap = {}
                let userKeycloakId = ""
                let userRole
                let existingEntity
                let existingUserRole
                
                for (let csvRowNumber = 0; csvRowNumber < userRolesCSVData.length; csvRowNumber++) {
                    
                    userRole = gen.utils.valueParser(userRolesCSVData[csvRowNumber]);
                    userRole["_SYSTEM_ID"] = ""
                    
                    try {

                        if(!userRoleMap[userRole.role]) throw "Invalid role code."

                        if(!entityOperation[userRole.entityOperation]) throw "Invalid entity operation."

                        let entityQueryObject = {
                            _id : userRole.entity
                        }
                        if(userRoleAllowedEntityTypes[userRole.role] && userRoleAllowedEntityTypes[userRole.role].length > 0) {
                            entityQueryObject.entityTypeId = {
                                $in:userRoleAllowedEntityTypes[userRole.role]
                            }
                        }
                        existingEntity = await database.models.entities.findOne(
                            entityQueryObject,
                            {
                                _id :1 
                            }
                        );

                        if(!existingEntity || !existingEntity._id) throw "Invalid entity id."
                        
                        if(userToKeycloakIdMap[userRole.user]) {
                            userKeycloakId = userToKeycloakIdMap[userRole.user]
                        } else {
                            let keycloakUserId = await shikshalokamGenericHelper.getKeycloakUserIdByLoginId(userDetails.userToken, userRole.user)
                            
                            if(keycloakUserId && keycloakUserId.length > 0 && keycloakUserId[0].userLoginId) {
                                userKeycloakId = keycloakUserId[0].userLoginId
                                userToKeycloakIdMap[userRole.user] = keycloakUserId[0].userLoginId
                            } else {
                                throw "User entity id."
                            }
                        }

                        existingUserRole = await database.models.userExtension.findOne(
                            {
                                userId : userKeycloakId
                            },
                            {
                                roles :1 
                            }
                        );

                        if (existingUserRole && existingUserRole._id) {
                            
                            let userRoleToUpdate
                            
                            if(existingUserRole.roles && existingUserRole.roles.length > 0) {
                                userRoleToUpdate = _.findIndex(existingUserRole.roles, { 'code': userRole.role });
                            }

                            if(!(userRoleToUpdate >= 0)) {
                                userRoleToUpdate = existingUserRole.roles.length
                                existingUserRole.roles.push(userRoleMap[userRole.role])
                            }
                            
                            existingUserRole.roles[userRoleToUpdate].entities = existingUserRole.roles[userRoleToUpdate].entities.map(eachEntity => eachEntity.toString());
                            
                            if (userRole.entityOperation == "OVERRIDE") {
                                existingUserRole.roles[userRoleToUpdate].entities = [userRole.entity]
                            } else if (userRole.entityOperation == "APPEND" || userRole.entityOperation == "ADD") {
                                existingUserRole.roles[userRoleToUpdate].entities.push(userRole.entity)
                                existingUserRole.roles[userRoleToUpdate].entities = _.uniq(existingUserRole.roles[userRoleToUpdate].entities)
                            } else if (userRole.entityOperation == "REMOVE") {
                                _.pull(existingUserRole.roles[userRoleToUpdate].entities, userRole.entity);
                            }

                            existingUserRole.roles[userRoleToUpdate].entities = existingUserRole.roles[userRoleToUpdate].entities.map(eachEntity => ObjectId(eachEntity))
                            
                            await database.models.userExtension.findOneAndUpdate(
                                {
                                    _id : existingUserRole._id
                                },
                                _.merge({
                                    "roles":existingUserRole.roles,
                                    "updatedBy": userDetails.id
                                },_.omit(userRole,["externalId","userId", "createdBy","updatedBy","createdAt","updatedAt"]))
                            );

                            userRole["_SYSTEM_ID"] = existingUserRole._id 
                            userRole.status = "Success"

                        } else {
                            
                            let roles = [userRoleMap[userRole.role]]
                            roles[0].entities = [ObjectId(userRole.entity)]

                            let newRole = await database.models.userExtension.create(
                                _.merge({
                                    "roles":roles,
                                    "userId":userKeycloakId,
                                    "externalId":userRole.user,
                                    "status" : "active",
                                    "updatedBy": userDetails.id,
                                    "createdBy": userDetails.id
                                },_.omit(userRole,["externalId", "userId", "createdBy","updatedBy","createdAt","updatedAt","status","roles"]))
                            );

                            if (newRole._id) {
                                userRole["_SYSTEM_ID"] = newRole._id 
                                userRole.status = "Success"
                            } else {
                                userRole["_SYSTEM_ID"] = ""
                                userRole.status = "Failed to create the user role."
                            }

                        }
                         

                    } catch (error) {
                        userRole.status = (error && error.message) ? error.message : error
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