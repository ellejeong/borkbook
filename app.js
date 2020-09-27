const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const methodOverride = require("method-override");
const flash = require("connect-flash");
require("dotenv").config();

const User = require("./models/user");
const seedDB = require("./seeds");

var commentRoutes = require("./routes/comments");
var postRoutes = require("./routes/posts");
var authRoutes = require("./routes/index");

// ===================
//       DB SETUP
// ===================

mongoose
  .connect("mongodb://localhost:27017/yelp_camp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to DB!"))
  .catch((error) => console.log(error.message));

// Seed the database!
// seedDB();
app.use(flash());
// Moment availability for all view files via the variable named moment
app.locals.moment = require("moment");

// ===================
//   PASSPORT CONFIG
// ===================
app.use(
  require("express-session")({
    secret: "Bruno is the cutest",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Give currentUser info to every route
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

// ===================
//       CONFIGS
// ===================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(`${__dirname}/public`));
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("landing");
});

// ===================
//       ROUTES
// ===================
app.use(authRoutes);
app.use("/posts/:id/comments", commentRoutes);
app.use("/posts", postRoutes);

// ===================
//   LISTENING TO...
// ===================
app.listen(3000, () => {
  console.log("ROCKIN' OUT ON 3000");
});
