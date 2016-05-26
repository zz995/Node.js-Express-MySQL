'use strict';

const express = require('express');
const router = express.Router();
const staff = require('../controller/staff');
const film = require('../controller/film');
const admin = require('../controller/admin');
const auth = require('../middleware/auth');
const passport = require('passport');

router.param('ids', staff.load);
router.get('/staff', auth, staff.form);
router.get('/staff/:ids/edit', auth, staff.edit);
router.put('/staff/:ids', auth, staff.update);
router.delete('/staff/:ids', auth, staff.deleteSt);
router.post('/staff', auth, staff.create);


router.param('idf', film.load);
router.get('/film', auth, film.form);
router.get('/film/:idf/edit', auth, film.edit);
router.post('/film', auth, film.create);
router.put('/film/:idf', auth, film.update);
router.delete('/film/:idf', auth, film.remove);

router.get('/login', admin.login);
//router.get('/admin/signup', admin.signup);
router.get('/logout', auth, admin.logout);
//router.post('/', admin.create);
router.post('/session',
    passport.authenticate('local', {
        failureRedirect: '/admin/login',
        failureFlash: true
    }), admin.session);

router.get('/profile', auth, admin.profile);
router.put('/profile', auth, admin.change);

module.exports = router;
