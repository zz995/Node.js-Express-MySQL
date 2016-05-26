'use strict';

const multer = require('multer');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mkdirp = require('mkdirp');
const db = require('../db');
const only = require('only');

const findOrInsert = (table, field, data) => {
    const sql = `INSERT INTO ${table} (${field}) `
        + `SELECT * FROM ( SELECT ${db.escape(data)}) AS tmp `
        + "WHERE NOT EXISTS ( "
        + `SELECT ${field} `
        + `FROM ${table} `
        + `WHERE ${field} = ${db.escape(data)} `
        + ")";

    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
                if (err) reject(err);
                resolve(result);
            }
        )
    }).then(
        result => {
            if (result.affectedRows) return result.insertId;
            const sql = `SELECT ${table}_id `
                + `FROM ${table} `
                + `WHERE ${field} = ${db.escape(data)} `
                + "LIMIT 1";
            return new Promise((resolve, reject) => {
                db.query(sql, (err, result) => {
                    if (err) reject(err);
                    resolve( result[0][`${table}_id`]);
                })
            })
        }
    )
};

const remove = () => {
    const removeData = data => {
        const sql = `SELECT ${data[0]}_id AS id `
            + `FROM ${data[0]} LEFT JOIN ${data[1]} f USING (${data[0]}_id) `
            + `WHERE f.${data[2]} IS NULL`;
        return new Promise((resolve, reject) => {
            db.query(sql, (err, result) => {
                if (err) reject(err);
                if (!result || !result.length) return resolve();
                let str = '';
                for (let i = 0; i < result.length; i++) {
                    if (i) {
                        str += ', ';
                    }
                    str += result[i].id;
                }

                resolve('('+str+')');
            })
        }).then(
            res => {
                if (!res) return null;
                const sql = `DELETE FROM ${data[0]} WHERE ${data[0]}_id IN ${res}`;
                return new Promise((resolve, reject) => {
                    db.query(sql, (err, result) => {
                        if (err) reject(err);
                        resolve();
                    })
                });
            }
        )
    };
    const forRemove = [
        ['genre', 'film_has_genre', 'film_id'],
        ['country', 'country_has_film', 'film_id'],
        ['language', 'film_has_language', 'film_id'],
        ['staff', 'employee_has_film', 'film_id']
    ];

    return Promise.all(forRemove.map(removeData));
};

const findOrInsertEmp = (list) => {


    if (!list.length) return [];
    const ins = val => {
        const sql = `INSERT INTO employee_has_film (employee_id, film_id, position) `
            + `SELECT * FROM ( SELECT ${val[0]}, ${val[1]}, '${val[2]}') AS tmp `
            + "WHERE NOT EXISTS ( "
            + `SELECT employee_id, film_id, position `
            + `FROM employee_has_film `
            + `WHERE employee_id = ? AND film_id = ? AND position = ?`
            + ")";

        return new Promise((resolve, reject) => {
            db.query(sql, val, (err, result) => {
                    if (err) reject(err);
                    resolve();
                }
            )
        })
    };

    return Promise.all(list.map(ins))
};

exports.upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const hash = crypto.createHash('md5')
                .update(file.originalname + (new Date()).getTime().toString())
                .digest('hex');
            let relativePath = path.join(
                '/uploads',
                file.mimetype.split('/')[0],
                hash.slice(0, 1),
                hash.slice(1, 2)
            );
            let nameFile = `${hash}${path.extname(file.originalname)}`;
            const pathFile = path.join(
                __dirname,
                '../public',
                relativePath
            );
            file.relativepath = path.join(relativePath, nameFile);
            mkdirp(pathFile, function (err) {
                if (err) throw new Error(err);
                else {
                    file.changeName = nameFile;
                    file.imgPr = path.join(relativePath, hash);
                    cb(null, pathFile);
                }
            });
        },
        filename: (req, file, cb) => cb(null, file.changeName)
    }),
    fileFilter: function(req, file, cb) {
        if(config.get('img:supportMimeTypes').indexOf(file.mimetype) == -1) {
            cb(new Error(`Тип не підтримується ${file.mimetype}`), false);
        } else {
            cb(null, true);
        }
    },
    limits: config.get('img:limits')
}).single('picture');


