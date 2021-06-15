var fs = require('fs');

exports.myConsoleLog = function(text) {
    //TODO: when this is done server.js will be run with forever, gonna replace all myConsoleLog's with this to also log it in a file
    console.log(text);
};

exports.strmatch = function (needle, haystack){
    if(haystack.toString().indexOf(needle) != -1)
        return true;
    else
        return false;
};

exports.addslashes = function(str){
    if(typeof str === 'undefined'){
        console.log('addslashes() str is undefined, returning an empty string.');
        return '';
    }
    if (typeof(str) != "string") {
        console.log('addslashes() type of str is not string, returning string unchanged. typeof(str): ');
        console.log(typeof(str));
        console.log(str);
        return str;
    }
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
};

exports.addslashes2 = function(str) { //escapes inputs to be used in mysql queries
    str = str.replace(/\\/g, '\\\\');
    str = str.replace(/\'/g, '\\\'');
    str = str.replace(/\"/g, '\\"');
    str = str.replace(/\0/g, '\\0');
    return str;
};

exports.myTrim = function(x) {
    return x.replace(/^\s+|\s+$/gm,'');
};

exports.secondsToTime = function(secs){
    var hours = Math.floor(secs / (60 * 60));
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = Math.floor(divisor_for_minutes / 60);
    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = Math.ceil(divisor_for_seconds);
    return hours+' hours, '+minutes+' minutes, '+seconds+' seconds';
};

exports.getItems = function(data) {
    var itemArr = [];
    for (var id in data.rgDescriptions) {
        if(typeof data.rgDescriptions[id].tags[4] !== 'undefined') {
            var item = {
                name: data.rgDescriptions[id].market_hash_name,
                classid: data.rgDescriptions[id].classid,
                icon: data.rgDescriptions[id].icon_url,
                color: data.rgDescriptions[id].tags[4].color,
                tradable: data.rgDescriptions[id].tradable,
                marketable: data.rgDescriptions[id].marketable,
            };
            itemArr.push(item);
        }
    }
    return itemArr;
};

exports.isNumeric = function(num) {
    return !isNaN(num)
};

exports.htmlspecialchars = function(str) { //use it to sanitize usernames and any other user input that is displayed to others to prevent cross-site-scripting (XSS)
    if (typeof(str) == "string") {
        str = str.replace(/&/g, "&amp;"); /* must do &amp; first */
        str = str.replace(/"/g, "&quot;");
        str = str.replace(/'/g, "&#039;");
        str = str.replace(/</g, "&lt;");
        str = str.replace(/>/g, "&gt;");
    }
    return str;
};

exports.isInt = function(n){
    if (n % 1 == 0)
        return true;
    else
        return false;
};

exports.rolltotext = function(roll){
    if(roll==0 || roll==18 || roll==36){
        return 'zero';
    }else if(roll>18){
        return 'high';
    }else{
        return 'low';
    }
};

exports.randomfloat = function(){
    return (Math.random() * (0.9 - 0.1) + 0.1).toFixed(3); //new, returns between 0.1 and 0.9
    //return parseFloat(Math.random().toFixed(3)); //old, returns between 0 and 0.999
};

exports.IsJsonString = function(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};
