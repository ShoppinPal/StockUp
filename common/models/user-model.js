var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var _ = require('underscore');
var Joi = Promise.promisifyAll(require('joi'));
var validate = Promise.promisify(require('joi').validate);
const aws = require('aws-sdk');
const nodemailer = require('nodemailer');

module.exports = function (UserModel) {

    // https://github.com/strongloop/loopback/issues/418
    // once a model is attached to the data source
    UserModel.on('dataSourceAttached', function (obj) {
        // wrap the whole model in Promise
        // but we need to avoid 'validate' method
        UserModel = Promise.promisifyAll(
            UserModel,
            {
                filter: function (name, func, target) {
                    return !( name == 'validate');
                }
            }
        );

        UserModel.remoteMethod('profile', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/profile', verb: 'get'},
            returns: {arg: 'profileData', type: 'object'}
        });

        UserModel.profile = function (id, options, cb) {
            logger.debug({
                message: 'Profile method was called',
                functionName: 'profile',
                options
            });
            UserModel.findById(id, {
                include: [
                    'roles',
                    {
                        relation: 'orgModel',
                        scope: {
                            include: 'integrationModels'
                        }
                    }
                ]
            })
                .then(function (userModelInstance) {
                    logger.debug({
                        message: 'Found this user',
                        user: userModelInstance,
                        functionName: 'profile',
                        options
                    });
                    var roles = [];
                    userModelInstance.roles().forEach(function (role) {
                        roles.push(role.name);
                    });
                    var profileDataAsResponse = {
                        username: userModelInstance.username,
                        email: userModelInstance.email,
                        roles: roles,
                        userId: userModelInstance.id,
                        integrationType: userModelInstance.orgModel().integrationModels().length ? userModelInstance.orgModel().integrationModels()[0].type : null,
                        orgModelId: userModelInstance.orgModelId
                    };
                    logger.debug({
                        message: 'Fetching user profile',
                        profile: profileDataAsResponse,
                        functionName: 'profile',
                        options
                    });
                    cb(null, profileDataAsResponse);
                })
                .catch(function (err) {
                    logger.error({
                        error: 'Unable to fetch profile',
                        err: err,
                        functionName: 'profile',
                        options
                    });
                    cb('Unable to fetch profile', err);
                });
        };

        UserModel.remoteMethod('signup', {
            accepts: [
                {arg: 'data', type: 'object', required: true, http: {source: 'body'}}
            ],
            http: {path: '/signup', verb: 'post'},
            returns: {arg: 'user', type: 'object'}
        });

        UserModel.signup = function (data, cb) {
            logger.debug({
                data: data,
                message: 'initiating sign-up',
                functionName: 'signup'
            });
            var OrgModel = UserModel.app.models.OrgModel;
            var validObjectSchema = Joi.object().keys({
                'orgName': Joi.string().required(),
                'email': Joi.string().email().required(),
                'password': Joi.string()
                    .min(5)
                    .required()
            });

            var orgCreated = {};
            var userModelCreated = {};

            validate(data, validObjectSchema)
                .then(function () {
                    logger.debug({
                        message: 'Validated data for sign up successfully',
                        functionName: 'signup'
                    });
                    return OrgModel.find({where: {name: data.orgName}});
                })
                .then(function (orgInstance) {
                    if (orgInstance.length) {
                        logger.debug({message: 'This organisation name already exists in database', org: orgInstance});
                        return Promise.reject({message: 'This organisation name already exists in database'});
                    }
                    else {
                        return OrgModel.create({
                            name: data.orgName
                        });
                    }
                })
                .then(function (orgInstance) {
                    logger.debug({
                        orgInstance: orgInstance,
                        message: 'Created this organisation',
                        functionName: 'signup'
                    });
                    orgCreated = orgInstance; //creating object reference instead of copying, so that can be accessed in catch block
                    return orgInstance.userModels.create({
                        email: data.email,
                        password: data.password
                    });
                })
                .then(function (userModelInstance) {
                    var rolesToAssign = ['orgAdmin'];
                    return UserModel.assignRoles(userModelInstance.id, rolesToAssign);
                })
                .then(function (userModelInstance) {
                    logger.debug({
                        userModelInstance: userModelInstance,
                        message: 'Created this user for the organisation',
                        functionName: 'signup'
                    });
                    userModelCreated = userModelInstance;
                    cb(null, userModelCreated);
                })
                .catch(function (error) {
                    var rejectError = {};
                    logger.error({
                        error: error,
                        message: 'Error creating organisation, rolling back creations',
                        functionName: 'signup'
                    });
                    if (!_.isEmpty(orgCreated)) {
                        logger.debug({
                            message: 'Will delete the organisation created',
                            orgCreated,
                            functionName: 'signup'
                        });
                        OrgModel.deleteById(orgCreated.id)
                            .then(function () {
                                if (!_.isEmpty(userModelCreated)) {
                                    logger.debug({
                                        message: 'Will delete the user created',
                                        userModelCreated,
                                        functionName: 'signup'
                                    });
                                    return UserModel.deleteById(userModelCreated.id);
                                }
                                else {
                                    return Promise.resolve();
                                }
                            })
                            .then(function () {
                                cb({message: 'Error in signup'});
                            })
                            .catch(function (anotherError) {
                                logger.error({
                                    anotherError: anotherError,
                                    message: 'anotherError',
                                    functionName: 'signup'
                                });
                                rejectError.statusCode = 500;
                                rejectError.message = 'Internal Server Error. Please try again.';
                                cb(rejectError);
                            });
                    }
                    else {
                        if (!error.message) {
                            if (error.isJoi) {
                                rejectError.message = error.details[0].message;
                            }
                            else {
                                rejectError.statusCode = 500;
                                rejectError.message = 'Error in signup, please contact customer support';
                            }
                        }
                        else {
                            rejectError.message = error.message;
                        }
                        cb(rejectError);
                    }
                });
        };

        // UserModel.observe('after save', function (ctx, next) {
        //     try {
        //         if (ctx.isNewInstance) {
        //             aws.config.region = UserModel.app.get('awsSesRegion') || process.env.AWS_SES_REGION;
        //             var transporter = nodemailer.createTransport({
        //                 SES: new aws.SES({
        //                     apiVersion: '2010-12-01'
        //                 })
        //             });
        //
        //             //cloning because userInstance.verify accepts a mailer which has .send() function by default
        //             transporter.send = transporter.sendMail;
        //             var verifyOptions = {
        //                 type: 'email',
        //                 to: 'kamal@shoppinpal.com',
        //                 // to: ctx.instance.email,
        //                 subject: 'Thank you for registering.',
        //                 from: UserModel.app.get('verificationEmail') || process.env.VERIFICATION_EMAIL,
        //                 // from: 'kamal@shoppinpal.com',
        //                 redirect: '/',
        //                 user: ctx.instance,
        //                 mailer: transporter
        //             };
        //             ctx.instance.verify(verifyOptions, function (err, obj) {
        //                 if (err) {
        //                     logger.error({
        //                         err,
        //                         message: 'Error from the mailer',
        //                         functionName: 'UserModel:after save'
        //                     });
        //                     next(err);
        //                 }
        //                 else {
        //                     logger.debug({
        //                         message: 'Verification email sent',
        //                         functionName: 'UserModel:after save'
        //                     });
        //                     var rolesToAssign = ['orgAdmin'];
        //                     UserModel.assignRoles(ctx.instance.id, rolesToAssign)
        //                         .then(function (roles) {
        //                             logger.debug({
        //                                 message: 'Created roles for user',
        //                                 roles,
        //                                 functionName: 'UserModel:after save'
        //                             });
        //                             next();
        //                         })
        //                         .catch(function (error) {
        //                             logger.error({
        //                                 message: 'Error creating roles for user',
        //                                 functionName: 'UserModel:after save'
        //                             });
        //                             next(error);
        //                         });
        //                 }
        //             });
        //         }
        //         else {
        //             next();
        //         }
        //     }
        //     catch (e) {
        //         logger.error({
        //             e,
        //             message: 'Error from the mailer',
        //             functionName: 'UserModel:after save'
        //         });
        //         next(e);
        //     }
        // });

        UserModel.assignRoles = function (userId, rolesToAssign) {
            logger.debug({
                id: userId,
                userIdType: typeof userId,
                rolesToAssign: rolesToAssign,
                message: 'Assign Roles',
                functionName: 'assignRoles'
            });
            var Role = UserModel.app.models.Role;
            var RoleMapping = UserModel.app.models.RoleMapping;
            var orConditions = [];
            rolesToAssign.forEach(function (eachRole) {
                orConditions.push({name: eachRole});
            });

            var validObjectSchema = Joi.object().keys({
                'id': Joi.required(),
                'rolesToAssign': Joi.array().min(1).items(Joi.string().required()),
            });

            var data = {id: userId, rolesToAssign: rolesToAssign};
            return validate(data, validObjectSchema)
                .catch(function (error) {
                    logger.error({
                        error: error,
                        message: 'Error in validating assignRoles object',
                        functionName: 'assignRoles'
                    });
                    return Promise.reject(error);
                })
                .then(function () {
                    return Role.find({
                        where: {
                            or: orConditions
                        }
                    });
                })
                .then(function (roles) {
                    return Promise.map(roles, function (eachRole) {
                        logger.debug({
                            assigningRole: eachRole.name,
                            message: 'Assigning role',
                            functionName: 'assignRoles'
                        });
                        return RoleMapping.upsert({roleId: eachRole.id, principalId: userId});
                    });
                })
                .then(function (result) {
                    logger.debug({
                        result: result,
                        message: 'Finished assigning roles to user',
                        functionName: 'assignRoles'
                    });
                    return Promise.resolve(result);
                })
                .catch(function (error) {
                    logger.error({
                        error: error,
                        message: 'Error assigning roles',
                        functionName: 'assignRoles'
                    });
                    return Promise.reject(error);
                });
        };


    });
};
