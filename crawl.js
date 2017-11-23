var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var dotenv = require('dotenv');
const utilities = require('./utilities');
var env = process.env.NODE_ENV || 'development';
if (env === 'development') {
    dotenv.config();
}
else{
    console.log('Running in production environment.');
}

var excludeTypes = ['css','js','png','gif','jpg','JPG','pdf','zip','mp4','txt','ico'];

var START_URL = "https://www.google.com";
var SEARCH_WORD = "stemming";
var MAX_PAGES_TO_VISIT = 5;

var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];
var url = new URL(START_URL);
var baseUrl = url.protocol + "//" + url.hostname;

pagesToVisit.push(START_URL);
crawl();

function crawl() {
  if(numPagesVisited >= MAX_PAGES_TO_VISIT) {
    console.log("Reached max limit of number of pages to visit.");
    module.exports = pagesToVisit;
    return;
  }
  pagesToVisit = utilities.ArrNoDupe(pagesToVisit);
  var nextPage = pagesToVisit[numPagesVisited];
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
      module.exports = pagesToVisit;
      return;
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
     var $ = cheerio.load(body);
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
  var bodyText = $('html > body').text().toLowerCase();
  return(bodyText.indexOf(word.toLowerCase()) !== -1);
}

function collectInternalLinks($) {
    var relativeLinks = $("a[href^='/']");
    console.log("Found " + relativeLinks.length + " relative links on page");
    relativeLinks.each(function() {
        var link = $(this).attr('href');
        var type = link.split('.');
        type = type[type.length - 1];
        if( (excludeTypes.indexOf(type.toLowerCase()) < 0) && 
        (excludeTypes.indexOf(type.toUpperCase()) < 0) ) {
            pagesToVisit.push(baseUrl + $(this).attr('href'));
        }
    });
}