exports.save = (data, update, idFilm) =>
    new Promise((resolve, reject) => {
        let film_id = null;
        const transaction = new Promise((resolve, reject) => {
            db.beginTransaction(err => {
                if (err) reject(err);
                resolve();
            })
        });

        transaction.then(
            () => {
                return update
                ? new Promise((resolve, reject) => {
                    db.query('UPDATE film SET ? WHERE film_id = ?',
                        [only(data, 'title year type img description time trailer'), idFilm],
                        (err, result) => {
                            if (err) reject(err);
                            film_id = idFilm;
                            resolve();
                        }
                    )
                })
                : new Promise((resolve, reject) => {
                    db.query('INSERT INTO film SET ?',
                        only(data, 'title year type img description time trailer'),
                        (err, result) => {
                            if (err) reject(err);
                            film_id = result.insertId;
                            resolve();
                        }
                    )
                })
            },
            err => resolve(err)
        ).then(
            () => {
                if (!update) return null;
                const remove = table => new Promise((resolve, reject) => {
                    const sql = `DELETE FROM ${db.escapeId(table)} WHERE film_id=${db.escape(film_id)}`;
                    db.query(sql, (err, result) => {
                        if (err) reject(err);
                        resolve();
                    })
                });

                return Promise.all([
                    ['country_has_film', 'employee_has_film', 'film_has_genre', 'film_has_language'].map(
                        remove
                    )
                ]);
            }
        ).then(
            () => {
                const list = {};
                const arraySelected = [];
                const staffPos = [];
                for (let key in data.employee) {
                    data.employee[key]
                        .split(/\s*,\s*/)
                        .forEach(item => {
                            const name = item.split(/\s*\(\s*|\s*\)\s*|\s+/);

                            if (!list[key]) list[key] = {};

                            let id = null;
                            if (!name[1] && /\d+/.test(name[0])) {
                                id = name[0];
                            } else if (name[2] && /\d+/.test(name[2])) {
                                id = name[2];
                            }
                            if (id) {
                                list[key].id
                                    ? list[key].id.push(id)
                                    : list[key].id = [id];
                            } else if (name[0] && name[1]) {
                                list[key].first
                                    ? list[key].first.push(db.escape(name[0]))
                                    : list[key].first = [db.escape(name[0])];
                                list[key].last
                                    ? list[key].last.push(db.escape(name[1]))
                                    : list[key].last = [db.escape(name[1])];
                            }
                        });
                    if (list[key].first && list[key].last) {
                        arraySelected.push({listName: list[key], position: key});
                    }
                    /*if (list[key].id) {
                        arraySelected.push({id: list[key], position: key});
                    }
*/
                    staffPos.push(key);
                }

                const select = data => new Promise((resolve, reject) => {
                    let listName = data.listName;
                    let position = data.position;
                    const sql = 'SELECT employee_id '
                        + 'FROM employee '
                        + `WHERE first_name IN (${listName.first.join(', ')}) `
                        + `AND last_name IN (${listName.last.join(', ')})`;

                    db.query(sql, (err, result) => {
                            if (err) reject(err);
                            list[position].id =
                                list[position].id
                                    ? list[position].id.concat(
                                        result.map(item => item.employee_id)
                                    )
                                    : result.map(item => item.employee_id);
                            resolve();
                        }
                    )
                });

                const selectPosId = pos => findOrInsert('staff', 'position', pos).then(
                    (id) => {
                        list[pos].posId = id;
                    }
                );

                const employee =  (arraySelected) => {
                    if (!arraySelected.length && !staffPos.length) return null;
                    return Promise.all(arraySelected.map(select).concat(
                        staffPos.map(selectPosId)
                    )).then(
                        () => {
                            const empHasStuff = [];
                            for (let key in list) {
                                const staff = list[key];

                                if (staff.id) {
                                    staff.id.forEach(item => empHasStuff.push([item, film_id, staff.posId]));
                                }
                            }

                            if (!empHasStuff.length) return null;

                            return new Promise((resolve, reject) => {
                                const sql = 'INSERT INTO employee_has_film (employee_id, film_id, staff_id) VALUE ?';
                                db.query(sql, [empHasStuff], err => {
                                    if (err) reject(err);
                                    resolve();
                                })
                            })
                        }
                    );
                };

                const insTab = (unionTable, table, field, data) => {
                    if (!data[table]) return null;
                    return Promise.all(
                        data[table].split(/\s*,\s*/).map(findOrInsert.bind(null, table, field))
                    ).then(
                        ids => {
                            if (!ids.length) return null;
                            return new Promise((resolve, reject) => {
                                const sql = `INSERT INTO ${unionTable} (film_id, ${table}_id) VALUE ?`;
                                ids = ids.map(item => [film_id, item]);
                                db.query(sql, [ids], err => {
                                    if (err) reject(err);
                                    resolve();
                                })
                            })
                        }
                    );
                };
                return Promise.all([
                    employee(arraySelected),
                    insTab('country_has_film', 'country', 'name', data),
                    insTab('film_has_genre', 'genre', 'name', data),
                    insTab('film_has_language', 'language', 'name', data)
                ]);
            }
        ).then(
            () => {
                if (!update) return null;
                return remove();
            }
        ).then(
            () => new Promise((resolve, reject) => {
                db.commit(err => {
                    if (err) reject(err);
                    resolve();
                })
            })
        ).then(
            () => resolve()
        ).catch(
            err => {
                reject(err)
            }
        );

    });

