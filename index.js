const levDistance = require('fast-levenshtein');
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
    if ('fuzzy' in opts && opts.fuzzy) {
        fuzzySearch = true;
    }
    if ('exportMatches' in opts && opts.matches) {
        returnMatches = true;
    }

    const nameSplitted = name.split(' ');
    let output = {
        gender: null,
        score: null,
    }

    let found = names.filter(function(o) {
        if (!fuzzySearch) {
            if (nameSplitted.indexOf(o.name) > -1) return true;
        } else {
            let x = nameSplitted.filter(function(n) {
                return levDistance.get(o.name, n) < 2;
            });
            if (x.length > 0) return true;
        }
    });

    found = found.sort(function(a, b) {
        const indexa = nameSplitted.indexOf(a.name);
        const indexb = nameSplitted.indexOf(b.name);

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
    let gender = null;

    for(const index in found) {
        const factor = Math.pow(found.length - index, 2);
        if (['unisex', null].indexOf(gender) > -1 ) {
            gender = found[index].gender;
        }
        if (found[index].gender === 'male') {
            scoreCounter += factor;
        } else if (found[index].gender === 'female') {
            scoreCounter += -1 * factor;
        }
    }

    if (found.length > 0) {
        const score = Math.sqrt(Math.abs(scoreCounter));
        output.gender = gender;
        const size = found.filter(function(n) {
            return ['unisex', gender].indexOf(n.gender) > -1;
        }).length;
        output.score = (size / found.length);
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

// console.log(infer(process.argv[2], {matches: false}))
