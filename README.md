# Alexa Mime

Create test suites for your Alexa Skills and Google Actions in [YML](http://yaml.org/start.html) structured files

## Installation

Install it from [npm](https://www.npmjs.com/package/alexa-mime)

```bash
$ npm install --save-dev alexa-mime
```

## Usage

Alexa Mime relies on the [Alexa Skill Test Framework](https://github.com/BrianMacIntosh/alexa-skill-test-framework) to run all your unit tests, if you want to understand a little bit further on how Alexa Mime works internally, please check the documentation of Alexa Skill Test Framework.

### The `describeWrapper` object

Alexa Mime lets you wrap all your mock statements in a Javascript object that is available for all your test cases. There you can mock all the things you need for your tests to work properly. A basic example of a `describeWrapper` would be (using the [simple-mock](https://github.com/jupiter/simple-mock) library):

```javascript
const simple = require('simple-mock');
const User = require('../path/to/UserClass');

const describeWrapper = {
  clear: () => {
    simple.restore();
  },
  firstTimeUser: () => {
    // Your mock statements here
    simple.mock(User.prototype, 'isFirstTime').returnWith(true);
  },
};
```

You can define as many properties as you want in the `describeWrapper` object, then you can use them in the `beforeEach` and `afterEach` hooks in your `YML` files.

### Use cases (`YML` files)

Once you have your `describeWrapper`, is time to create your actual unit tests in `YML` structure files. A basic example of a use case in a `YML` form would be:

```YML
User launches the skill for the first time as a new user:
  - beforeEach: 'firstTimeUser'
  - afterEach: 'clear'
  - LaunchIntent:
      alexaResponse: Begin.FirstTime
```

Note how the `firstTimeUser` property is being injected in the `beforeEach` key, and same for `clear` injected in `afterEach`, Alexa Mime will take care of executing whatever you define in your `describeWrapper` so your tests run without issues.

### Hooking it up

```javascript
const mime = require('alexa-mime');
const simple = require('simple-mock');
const path = require('path');
const skill = require('../path/to/skill/handler/index'); 
const views = require('../path/to/views/index'); 
const User = require('../path/to/UserClass');

const describeWrapper = {
  clear: () => {
    simple.restore();
  },
  firstTimeUser: () => {
    // Your mock statements here
    simple.mock(User.prototype, 'isFirstTime').returnWith(true);
  },
};

mime(
  skill,
  views,
  path.join(__dirname, 'use-cases'),
  path.join(__dirname, '..', 'simulate'),
  describeWrapper
);
```

### Options

* **skill**: Object containing your skill's/action's handler method. It must define a method called `handler` which runs the skill
* **views**: Object representation of all the responses that your skill/action contains and that your tests expect for certain use case. For more info, see the **Views and Variables** section [here](https://voxa.readthedocs.io/en/master/views-and-variables.html)
* **pathToYAMLTest**: Path to the folder where all your `YML` files are located
* **pathToSaveHTML**: Alexa Mime will generate a HTML report file with all your test cases and result of rach (error or success). Here you can specify the path where Alexa Mime will save the report.
* **describeWrapper**: Your `describeWrapper` object
* **locale**: The locale that your skill/action runs in. By default Alexa Mime uses `en-US` but you can specify any valid locale based on the platform you are using (Alexa or Google Assistant).

### Going deeper

#### Define multiple `beforeEach` statements in your `YML` files

```YML
User launches the skill for the first time as a new user:
  - beforeEach: 'globalMock, firstTimeUser'
  - afterEach: 'clear'
  - LaunchIntent:
      alexaResponse: Begin.FirstTime
```

### Define a different locale for your test cases

This example uses a `views` object of [Voxa3](https://voxa.readthedocs.io/en/v3/views-and-variables.html#views)

```javascript
// ...

const mime = require('alexa-mime');
const locale = 'en-AU';

// ...

mime(
  skill,
  views[locale].translation,
  path.join(__dirname, 'use-cases'),
  path.join(__dirname, '..', 'simulate'),
  describeWrapper,
  locale
);
```

### Complex `YML` files

```YML
User launches the skill as an expert, receives welcome message, invokes BookCarIntent with carName slot, car is booked successfully, the session ends:
  - beforeEach: 'expertUser'
  - afterEach: 'clear'
  - LaunchIntent:
      alexaVariable:
        greeting: 'Hey'
      alexaResponse: Begin.Expert
  - BookCarIntent:
      slots:
        carName: 'Karen The Yaris'
      alexaVariable:
        goodbye: 'See you soon.'
      alexaResponse: BookCar.Done
      shouldEndSession: true
```

`YML` files can contain these properties:

* **beforeEach**: You define this in your `describeWrapper` and runs before each test case
* **afterEach**: You define this in your `describeWrapper` and runs after each test case
* **intent**: The name of the intent you want your test case to cover. Note that multiple intents can be tested in the same use case
  * **slots**: Name and value of any slot that your intent expects. You can specify multiple slots, one slot per line
  * **alexaVariable**: Name and value of the variable that your view (`alexaResponse`) uses. You can specify multiple variables, one slot per line
  * **alexaResponse**: Name/Path of the actual view/response your test case expects for this request or use case. You can specify multiple views/responses, in the same line separated by comma
  * **shouldEndSession**: Boolean value specifying if session is closed after the test case runs