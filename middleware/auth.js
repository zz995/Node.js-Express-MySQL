'use strict';

module.exports = function (req, res, next) {
    if (req.isAuthenticated()) {
        req.isRoot = req.user.name == 'root';
        return next();
    }
    if (req.method == 'GET') req.session.returnTo = req.originalUrl;
    res.redirect('/admin/login');
};