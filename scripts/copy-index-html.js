const srcFile = process.argv[2];
const destFile = process.argv[3];

if (!srcFile || !destFile) {
	console.error('ERROR: Missing required arguments.\n\nUsage: SCRIPT <source file> <destination file>');
}

const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const srcFilePath = path.resolve(srcFile);
const destFilePath = path.resolve(destFile);

const child = spawn('git', [ 'rev-parse', 'HEAD' ]);
let stdout = '';
let stderr = '';
child.stdout.on('data', function(data) {
	if (data) {
		stdout += data.toString();
	}
});
child.stderr.on('data', function(data) {
	if (data) {
		stderr += data.toString();
	}
});
child.stdin.end();
child.on('close', () => {
	if (stderr) {
		return done(new Error(stderr.trim()));
	}
	const commitHash = stdout.trim();
	fs.readFile(srcFilePath, function(error, contents) {
		if (error) return done(error);
		const pkg = require('../package.json');
		const target = process.env.NODE_ENV || 'prod';
		const data = {
			info: _.extend({}, _.pick(pkg,
				'description',
				'version'
			), {
				name: pkg.app.name || '',
				repoUrl: pkg.homepage || '',
				commitHash,
			}),
			target,
		};
		const template = _.template(contents.toString());
		const output = template(data);
		fs.writeFile(destFilePath, output, done);
	});
});

const done = function(error) {
	if (error) {
		console.error(error);
		process.exit(1);
	}
	process.exit();
};
