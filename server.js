// importing modules
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const compression = require('compression');
const favicon = require('serve-favicon');
const helmet = require('helmet');
const dotenv = require('dotenv');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const URL = require('url-parse');
const webshot = require('webshot');
const async = require('async');
const urlFile = 'urls_list.txt';

const utilities = require('./utilities');
const port = 3000;
// Importing the express module under the `app` variable
const app = express();
/* If the user is local development import the .env file, else do not load the
.env file.*/
if (app.get('env') === 'development') {
  dotenv.config();
} else {
  console.log('Application is running in production environ');
}

// Importing the favicon, remove if you do not have one.
// app.use(favicon(`${__dirname}/lib/public/img/favicon.ico`));

// Added further layer of security
app.use(helmet());

// Configure the express app
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false,
}));

// compress all routes
app.use(compression());

app.use(express.static(path.join(__dirname, 'lib/public')));

// catch 404 and forward to error handler
// app.use((req, res, next) => {
//   const err = new Error('Page Not Found');
//   err.status = 404;
//   next(err);
// });

// app.use((err, req, res, next) => { // eslint-disable-line
//   res.status(err.status || 500);

//   // development error handler will print stack trace
//   if (process.env.NODE_ENV === 'development') {
//     if (err.status === 404) {
//       // errors.Get404Page(req, res, err.message, err, true);
//       error.geterror(err, req, res);
//     } else {
//       // errors.Get500Page(req, res, err.message, err, true);
//       error.geterror(err, req, res);
//     }
//   } else if (process.env.NODE_ENV !== 'development') {
//     // production error handler. No stacktraces leaked to user
//     if (err.status === 404) {
//       // errors.Get404Page(req, res, '', {}, false);
//       error.geterror(err, req, res);
//     } else {
//       // errors.Get500Page(req, res, '', {}, false);
//       err.status = 500;
//       error.geterror(err, req, res);
//     }
//   }
// });

// app.use((err, req, res, next) => {
//   if (err.status === 404) {
//      console.log('1',err.status);
//      error.geterror(err, req, res);
//    } else if (err.status === 500) {
//      console.log('2', err.status);
//      error.geterror(err, req, res);
//    }

// });

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  res.send('hello world');
});

