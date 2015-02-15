# Contributing to waterline-orientdb

1. [Getting Involved](#getting-involved)
2. [Discussion](#discussion)
3. [How To Report Bugs](#how-to-report-bugs)
4. [Tips For Submitting Code](#tips-for-submitting-code)

## Getting Involved

There are a number of ways to get involved with the development of waterline-orientdb. Even if you've never contributed code to an Open Source project before, we're always looking for help identifying bugs, cleaning up code, writing documentation and testing.

The goal of this guide is to provide the best way to contribute to waterline-orientdb.

## Discussion

### Gitter.im
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/appscot/waterline-orientdb?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

We frequently tracks posts on [Gitter](https://gitter.im/appscot/waterline-orientdb). If you have longer posts or questions please feel free to post them there. If you think you've found a bug please [file it in the bug tracker](#how-to-report-bugs).


## How to Report Bugs

### Try the latest version of waterline-orientdb

Bugs in old versions of waterline-orientdb may have already been fixed. In order to avoid reporting known issues, make sure you are always testing against the latest build/source. Please follow these guidelines before reporting a bug:

1. **Update to the latest version** &mdash; Check if you can reproduce the issue with the latest version from the `master` branch. You can install from `master` by running:
  ``` sh
  npm install appscot/waterline-orientdb
  ```

2. **Enable logging** &mdash; `waterline-orientdb` uses [debug-logger](https://github.com/appscot/debug-logger) (a wrapper around [visionmedia/debug](https://github.com/visionmedia/debug)) and so you can enable logging by running the below command:
  ``` sh
  export DEBUG=$DEBUG,waterline-orientdb:*
  ```

3. **Use the Issues search** &mdash; check if the issue has already been reported. If it has been, please comment on the existing issue.

4. **Provide a means to reproduce the problem** &mdash; Please provide as much details as possible, e.g. `waterline-orientdb` logs, and of course the steps to reproduce the problem. Ideally, submit an automated test such as those in the [test folder](https://github.com/appscot/waterline-orientdb/tree/master/test/integration-orientdb/tests).

### Report a bug

Fill in a bug by creating a [new github issue](https://github.com/appscot/waterline-orientdb/issues/new) and provide as much information as possible.

### Feature requests

Please follow the bug guidelines above for feature requests, i.e. update to the latest version and search for existing issues before posting a new request.


## Tips For Submitting Code


### Code

**NEVER write your patches to the master branch** - it gets messy (I say this from experience!)

**ALWAYS USE A "TOPIC" BRANCH!** Personally I like the `issuenumber-feature_name` format that way its easy to identify the branch and feature at a glance. Also please make note of any issue number in the pull commit so we know what you are solving (it helps with cleaning up the related items later).


### Running The Tests

The tests are based on [mocha](http://visionmedia.github.io/mocha) and [commonjs-assert](https://github.com/defunctzombie/commonjs-assert).

Before running the tests, ensure you've configured your orientdb server to use the same credentials as in [test-connection.json](./test/test-connection.json).

To run the tests:
```sh
npm test
```

To generate the code coverage report, run:
```sh
npm run coverage
```
And have a look at `coverage/lcov-report/index.html`.


### Pull requests

[Pull requests](https://help.github.com/articles/using-pull-requests) are welcome and the preferred way of accepting code contributions.

Please follow these guidelines before sending a pull request:

1. Update your fork to the latest upstream version.
2. Use the `master` branch to base your code off of.
3. Follow the coding conventions of the original repository. Do not change line endings of the existing file, as this will rewrite the file and loses history.
4. Keep your commits as autonomous as possible, i.e. create a new commit for every single bug fix or feature added.
5. Always add meaningful commit messages. We should not have to guess at what your code is suppose to do.
6. Make sure your changes pass all automated tests (old and new).
