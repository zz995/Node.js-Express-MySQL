'use strict';

const only = require('only');
const admin= require('../model/admin');
const crypto = require('crypto');
const fs = require('fs');
const db = require('../db');



exports.check = () => new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM admin';
    db.query(sql, (err, result) => {
            if (err) reject(err);
            resolve(!!result.length);
        }
    )
});

exports.encryptPassword = (password, salt) => {
    if (!password) return '';
    try {
        return crypto
            .createHmac('sha1', salt)
            .update(password)
            .digest('hex');
    } catch (err) {
        return '';
    }
};

exports.create = (name, password) => new Promise((resolve, reject) => {
    //INSERT INTO `mydb`.`film` (`type`) VALUES ('5645');
    const sql = 'INSERT INTO admin SET ?';
    const salt = Math.round((new Date().valueOf() * Math.random())) + '';
    const hash = this.encryptPassword(password, salt);
    if (!hash) return reject(new Error('Пароль не повинен бути порожнім'));
    const data = {name, password: hash, salt};
    db.query(sql, data,(err, result) => {
            if (err) return reject(err);
            resolve();
        }
    )
});

exports.load = (name) => new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM admin WHERE name = ?';
    db.query(sql, [name],(err, result) => {
            if (err) return reject(err);
            //if (!result[0]) return reject(new Error('Not found'));
            resolve(result[0]);
        }
    )
});

exports.update = (admin, password) => new Promise((resolve, reject) => {
    //UPDATE `mydb`.`film` SET `description`='fgdfgdf' WHERE `film_id`='140';
    const sql = 'UPDATE admin SET password=? WHERE admin_id = ?';
    const hash = this.encryptPassword(password, admin.salt);
    if (!hash) return reject(new Error('Пароль не повинен бути порожнім'));
    db.query(sql, [hash, admin.admin_id],(err, result) => {
            if (err) return reject(err);
            resolve();
        }
    )
});

exports.authenticate = (parol, admin) => {
    return this.encryptPassword(parol, admin.salt) == admin.password;
};
