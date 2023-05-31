class BlogDTO {
  constructor(blog) {
    this._id = blog._id;
    this.author = blog.author;
    this.content = blog.content;
    this.title = blog.title;
    this.photopath = blog.photopath;
  }
}
module.exports = BlogDTO;
