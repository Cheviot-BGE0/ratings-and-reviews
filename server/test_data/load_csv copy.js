const events = require('events');
const fs = require('fs');
const readline = require('readline');

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/atelier_ratings')
  .catch(err => console.log(err));

const reviewSchema = new mongoose.Schema({
  product_id: { type: [String], index: true },
  rating: Number,
  summary: String,
  body: String,
  recommend: Boolean,
  response: String,
  reported: Boolean,
  date: Date,
  reviewer_name: String,
  reviewer_name: String,
  helpfulness: Number,
  photos: [
    { url: String }
  ],
  review_id: { type: [Number], index: true }
});

const Review = mongoose.model('Review', reviewSchema);

const reviewsMetaSchema = new mongoose.Schema({
  product_id: String,
  total_reviews: Number,
  ratings: {
    1: Number,
    2: Number,
    3: Number,
    4: Number,
    5: Number
  },
  recommended: {
    true: Number,
    false: Number
  },
  characteristics: {
    Size: Number,
    Width: Number,
    Comfort: Number,
    Quality: Number,
    Length: Number,
    Fit: Number
  }
});

const ReviewsMeta = mongoose.model('ReviewsMeta', reviewsMetaSchema);

// https://stackoverflow.com/questions/11456850/split-a-string-by-commas-but-ignore-commas-within-double-quotes-using-javascript
const splitCsv = (str) => {
  const accumulator = {
    soFar: [],
    isConcatting: false
  };
  str.split(',')
    .reduce((accumulator, current) => {
      if (accumulator.isConcatting) {
        accumulator.soFar[accumulator.soFar.length-1] += ',' + current;
      } else {
        if (current[0] === '"' && current[current.length-1] === '"') {
          accumulator.soFar.push(current.slice(1, current.length-1));
        } else {
          accumulator.soFar.push(current);
        }
      }
      if (current.split('"').length % 2 == 0) {
        accumulator.isConcatting = !accumulator.isConcatting;
      }
      return accumulator;
    }, accumulator);
  return accumulator.soFar;
};

// https://geshan.com.np/blog/2021/10/nodejs-read-file-line-by-line/
// https://stackabuse.com/reading-a-file-line-by-line-in-node-js/
const processLineByLine = (name, processFunc=()=>{}, storeFunc) => {
  return new Promise((resolve, reject) => {
    (async function() {
      try {
        process.stdout.write('0');
        let lineNo = 0;
        let t = new Date();
        let keys = [];
        let resultList = [];
        const rl = readline.createInterface({
          input: fs.createReadStream(name),
          crlfDelay: Infinity
        });

        rl.on('line', (line) => {
          lineNo++;
          if (lineNo === 1) {
            keys = splitCsv(line);
          } else {
            // lineData = line.split(',');
            // lineData = csvSplit(line);
            lineData = splitCsv(line);
            lineObj = {};
            for (let i = 0; i < keys.length; i++) {
              if (lineData[i] == 'null') {
                lineObj[keys[i]] = null;
              } else {
                lineObj[keys[i]] = lineData[i];
              }
            }
            procObj = processFunc(lineObj);
            if (procObj !== null) {
              resultList.push(procObj);
            }
          }
          if (new Date() - t > 500) {
            t = new Date();
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write('Line No. ');
            process.stdout.write(lineNo.toString());
          }
          if (storeFunc && resultList.length >= 100_000) {
            rl.pause();
            storeFunc(resultList)
              .then(() => {
                resultList = [];
                rl.resume()
              });
          }
        });

        await events.once(rl, 'close');

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(lineNo.toString());
        process.stdout.write(' lines read\n');
        console.log('Reading file line by line with readline done.');
        const used = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
        let returnPromise = null;
        if (storeFunc) {
          returnPromise = storeFunc(resultList);
        }
        delete resultList;
        resolve(returnPromise);
      } catch (err) {
        console.error(err);
        reject(err);
      }
    })();
  });
}

function storeReviews(reviews) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write('Storing Reviews');
  return Review.insertMany(reviews, {
    ordered: false,
    lean: true
  });
  // Reviews.insert_many(reviews, False)
}

function toBool(key) {
  if (key === '1' || key === 'true' || key === true) {
    return 'false';
  } else {
    return 'true';
  }
}

function processReview(review) {
  review['review_id'] = review['id'];

  if (!(review['product_id'] in productRatingMap)) {
    productRatingMap[review['product_id']] = {};
  }
  if (!(review['rating'] in productRatingMap[review['product_id']])) {
    productRatingMap[review['product_id']][review['rating']] = 0;
  }
  productRatingMap[review['product_id']][review['rating']]++;

  recommendKey = toBool(review['recommend'])

  if (!(review['product_id'] in productRecommendMap)) {
    productRecommendMap[review['product_id']] = {};
  }
  if (!(recommendKey in productRecommendMap[review['product_id']])) {
    productRecommendMap[review['product_id']][recommendKey] = 0;
  }
  productRecommendMap[review['product_id']][recommendKey]++;

  if (review['id'] in reviewsPhotosMap) {
    const photos = [];
    for (let i in reviewsPhotosMap[review['id']]) {
      photos.push({
        id: i,
        url: reviewsPhotosMap[review['id']][i]
      })
    }
    review['photos'] = photos;
  }
  review['date'] = Date.parse(review['date']);
  delete review['id'];
  return review;
}

function processReviewPhotos(photo) {
    reviewId = photo['review_id'];
    delete photo['review_id'];
    if (!(reviewId in reviewsPhotosMap)) {
      reviewsPhotosMap[reviewId] = {};
    }
    reviewsPhotosMap[reviewId][photo['id']] = photo['url'];
    return null;
}

process.stdout.write('Loading Review Photos\n');
reviewsPhotosMap = {};
productRatingMap = {};
productRecommendMap = {};
processLineByLine('reviews_photos.csv', processReviewPhotos)
  .then(() => {
    process.stdout.write('Loading Reviews\n')
    return processLineByLine('reviews.csv', processReview, storeReviews);
  })
  .then(() => {
    mongoose.connection.close();
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write('Transfer complete\n');
  })