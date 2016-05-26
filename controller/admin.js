'use strict';

const only = require('only');
const admin= require('../model/admin');
const fs = require('fs');

exports.profile = (req, res, next) => {
    res.render('form/profile', {
        title: 'Профіль',
        error: req.flash('error'),
        success: req.flash('success'),
        admin: req.user,
        isAuth: req.isAuthenticated()
    })
};

exports.login = (req, res, next) => {
    res.render('form/login', {
        title: 'Login',
        error: req.flash('error'),
        success: req.flash('success')
    })
};

exports.logout = (req, res) => {
    req.logout();
    res.redirect('/films');
};

exports.session = (req, res) => {
    const redirectTo = req.session.returnTo
        ? req.session.returnTo
        : '/films';
    delete req.session.returnTo;
    res.redirect(redirectTo);
};

exports.change = (req, res) => {
    const body = req.body;
    const adm = req.user;

    let url = req.originalUrl;
    if (url.indexOf('?')+1) {
        url = url.slice(0, url.indexOf('?'));
    }

    if (body.password == body.confirm) {
        if (admin.authenticate(body.passwordOld, adm)) {
            admin.update(adm, body.password).then(
                () => admin.load(adm.name)
            ).then(
                    result => {
                    req.logIn(result, function (err) {

                        if (err) {
                            req.flash('error', 'Невдалося увійти');
                            return res.redirect(url);
                        }
                        req.flash('success', 'Інформація змінена');
                        return res.redirect(url);
                    })
                },
                    err => next(err)
            );
        } else {
            req.flash('error', 'Пароль не вірний');
            return res.redirect(url);
        }

    } else {
        req.flash('error', 'Паролі не співпадаються');
        return res.redirect(url);
    }
};