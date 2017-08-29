var expect = require('chai').expect;
var mlog = require('mocha-logger');
var spawn = require('child_process').spawn;
var temp = require('temp');

describe('obvious duplicates', function(done) {

	var outputPath = temp.path({prefix: 'sra-dedupe-ui-test-', suffix: '.json'});

	it('should launch the program', function(done) {
		this.timeout(10 * 1000);
		var proc = spawn('node', [
			`${__dirname}/../start.js`,
			`${__dirname}/data/dupes-obvious.json`,
			`--output`,
			outputPath,
		]);

		proc.stderr.on('data', (...text) => mlog.log('STDERR', ...text));
		proc.stdout.on('data', (...text) => mlog.log('STDOUT', ...text));
		proc.on('close', code => {
			expect(code).to.be.equal(0);
			done();
		});
	});

	it('should have created an output file', done => {
		fs.stat(outputPath, (err, stats) => {
			expect(err).to.be.not.ok;
			expect(stats).to.be.an.instanceOf(Object);
			expect(stats.size).to.be.above(0);
			done();
		});
	});

	it('should have detected duplicates', ()=> {
		var refs = require(outputPath);
		expect(refs).to.be.an.instanceOf(Array);
		expect(refs).to.have.length(100);
	});
});
