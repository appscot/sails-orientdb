var assert = require('assert');

var self = this;

describe('Bug #116: Found class name null or empty', function () {
    before(function (done) {

        var fixtures = {
            AnswerFixture: {
                tableName: 'Answer',
                //identity: 'answer',

                attributes: {
                    id: {
                        type: 'string',
                        primaryKey: true,
                        columnName: '@rid'
                    },
                    Answer: {
                        type: 'JSON'
                    },
                    question: {
                        collection: 'Questions',
                        via: 'answers',
                    }
                }
            },

            QuestionsFixture: {
                tableName: 'Questions',
                //identity:'questions',
                joinTableNames: {
                    answers: 'answered'
                },

                attributes: {
                    id: {
                        type: 'string',
                        primaryKey: true,
                        columnName: '@rid'
                    },
                    question: {
                        type: 'string'
                    },
                    answers: {
                        collection: 'Answer',
                        via: 'question',
                        dominant: true
                    }
                }
            }

        };

        CREATE_TEST_WATERLINE(self, 'test_bug_116', fixtures, done);
    });
    after(function (done) {
        DELETE_TEST_WATERLINE('test_bug_116', done);
    });

    describe('Create answer', function () {

        /////////////////////////////////////////////////////
        // TEST SETUP
        ////////////////////////////////////////////////////

        var questionRecord;


        before(function (done) {
            self.collections.Questions.create({
                question: 'This should work, shouldnt it?'
            }, function (err, question) {

                if (err) {
                    return done(err);
                }

                questionRecord = question;
                done();

            });
        });


        /////////////////////////////////////////////////////
        // TEST METHODS
        ////////////////////////////////////////////////////

        it('should add answer and create edge answered from answer to questions', function (done) {


            self.collections.Answer.create({
                question:questionRecord.id,
                Answer: {binary:'Yes'}
            }, function (err, question) {

                if (err) {
                    return done(err);
                }

            self.collections.Answer.query('select * from answered', function (err, answered) {

                if (err) {
                    return done(err);
                }

                assert(answered);
                done();

            }); 

            });


        });
        

    });
});
