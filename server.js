'use strict';

require('dotenv').config();
var express = require('express');
var dns = require('dns');
var bodyParser = require('body-parser');
var mongo = require('mongodb');
var mongoose = require('mongoose');
const { Schema } = mongoose;
var cors = require('cors');

var app = express();
var port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Basic Configuration
/** this project needs a db !! **/

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true }); // mongoose instance
mongoose.connection.on('error', () => console.log('Connection Error'));
mongoose.connection.on('open', () => console.log('Connection Success'));

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

const urlSchema = new Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: String,
    required: true,
    default: 0
  }
});
// convert/compile urlSchema into a model with schema compiled
const Url = mongoose.model('Url', urlSchema);

async function isValidUrl(urlRequest) {
  const hostname = urlRequest
    .replace(/http[s]?\:\/\//, '')
    .replace(/\/(.+)?/, '');

  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (error, address) => {
      if (error || !address) reject(false);
      resolve(true);
    });
  });
}

async function countDocuments(collection) {
  return new Promise((resolve, reject) => {
    collection.estimatedDocumentCount((error, count) => {
      if (error) reject('estimateDocumentCount() error');
      resolve(count);
    });
  });
}

const nameSchema = new Schema({
  name: String
});

app.post('/api/shorturl/new', async function(req, res) {
  const urlRequest = req.body.url;
  const isValid = await isValidUrl(urlRequest);
  if (isValid) {
    Url.findOne({ original_url: urlRequest }, async (error, urlFound) => {
      if (error) console.log('findOne() error');
      if (!urlFound) {
        Url.estimatedDocumentCount(async (error, count) => {
          if (error) res.send('estimateDocumentCount() error');
          const url = new Url({
            original_url: urlRequest,
            short_url: count + 1
          });
          //  collection, model, database?
          url.save((error, urlSaved) => {
            //.save() document url's api
            if (error) {
              res.send('save() error');
            }
            res.json({
              original_url: urlSaved.original_url,
              short_url: urlSaved.short_url
            });
            // save block
          });
          // count block
        });
        // url not found block
      } else {
        // when findOne() returns an object
        res.json({
          original_url: urlFound.original_url,
          short_url: urlFound.short_url
        });
      }
      // url found block
    });
  }
  // findOne block
});
// post request bloack

app.get('/api/shorturl/:shorturl', function(req, res) {
  const { shorturl } = req.params;
  // look for a document in database
  Url.findOne({ short_url: shorturl }, (error, urlFound) => {
    if (error || !urlFound) {
      res.json({
        error: 'No matching URL'
      });
    } else {
      res.redirect(urlFound.original_url);
    }
  });
  // findOne block
});
// get request block

app.listen(port);
console.log(`Listening to port ${port}`);
