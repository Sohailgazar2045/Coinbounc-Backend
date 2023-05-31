const Joi = require("joi");
const fs = require("fs");
const Blog = require("../models/blog");
const { BACKEND_SERVER_PATH } = require("../config/index");
const BlogDTO = require("../dto/blog");
const BlogDetailsDTO = require("../dto/blog-details");
const Comment = require("../models/comment");

const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;
const blogController = {
  async create(req, res, next) {
    // 1. validate input
    // client side -> base64 encoded string -> decode -> store -> save photo's path in db
    const createBlogSchema = Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      photopath: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
    });
    const { error } = createBlogSchema.validate(req.body);

    if (error) {
      return next(error);
    }

    const { title, content, photopath, author } = req.body;

    // 2. handle photo storage and  naming

    // read as buffer
    const buffer = Buffer.from(
      photopath.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
      "base64"
    );
    // give a rendom name to photo
    const imagePath = `${Date.now()}-${author}.png`;
    // save locally
    try {
      fs.writeFileSync(`storage/${imagePath}`, buffer);
    } catch (error) {
      return next(error);
    }
    // 3. save blog to database
    let newblog;
    try {
      newblog = new Blog({
        title,
        author,
        content,
        photopath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`,
      });
      await newblog.save();
    } catch (error) {
      return next(error);
    }
    // 4. return response
    const blogDto = new BlogDTO(newblog);
    return res.status(201).json({
      blog: blogDto,
    });
  },
  async getAll(req, res, next) {
    try {
      const blogs = await Blog.find({});

      const blogsDto = [];
      for (i = 0; i < blogs.length; i++) {
        const dto = new BlogDTO(blogs[i]);
        blogsDto.push(dto);
      }
      return res.status(200).json({ blog: blogsDto });
    } catch (error) {
      return next(error);
    }
  },
  async getById(req, res, next) {
    // validate Id
    const getByIdSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });
    const { error } = getByIdSchema.validate(req.params);
    if (error) {
      return next(error);
    }
    let blog;
    const { id } = req.params;
    try {
      blog = await Blog.findOne({ _id: id }).populate("author");
    } catch (error) {
      return next(error);
    }
    // send response
    const blogDto = new BlogDetailsDTO(blog);
    return res.status(200).json({ blog: blogDto });
  },
  async update(req, res, next) {
    // validate
    const updateBlogSchema = Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      blogId: Joi.string().regex(mongodbIdPattern).required(),
      photopath: Joi.string(),
    });
    const { error } = updateBlogSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const { title, content, author, blogId, photopath } = req.body;
    // if we want to update photo
    // delete prevois photo
    // save new photo

    let blog;
    try {
      blog = await Blog.findOne({ _id: blogId });
    } catch (error) {
      return next(error);
    }

    if (photopath) {
      let prevoisPhoto = blog.photopath;
      prevoisPhoto = prevoisPhoto.split("/").at(-1);
      // delete photo
      fs.unlinkSync(`storage/${prevoisPhoto}`);

      // now save new photo
      // read as buffer
      const buffer = Buffer.from(
        photopath.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
        "base64"
      );
      // give a rendom name to photo
      const imagePath = `${Date.now()}-${author}.png`;
      // save locally
      try {
        fs.writeFileSync(`storage/${imagePath}`, buffer);
      } catch (error) {
        return next(error);
      }
      await Blog.updateOne(
        { _id: blogId },
        {
          title,
          content,
          photopath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`,
        }
      );
    } else {
      await Blog.updateOne({ _id: blogId }, { title, content });
    }
    return res.status(200).json({ message: "Blog update successfully" });
  },
  async delete(req, res, next) {
    // validate Id
    const deleteBlogSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });
    const { error } = deleteBlogSchema.validate(req.params);
    if (error) {
      return next(error);
    }

    const { id } = req.params;

    // delete blog
    // delete comments on blog
    try {
      await Blog.deleteOne({ _id: id });

      await Comment.deleteMany({ blog: id });
    } catch (error) {
      return next(error);
    }
    return res.status(200).json({ message: "Blog deleted successfully" });
  },
};

module.exports = blogController;