exports.listfilm = (data, count, findById) =>
    new Promise((resolve, reject) => {
        const limit = data.limit || 10;
        const skip = data.page * limit || 0;

        class Table {
            constructor(table) {
                this.value = '';
                this.table = table;
            }
            _bind() {
                if (this.value) {
                    this.value += 'AND ';
                } else {
                    this.value = `SELECT ${this.table}_id FROM ${this.table} WHERE `;
                }
            }
            add(param) {
                this._bind();
                this.value += param + ' ';
            }
        }
        let filter = {
            value: '',
            film: new Table('film'),
            genre: new Table('genre'),
            country: new Table('country'),
            language: new Table('language'),
            employee: {
                value: '',
                _bind() {
                    if (this.value) {
                        this.value += 'OR ';
                    } else {
                        this.value = "SELECT ef.film_id "
                            + "FROM employee "
                            + "INNER JOIN employee_has_film ef "
                            + "USING (employee_id) "
                            + "INNER JOIN staff "
                            + "USING (staff_id) "
                            + "WHERE ";
                    }
                },
                add(param) {
                    this._bind();
                    this.value += param + ' ';
                }
            },
            bindUnion(table) {
                this.value += `INNER JOIN ${table} `;
                this.value += "USING (film_id) ";
            },
            bind(table, id) {
                this.value += `INNER JOIN ${table} `;
                this.value += `USING (${id}) `;
            },
            get get() {
                if (count) {
                    this.value += "SELECT COUNT(DISTINCT f.film_id) AS count ";
                } else {
                    this.value += "SELECT f.film_id ";
                }
                if (this.film.value) {
                    this.value += `FROM (${this.film.value}) f `;
                } else {
                    this.value += "FROM film f ";
                }
                if (this.employee.value) {
                    this.value += `INNER JOIN (${this.employee.value}) e `
                        + "USING (film_id) ";
                }
                if (this.country.value) {
                    this.value += "INNER JOIN country_has_film "
                        + "USING (film_id) "
                        + `INNER JOIN (${this.country.value}) c `
                        + "USING (country_id) ";
                }
                if (this.genre.value) {
                    this.value += "INNER JOIN film_has_genre "
                        + "USING (film_id) "
                        + `INNER JOIN (${this.genre.value}) g `
                        + "USING (genre_id) ";
                }
                if (this.language.value) {
                    this.value += "INNER JOIN film_has_language "
                        + "USING (film_id) "
                        + `INNER JOIN (${this.language.value}) l `
                        + "USING (language_id) ";
                }
                return this.value;
            }
        };

        if (findById) {
            filter.film.add(`film_id = ${db.escape(findById)}`);
        } else {
            data.search && filter.film.add(`title LIKE ${db.escape('%' + data.search + '%')}`);
            data.yearFor && filter.film.add(`year >= ${db.escape(data.yearFor)}`);
            data.yearTo && filter.film.add(`year <= ${db.escape(data.yearTo)}`);

            data.genre && filter.genre.add(`name IN (${data.genre.map(item => db.escape(item)).join(', ')})`);
            data.country && filter.country.add(`name IN (${data.country.map(item => db.escape(item)).join(', ')})`);

            data.language && filter.language.add(`name = ${db.escape(data.language)}`);

            data.actor && filter.employee.add(`position = 'actor'
            AND first_name = ${db.escape(data.actor[0])}
            AND last_name = ${db.escape(data.actor[1])}`);

            data.producer && filter.employee.add(`position = 'producer'
            AND first_name = ${db.escape(data.producer[0])}
            AND last_name = ${db.escape(data.producer[1])}`);
        }

        let sql = '';
        if (!count) {
            sql += "SELECT f.*, "
                + "c.name AS country, "
                + "g.name AS genre, "
                + "l.name AS language, "
                + "c.country_id, g.genre_id, l.language_id, "
                + "s.*, e.employee_id, e.first_name, e.last_name ";
            const filterValue = filter.get;

            sql += `FROM (SELECT * FROM film WHERE film_id IN (${filterValue}) `;
            if (data.sort) {
                sql += `ORDER BY ${db.escapeId(data.sort.name)} ${(data.sort.desc ? "DESC " : "ASC ")} `;
            }
            sql += `LIMIT ${limit} OFFSET ${skip} ) f `;
            sql += "LEFT JOIN country_has_film "
                + "USING (film_id) "
                + "LEFT JOIN country c "
                + "USING (country_id) "
                + "LEFT JOIN film_has_genre "
                + "USING (film_id) "
                + "LEFT JOIN genre g "
                + "USING (genre_id) "
                + "LEFT JOIN film_has_language "
                + "USING (film_id) "
                + "LEFT JOIN language l "
                + "USING (language_id) "
                + "LEFT JOIN employee_has_film "
                + "USING (film_id) "
                + "LEFT JOIN employee e "
                + "USING (employee_id) "
                + "LEFT JOIN staff s "
                + "USING (staff_id) ";
        } else {
            sql = filter.get;
        }

        db.query(sql, (err, result) => {
            if (err) reject(err);
            result = result || [];
            if (!count) {
                const films = [];
                let genre = new Set();
                let language = new Set();
                let country = new Set();
                let employee = new Set();
                let id = -1;
                for (let i = 0, t = -1, l = result.length; i < l; i++) {
                    if (id != result[i].film_id) {
                        genre.clear();
                        language.clear();
                        country.clear();
                        employee.clear();
                        t++;
                        films.push(only(result[i], 'film_id title year type description time img trailer'));

                        id = result[i].film_id;
                    }
                    const film = result[i];
                    if (film.genre && !genre.has(film.genre_id)) {
                        if (films[t].genre) {
                            films[t].genre.push(film.genre);
                        } else {
                            films[t].genre = [film.genre];
                        }
                        genre.add(film.genre_id);
                    }
                    if (film.country && !country.has(film.country_id)) {
                        country.add(film.country_id);
                        if (films[t].country) {
                            films[t].country.push(film.country);
                        } else {
                            films[t].country = [film.country];
                        }
                    }
                    if (film.language && !language.has(film.language_id)) {
                        language.add(film.language_id);
                        if (films[t].language) {
                            films[t].language.push(film.language);
                        } else {
                            films[t].language = [film.language];
                        }
                    }


                    if (film.first_name && !employee.has('' + film.employee_id + 'T' + film.staff_id)) {
                        employee.add('' + film.employee_id + 'T' + film.staff_id);
                        const data = {name: film.first_name + ' ' + film.last_name, id: film.employee_id};
                        if (films[t][film.position]) {
                            films[t][film.position].push(data);
                        } else {
                            films[t][film.position] = [data];
                        }
                    }
                }
                resolve(films);
            }

            resolve(result);
        })
    });