// respond with "hello world" when a GET request is made to the homepage
app.get('/crawl', function (req, res) {
  

  // TODO: Enable the below line in production
  // if (!req.body.length) return res.send('Body not found in request.');
  // For Crawler to exlcude file types
  const excludeTypes = ['css', 'js', 'png', 'gif', 'jpg', 'JPG',
    'pdf', 'zip', 'mp4', 'txt', 'ico'];

  const START_URL = "https://www.lilly.se";
  const SEARCH_WORD = "stemming";
  const MAX_PAGES_TO_VISIT = 50;

  let stream = fs.createWriteStream("urls.txt");

  let pagesVisited = {};
  let numPagesVisited = 0;
  let pagesToVisit = [];
  let url = new URL(START_URL);
  let baseUrl = url.protocol + "//" + url.hostname;
  let urlFilePath = './websites/' + url.hostname + '/' + urlFile;
  app.set('hostname',url.hostname);

  if (!fs.existsSync('./websites/' + url.hostname)){
      fs.mkdirSync('./websites/' + url.hostname);
  }

  pagesToVisit.push(START_URL);
  crawl();

  function crawl() {
    pagesToVisit = utilities.ArrNoDupe(pagesToVisit);
    if (numPagesVisited >= MAX_PAGES_TO_VISIT) {
      console.log("Reached max limit of number of pages to visit.");
      fs.writeFile(urlFilePath, JSON.stringify(pagesToVisit), function (err) {
        if (err) {
          console.log(err);
        }
        else {
          console.log("Output saved to /urls.txt");
        }
        return res.send(JSON.stringify(pagesToVisit));
      });
    }
    if (pagesToVisit.length >= 50) {
      console.log("Pages to visit array size threshold hit.");
      fs.writeFile(urlFilePath, JSON.stringify(pagesToVisit), function (err) {
        if (err) {
          console.log(err);
        }
        else {
          console.log("Output saved to /urls.txt");
        }
        return res.send(JSON.stringify(pagesToVisit));
      });
    }
    if (numPagesVisited < pagesToVisit.length) {
      let nextPage = pagesToVisit[numPagesVisited];
      if (nextPage in pagesVisited) {
        // We've already visited this page, so repeat the crawl
        crawl();
      } else {
        // New page we haven't visited
        visitPage(nextPage, crawl);
      }
    }
    else {
      console.log('End of array reached');

      fs.writeFile(urlFilePath, JSON.stringify(pagesToVisit), function (err) {
        if (err) {
          console.log(err);
        }
        else {
          console.log("Output saved to /urls.txt");
        }
        return res.send(JSON.stringify(pagesToVisit));
      });

    }

  }

  function visitPage(url, callback) {
    // Add page to our set
    pagesVisited[url] = true;
    numPagesVisited++;

    // Make the request
    console.log("Visiting page " + url);
    if (!url) {
      console.log('url not defined', url);
      stream.once('open', function (fd) {
        pagesToVisit.forEach((url) => {
          stream.write(url);
          stream.write(',');
        });
        stream.end();
      });
      return res.send(JSON.stringify(pagesToVisit));
    }
    request(url, function (error, response, body) {
      if (error) {
        console.log(error);
        throw error;
      }
      // Check status code (200 is HTTP OK)
      console.log("Status code: " + response.statusCode);
      if (response.statusCode !== 200) {
        callback();
        return;
      }
      // Parse the document body
      let $ = cheerio.load(body);
      //  var isWordFound = searchForWord($, SEARCH_WORD);
      //  if(isWordFound) {
      //    console.log('Word ' + SEARCH_WORD + ' found at page ' + url);
      //  } else {
      collectInternalLinks($);
      // In this short program, our callback is just calling crawl()
      callback();
      //  }
    });
  }

  function searchForWord($, word) {
    let bodyText = $('html > body').text().toLowerCase();
    return (bodyText.indexOf(word.toLowerCase()) !== -1);
  }

  function collectInternalLinks($) {
    let relativeLinks = $("a[href^='/']");
    console.log("Found " + relativeLinks.length + " relative links on page");
    relativeLinks.each(function () {
      let link = $(this).attr('href');
      let type = link.split('.');
      let linkUrl = new URL(link);
      type = type[type.length - 1];
      console.log(link);
      console.log(link.hostname);
      if (!(linkUrl.hostname)) {
        console.log('no hostname found');
        if ((excludeTypes.indexOf(type.toLowerCase()) < 0) &&
          (excludeTypes.indexOf(type.toUpperCase()) < 0)) {
          pagesToVisit.push(baseUrl + $(this).attr('href'));
        }
      }
    });
    console.log('=======================================');
  }
})

app.get('/screenshots', function(req, res){
  // TODO: Enable the below line in production
  // if (!req.body) return res.send('Body not found in request.');
  let hostname = app.get('hostname');
  if(!hostname) hostname = 'www.google.com';
  let urlFilePath = './websites/' + hostname + '/' + urlFile;
  fs.readFile(urlFilePath, (err, data) => {
    if (err) throw err;
    let links = JSON.parse(data.toString());
    //let links = data.toString().split(',');
    let count = 0;
    let times = 0;
    async.each(
        links,
        function (link, callback) {
            count = count + 1;
            let desktopConfig = {
                name: 'desktop',
                windowSize: {
                    width: 1280
                    , height: 800
                }
                , shotSize: {
                    width: 1280
                    , height: 'all'
                },
                phantomConfig: {'ssl-protocol':'any','ignore-ssl-errors': 'true'},
                renderDelay: 100,
                
            };

            let iphone6 = {
                name: 'iPhone6',
                windowSize: {
                    width: 375
                    , height: 667
                }
                , shotSize: {
                    width: 375
                    , height: 'all'
                },
                phantomConfig: {'ssl-protocol':'any','ignore-ssl-errors': 'true'},
                renderDelay: 100,
                
            };

            let configurations = [];
            configurations.push(desktopConfig);
            configurations.push(iphone6);

            async.each(configurations, function (config, cb) {
                times = times + 1;
                console.log(times);
                let file = path.join('./websites', hostname, 'screenshots', config.name, count.toString() + '.png');
                webshot(link, file, config, function (err) {
                  if(err){
                    console.log('\x1b[33m%s\x1b[0m',link);
                    cb(err, link);
                  }
                  else {
                    console.log('finished taking screenshot');
                    cb();
                  }
                });
            }, callback);

        },
        function (e) {
            if (e) {
                console.log(e);
            }
            console.log('Process Complete second!');
            return res.send('Done');
        }
    );
});


});

// module.exports = app;

app.listen(port, () => {
  console.log('Server is running on port:' + port);
});
