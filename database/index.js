const mongoose = require("mongoose");
const { dbString } = require("../config/index");

const connectDB = async () => {
  try {
    await mongoose.connect(dbString);
    console.log(`Mongodb connected ${mongoose.connection.host}`);
  } catch (error) {
    console.log(`Mongodb Server Issue ${error}`);
  }
};

module.exports = connectDB;
