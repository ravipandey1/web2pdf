const webshot = require('webshot');
const fs = require('fs');
const async = require('async');
const path = require('path');

const urlFile = 'heroku.txt';

fs.readFile(urlFile, (err, data) => {
    if (err) throw err;
    let links = data.toString().split(',');
    let count = 0;
    let times = 0;
    async.each(
        links,
        function (link, cb) {
            count = count + 1;
            let desktopConfig = {
                name: 'desktop',
                screenSize: {
                    width: 1280
                    , height: 800
                }
                , shotSize: {
                    width: 1280
                    , height: 'all'
                }
            };

            let iphone6 = {
                name: 'iPhone6',
                screenSize: {
                    width: 375
                    , height: 667
                }
                , shotSize: {
                    width: 375
                    , height: 'all'
                }
            };

            let configurations = [];
            configurations.push(desktopConfig);
            configurations.push(iphone6);

            async.each(configurations, function (config, cb) {
                times = times + 1;
                let file = path.join('./', 'screenshots/', config.name, count.toString() + '.png');
                webshot(link, file, config, function (err) {
                    cb(err, link);
                });
            },
                function (err) {
                    if (err) throw err;
                    else {
                        if (times === links.length * 2) {
                            console.log('Process Complete!');
                            process.exit(0);
                        }
                    }
                });

        },
        function (e) {
            if (e) {
                console.log(e);
            }
            console.log('Process Complete!');
            process.exit(0);
        }
    );
});
