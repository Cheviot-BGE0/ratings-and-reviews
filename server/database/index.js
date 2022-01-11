const reviewsSchema = new mongoose.Schema({
  product_id: String,
  review_id: Number,
  rating: Number,
  summary: String,
  recommend: Boolean,
  response: String,
  body: String,
  date: Date,
  reviewer_name: String,
  helpfulness: Number,
  photos: [
    { id: Number, url: String }
  ],
  review_id: String
});

const reviewsMetaSchema = new mongoose.Schema({
  review_id: String,
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