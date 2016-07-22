const levDistance = require('fast-levenshtein');
const removeDiacritics = require('diacritics').remove;
const names = require('./lib/names');

module.exports = {infer};
const debugEnabled = ['*', 'gender-inference'].indexOf(process.env.DEBUG) >= 0;

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
        debug('Fuzzy search: [ENABLED]');
    } else {
        debug('Fuzzy search: [DISABLED]');
    }
    if ('exportMatches' in opts && opts.exportMatches) {
        returnMatches = true;
        debug('Exporting matches: [ENABLED]');
    } else {
        debug('Exporting matches: [DISABLED]');
    }

    if ('diacritcs' in opts) {
        disableDiacritics = opts.diacritcs === false ? true : false;
        if (disableDiacritics) {
            debug('Diacritics: [DISABLED]');
        } else {
            debug('Diacritics: [ENABLED]');
        }
    }

    if ('country' in opts) {
        country = String(opts.country);
        debug('Filtering country: ' + country);
    }

    const nameSplitted = name.split(' ');
    debug('Informed name(s): ' + nameSplitted.join(', '));
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
                return levDistance.get(o.name.toLowerCase(), n) < 2 && o.name.length === n.length && o.name.substring(0, 2) == n.substring(0, 2);
            });
            if (disableDiacritics) {
                x = nameSplittedPlain.filter(function(n) {
                    return levDistance.get(o.name.toLowerCase(), n) < 2 && o.name.length === n.length && o.name.substring(0, 2) == n.substring(0, 2);
                });
            }
            if (x.length > 0) return true;
        }
    });
    debug(found.length + ' names found')

    if (country) {
        const foundCountry = found.filter(function(o){
            if ('country' in o && o.country.indexOf(country) >= 0) return true;
        })
        const hasCountry = foundCountry.length > 0;
        if (hasCountry) {
            debug('Removing names which are not from informed country');
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
            debug('Removing names from other countries');
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
        scoreMax += factor;
        if (['unisex', null].indexOf(gender) > -1 ) {
            gender = genderMode(found);
            debug('Setting gender ' + gender);
        }
        if (found[index].gender === 'male') {
            // debug('Incrementing male score');
            scoreCounter += factor;
        } else if (found[index].gender === 'female') {
            // debug('Incrementing female score');
            scoreCounter += -1 * factor;
        }
    }
    if (scoreCounter === 0) {
        scoreCounter = 1;
    }
    if (found.length > 0) {
        let score = Math.sqrt(Math.abs(scoreCounter));
        scoreMax = Math.sqrt(scoreMax);
        if (found[0].gender === 'unisex') {
            const unisexFactor = Math.pow(found.length, 2);
            if (found.length > 1) {
                score = Math.sqrt(Math.abs(unisexFactor - scoreCounter));
            }
        }
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
            debug('Penalizing score for each diacritics difference found; Relax, it\'s ok ;)');
            output.score -= Math.pow(distance/_name.length, 2);
        }
    }

    if (!fuzzySearch && !('fuzzy' in opts) && gender === 'unisex' && found.length === 1) {
        debug('Just one name was found and its gender is unisex. Will try fuzzy now');
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

function debug(msg) {
    if (debugEnabled) {
        console.log(msg);
    }
}

function genderMode(data) {
    if (data.length === 1) {
        return data[0].gender;
    }
    const genders = data.map(function(i) {
        if (i.gender !== 'unisex')  return i.gender;
    }).filter(function(i) {
        return i !== undefined;
    });

   const modeMap = {};
   let maxEl = genders[0];
   let maxCount = 1;
   for(let i = 0; i < genders.length; i++) {
        const el = genders[i];
        if(modeMap[el] == null) {
            modeMap[el] = 1;
        } else {
            modeMap[el]++;
        }
        if(modeMap[el] > maxCount) {
            maxEl = el;
            maxCount = modeMap[el];
        }
   }

   return maxEl === undefined ? 'unisex' : maxEl;
}
