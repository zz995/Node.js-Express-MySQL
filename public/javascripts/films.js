(function () {
    document.getElementById('sortFilms').onchange = function () {
        var value = this.value;
        var href = document.getElementById('attr').firstChild.href;
        if (value) {
            href = href.replace(/&sort=\w+|$/, '&sort=' + value.slice(value.indexOf(' ') + 1, value.length));
            href = href.replace(/&desc=\w+|$/, '&desc=' + value.slice(0, value.indexOf(' ')));
            //alert(href);
        } else {
            href = href.replace(/&sort=[^&]*/, '');
            href = href.replace(/&desc=[^&]*/, '');
        }

        href = href.replace(/(&|\?)page=[^&]+/, '$1page=1');
        document.getElementById('attr').firstChild.href = href;
        document.getElementById('attr').firstChild.click();
    };
    document.getElementById('searchAct').onchange = function () {
        var href = document.getElementById('attr').firstChild.href;
        var value = this.value;
        if (value && /.+\s+.+/.test(value)) {
            href = href.replace(/&actor=[^&]+|$/, '&actor=' + encodeURIComponent(value.replace(/^\s*|\s*$/g,'')));
        } else {
            href = href.replace(/&actor=[^&]+/, '');
        }

        href = href.replace(/(&|\?)page=[^&]+/, '$1page=1');
        document.getElementById('attr').firstChild.href = href;
        document.getElementById('attr').firstChild.click();
    };
    document.getElementById('searchPr').onchange = function () {
        var href = document.getElementById('attr').firstChild.href;
        var value = this.value;
        if (value && /.+\s+.+/.test(value)) {
            href = href.replace(/&producer=([^&])+|$/, '&producer=' + encodeURIComponent(value.replace(/^\s*|\s*$/g,'')));
        } else {
            href = href.replace(/&producer=([^&])+/, '');
        }

        href = href.replace(/(&|\?)page=[^&]+/, '$1page=1');
        document.getElementById('attr').firstChild.href = href;
        document.getElementById('attr').firstChild.click();
    };
    document.getElementById('yearFor').onchange = function () {
        var href = document.getElementById('attr').firstChild.href;
        var value = encodeURIComponent(this.value.replace(/^\s*|\s*$/g,''));
        if (value) {
            href = href.replace(/&for=([^&])+|$/, '&for=' + value);
        } else {
            href = href.replace(/&for=([^&])+/, '');
        }

        href = href.replace(/(&|\?)page=[^&]+/, '$1page=1');
        document.getElementById('attr').firstChild.href = href;
        document.getElementById('attr').firstChild.click();
    };
    document.getElementById('yearTo').onchange = function () {
        var href = document.getElementById('attr').firstChild.href;
        var value = encodeURIComponent(this.value.replace(/^\s*|\s*$/g,''));
        if (value) {
            href = href.replace(/&to=([^&])+|$/, '&to=' + value);
        } else {
            href = href.replace(/&to=([^&])+/, '');
        }

        href = href.replace(/page=(-|\w)+/, 'page=1');
        document.getElementById('attr').firstChild.href = href;
        document.getElementById('attr').firstChild.click();
    };
    document.getElementById('language').onchange = function () {
        var href = document.getElementById('attr').firstChild.href;
        var value = encodeURIComponent(this.value.replace(/^\s*|\s*$/g,''));
        if (value) {
            href = href.replace(/&language=([^&])+|$/, '&language=' + value);
        } else {
            href = href.replace(/&language=([^&])+/, '');
        }

        href = href.replace(/(&|\?)page=[^&]+/, '$1page=1');
        document.getElementById('attr').firstChild.href = href;
        document.getElementById('attr').firstChild.click();
    };
    document.getElementById('genre').onchange = function () {
        var href = document.getElementById('attr').firstChild.href;
        var value = encodeURIComponent(this.value.replace(/^\s*|\s*$/g,''));
        if (value) {
            if (href.search(/(&genre=[^&]+)/) + 1) {
                var valid = href.match(/&genre=([^&]+)/)[1].search(new RegExp('\\s*(,|^)\\s*' + value + '\\s*(,|$)\\s*'));
                if (!++valid) href = href.replace(/(&genre=[^&]+)/, '$1,' + value);
            } else {
                href += '&genre=' + value;
            }
        } else {
            href = href.replace(/(&genre=[^&]+)/, '');
        }

        href = href.replace(/(&|\?)page=[^&]+/, '$1page=1');
        document.getElementById('attr').firstChild.href = href;
        document.getElementById('attr').firstChild.click();
    };
    document.getElementById('country').onchange = function () {
        var href = document.getElementById('attr').firstChild.href;
        var value = encodeURIComponent(this.value.replace(/^\s*|\s*$/g,''));
        if (value) {
            if (href.search(/(&country=[^&]+)/) + 1) {
                var valid = href.match(/&country=([^&]+)/)[1].search(new RegExp('\\s*(,|^)\\s*' + value + '\\s*(,|$)\\s*'));
                if (!++valid) href = href.replace(/(&country=[^&]+)/, '$1,' + value);
            } else {
                href += '&country=' + value;
            }
        } else {
            href = href.replace(/(&country=[^&]+)/, '');
        }

        href = href.replace(/(&|\?)page=[^&]+/, '$1page=1');
        document.getElementById('attr').firstChild.href = href;
        document.getElementById('attr').firstChild.click();
    };
    document.getElementById('query').onclick = function (event) {
        var target = event.target;

        if (!(target.tagName == 'SPAN' && target.classList.contains("glyphicon-remove-circle"))) return false;
        var href = document.getElementById('attr').firstChild.href;
        var param = target.getAttribute("data-param");
        if (param == 'search') {
            href = href.replace(/(&search=[^&]+)/, '');
        } else if (param == 'language') {
            href = href.replace(/(&language=[^&]+)/, '');
        } else if (param == 'genre') {
            var value = encodeURIComponent(target.getAttribute("data-name").replace(/^\s*|\s*$/g,''));
            var genre = href.match(/&genre=([^&]+)/)[1].replace(new RegExp('\\s*(,|^)\\s*' + value + '\\s*(,|$)\\s*'), '$2');
            if (genre[0] == ',') genre = genre.slice(1);
            if (genre) {
                href = href.replace(/(&genre=)[^&]+/, '$1' + genre);
            } else {
                href = href.replace(/(&genre=)[^&]+/, '');
            }
        } else if (param == 'country') {
            value = encodeURIComponent(target.getAttribute("data-name").replace(/^\s*|\s*$/g,''));
            var country = href.match(/&country=([^&]+)/)[1].replace(new RegExp('\\s*(,|^)\\s*' + value + '\\s*(,|$)\\s*'), '$2');
            if (country[0] == ',') country = country.slice(1);
            if (country) {
                href = href.replace(/(&country=)[^&]+/, '$1' + country);
            } else {
                href = href.replace(/(&country=)[^&]+/, '');
            }

        }

        href = href.replace(/(&|\?)page=[^&]+/, '$1page=1');
        document.getElementById('attr').firstChild.href = href;
        document.getElementById('attr').firstChild.click();
    };
})();