exports.getGenre = () =>
    new Promise((resolve, reject) => {
        let sql = "SELECT name, genre_id AS id FROM genre ORDER BY name";
        db.query(sql, (err, result) => {
            if (err) reject(err);
            resolve({genre: result});
        });
    });

exports.getCountry = () =>
    new Promise((resolve, reject) => {
        let sql = "SELECT name, country_id AS id FROM country ORDER BY name";
        db.query(sql, (err, result) => {
            if (err) reject(err);
            resolve({country: result});
        });
    });


exports.getLanguage = () =>
    new Promise((resolve, reject) => {
        let sql = "SELECT name, language_id AS id FROM language ORDER BY name";
        db.query(sql, (err, result) => {
            if (err) reject(err);
            resolve({language: result});
        });
    });


exports.imgDel = img =>
    new Promise((resolve, reject) => {
        fs.unlink(path.join(__dirname, '../public', img), err => {
            if (err) reject(err);
            resolve();
        })
    });

exports.remove = film => {
    return new Promise((resolve, reject) => {
        const id = film.film_id;
        const img = film.img;
        const promise = new Promise((resolve, reject) => {
            fs.unlink(path.join(__dirname, '../public', img), err => {
                if (err && err.code != 'ENOENT') reject(err);
                resolve();
            })
        });

        promise.then(
            () => new Promise((resolve, reject) => {
                const sql = 'DELETE FROM film WHERE film_id = ?';
                db.query(sql, [id], (err, result) => {
                    if (err) reject(err);
                    resolve(id);
                });
            })).then(
            () => remove()
        ).then(
            () => resolve()
        ).catch(
                err => {
                console.log(err);
                reject(err)
            }
        );
    });
};
