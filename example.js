var gender = require('gender-inference');

gender.infer('Carlos');
// => { gender: 'male',
//      score: 1 }

gender.infer('Pamela');
// => { gender: 'female',
//      score: 1 }

gender.infer('Ruby');
// => { gender: 'female',
//      score: 0.54545454 }

gender.infer('Ruby Rose');
// => { gender: 'female',
//      score: 1 }

gender.infer('Voldemort');
// => { gender: null,
//      score: null }
