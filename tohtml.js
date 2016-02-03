var fs = require('fs');
var path = require('path');
var util = require('util');
var xml2js = require('xml2js');
var sanitizer = require('sanitizer');
var glob = require("glob")

var in_dir = process.argv[2];
var out_dir = process.argv[3];

var parser = new xml2js.Parser({
	explicitArray: false,
	preserveChildrenOrder: true
});

in_dir = path.join(in_dir, '**/vc.nativecodeanalysis.all.xml');
console.log('globing:', in_dir);

glob(in_dir, function (err, files) {
	if (err) {
		console.log(err);
		process.exit(1);
	}
	files.forEach(function (file) {
		out_html = path.join(out_dir, path.basename(path.dirname(file)) + '.html');
		console.log(out_html);
		processFile(file, out_html);
	});
	//process.exit(0);

});


function processFile(in_xml, out_file) {
	fs.readFile(in_xml, 'utf8', function (err, data) {
		parser.parseString(
			data,
			function (err, asJson) {
				writeHtml(asJson.DEFECTS.DEFECT, out_file);
			});
	});
}

function writeHtml(defects, out_file) {

	if (defects) {
		if (!Array.isArray(defects)) {
			defects = [defects];
		}
		console.log(defects.length, 'defects');
	} else {
		console.log('no defects, skipping:', out_file);
		return;
	}

	var col_names = [
		'file'
		, 'line'
		, 'column'
		, 'description'
		, 'function'
		, 'function line'
		, 'defect code'
	];
	var tbl_hdr_cells = '';

	col_names.forEach(function (cell) {
		tbl_hdr_cells += '<th>' + cell + '</th>'
	});

	var tbl_rows = '';
	defects.forEach(function (d) {
		var sfa = d.SFA;
		//exlude boost
		if (
			-1 < sfa.FILEPATH.indexOf('include\\boost')
			) {
			//console.log('skipping:', sfa.FILEPATH);
			return;
		}
		var rule_category = null;
		if (d.CATEGORY && d.CATEGORY.RULECATEGORY) {
			rule_category = d.CATEGORY.RULECATEGORY;
		}
		var row = util.format(
			'<tr><td title="%s">%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s<br />%s</td><td>%s</td><td>%s%s</td></tr>',
			sfa.FILEPATH,
			sfa.FILENAME,
			sfa.LINE,
			sfa.COLUMN,
			d.DESCRIPTION,
			d.FUNCTION,
			//d.DECORATED,
			iteratePath(d.PATH),
			d.FUNCLINE,
			null !== rule_category ? rule_category + ': ' : '',
			d.DEFECTCODE
			);
		tbl_rows += row;
	});

	fs.readFile(path.join(__dirname, 'html-template', 'html-template.html'), 'utf8', function (err, tmpl) {

		tmpl = tmpl.replace('{{tbl_header_cells}}', tbl_hdr_cells);
		tmpl = tmpl.replace('{{tbl_rows}}', tbl_rows);
		fs.writeFile(out_file, tmpl, 'utf8', function (err) {
			if (err) {
				console.log('err:', err);
			} else {
				console.log('finished:', out_file);
			}
		});
	});
}


function iteratePath(nodePath) {
	if (!nodePath) {
		return '';
	}

	var paths = '<br /><hr />';
	try {
		if (Array.isArray(nodePath.SFA)) {
			nodePath.SFA.forEach(function (sfa) {
				paths += toStringSfa(sfa);
			});
		} else if ((typeof nodePath.SFA) === 'object') {
			paths += toStringSfa(nodePath.SFA);
		} else {
			console.log('unknown property');
			console.log(typeof nodePath.SFA);
		}
	}
	catch (err) {
		console.log(err);
		console.log(nodePath);
	}
	return paths + '<br />';
}

function toStringSfa(sfa) {
	var keyEvent = '';
	if (sfa.KEYEVENT) {
		var ke = sfa.KEYEVENT;
		keyEvent = util.format(
			'&nbsp;-id:%s<br />&nbsp;-kind:%s<br />&nbsp;-importance:%s<br />&nbsp;-msg:<i>%s</i><br />',
			ke.ID,
			ke.KIND,
			ke.IMPORTANCE,
			sanitizer.escape(ke.MESSAGE)
			)
	}
	return util.format(
		'<b>%s line:%s col:%s</b><br />%s'
		, sfa.FILENAME
		, sfa.LINE
		, sfa.COLUMN
		, keyEvent
		);
}