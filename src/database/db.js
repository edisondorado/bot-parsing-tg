const mongoose = require("mongoose");
module.exports = mongoose.connect(
  "mongodb+srv://<name>:<password>@cluster0.t09fkhs.mongodb.net/?retryWrites=true&w=majority"
);
