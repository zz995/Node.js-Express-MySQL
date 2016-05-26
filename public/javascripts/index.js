(function () {
    document.getElementById('searchForm').onsubmit = function () {
        var value = document.getElementById('searchWord').value;
        if (value) {
            var action = 'films?page=1&limit=10&search=' + document.getElementById('searchWord').value;
            document.getElementById('search').href = action;
            document.getElementById('search').click();
        }
        return false;
    }
})();