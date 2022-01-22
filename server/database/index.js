const mongoose = require('mongoose');
const generateUniqueKey = require('mongoose-generate-unique-key');

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

reviewSchema.plugin(
  generateUniqueKey('review_id', () => String(Math.floor(Math.random() * 1_000_000_000)))
);

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
    Size: {
      id: Number,
      value: Number
    },
    Width: {
      id: Number,
      value: Number
    },
    Comfort: {
      id: Number,
      value: Number
    },
    Quality: {
      id: Number,
      value: Number
    },
    Length: {
      id: Number,
      value: Number
    },
    Fit: {
      id: Number,
      value: Number
    }
  }
});

const ReviewsMeta = mongoose.model('ReviewsMeta', reviewsMetaSchema);

const loadReview = (review_id) => {
  return Review.findOne({ review_id });
};

const updateReview = (review_id, review) => {
  return Review.updateOne({ review_id }, review);
};

const createReview = (reivewData) => {
  let {
    product_id,
    rating,
    summary,
    body,
    recommend,
    name,
    email,
    photos
  } = reivewData;
  product_id = product_id.toString();
  for (let i = 0; i < photos.length; i++) {
    photos[i] = { url: photos[i] };
  }
  return ReviewsMeta.findOne({ product_id })
    .then((productMeta) => {
      if (reivewData.characteristics) {
        for (let name in productMeta.characteristics) {
          if (productMeta.characteristics[name].id) {
            const id = productMeta.characteristics[name].id.toString();
            if (id in reivewData.characteristics) {
              productMeta.characteristics[name].value += reivewData.characteristics[id];
            }
          }
        }
      }
      if (reivewData.recommend) {
        if (!productMeta.recommended['true']) {
          productMeta.recommended['true'] = 0;
        }
        productMeta.recommended['true']++;
      } else {
        if (!productMeta.recommended['false']) {
          productMeta.recommended['false'] = 0;
        }
        productMeta.recommended['false']++;
      }
      if (reivewData.rating) {
        if (!productMeta.ratings[reivewData.rating]) {
          productMeta.ratings[reivewData.rating] = 0;
        }
        productMeta.ratings[reivewData.rating]++;
      }
      productMeta.total_reviews++;
      return ReviewsMeta.updateOne({ product_id }, productMeta);
    })
    .then(() => {
      const review = new Review({
        product_id,
        rating,
        summary,
        body,
        recommend,
        response: null,
        date: new Date(),
        reviewer_name: name,
        helpfulness: 0,
        email,
        photos,
        // review_id: new mongoose.Types.ObjectId()
      });
      return review.save();
    });
};

const loadReviewsMeta = (product_id) => {
  return ReviewsMeta.findOne({ product_id })
    .then((result) => {
      if (result === null) {
        throw 'No such product_id';
      }
      metadata = {};
      metadata.product_id = result.product_id;
      if (result.ratings) {
        metadata.ratings = result.ratings;
      }
      if (result.recommended) {
        metadata.recommended = result.recommended;
      }
      if (result.characteristics) {
        const chrs = result.characteristics.toObject();
        const total = result.total_reviews;
        for (let chr in chrs) {
          if (!chrs[chr].value) {
            delete chrs[chr];
          } else {
            chrs[chr].value = chrs[chr].value / total;
          }
        }
        metadata.characteristics = chrs;
      }
      return metadata;
    });
};

const loadReviews = (product_id, count, page, sort) => {
  return Review.find({ product_id }).where('reported').ne(true).lean()
    .then((reviews) => {
      for (let review of reviews) {
        if (!review.photos) {
          review.photos = [];
        }
      }
      return {
        product: product_id,
        page,
        count,
        results: reviews
      };
    });
};

module.exports = {
  loadReview,
  updateReview,
  loadReviews,
  createReview,
  loadReviewsMeta,
  Review,
  ReviewsMeta
};