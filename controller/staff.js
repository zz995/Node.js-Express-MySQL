'use strict';

const only = require('only');
const staff = require('../model/staff');
const fs = require('fs');

exports.load = (req, res, next, id) => {
    staff.findByIdstaff(id).then(
            result => {
            req.staff = result[0];
            next();
        },
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

exports.info = (req, res, next) => {
    staff.staffFilm(req.staff.employee_id).then(
        films => {
            res.render('temp/staff', {
                title: 'Співробітник',
                staff: req.staff,
                films,
                isAuth: req.isAuthenticated()
            })
        },
        err => next(err)
    );

};

exports.edit = (req, res, next) => {
    res.render('form/staff', {
        title: 'Адмін паналь',
        titleSp: 'Створення',
        isNew: false,
        error: req.flash('error'),
        success: req.flash('success'),
        staff: req.staff,
        isAuth: req.isAuthenticated()
    })
};

exports.form = (req, res, next) => {
    res.render('form/staff', {
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
        staff.upload(req, res, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
    promise.then(
        () => {
            if (req.file && req.staff.img) return staff.staffImgDel(req.staff.img);
            return null;
        }
    ).catch(
            err => {
            if (err.code == 'ENOENT') return 0;
            throw err;
        }
    ).then(
        () => {
            const data = only(req.body, 'last_name first_name');

            if (req.body.date_birth) {
                data.date_birth = req.body.date_birth;
            }
            if (req.file) {
                data.img = req.file.relativepath;
            }
            data.employee_id = req.staff.employee_id;

            const pos = [];
            for (let key in req.body.position) {
                //if (req.body.position.hasOwnProperty(key)) continue;
                pos.push([key]);
            }
            data.position = pos;
            return staff.staffUpdate(data);
        }
    ).then(
        () => {
            req.flash('success', 'Данні змінені');
            let curPuth = req.originalUrl.slice(0, req.originalUrl.indexOf('?')) + '/edit';
            res.redirect(curPuth);
        },
            error => {
            if (!req.file) resolve(error);
            return new Promise((resolve, reject) => {
                fs.unlink(req.file.path, err => {
                    if (err) reject(err);
                    resolve(error);
                });
            })
        }
    ).then(
            result => {
            req.flash('error', result.message);
            let curPuth = req.originalUrl.slice(0, req.originalUrl.indexOf('?')) + '/edit';
            res.redirect(curPuth);
        },
            err => {
            req.flash('error', err.message);
            let curPuth = req.originalUrl.slice(0, req.originalUrl.indexOf('?')) + '/edit';
            res.redirect(curPuth);
        }
    )
};

exports.create = (req, res, next) => {
    const promise = new Promise((resolve, reject) => {
        staff.upload(req, res, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
    promise.then(
        () => {
            const data = only(req.body, 'last_name first_name date_birth');
            data.img = req.file ? req.file.relativepath : null;
            const pos = [];

            for (let key in req.body.position) {
                //if (req.body.position.hasOwnProperty(key)) continue;
                pos.push([key]);
            }
            data.position = pos;

            return staff.savestaff(data);
        }
    ).then(
        () => {
            req.flash('success', 'Співробітник доданий');
            res.redirect('/admin/staff');
        },
            error => {
            if (!req.file) return error;
            return new Promise((resolve, reject) => {
                fs.unlink(req.file.path, err => {
                    if (err) reject(err);
                    resolve(error);
                });
            })
        }
    ).then(
            result => {
            req.flash('error', result.message);
            res.redirect('/admin/staff');
        },
            err => {
            req.flash('error', err.message);
            res.redirect('/admin/staff');
        }
    )
};

exports.list = (req, res, next) => {
    const page = (req.query.page > 0 ? req.query.page : 1) - 1 || 0;
    const limit = ~~req.query.limit || 12;
    const validSort = ['first_name', 'last_name', 'date_birth'].indexOf(req.query.sort) + 1;

    const data = {page, limit};
    if (validSort) {
        data.sort = {
            name: req.query.sort,
            desc: req.query.desc == 'true'
        };
    }

    const answer = {};

    staff.liststaff(data).then(
            result => {
            answer.staffs = result;
            return staff.countEmployee()
        }
    ).then(
            result => {
            res.render('temp/staffs', {
                title: 'Співробітники',
                error: req.flash('error'),
                success: req.flash('success'),
                staffs: answer.staffs,
                pages: Math.ceil(result[0].count / limit),
                limit, curPage: page,
                sort: data.sort || {
                    name: 'first_name',
                    desc: 0
                },
                isAuth: req.isAuthenticated()
            })
        },
            err => {
            res.status(404);
            res.render('error', {
                title: 'Співробітники',
                message: 'Не знайдено',
                error: process.env.NODE_ENV === 'development' ? {} : err,
                isAuth: req.isAuthenticated()
            });
        }
    )
};

exports.deleteSt = (req, res, next) => {
    staff.staffDelete(req.staff).then(
        () => {
            req.flash('success', 'Співробітник успішно видалений');
            res.redirect('/staffs');
        },
            err => {
            req.flash('error', err.message);
            res.redirect('/staffs');
        }
    )
};