'use strict';

const multer = require('multer');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mkdirp = require('mkdirp');
const db = require('../db');
const only = require('only');

const findOrInsert = data =>
    employee_id => {
        console.log('ins staff');
        if (!data.position.length) return [];
        const ins = pos => {
            const sql = "INSERT INTO staff (position) "
                + `SELECT * FROM ( SELECT '${pos}') AS tmp `
                + "WHERE NOT EXISTS ( "
                + "SELECT position "
                + "FROM staff "
                + "WHERE position = ? "
                + ")";
            return new Promise((resolve, reject) => {
                db.query(sql, [pos], (err, result) => {
                        if (err) reject(err);
                        resolve({employee_id, result});
                    }
                )
            }).then(
                data => {
                    if (data.result.affectedRows) return [data.employee_id, data.result.insertId];
                    const sql = "SELECT staff_id "
                        + "FROM staff "
                        + "WHERE position = ? "
                        + "LIMIT 1";
                    return new Promise((resolve, reject) => {
                        db.query(sql, [pos], (err, result) => {
                            if (err) reject(err);
                            resolve([data.employee_id, result[0].staff_id]);
                        })
                    })
                }
            )
        };

        return Promise.all(data.position.map(ins));
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

exports.savestaff = data =>
    new Promise((resolve, reject) => {
        if (!data.date_birth.length) data.date_birth = null;
        db.query('INSERT INTO employee SET ?',
            only(data, 'last_name first_name date_birth img'),
            (err, result) => {
                if (err) reject(err);
                resolve();
            }
        )
    });

exports.liststaff = data =>
    new Promise((resolve, reject) => {
        const sort = data.sort || {
                name: 'first_name',
                desc: 0
            };
        const limit = data.limit || 10;
        const skip = data.page * limit || 0;
        const sql = "SELECT e.employee_id, e.first_name, e.last_name, e.date_birth, e.img "
            + "FROM employee e "
            + "ORDER BY ?? " + (sort.desc ? "DESC " : "ASC ")
            + "LIMIT ? OFFSET ?";

        db.query(sql, [sort.name, limit, skip], (err, result) => {
            if (err) reject(err);
            resolve(result);
        })
    });


exports.countEmployee = () =>
    new Promise((resolve, reject) => {
        const sql = "SELECT COUNT(*) as count FROM employee";
        db.query(sql, (err, result) => {
            if (err) reject(err);
            resolve(result);
        })
    });

exports.findByIdstaff = id =>
    new Promise((resolve, reject) => {
        const sql = "SELECT e.employee_id, e.first_name, e.last_name, e.date_birth, e.img "
            + "FROM employee e "
            + "WHERE e.employee_id = ?";
        db.query(sql, [id], (err, result) => {
            if (err) reject(err);
            resolve(result);
        })
    });


exports.staffImgDel = img =>
    new Promise((resolve, reject) => {
        fs.unlink(path.join(__dirname, '../public', img), err => {
            if (err) reject(err);
            resolve();
        })
    });

exports.staffUpdate = data =>
    new Promise((resolve, reject) => {
        console.log('update employee');
        db.query('UPDATE employee SET ? WHERE employee_id = ?',
            [only(data, 'last_name first_name date_birth img'), data.employee_id],
            (err, result) => {
                if (err) reject(err);
                resolve();
            }
        )
    });

exports.staffDelete = staff =>
    new Promise((resolve, reject) => {
        const id = staff.employee_id;
        const img = staff.img;
        const promise = new Promise((resolve, reject) => {
            fs.unlink(path.join(__dirname, '../public', img), err => {
                if (err) reject(err);
                resolve();
            })
        });

        promise.then(
            () => new Promise((resolve, reject) => {
                const sql = 'DELETE FROM employee WHERE employee_id = ?';
                db.query(sql, [id], (err, result) => {
                    if (err) reject(err);
                    resolve(id);
                });
            })).then(
            () => resolve()
        ).catch(
                err => {
                console.log(err);
                reject(err)
            }
        );
    });

exports.staffFilm = id =>
    new Promise((resolve, reject) => {
        const sql = "SELECT f.film_id, f.title FROM ( "
            + "SELECT employee_id FROM employee WHERE employee_id = ? "
            + ") e "
            + "INNER JOIN employee_has_film "
            + "USING (employee_id) "
            + "INNER JOIN film f "
            + "USING (film_id) "
            + "GROUP BY f.film_id ";
        console.log(sql);
        db.query(sql, [id], (err, result) => {
            console.log('staffFilm');
            if (err) reject(err);
            resolve(result);
        });
    });