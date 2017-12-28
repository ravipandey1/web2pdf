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
const puppeteer = require('puppeteer');
const utilities = require('./utilities');
const port = 3000;
const app = express();
var PDF = require('pdfkit');

if (app.get('env') === 'development') {
  dotenv.config();
} else {
  console.log('Application is running in production environ');
}


app.use(express.static(path.join(__dirname, 'frontend')));
app.use(helmet());
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false,
}));
app.use(compression());

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/frontend/home.html'));
});

app.get('/pdfpage', function (req, res) {
  res.sendFile(path.join(__dirname + '/frontend/pdfgen.html'));
});

app.post('/url', function (req, res) {

  var fetchedUrl = req.body.url;
  console.log(fetchedUrl);

  // TODO: Enable the below line in production
  // if (!req.body.length) return res.send('Body not found in request.');
  // For Crawler to exlcude file types
  const excludeTypes = ['css', 'js', 'png', 'gif', 'jpg', 'JPG',
    'pdf', 'zip', 'mp4', 'txt', 'ico'];

  const START_URL = fetchedUrl;
  console.log(START_URL);
  const SEARCH_WORD = "stemming";
  const MAX_PAGES_TO_VISIT = 50;

  let stream = fs.createWriteStream("urls.txt");

  let pagesVisited = {};
  let numPagesVisited = 0;
  let pagesToVisit = [];
  let url = new URL(START_URL);
  let baseUrl = url.protocol + "//" + url.hostname;
  let urlFilePath = './websites/' + url.hostname + '/' + urlFile;
  app.set('hostname', url.hostname);

  if (!fs.existsSync('./websites/')) {
    fs.mkdirSync('./websites/');
  }

  if (!fs.existsSync('./views/')) {
    fs.mkdirSync('./views/');
  }

  if (!fs.existsSync('./PDF/')) {
    fs.mkdirSync('./PDF/');
  }

  if (!fs.existsSync(`./websites/${url.hostname}`)) {
    fs.mkdirSync(`./websites/${url.hostname}`);
  }

  pagesToVisit.push(START_URL);
  crawl();
  console.log("this is the end of first part");
  //

  function crawl() {
    pagesToVisit = utilities.ArrNoDupe(pagesToVisit);
    if (numPagesVisited >= MAX_PAGES_TO_VISIT) {
      console.log("Reached max limit of number of pages to visit.");
      fs.writeFile(urlFilePath, JSON.stringify(pagesToVisit), function (err) {
        if (err) {
          console.log(err);
        }
        else {
          console.log("Output... saved to /urls.txt");
          //screenshot();
        }
        // return res.render((__dirname+'/frontend/home.html'));
        // res.status(200).end();
        // return res.send(JSON.stringify(pagesToVisit));
      });
    }
    if (pagesToVisit.length >= 50) {
      console.log("Pages to visit array size threshold hit.");
      fs.writeFile(urlFilePath, JSON.stringify(pagesToVisit), function (err) {
        if (err) {
          console.log(err);
        }
        else {
          console.log("Output.saved to /urls.txt");
          screenshot();
        }
        return res.render((__dirname + '/frontend/home.html'));
        res.end();
        // return res.send(JSON.stringify(pagesToVisit));
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
          console.log("Output.. saved to /urls.txt");
          screenshot();
        }
        // return res.send(JSON.stringify(pagesToVisit));
        // return res.redirect('pdfgen.html', { root: node.frontend})

        // return res.render((__dirname+'/frontend/home.html'));
        //       res.end();
        
      });

      console.log("ITS THE ENDING");
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

  // function searchForWord($, word) {
  //   let bodyText = $('html > body').text().toLowerCase();
  //   return (bodyText.indexOf(word.toLowerCase()) !== -1);
  // }

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


  function screenshot() {
    var fs = require('fs');
  
    var puppeteer = require('puppeteer');
    fs.readFile(`./websites/${url.hostname}/urls_list.txt`, 'utf8', function (err, data) {
      if (err) throw err;
      console.log(data);
      var obj = JSON.parse(data);
  
  
      console.log(obj);
  
  
      (async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        var site = obj;
        console.log(site);
  
        for (var i = 0; i < site.length; i++) {
          console.log(i);
          var URL = site[i];
          console.log(URL);
          await page.goto(URL);
          await page.screenshot({ path: './views/' + i + 'example.png', fullPage: true });
  
        }
        console.log('********ended*************');
        await pdfgenerator();
        await browser.close();
      }
      )();
  
    });
  
  }
  
  function pdfgenerator() {
    var PDF = require('pdfkit');
    var fs = require('fs');
  
    var fs = require('fs');
    var async = require('async');
    var doc = new PDF();
    var i = 1;
    doc.pipe(fs.createWriteStream(`./PDF/${url.hostname}.pdf`));
  
    i = i + 1;

    var dirPath = './views';
  
    fs.readdir(dirPath, function (err, filesPath) {
      if (err) throw err;
      console.log(err);
      filesPath = filesPath.map(function (filePath) {
        console.log(dirPath + "/" + filePath);
  
        return dirPath + "/" + filePath;
  
      });
      async.map(filesPath, function (err, filesPath) {
        fs.readFile(err, filesPath);
  
      }, function (err, body) {
        if (err) throw err;
  
  
        console.log(body);
        console.log('added');
        for (var i = 0; i < body.length; i++) {
          doc.image(body[i], 0, 15, { width: 500 });
          // doc.text('HOLIDAYS - 1 Fortime',80,165,{align:'TOP'});
          // doc.text('Hello this is a demo file',100,200);
  
  
          doc.addPage();
        }
  
        doc.end();
        return res.send('PDF Generated successfully');
  
      });
  
    });
  }

})






app.listen(port, () => {
  console.log('Server is running on port:' + port);
});
