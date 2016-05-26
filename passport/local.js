'use strict';

const mongoose = require('mongoose');
const LocalStrategy = require('passport-local').Strategy;
const admin = require('../model/admin');

module.exports = new LocalStrategy({
        usernameField: 'name',
        passwordField: 'password'
    },
    function (name, password, done) {
        admin.load(name).then(
            (adm) => {
                if (!adm) {
                    return done(null, false, { message: 'Ім\'я не вірне' });
                }
                if (!admin.authenticate(password, adm)) {
                    return done(null, false, { message: 'Пароль не вірний' });
                }
                return done(null, adm);
            },
            err => {
                done(err);
            }
        );
    }
);