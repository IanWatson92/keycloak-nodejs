/*
 * Copyright 2016 Red Hat Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
'use strict';

const UUID = require('./../uuid');

function forceLogin (keycloak, request, response) {
  let host = request.hostname;
  let headerHost = request.headers.host.split(':');
  let port = headerHost[1] || '';
  let protocol = request.protocol;
  let hasQuery = ~(request.originalUrl || request.url).indexOf('?');

  let redirectUrl = protocol + '://' + host + (port === '' ? '' : ':' + port) + (request.originalUrl || request.url) + (hasQuery ? '&' : '?') + 'auth_callback=1';

  if (request.session) {
    request.session.auth_redirect_uri = redirectUrl;
  }

  let uuid = UUID();
  let loginURL = keycloak.loginUrl(uuid, redirectUrl);
  response.redirect(loginURL);
}

function simpleGuard (role, token) {
  console.log("I am in the simple guard!");
  return token.hasRole(role);
}

module.exports = function (keycloak, spec) {
  let guard;
  console.log('I am here!!!!');
  if (typeof spec === 'function') {
    guard = spec;
  } else if (typeof spec === 'string') {
    guard = simpleGuard.bind(undefined, spec);
  }
  console.log("Protect 0")
  return function protect (request, response, next) {
    console.log("Protect 1")
    console.log(request.kauth)
    if (request.kauth && request.kauth.grant) {
      console.log("Protect 2")
      if (!guard || guard(request.kauth.grant.access_token, request, response)) {
        console.log("Protect 3")
        return next();
      }

      console.log("Protect 4")
      return keycloak.accessDenied(request, response, next);
    }

    console.log("Protect 5")
    if (keycloak.redirectToLogin(request)) {
      forceLogin(keycloak, request, response);
    } else {
      console.log("Protect 6")
      return keycloak.accessDenied(request, response, next);
    }
  };
};
