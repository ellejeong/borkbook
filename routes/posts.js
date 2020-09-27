const express = require("express");
const router = express.Router();
const Post = require("../models/post");
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
//    POST ROUTES
// ===================

// INDEX - SHOW ALL posts
router.get("/", (req, res) => {
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), "gi");
    // Fuzzy search
    Post.find({ name: regex }, function (err, allPosts) {
      if (err || allPosts.length < 1) {
        console.error("Something went wrong: ", err);
        req.flash(
          "error",
          "No posts matched your search. Please try again."
        );
        res.redirect("back");
      } else {
        return res.render("posts/index", {
          posts: allPosts,
          page: "posts",
        });
      }
    });
  } else {
    Post.find({}, function (err, allPosts) {
      if (err) {
        console.error("Something went wrong: ", err);
      } else {
        return res.render("posts/index", {
          posts: allPosts,
          page: "posts",
        });
      }
    });
  }
});

// CREATE - ADD NEW POST TO DB
router.post("/", middleware.isLoggedIn, upload.single("image"), (req, res) => {
  cloudinary.uploader.upload(req.file.path, (result) => {
    // add cloudinary url for the image to the post object under image property
    req.body.post.image = result.secure_url;
    // add author to post
    req.body.post.author = {
      id: req.user._id,
      username: req.user.username,
    };
    Post.create(req.body.post, function (err, post) {
      if (err) {
        req.flash("error", err.message);
        return res.redirect("back");
      }
      res.redirect("/posts/" + post.id);
    });
  });
});

// NEW - SHOW FORM TO CREATE NEW POST
router.get("/new", middleware.isLoggedIn, (req, res) => {
  res.render("posts/new");
});

// SHOW - SHOWS INFO ABOUT ONE POST
router.get("/:id", (req, res) => {
  Post.findById(req.params.id)
    .populate("comments likes")
    .exec(function (err, foundPost) {
      if (err) {
        console.error("Something went wrong: ", err);
      } else {
        res.render("posts/show", { post: foundPost });
      }
    });
});

// EDIT - SHOWS EDIT FORM
router.get("/:id/edit", middleware.checkPostOwnership, (req, res) => {
  Post.findById(req.params.id, function (err, foundPost) {
    res.render("posts/edit", { post: foundPost });
  });
});

// EDIT - EDIT POST
router.put(
  "/:id",
  middleware.checkPostOwnership,
  upload.single("image"),
  (req, res) => {
    const { id } = req.params;
    if (req.file) {
      cloudinary.uploader.upload(req.file.path, (result) => {
        // add cloudinary url for the image to the post object under image property
        req.body.post.image = result.secure_url;
        Post.findByIdAndUpdate(id, req.body.post, (err) => {
          if (err) {
            console.error("Something went wrong: ", err);
            res.redirect("/posts");
          } else {
            res.redirect(`/posts/${id}`);
          }
        });
      });
    } else {
      Post.findByIdAndUpdate(id, req.body.post, (err) => {
        if (err) {
          console.error("Something went wrong: ", err);
          res.redirect("/posts");
        } else {
          res.redirect(`/posts/${id}`);
        }
      });
    }
  }
);

// DELETE - DELETES POST
router.delete("/:id", middleware.checkPostOwnership, (req, res) => {
  Post.findByIdAndRemove(req.params.id, (err) => {
    if (err) {
      console.error("Something went wrong: ", err);
      res.redirect("/posts");
    } else {
      req.flash("success", "Post deleted.");
      res.redirect("/posts/");
    }
  });
});





// POST LIKE UPDATE
router.post("/:id/like", middleware.isLoggedIn, (req, res) => {
  Post.findById(req.params.id, function (err, foundPost) {
      if (err) {
          console.log(err);
          return res.redirect("/posts");
      }

      // check if req.user._id exists in foundPost.likes
      var foundUserLike = foundPost.likes.some(function (like) {
          return like.equals(req.user._id);
      });

      if (foundUserLike) {
          // user already liked, removing like
          foundPost.likes.pull(req.user._id);
      } else {
          // adding the new user like
          foundPost.likes.push(req.user);
      }

      foundPost.save(function (err) {
          if (err) {
              console.log(err);
              return res.redirect("/posts");
          }
          return res.redirect("/posts/" + foundPost._id);
      });
  });
});



// REGEX HELPER TO AVOID DDOS ATTACK
function escapeRegex(text) {
  return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

module.exports = router;
