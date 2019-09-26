"use strict";

const _ = require("lodash");

function assertView(views, expectedView, variables, forceResponseType) {
  function getStatement(path) {
    const viewObject = _.get(views, path);
    if (!viewObject) {
      throw new Error(`${path} not found`);
    }
    const responseTypes = forceResponseType
      ? [forceResponseType]
      : ["ask", "say", "tell", "alexa"];

    return _(responseTypes)
      .map(key => viewObject[key])
      .filter()
      .map(view => {
        if (_.isArray(view)) {
          view = _.head(view);
        }

        return view.replace(/\{(\w+)\}/g, (m, offset) => {
          if (variables && !_.isUndefined(variables[offset])) {
            return variables[offset];
          }

          throw new Error(`Variable ${offset} missing`);
        });
      })
      .first();
  }
  let expectedReply;
  if (_.isArray(expectedView)) {
    expectedReply = _.reduce(
      expectedView,
      (acc, view) => {
        const statement = getStatement(view);
        acc.push(statement);
        return acc;
      },
      []
    ).join("\n");
  } else {
    expectedReply = getStatement(expectedView);
  }
  return `<speak>${expectedReply}</speak>`;
}

module.exports = {
  assertView
};
