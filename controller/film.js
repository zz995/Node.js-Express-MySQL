'use strict';

const only = require('only');
const film = require('../model/film');
const fs = require('fs');

exports.load = (req, res, next, id) => {
    film.listfilm({limit: 1}, null, id).then(
        result => {
            if (!result[0]) throw new Error('Не знайдено');
            let filmInfo = result[0];
            let actorString = '';
            let producerString = '';
            if (filmInfo.actor) {
                for (let i = 0; i < filmInfo.actor.length; i++) {
                    if (i) {
                        actorString +=  ', ';
                    }
                    actorString += `${filmInfo.actor[i].name} (${filmInfo.actor[i].id})`;
                }
                filmInfo.actorString = actorString;
            }
            if (filmInfo.producer) {
                for (let i = 0; i < filmInfo.producer.length; i++) {
                    if (i) {
                        producerString +=  ', ';
                    }
                    producerString += `${filmInfo.producer[i].name} (${filmInfo.producer[i].id})`;
                }
                filmInfo.producerString = producerString;
            }

            req.film = filmInfo;
            next();
        }
    ).catch(
        err => {
            res.status(404);
            res.render('error', {
                message: 'Не знайдено',
                error: process.env.NODE_ENV === 'development' ? {} : err,
                isAuth: req.isAuthenticated()
            });
        }
    )
};

exports.edit = (req, res, next) => {
    res.render('form/film', {
        title: 'Адмін паналь',
        titleSp: 'Створення',
        isNew: false,
        error: req.flash('error'),
        success: req.flash('success'),
        film: req.film,
        isAuth: req.isAuthenticated()
    })
};

exports.newFilm = (req, res, next) => {
    res.render('form', {
        title: 'Адмін паналь',
        isAuth: req.isAuthenticated()
    })
};

exports.form = (req, res, next) => {
    res.render('form/film', {
        title: 'Адмін паналь',
        titleSp: 'Створення',
        isNew: true,
        error: req.flash('error'),
        success: req.flash('success'),
        isAuth: req.isAuthenticated()
    })
};

exports.update = (req, res, next) => {
    const promise = new Promise((resolve, reject) => {
        film.upload(req, res, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
    promise.then(
        () => {
            if (req.file && req.film.img) return film.imgDel(req.film.img);
            return null;
        }
    ).catch(
        err => {
            if (err.code == 'ENOENT') return 0;
            throw err;
        }
    ).then(
        () => {
            const data = only(req.body, 'title year time type country genre language employee description trailer');
            data.img = req.file ? req.file.relativepath : null;
            return film.save(data, true, req.film.film_id);
        }
    ).then(
        () => {
            req.flash('success', 'Фільм змінений');
            let curPuth = req.originalUrl.slice(0, req.originalUrl.indexOf('?')) + '/edit';
            res.redirect(curPuth);
        },
        error => {
            if (!req.file) throw error;
            return new Promise((resolve, reject) => {
                fs.unlink(req.file.path, err => {
                    if (err && err.code !== 'ENOENT') reject(err);
                    reject(error);
                });
            })
        }
    ).catch(
            err => {
            req.flash('error', err.message);
            let curPuth = req.originalUrl.slice(0, req.originalUrl.indexOf('?')) + '/edit';
            res.redirect(curPuth);
        }
    )
};

exports.create = (req, res, next) => {
    const promise = new Promise((resolve, reject) => {
        film.upload(req, res, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
    promise.then(
        () => {
            const data = only(req.body, 'title year time type country genre language employee description trailer');
            data.img = req.file ? req.file.relativepath : null;
            return film.save(data);
        }
    ).then(
        () => {
            req.flash('success', 'Фільм доданий');
            res.redirect('/admin/film');
        },
        error => {
            if (!req.file) throw error;
            return new Promise((resolve, reject) => {
                fs.unlink(req.file.path, err => {
                    if (err && err.code !== 'ENOENT') reject(err);
                    reject(error);
                });
            })
        }
    ).catch(
        err => {
            req.flash('error', err.message);
            res.redirect('/admin/film');
        }
    )
};

exports.list = (req, res, next) => {
    const page = (req.query.page > 0 ? req.query.page : 1) - 1 || 0;
    const limit = ~~req.query.limit || 10;
    const validSort = ['title', 'time', 'year'].indexOf(req.query.sort) + 1;

    const data = {page, limit};
    if (validSort) {
        data.sort = {
            name: req.query.sort,
            desc: req.query.desc == 'true'
        };
    }

    if (req.query.genre) data.genre = req.query.genre.split(/,\s*/);
    if (req.query.country) data.country = req.query.country.split(/,\s*/);
    if (req.query.actor) data.actor = req.query.actor.split(/\s/);
    if (req.query.producer) data.producer = req.query.producer.split(/\s/);
    if (req.query.language) data.language = req.query.language;
    if (req.query.for) data.yearFor = req.query.for;
    if (req.query.to) data.yearTo = req.query.to;
    if (req.query.search) data.search = req.query.search;

    const answer = {};

    film.listfilm(data).then(
        result => {
            answer.film = result;
            return film.listfilm(data, true);
        }
    ).then(
        result => {
            answer.count = result[0].count;
            return Promise.all([
                film.getCountry(),
                film.getGenre(),
                film.getLanguage()
            ]);
        }
    ).then(
        result => {
            const ans = {};
            result.forEach(item => {
                const key = Object.keys(item)[0];
                ans[key] = item[key];
            });
            return ans;
        }
    ).then(
        result => {
            res.render('temp/films', {
                title: 'Фільм',
                error: req.flash('error'),
                success: req.flash('success'),
                films: answer.film,
                pages: Math.ceil(answer.count / limit),
                limit, curPage: page,
                sort: data.sort,
                select: result,
                query: data,
                isAuth: req.isAuthenticated()
            })
        },
        err => {
            res.status(404);
            res.render('error', {
                title: 'Фільм',
                message: 'Не знайдено',
                error: process.env.NODE_ENV === 'development' ? {} : err,
                isAuth: req.isAuthenticated()
            });
        }
    )
};

exports.remove = (req, res, next) => {
    film.remove(req.film).then(
        () => {
            req.flash('success', 'Фільм успішно видалений');
            res.redirect('/films');
        },
            err => {
            req.flash('error', err.message);
            res.redirect('/films');
        }
    )
};

exports.film = (req, res, next) => {
    res.render('temp/film', {
        title: 'Адмін паналь',
        titleSp: 'Створення',
        isNew: false,
        error: req.flash('error'),
        success: req.flash('success'),
        film: req.film,
        isAuth: req.isAuthenticated()
    })
};