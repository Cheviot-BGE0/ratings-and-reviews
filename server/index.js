const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const API_KEY = require('./config.js').API_KEY;
const {
  loadReview,
  updateReview,
  loadReviews,
  createReview,
  loadReviewsMeta
} = require('./database');
const app = express();
const port = 3003;

app.use(bodyParser.json());

app.get('/reviews', (req, res) => {
  if (req.query.product_id) {
    loadReviews(req.query.product_id)
      .then((reviews) => {
        res.json(reviews);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send(err);
      });
  }
});

app.get('/reviews/meta', (req, res) => {
  if (req.query.product_id) {
    loadReviewsMeta(req.query.product_id.toString())
      .then((reviewsMeta) => {
        res.json(reviewsMeta);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send(err);
      });
  }
});

app.post('/reviews', (req, res) => {
  createReview(req.body)
    .then((result) => {
      res.sendStatus(201);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send(err);
    });
});

app.put('/reviews/:review_id/helpful', (req, res) => {
  if (req.params.review_id) {
    loadReview(req.params.review_id)
      .then((review) => {
        if (review) {
          review.helpfulness++;
          updateReview(req.params.review_id, review)
            .then(() => {
              res.sendStatus(204);
            });
        } else {
          res.status(422).send('No such review_id');
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send(err);
      })
  } else {
    res.status(400).send('Missing parameters');
  }
});

app.put('/reviews/:review_id/report', (req, res) => {
  if (req.params.review_id) {
    loadReview(req.params.review_id)
      .then((review) => {
        if (review) {
          review.reported = true;
          updateReview(req.params.review_id, review)
            .then(() => {
              res.sendStatus(204);
            });
        } else {
          res.status(422).send('No such review_id');
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send(err);
      })
  } else {
    res.status(400).send('Missing parameters');
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});