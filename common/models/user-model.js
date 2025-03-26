var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var _ = require('underscore');
var Joi = Promise.promisifyAll(require('joi'));
var validate = Promise.promisify(require('joi').validate);
const aws = require('aws-sdk');
const nodemailer = require('nodemailer');
const slackUtils = require('../utils/slack');
const constants = require("../utils/constants");
const ROLES = constants.ROLES;

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

        UserModel.profile = function (id, options) {
            logger.debug({
                message: 'Profile method was called',
                functionName: 'profile',
                options
            });
            return UserModel.findById(id, {
                include: [
                    'roles',
                    {
                        relation: 'roleMapping',
                        scope: {
                            include: ['storeModels', 'role']
                        }
                    },
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
                    let storeModels = [], discrepancyManagerStoreModels = [];
                    userModelInstance.roleMapping().forEach(function (roleMapping) {
                        if (roleMapping.role().name === ROLES.ORDER_MANAGER){
                            storeModels = roleMapping.storeModels();
                        } else if (roleMapping.role().name === ROLES.DISCREPANCY_MANAGER) {
                            discrepancyManagerStoreModels = roleMapping.storeModels();
                        }
                    });

                    var profileDataAsResponse = {
                        username: userModelInstance.username,
                        email: userModelInstance.email,
                        roles: roles,
                        name: userModelInstance.name,
                        userId: userModelInstance.id,
                        storeModels: storeModels,
                        discrepancyManagerStoreModels: discrepancyManagerStoreModels,
                        integrationType: userModelInstance.orgModel().integrationModels().length ? userModelInstance.orgModel().integrationModels()[0].type : null,
                        orgModelId: userModelInstance.orgModelId
                    };
                    logger.debug({
                        message: 'Fetching user profile',
                        profile: profileDataAsResponse,
                        functionName: 'profile',
                        options
                    });
                    return Promise.resolve(profileDataAsResponse)
                })
                .catch(function (err) {
                    logger.error({
                        error: 'Unable to fetch profile',
                        err: err,
                        functionName: 'profile',
                        options
                    });
                    return Promise.reject('Unable to fetch profile');
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
                orgName: data.orgName,
                email: data.email,
                message: 'initiating sign-up',
                functionName: 'signup'
            });
            var OrgModel = UserModel.app.models.OrgModel;
            var validObjectSchema = Joi.object().keys({
                'orgName': Joi.string().required(),
                'email': Joi.string().email().required(),
                'password': Joi.string()
                    .min(6)
                    .required(),
            });

            var orgCreated = {};
            var userModelCreated = {};

            validate(data, validObjectSchema)
                .then(function () {
                    slackUtils.sendOrgSignupAlert({
                        email: data.email,
                        orgName: data.orgName
                    });
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
        //                 to: 'kamal@linktoany.com',
        //                 // to: ctx.instance.email,
        //                 subject: 'Thank you for registering.',
        //                 from: UserModel.app.get('verificationEmail') || process.env.VERIFICATION_EMAIL,
        //                 // from: 'kamal@linktoany.com',
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
                        return RoleMapping.upsert({roleId: eachRole.id, principalId: userId, updatedAt: new Date()});
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

        UserModel.inviteUser = function (id, userId, options) {
            logger.debug({
                message: 'Will invite this user to platform',
                userId,
                options,
                functionName: 'inviteUser'
            });
            var user;
            return UserModel.findOne({
                where: {
                    id: userId
                }
            })
                .then(function (userModelInstance) {
                    logger.debug({
                        message: 'Found this user, will create a short-lived access token',
                        userModelInstance,
                        options,
                        functionName: 'inviteUser'
                    });
                    user = userModelInstance;
                    return userModelInstance.createAccessToken(7200);
                })
                .then(function (accessToken) {
                    logger.debug({
                        message: 'Created a short lived token for user',
                        options,
                        functionName: 'inviteUser'
                    });
                    var email = require('../utils/email');
                    var argsForEmail = email.argsForEmail;
                    argsForEmail.to = user.email;
                    argsForEmail.from = process.env.VERIFICATION_EMAIL;
                    argsForEmail.subject = 'Invitation from StockUp';
                    user.name = user.name.substr(0, 1).toUpperCase() + user.name.substr(1, user.name.length - 1).toLowerCase();
                    var inviteUserLink = UserModel.app.get('site').baseUrl + '/#/invite-user?accessToken=' + accessToken.id + '&name=' + user.name;
                    argsForEmail.html = `<p>Welcome ${user.name}, you have been invited to join your organisation.
                                        Please click this <a href="${inviteUserLink}">link</a> to sign up on StockUp.</p>`;
                    argsForEmail.html += `<p>If clicking the above link doesn't work, try copy-pasting the below url on your
                                            web browser</p>`;
                    argsForEmail.html += `<p>${inviteUserLink}</p>`;
                    argsForEmail.html += `<p>This link is only valid for 2 hours. Also, please don't share this email with anybody.</p>`;
                    argsForEmail.html += `<p>Regards,<br/>- StockUp Team</p>`;
                    argsForEmail.html += '</html>';
                    return email.sendEmail(argsForEmail, options);
                })
                .then(function (response) {
                    logger.debug({
                        message: 'Sent email to user',
                        options,
                        functionName: 'inviteUser'
                    });
                    return Promise.resolve(true);
                })
                .catch(function (error) {
                    logger.error({
                        error,
                        reason: error,
                        options,
                        functionName: 'inviteUser'
                    });
                    return Promise.reject(error);
                });

        };

        UserModel.deleteUser = function (id, userId, options) {
            logger.debug({
                message: 'Will delete this user from platform',
                userId,
                options,
                functionName: 'deleteUser'
            });
            return UserModel.deleteById(userId)
                .then(function () {
                    return Promise.resolve(true);
                })
                .catch(function (error) {
                    logger.error({
                        error,
                        reason: error,
                        options,
                        functionName: 'deleteUser'
                    });
                    return Promise.reject(error);
                });

        };

        UserModel.remoteMethod('setPassword', {
            accepts: [
                {arg: 'password', type: 'string', required: true},
                {arg: 'accessToken', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/setPassword', verb: 'post'},
            returns: {arg: 'user', type: 'object'}
        });

        UserModel.setPassword = function (password, accessToken, options) {
            logger.debug({
                message: 'Will reset password for user',
                options,
                functionName: 'resetPassword'
            });
            return UserModel.app.models.AccessToken.findOne({
                where: {
                    id: accessToken
                }
            })
                .then(function (response) {
                    logger.debug({
                        message: 'Found accessToken, will try to find user',
                        response,
                        options,
                        functionName: 'inviteUser'
                    });
                    return UserModel.findOne({
                        where: {
                            id: response.userId
                        }
                    });
                })
                .then(function (user) {
                    logger.debug({
                        message: 'Found user',
                        user,
                        options,
                        functionName: 'inviteUser'
                    });
                    return user.updateAttributes({
                        password: password,
                        emailVerified: true
                    });
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not change user password',
                        error,
                        reason: error,
                        options,
                        functionName: 'inviteUser'
                    });
                    return Promise.reject('Could not change user password');
                });

        };

        UserModel.on('resetPasswordRequest', function (info) {
            logger.debug({
                message: 'Will send email to user with reset password instructions',
                userEmail: info.email,
                info,
                functionName: 'resetPasswordRequest'
            });
            var email = require('../utils/email');
            var argsForEmail = email.argsForEmail;
            argsForEmail.to = info.email;
            argsForEmail.from = process.env.VERIFICATION_EMAIL;
            argsForEmail.subject = 'Password reset instructions';
            var userName = info.user.name.substr(0, 1).toUpperCase() + info.user.name.substr(1, info.user.name.length - 1).toLowerCase();
            var passwordResetLink = UserModel.app.get('site').baseUrl + '/#/invite-user?accessToken=' + info.accessToken.id + '&name=' + userName;
            argsForEmail.html = `<html>
                                    <p>Hello ${userName},</p>
                                    <p>Please follow this <a href="${passwordResetLink}">link</a> to reset your password.</p>
                                    <p>If the above link doesn't work, try copy-pasting the below link in your web browser.</p>
                                    <p>${passwordResetLink}</p>
                                    <p>This link is only valid for 2 hours. Also, please don't share this email with anybody.</p>
                                    <p>Regards,<br/>- StockUp Team</p>
                                 </html>`;
            return email.sendEmail(argsForEmail)
                .catch(function (error) {
                    logger.error({
                        message: 'Error sending password reset email',
                        userEmail: info.email,
                        error,
                        reason: error,
                        functionName: 'resetPasswordRequest'
                    });
                    return Promise.reject('Error sending password reset email');
                })
                .then(function (response) {
                    logger.debug({
                        message: 'Sent reset password email to user',
                        userEmail: info.email,
                        functionName: 'resetPasswordRequest'
                    });
                    return Promise.resolve(true);
                });
        });

        UserModel.assignStoreModelsToUser = function (orgModelId, userModelId, storeIds, role, options) {
            let roleInstance;
            logger.debug({
                message: 'Will replace previous store-user mappings if available',
                functionName: 'assignStoreModelsToUser',
                userModelId,
                options
            });
            return UserModel.app.models.Role.findOne({
                    where: {
                        name: role
                    }
                })
                .then(function (role) {
                    logger.debug({
                        message: 'Found Role',
                        functionName: 'assignStoreModelsToUser',
                        role
                    });
                    if (!role) {
                        return Promise.reject('No Role Found');
                    }
                    roleInstance = role;
                    return UserModel.app.models.RoleMapping.findOne(
                        {
                            where: {
                                roleId: role.id,
                                principalId: userModelId,
                            }
                        });
                })
                .then(function (roleMapping) {
                    logger.debug({
                        message: 'Found Role Mapping',
                        functionName: 'assignStoreModelsToUser',
                        roleMapping
                    });
                    if (roleMapping) {
                        if (storeIds.length === 0) {
                            return UserModel.app.models.RoleMapping.destroyById(roleMapping.id);
                        }
                        // Update
                        return UserModel.app.models.RoleMapping.updateAll(
                            {
                                id: roleMapping.id
                            }
                            , {
                                storeModelIds: storeIds,
                                updatedAt: new Date()
                            });
                    } else {
                        return UserModel.app.models.RoleMapping.create(
                            {
                                roleId: roleInstance.id,
                                principalId: userModelId,
                                storeModelIds: storeIds,
                                updatedAt: new Date()
                            }
                        );
                    }
                })
                .then(function () {
                    logger.debug({
                        message: 'Assigned new store mappings to user',
                        functionName: 'assignStoreModelsToUser',
                        options
                    });
                    return Promise.resolve(true);
                })
                .catch(function (err) {
                    logger.error({
                        message: 'Could not assign stores to user',
                        err,
                        reason: err,
                        functionName: 'assignStoreModelsToUser',
                        options
                    });
                    return Promise.reject('Could not assign stores to user');
                });
        };


    });
};
