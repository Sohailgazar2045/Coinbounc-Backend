const express = require("express");
const connectDB = require("./database/index");
const { PORT } = require("./config/index");
const router = require("./routes/index");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const corsOptions = {
  credentials: true,
  origin: ["http://localhost:3000"],
};

const app = express();
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use("/api/v1", router);
connectDB();

app.use("/storage", express.static("storage"));
app.use(errorHandler);
app.listen(PORT, () => {
  console.log(`App is running at PORT : ${PORT}`);
});
