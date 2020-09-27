const express = require("express");
const router = express.Router({ mergeParams: true });
const Post = require("../models/post");
const Comment = require("../models/comment");
const middleware = require("../middleware");

// ===================
//   COMMENTS ROUTES
// ===================

// CREATE NEW COMMENT PAGE
router.get("/new", middleware.isLoggedIn, (req, res) => {
  Post.findById(req.params.id, (err, foundPost) => {
    if (err) {
      console.error("Something went wrong: ", err);
    } else {
      res.render("comments/new", { post: foundPost });
    }
  });
});

// CREATE NEW COMMENT POST
router.post("/", middleware.isLoggedIn, (req, res) => {
  Post.findById(req.params.id, (err, post) => {
    if (err) {
      req.flash("errpr", "Something went wrong.");
      console.error("Something went wrong: ", err);
      res.redirect("/posts");
    } else {
      Comment.create(req.body.comment, (err, comment) => {
        if (err) {
          console.error("Something went wrong: ", err);
        } else {
          // Add username and id to comment
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          // Then save comment
          comment.save();
          // Then push the comments onto current post
          post.comments.push(comment);
          // Then save the post with new comment
          post.save();
          req.flash("success", "Successfully added comment.");
          // Then redirect to post page to see new cpmment
          res.redirect(`/posts/${post._id}`);
        }
      });
    }
  });
});

// EDIT - EDIT COMMENT PAGE
router.get(
  "/:comment_id/edit",
  middleware.checkCommentOwnership,
  (req, res) => {
    const { id, comment_id } = req.params;
    Comment.findById(comment_id, (err, foundComment) => {
      if (err) {
        console.error("Something went wrong: ", err);
        res.redirect("back");
      } else {
        res.render("comments/edit", {
          post_id: id,
          comment: foundComment,
        });
      }
    });
  }
);

// EDIT - COMMENT UPDATE
router.put("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  const { id, comment_id } = req.params;
  Comment.findByIdAndUpdate(comment_id, req.body.comment, (err, comment) => {
    if (err) {
      console.error("Something went wrong: ", err);
      res.redirect("back");
    } else {
      res.redirect(`/posts/${id}`);
    }
  });
});

// DELETE - DELETES COMMENT
router.delete("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  const { id, comment_id } = req.params;
  Comment.findByIdAndRemove(comment_id, (err) => {
    if (err) {
      console.error("Something went wrong: ", err);
      res.redirect("back");
    } else {
      req.flash("success", "Comment deleted.");
      res.redirect(`/posts/${id}`);
    }
  });
});

module.exports = router;
