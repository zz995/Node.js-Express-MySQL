'use strict';

const express = require('express');
const router = express.Router();
const staff = require('../controller/staff');
const film = require('../controller/film');

router.param('ids', staff.load);
router.get('/staffs', staff.list);
router.get('/staff/:ids', staff.info);

router.param('idf', film.load);
router.get('/films', film.list);
router.get('/', film.list);
router.get('/film/:idf', film.film);

module.exports = router;
