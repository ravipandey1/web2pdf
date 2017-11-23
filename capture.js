const page = require('phantomjs');
//phantom.addCookie({
//  'name'     : 'connect.sid',   /* required property //*/
//  'value'    : 's%3AhQXqpw-rd3XpBqpbN3sHcYMHf0gctAPt.bQnGLZ62YPij%2BVER4q0aqXzwTApVNgW9lMl5bd80RW4',  /* required property */
//  'domain'   : 'buit-eucan-rheumotology-uk-dev.herokuapp.com',
//  'path'     : '/'
//});

module.exports = function capture(sizes, address, outfilename, callback) {
//    page.customHeaders={'Authorization': 'Basic '+btoa('elanco:elanco123')};
//    page.customHeaders={'Authorization': 'Basic '+btoa('manisha.verma:SWab6mef')};
//    page.customHeaders={'Authorization': 'Basic '+btoa('C196262:Saturday123')};
    page.viewportSize = {
        width: sizes[0],
        height: sizes[1]
    };
    page.zoomFactor = 1;
    page.settings.userAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    page.open(address, function (status) {
        var filename = outfilename + '-' + sizes[0] + 'x' + sizes[1] + '.png';
        page.render('lillypublisher//' + filename);
        page.close();
        callback.apply();
    });
};

