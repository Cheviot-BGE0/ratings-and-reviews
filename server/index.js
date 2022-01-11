const express = require('express');
const axios = require('axios');
const API_KEY = require('./config.js').API_KEY;
const app = express();
const port = 3003;

const path = require('path');
const { error } = require('console');
app.use('/', express.static(path.join(__dirname, '../../atelier-front-end/dist')));

app.all('*', (req, res) => {
  console.log(req.path);
  console.log(req.query);
  axios({
    method: req.method,
    url: `https://app-hrsei-api.herokuapp.com/api/fec2/hr-nyc${req.path}`,
    headers: {Authorization: API_KEY},
    params: req.query
  })
    .then((serviceResponse) => {
      res.json(serviceResponse.data);
    })
    .catch((err) => {
      console.error(err.toJSON().message);
      if (error.response) {
        console.error(err.response.data);
      }
    });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});