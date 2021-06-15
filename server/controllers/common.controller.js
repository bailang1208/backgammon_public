var fs = require('fs');

function read_default_settings() {
    var filePath = path.resolve('./config/default_setting.variables.json');
    if(fs.existsSync(filePath)) {
        defaultValue = require(filePath);
        return defaultValue;
    } else {
        return defaultValue;
    }
}

function update_default_settings(defaultValue, cb) {
    var filePath = path.resolve('./config/default_setting.variables.json');
    fs.writeFile(filePath, JSON.stringify(defaultValue), function(err) {
        cb(err);
    });
}

module.exports.read_default_settings = read_default_settings;
module.exports.update_default_settings = update_default_settings;