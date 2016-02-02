var fs = require('fs');
var path = require('path');
var util = require('util');
var xml2js = require('xml2js');
var sanitizer = require('sanitizer');

var in_xml = process.argv[2];
var out_html = process.argv[3];

var parser = new xml2js.Parser({
	explicitArray: false,
	preserveChildrenOrder: true
});

fs.readFile(in_xml, 'utf8', function (err, data) {
	parser.parseString(
		data,
		function (err, asJson) {
			writeHtml(asJson.DEFECTS.DEFECT);
		});
});

function writeHtml(defects) {

	console.log(defects.length, 'defects');

	var col_names = [
		'file'
		, 'line'
		, 'column'
		, 'function/decorcated'
		, 'function line'
		, 'defect code'
		, 'desc'

	];
	var tbl_hdr_cells = '';

	col_names.forEach(function (cell) {
		tbl_hdr_cells += '<th>' + cell + '</th>'
	});

	var tbl_rows = '';
	defects.forEach(function (d) {
		var sfa = d.SFA;
		var rule_category = null;
		if (d.CATEGORY && d.CATEGORY.RULECATEGORY) {
			rule_category = d.CATEGORY.RULECATEGORY;
		}
		var row = util.format(
			'<tr><td title="%s">%s</td><td>%s</td><td>%s</td><td>%s<br />%s</td><td>%s</td><td>%s%s</td><td>%s</td></tr>',
			sfa.FILEPATH,
			sfa.FILENAME,
			sfa.LINE,
			sfa.COLUMN,
			d.FUNCTION,
			//d.DECORATED,
			iteratePath(d.PATH),
			d.FUNCLINE,
			null !== rule_category ? rule_category + ': ' : '',
			d.DEFECTCODE,
			d.DESCRIPTION
			);
		tbl_rows += row;
	});

	fs.readFile(path.join(__dirname, 'html-template', 'html-template.html'), 'utf8', function (err, tmpl) {

		tmpl = tmpl.replace('{{tbl_header_cells}}', tbl_hdr_cells);
		tmpl = tmpl.replace('{{tbl_rows}}', tbl_rows);
		fs.writeFile(out_html, tmpl, 'utf8', function (err) {
			if (err) {
				console.log('err:', err);
			} else {
				console.log('finished:', out_html);
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