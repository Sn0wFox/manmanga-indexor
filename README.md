[![Build Status](https://travis-ci.org/Sn0wFox/manmanga-indexor.svg?branch=master)](https://travis-ci.org/Sn0wFox/manmanga-indexor)

# manmanga-indexor
Indexing engine for [Manmanga](https://github.com/Sn0wFox/manmanga).

The indexing engine is almost ready to use and will allow Manmanga
to not rely on Google anymore.

## TODOS
* ~~Verify doc's fields length in bytes before trying to index.~~
* ~~Verify doc's id length in bytes before trying to index.~~
* Don't forget to encode urls before querying (see Nagasarete_Airantō).
* ~~Some resources actually don't have any abstract or page on wikipedia,
so they must be removed from the index (see http://dbpedia.org/resource/Gurren_Lagann__manga__1).
It's - before further investigations - the ones with double underscore.~~
* Some resources are not worth indexing: the ones postfixed by `manga`
or `(manga)` and so on.