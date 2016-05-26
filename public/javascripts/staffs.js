(function () {
    document.getElementById('sortstaffs').onchange = function () {
        var href = document.getElementById('sort').firstChild.href;
        href = href.replace(/(&|\?)sort=[^&]+|$/, '$1sort=' + this.value.slice(this.value.indexOf(' ') + 1, this.value.length));
        href = href.replace(/(&|\?)desc=[^&]+|$/, '$1desc=' + this.value.slice(0, this.value.indexOf(' ')));
        console.log(this.value.slice(0, this.value.indexOf(' ')));
        href = href.replace(/(&|\?)page=[^&]+/, '$1page=1');
        document.getElementById('sort').firstChild.href = href;
        document.getElementById('sort').firstChild.click();
    };
})();