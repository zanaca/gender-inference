const levDistance = require('fast-levenshtein');
const removeDiacritics = require('diacritics').remove;
const names = require('./lib/names');

module.exports = {infer};

/**
 * Serve static files from `root`.
 *
 * Traverses the specified folder and serves all underlying files. Can be used for public and asset folders.
 *
 * @param {String} name
 * @param {Object} opts
 * @return {Object}
 * @api public
 */
function infer(_name, _opts){
    let name = null;
    if(!_name) {
        throw Error('Name must be defined.');
    } else {
        name = _name.toLowerCase();
    }

    if(typeof name !== 'string') {
        throw TypeError('Name must be a defined string.');
    }

    const opts = _opts || {};

    let fuzzySearch = false;
    let returnMatches = false;
    let disableDiacritics = true;
    let country = null;
    if ('fuzzy' in opts && opts.fuzzy) {
        fuzzySearch = true;
    }
    if ('exportMatches' in opts && opts.exportMatches) {
        returnMatches = true;
    }

    if ('diacritcs' in opts) {
        disableDiacritics = opts.diacritcs === false ? true : false;
    }

    if ('country' in opts) {
        country = String(opts.country);
    }

    const nameSplitted = name.split(' ');
    let nameSplittedPlain = [];
    if (disableDiacritics) {
        nameSplittedPlain = removeDiacritics(name).split(' ');
    }

    let output = {
        gender: null,
        score: null,
    }

    let found = names.filter(function(o) {
        if (!fuzzySearch) {
            if (nameSplitted.indexOf(o.name.toLowerCase()) > -1) return true;
            if (disableDiacritics && nameSplittedPlain.indexOf(o.name.toLowerCase()) > -1) return true;
        } else {
            let x = nameSplitted.filter(function(n) {
                return levDistance.get(o.name.toLowerCase(), n) < 2;
            });
            if (disableDiacritics) {
                x = nameSplittedPlain.filter(function(n) {
                    return levDistance.get(o.name.toLowerCase(), n) < 2;
                });
            }
            if (x.length > 0) return true;
        }
    });

    if (country) {
        const foundCountry = found.filter(function(o){
            if ('country' in o && o.country.indexOf(country) >= 0) return true;
        })
        const hasCountry = foundCountry.length > 0;
        if (hasCountry) {
            const foundNames = [];
            for (const index in foundCountry) {
                foundNames.push(foundCountry[index].name.toLowerCase());
                foundNames.push(removeDiacritics(foundCountry[index].name.toLowerCase()));
            }
            for (const index in found) {
                const name = found[index].name.toLowerCase();
                if (foundNames.indexOf(name) === -1) {
                    foundCountry.push(found[index]);
                }
            }
            found = foundCountry;
            delete foundCountry;
        } else {
            found = found.filter(function(o){
                if ('country' in o) return false;
                return true;
            });
        }
    }

    found = found.sort(function(a, b) {
        const indexa = disableDiacritics ? nameSplittedPlain.indexOf(a.name) : nameSplitted.indexOf(a.name);
        const indexb = disableDiacritics ? nameSplittedPlain.indexOf(b.name) : nameSplitted.indexOf(b.name);

        if (!fuzzySearch) {
            if (indexa < indexb) return -1;
            if (indexa > indexb) return 1;
            return 0;
        } else {
            if (nameSplitted[0] === a.name) return -1;
            if (indexa === -1) return 1;
            return 0;
        }
    });

    let scoreCounter = 0.0;
    let scoreMax = 0;
    let gender = null;

    for(const index in found) {
        const factor = Math.pow(found.length - index, 2);
        if (['unisex', null].indexOf(gender) > -1 ) {
            gender = found[index].gender;
        }
        scoreMax += factor;
        if (found[index].gender === 'male') {
            scoreCounter += factor;
        } else if (found[index].gender === 'female') {
            scoreCounter += -1 * factor;
        }
    }
    if (scoreCounter === 0) {
        scoreCounter = 1;
    }
    if (found.length > 0) {
        const score = Math.sqrt(Math.abs(scoreCounter));
        scoreMax = Math.sqrt(scoreMax);
        output.gender = gender;
/*        const size = found.filter(function(n) {
            return ['unisex', gender].indexOf(n.gender) > -1;
        }).length;
*/        output.score = (score / scoreMax); // * (size / found.length);
    }

    if (disableDiacritics && nameSplitted.join('') !== nameSplittedPlain.join('')) {
        const distance = levDistance.get(_name, removeDiacritics(_name));
        output.diacriticsRemoved = true;
        if (found.length > 0) {
            // Uses half of the distance weight to penalize score
            output.score -= Math.pow(distance/_name.length, 2);
        }
    }

    if (!fuzzySearch && !('fuzzy' in opts) && gender === 'unisex' && found.length === 1) {
        opts.fuzzy = true;
        output = infer(_name, opts);
    }

    if (returnMatches) {
        output.matches = found;
    }

    return output;
}


function gaussSum(n) {
    return (n * (n + 1)) / 2;
}


// console.log(infer(process.argv[2], {exportMatches: false}))
