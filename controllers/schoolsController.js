module.exports = class Schools extends AbstractController {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "schools";
  }

  insert(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    return super.insert(req);
  }

  find(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    console.log();

    return super.find(req);
  }
};
