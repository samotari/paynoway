var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var srcFile = path.join(__dirname, '..', 'index.html');
var destFile = path.join(__dirname, '..', 'www', 'index.html');
var content = fs.readFileSync(srcFile);
var pkg = require('../package.json');
var data = {
	info: _.extend({}, _.pick(pkg,
		'description',
		'version'
	), {
		name: pkg.app.name,
		repoUrl: pkg.repository && pkg.repository.url || '',
	}),
};
var template = _.template(content.toString());
var output = template(data);
fs.writeFileSync(destFile, output);
