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
const URL = require('url-parse');
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

app.set('views', path.join(__dirname, 'views'));

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
  res.send('hello world')
});

// respond with "hello world" when a GET request is made to the homepage
app.get('/crawl', function (req, res) {
  if(!req.body) return res.send('Body not found in request.');
  // For Crawler to exlcude file types
  const excludeTypes = ['css','js','png','gif','jpg','JPG',
  'pdf','zip','mp4','txt','ico'];

  let START_URL = "https://www.taltz.com";
  let SEARCH_WORD = "stemming";
  let MAX_PAGES_TO_VISIT = 50;
  
  let pagesVisited = {};
  let numPagesVisited = 0;
  let pagesToVisit = [];
  let url = new URL(START_URL);
  let baseUrl = url.protocol + "//" + url.hostname;
  
  pagesToVisit.push(START_URL);
  crawl();
  
  function crawl() {
    pagesToVisit = utilities.ArrNoDupe(pagesToVisit);
    if(numPagesVisited >= MAX_PAGES_TO_VISIT) {
      console.log("Reached max limit of number of pages to visit.");
      return res.send(JSON.stringify(pagesToVisit));
    }
    if(pagesToVisit.length >= 50) {
      console.log("Pages to visit array size threshold hit.");
      return res.send(JSON.stringify(pagesToVisit));
    }
    let nextPage = pagesToVisit[numPagesVisited];
    if (nextPage in pagesVisited) {
      // We've already visited this page, so repeat the crawl
      crawl();
    } else {
      // New page we haven't visited
      visitPage(nextPage, crawl);
    }
  }
  
  function visitPage(url, callback) {
    // Add page to our set
    pagesVisited[url] = true;
    numPagesVisited++;
  
    // Make the request
    console.log("Visiting page " + url);
    if(!url){
        console.log('url not defined', url);
        return res.send(JSON.stringify(pagesToVisit));
    }
    request (url, function(error, response, body) {
        if(error) {
            console.log(error);
            throw error;
        }
       // Check status code (200 is HTTP OK)
       console.log("Status code: " + response.statusCode);
       if(response.statusCode !== 200) {
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
    return(bodyText.indexOf(word.toLowerCase()) !== -1);
  }
  
  function collectInternalLinks($) {
      let relativeLinks = $("a[href^='/']");
      console.log("Found " + relativeLinks.length + " relative links on page");
      relativeLinks.each(function() {
          let link = $(this).attr('href');
          let type = link.split('.');
          type = type[type.length - 1];
          if( (excludeTypes.indexOf(type.toLowerCase()) < 0) && 
          (excludeTypes.indexOf(type.toUpperCase()) < 0) ) {
              pagesToVisit.push(baseUrl + $(this).attr('href'));
          }
      });
  }
})

// module.exports = app;

app.listen(port, () => {
  console.log('Server is running on port:'+port);
});
