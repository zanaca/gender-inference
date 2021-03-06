# gender-inference

A simple module to infer the gender of a person using it's name. The available gender are *male*, *female*, *unisex*

## Options

 - `fuzzy` Allow a search for names that are closest to informed name. Defaults to `false`
 - `exportMatches` Return the list of matched names from library for the informed name. Defaults to `false`
 - `diacritcs` If no gender is found using the informed name, will try to infer gender for the diacritcs removed name. E.g.: João to Joao. Defaults to `false`
 - `country` ISO 3166-1 of the country to be filtered. Defaults to `null`

## Instalation

```js
npm install gender-inference
```

## Usage
```js
var gender = require('gender-inference');

gender.infer('Carlos');
gender.infer('Carlos', {fuzzy: True});
```

## Examples
```js
var gender = require('gender-inference');

gender.infer('Carlos');
// => { gender: 'male',
//      score: 1 }

gender.infer('Pamela');
// => { gender: 'female',
//      score: 1 }

gender.infer('Ruby');
// => { gender: 'female',
//      score: 0.7958224257542216,, }

gender.infer('Ruby Rose');
// => { gender: 'female',
//      score: 1, }

gender.infer('Voldemort');
// => { gender: null,
//      score: null }
```

## License
  MIT

## Important
Keep in mind that some names have no specific gender and are marked as "unisex" on the database. So, for inferences of one word which results
on a unisex name, a new search is done with the `fuzzy` flagged *true* if it's not defined to try to infer the gender based on the fuzzy
search. If you need to receive "unisex", please inform the `fuzzy` as *false*.
