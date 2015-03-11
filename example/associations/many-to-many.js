/**
 * Based on http://stackoverflow.com/questions/28985075/waterline-orientdb-bi-directional-edge
 * Associations docs at https://github.com/balderdashy/waterline-docs/blob/master/associations.md
 * More info at https://github.com/balderdashy/waterline
 */

//////////////////////////////////////////////////////////////////////////////
// Example on how to run:
// mkdir manyToMany
// cd manyToMany
// npm install waterline
// npm install waterline-orientdb
// node node_modules/waterline-orientdb/example/associations/many-to-many.js  
//////////////////////////////////////////////////////////////////////////////

var setupWaterline = require('../raw/bootstrap');

var connections = {
  associations : {
    adapter: 'waterline-orientdb',
    host: 'localhost',
    port: 2424,
    user: 'root',
    password: 'root',
    database: 'example-waterline-manyToMany'
  }
};

var collections = {
  questions: {
    tableName: 'questionsTable',
    identity: 'questions',
    connection: 'associations',
  
    attributes: {
      id: { type: 'string', primaryKey: true, columnName: '@rid'},
      question  : { type: 'string'},
      // user: { model: "User", required: true },
      answerOptions: {type: 'json'},
      imagefile: {type:'string'},
      answers: {
        collection: 'answer',
        via: 'questions',
        dominant:true
      }
    }
  },
  
  answer: {
    tableName: 'answerTable',
    identity: 'answer',
    connection: 'associations',

    attributes: {
      id: {
        type: 'string',
        primaryKey: true,
        columnName: '@rid'
      },
      answer: 'string',
      questions: {
        collection: 'questions',
        via: 'answers'
      }
    }
  }
};

setupWaterline({
  collections : collections,
  connections : connections
}, function waterlineReady (err, ontology){
  if (err) throw err;
  
  console.log('\nWaterline initialized\n');
  
  var question1, answer1;
  
  ontology.collections.questions.create({ question: 'question1' })
    .then(function(question){
      question1 = question;
      
      return ontology.collections.answer.create([{ answer: 'answer1' }, { answer: 'answer2' }]);
    })
    .then(function(answers){
      answer1 = answers[0];
      question1.answers.add(answers[0]);
      question1.answers.add(answers[1]);
      
      return question1.save();
    })
    .then(function(res){
      return ontology.collections.questions.findOne(question1.id)
        .populate('answers');
    })
    .then(function(populatedQuestion){
      console.log('Question', populatedQuestion.question, 'has the following answers:', populatedQuestion.answers, '\n');
      
      return ontology.collections.answer.findOne(answer1.id)
        .populate('questions');
    })
    .then(function(populatedAnswer){
      console.log('Answer', populatedAnswer.answer, 'has the following questions:', populatedAnswer.questions, '\n');
      console.log('All done, have a nice day!\n');
      process.exit(0);
    });
  
});
