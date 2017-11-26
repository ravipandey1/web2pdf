const fs = require('fs');
const PDFKit = require('pdfkit');
const async = require('async');

let doc = new PDFKit();
doc.pipe(fs.createWriteStream('./websites/www.lilly.se/screenshots/desktop/file.pdf'));
fs.readdir('./websites/www.lilly.se/screenshots/desktop', (err, files) => {
    console.log(files);
    async.each(files, function(file, callback){
        if (!file.endsWith('.pdf')) {
            doc.image('./websites/www.lilly.se/screenshots/desktop/'+file, 0, 0, {width: 500});
            doc.addPage();
        }
        callback();
    }, function(){
        console.log('print this when I am finished');
        doc.end();
    });
});
// doc.image('path/to/image.png', {
//     align: 'center',
//     valign: 'center'
//  });