'use strict';

const yaml = require('js-yaml');
const _ = require('lodash');
const path = require('path');
// const config = require('../config');
const alexaTest = require('alexa-skill-test-framework');
const assertView = require('./assertion-helpers').assertView;
const fs = require('fs-extra');
const ejs = require('ejs');

module.exports = (skill, views, pathToYAMLTest, pathToSaveHTML, describeWrapper) => {
  alexaTest.initialize(skill, 'amzn1.ask.skill.00000000-0000-0000-0000-000000000000', 'amzn1.ask.account.VOID');
  alexaTest.setExtraFeature('questionMarkCheck', false);
  const allFlow = [];
  _.chain(fs.readdirSync(pathToYAMLTest))
    .filter(file => _.includes(file, '.yml'))
    .map(flow => yaml.safeLoad(fs.readFileSync(path.join(pathToYAMLTest, flow), 'utf8')))
    .flattenDeep()
    .map(flow => _.map(flow, describeFlow))
    .value();

  function describeFlow(value, useCase) {
    let flowStorage = {
      useCase,
      says: [],
      request: [],
    };

    describe(useCase, () => {
      after(() => {
        const template = fs.readFileSync(path.join(__dirname, 'template.ejs'), 'utf8');
        const htmlCompiled = ejs.render(template, { useCases: allFlow });
        fs.outputFileSync(path.join(pathToSaveHTML, 'index.html'), htmlCompiled, { flag: 'w' });
        fs.outputFileSync(path.join(pathToSaveHTML, 'skill.json'), JSON.stringify(allFlow, null, 2), { flag: 'w' });
      });
      beforeEach(() => {
        const beforeEachStatement = _.chain(value).find(intent => _.keys(intent)[0] === 'beforeEach').value();
        if (beforeEachStatement) {
          const intentName = _.keys(beforeEachStatement)[0];
          const intentOptions = beforeEachStatement[intentName];
          describeWrapper[intentOptions]();
        }
      });

      afterEach(() => {
        const afterEachStatement = _.chain(value).find(intent => _.keys(intent)[0] === 'afterEach').value();

        if (afterEachStatement) {
          const intentName = _.keys(afterEachStatement)[0];
          const intentOptions = afterEachStatement[intentName];
          describeWrapper[intentOptions]();
        }
        // console.log('says', flowStorage);
        flowStorage.flow = _.zip(flowStorage.says, flowStorage.request)
        .map((zipObject) => {
          return _.merge(zipObject[0], zipObject[1]);
        });
        _.unset(flowStorage, 'says');
        _.unset(flowStorage, 'request');
        allFlow.push(flowStorage);
        flowStorage = {
          says: [],
          request: [],
        };
      });

      const alexaTestFlow = _.chain(value)
      .map(intent => testIntentFlow(intent, flowStorage))
      .compact()
      .value();

      alexaTest.test(alexaTestFlow);
    });
  }


  function testIntentFlow(intent, flowStorage) {
    _.templateSettings.interpolate = /{([\s\S]+?)}/g;
    const IntentRequest = {};
    const intentName = _.keys(intent)[0];
    const intentOptions = intent[intentName];
    if (!(_.includes(intentName, 'Intent') || intentName === 'launchRequest')) return null;
    const slots = _.get(intentOptions, 'slots');
    let globalVariable = _.get(describeWrapper, 'globalVariable', {});
    globalVariable = _.clone(globalVariable);

    const variablesToRender = _.chain(globalVariable)
                              .assign(_.get(intentOptions, 'alexaVariable', {}))
                              // .toPairs()
                              // .map((variable) => {
                              //   const compiled = _.template(variable[1]);
                              //   return [variable[0], compiled({ config })];
                              // })
                              // .fromPairs()
                              .value();

    const shouldEndSession = !!_.get(intentOptions, 'shouldEndSession');
    const alexaResponse = _.chain(intentOptions)
                          .get('alexaResponse')
                          .split(',')
                          .map(resp => resp.trim())
                          .compact()
                          .value();

    IntentRequest.request = intentName === 'launchRequest' ? alexaTest.getLaunchRequest() : alexaTest.getIntentRequest(intentName, _.clone(slots));
    _.set(IntentRequest, 'request.context.System.device.supportedInterfaces.Display', { templateVersion: '1', markupVersion: '1' });
    IntentRequest.shouldEndSession = shouldEndSession;
    const item = { intentName };

    if (slots) item.slots = slots;
    flowStorage.request.push(item);


    IntentRequest.callback = (context, response) => {
      let status = true;


      const speech = _.get(response, 'response.outputSpeech.ssml');
      const card = _.get(response, 'response.card');
      const show = _.chain(response)
        .get('response.directives')
        .find(template => template.type === 'Display.RenderTemplate')
        .get('template')
        .value();
      const viewToExpect = assertView(views, alexaResponse, variablesToRender);

      if (alexaResponse) {
        status = viewToExpect === speech;
      }

      flowStorage.status = status;
      const flowSay = { speech };
      _.set(flowSay, 'card', card);
      _.set(flowSay, 'show', show);
      if (!status) {
        flowSay.expected = assertView(views, alexaResponse, variablesToRender);
        flowStorage.says.push(flowSay);
        context.assert({ message: 'expected speech and actual speech doesn\'t matched', expected: viewToExpect, actual: speech, showDiff: true });
      }
      flowStorage.says.push(flowSay);
    };

    return IntentRequest;
  }
};
