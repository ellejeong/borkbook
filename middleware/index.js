const Post = require("../models/post");
const Comment = require("../models/comment");
const User = require("../models/user");

// ===================
//     MIDDLEWARE
// ===================

let middleware = {};

middleware.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "You need to be logged in to do that.");
  res.redirect("/login");
};

middleware.checkProfileOwnership = (req, res, next) => {
  // Check if user is logged in
  if (req.isAuthenticated()) {
    User.findById(req.params.id, function (err, foundUser) {
      if (err || !foundUser) {
        req.flash("error", "Sorry, that comment does not exist.");
        console.error("Something went wrong: ", err);
        res.redirect("back");
      } else {
        // Does user own the comment?
        // Here, we use the .equals() because foundUser.author.id is a mongoose
        // object that get's converted to a string behind the scenes
        if (foundUser._id.equals(req.user._id) || req.user.isAdmin) {
          next();
        } else {
          req.flash("error", "You don't have permission to do that.");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "You need to be logged in to do that.");
    res.redirect("back");
  }
};

middleware.checkCommentOwnership = (req, res, next) => {
  // Check if user is logged in
  if (req.isAuthenticated()) {
    Comment.findById(req.params.comment_id, function (err, foundComment) {
      if (err || !foundComment) {
        req.flash("error", "Sorry, that comment does not exist.");
        console.error("Something went wrong: ", err);
        res.redirect("back");
      } else {
        // Does user own the comment?
        // Here, we use the .equals() because foundComment.author.id is a mongoose
        // object that get's converted to a string behind the scenes
        if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
          next();
        } else {
          req.flash("error", "You don't have permission to do that.");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "You need to be logged in to do that.");
    res.redirect("back");
  }
};

middleware.checkPostOwnership = (req, res, next) => {
  // Check if user is logged in
  if (req.isAuthenticated()) {
    Post.findById(req.params.id, function (err, foundPost) {
      if (err || !foundPost) {
        req.flash("error", "Sorry, that post does not exist.");
        console.error("Something went wrong: ", err);
        res.redirect("back");
      } else {
        // Does user own the post?
        // Here, we use the .equals() because post.author.id is a mongoose
        // object that get's converted to a string behind the scenes
        if (foundPost.author.id.equals(req.user._id) || req.user.isAdmin) {
          next();
        } else {
          req.flash("error", "You don't have permission to do that.");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "You need to be logged in to do that.");
    res.redirect("back");
  }
};

module.exports = middleware;
