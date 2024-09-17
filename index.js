const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

mongoose.connect(process.env.MONGO_URI).then(() => {
  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
  });
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB Atlas");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

//USER schema and model
const userSchema = new mongoose.Schema({
  // _id: String,
  username: String,
  description: String,
  duration: Number,
  date: String,
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
});

const User = mongoose.model("User", userSchema);

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// create a new user
app.post("/api/users", (req, res) => {
  // check if the request is a proper name
  if (!req.body.username) {
    return res.json({ status: "Invalid user" });
  } else {
    // check if the user already exists
    User.findOne({ username: req.body.username }).then((user) => {
      // create a new user if not exists
      if (!user) {
        const newUser = new User({ username: req.body.username, count: 0 });
        newUser
          .save()
          .then((user) => {
            res.json({
              username: user.username,
              _id: user._id,
            });
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        // if already exists
        return res.json({ status: "User already exists" });
      }
    });
  }
});

// getting all user from the database
app.get("/api/users", (req, res) => {
  User.find({})
    .select("username _id")
    .then((users) => {
      res.send(users);
    })
    .catch((error) => {
      res.status(error.status);
    });
});

// adding data to users exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  // check if id present or not
  if (!req.params._id) res.json({ status: "Invalid request id" });

  // check if description and duration present or not
  if (!req.body.description || !req.body.duration)
    res.json({ status: "request descriptionp or duration missing..." });

  // find and update user with exercise and log details
  User.findByIdAndUpdate(req.params._id)
    .exec()
    .then((user) => {
      // check if user exists or not
      if (!user) return res.json({ status: "User not found" });

      const exerciseObject = {
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date
          ? new Date(req.body.date).toDateString()
          : new Date().toDateString(),
      };

      user.description = exerciseObject.description;
      user.duration = exerciseObject.duration;
      user.date = exerciseObject.date;
      user.log.push(exerciseObject);
      user.count = user.log.length;

      user
        .save()
        .then((user) => {
          res.json({
            _id: user._id,
            username: user.username,
            description: user.description,
            duration: user.duration,
            date: user.date,
          });
        })
        .catch((error) => {
          console.log(error);
          res.json({ status: "User not found" });
        });
    });
});

app.get("/api/users/:_id/logs", (req, res) => {
  // check if id present or not
  if (!req.params._id) res.json({ status: "Invalid request id" });

  // find user to get logs
  User.findById(req.params._id)
    .then((user) => {
      // check if user exists or not
      if (!user) return res.json({ status: "User not found" });

      const fromDate = getDate(req.query.from);
      const toDate = getDate(req.query.to);
      const limit = Number(req.query.limit ? req.query.limit : 0);
      const logs = user.log;

      const filteredLogs = logs.filter((log) => {
        if (fromDate && toDate) {
          return new Date(log.date) >= fromDate && new Date(log.date) <= toDate;
        } else if (fromDate && !toDate) {
          return new Date(log.date) >= fromDate;
        } else if (!fromDate && toDate) {
          return new Date(log.date) <= toDate;
        } else {
          return true;
        }
      });

      console.log(filteredLogs);
      const limitedLogs =
        limit > 0 ? filteredLogs.slice(0, limit) : filteredLogs;

      user.log = limitedLogs;

      res.json(user);
    })
    .catch((error) => {
      console.log(error);
      res.json({ status: "User not found" });
    });
});

function getDate(param) {
  if (!param) return null;
  const date = new Date(param);
  if (date.getTime()) return date;
  return null;
}