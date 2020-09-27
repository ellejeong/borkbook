const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Post = require("../models/post");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const middleware = require("../middleware");
const multer = require("multer");

// ===================
//     CLOUDINARY
// ===================
var storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, Date.now() + file.originalname);
  },
});
var imageFilter = function (req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter });

var cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: "ellejeong",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===================
//     AUTH ROUTES
// ===================

// SIGN UP PAGE
router.get("/register", (req, res) => {
  res.render("register", { page: "register" });
});

// CREATE NEW USER
router.post("/register", upload.single("avatar"), (req, res) => {
  cloudinary.uploader.upload(req.file.path, (result) => {
    const newUserObj = {
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      // add cloudinary url for the image to the post object under image property
      avatar: result.secure_url,
    };
    const newUser = new User(newUserObj);
    if (req.body.adminCode === "ilovedogs0901") {
      newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, (err, user) => {
      if (err) {
        req.flash("error", err.message);
        console.error(err);
        return res.redirect("register");
      }
      passport.authenticate("local")(req, res, () => {
        req.flash("success", `Welcome to BorkBook ${user.username}`);
        res.redirect("/posts");
      });
    });
  });
});

// LOGIN PAGE
router.get("/login", (req, res) => {
  res.render("login", { page: "login" });
});

// AUTHENTICATE USER
router.post("/login", function (req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/posts",
    failureRedirect: "/login",
    failureFlash: true,
    // See use here:
    // http://www.passportjs.org/docs/authenticate/
    successFlash: `Welcome back, ${req.body.username}!`,
  })(req, res);
});

// LOGOUT USER
router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success", "You are now logged out.");
  res.redirect("/posts");
});

// PASSWORD RESET PROMP PAGE
router.get("/reset", (req, res) => {
  res.render("reset");
});

// PASSWORD RESET - EMAIL PROMPT
router.post("/reset", (req, res, next) => {
  async.waterfall(
    [
      (done) => {
        crypto.randomBytes(20, (err, buf) => {
          const token = buf.toString("hex");
          done(err, token);
        });
      },
      (token, done) => {
        User.findOne({ email: req.body.email }, (err, user) => {
          if (!user) {
            req.flash("error", "No account with that email address exists.");
            return res.redirect("/reset");
          }
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
          user.save((err) => {
            done(err, token, user);
          });
        });
      },
      (token, user, done) => {
        const smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: "help.borkbook@gmail.com",
            pass: process.env.GMAILPW,
          },
        });
        const mailOptions = {
          to: user.email,
          from: "help.borkbook@gmail.com",
          subject: "BorkBook: Password Reset",
          text: `You're receiving this because you (or someone else) have requested the reset of the password.\n\nPlease click the following link, or paste it into your browser to complete the process.\n\nhttp://${req.headers.host}/reset/${token}\n\nIf you did not make this request, please ignore this email and your password will remain unchanged`,
        };
        smtpTransport.sendMail(mailOptions, (err) => {
          console.log("Mail sent");
          req.flash(
            "success",
            `An email has been send to ${user.email} with further instructions.`
          );
          done(err, done);
        });
      },
    ],
    (err) => {
      if (err) return next(err);
      res.redirect("/reset");
    }
  );
});

// PASSWORD RESET UPDATE PAGE
router.get("/reset/:token", (req, res) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    (err, user) => {
      if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect(`/reset/${req.params.token}`);
      }
      res.render("new-password", { token: req.params.token });
    }
  );
});

// PASSWORD RESET - UPDATE EMAIL
router.post("/reset/:token", (req, res) => {
  async.waterfall(
    [
      (done) => {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          (err, user) => {
            if (!user) {
              req.flash(
                "error",
                "Password reset token is invalid or has expired."
              );
              return res.redirect("back");
            }
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, function (err) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function (err) {
                  req.logIn(user, function (err) {
                    done(err, user);
                  });
                });
              });
            } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect("back");
            }
          }
        );
      },
      (user, done) => {
        var smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: "help.borkbook@gmail.com",
            pass: process.env.GMAILPW,
          },
        });
        var mailOptions = {
          to: user.email,
          from: "help.borkbook@gmail.com",
          subject: "Your password has been changed",
          text:
            "Hello,\n\n" +
            "This is a confirmation that the password for your account " +
            user.email +
            " has just been changed.\n",
        };
        smtpTransport.sendMail(mailOptions, (err) => {
          req.flash("success", "Success! Your password has been changed.");
          done(err);
        });
      },
    ],
    (err) => {
      res.redirect("/posts");
    }
  );
});

// USER PROFILE PAGE
router.get("/users/:id", (req, res) => {
  User.findById(req.params.id, (err, foundUser) => {
    if (err) {
      req.flash("error", "User not found.");
      res.redirect("/");
    }
    Post.find()
      .where("author.id")
      .equals(foundUser._id)
      .exec((err, posts) => {
        if (err) {
          req.flash("error", "Something went wrong.");
          res.redirect("/");
        }
        res.render("users/show", { user: foundUser, posts: posts });
      });
  });
});

// EDIT - EDIT USER INFO
router.get("/users/:id/edit", middleware.checkProfileOwnership, (req, res) => {
  User.findById(req.params.id, (err, foundUser) => {
    if (err) {
      req.flash("error", "User not found.");
      res.redirect("/");
    }
    res.render("users/edit", { user: foundUser });
  });
});

// CREATE - ADD NEW POST TO DB
router.put(
  "/users/:id",
  middleware.checkProfileOwnership,
  upload.single("avatar"),
  (req, res) => {
    const { id } = req.params;
    const newUserObj = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
    };
    if (req.file) {
      cloudinary.uploader.upload(req.file.path, (result) => {
        // add cloudinary url for the image to the post object under image property
        newUserObj.avatar = result.secure_url;
        User.findByIdAndUpdate(id, newUserObj, (err) => {
          if (err) {
            console.error("Something went wrong: ", err);
            req.flash("error", "Unable to edit.");
            res.redirect(`/users/${id}`);
          } else {
            res.redirect(`/users/${id}`);
          }
        });
      });
    } else {
      User.findByIdAndUpdate(id, newUserObj, (err) => {
        if (err) {
          console.error("Something went wrong: ", err);
          req.flash("error", "Unable to edit.");
          res.redirect(`/users/${id}`);
        } else {
          res.redirect(`/users/${id}`);
        }
      });
    }
  }
);

module.exports = router;
