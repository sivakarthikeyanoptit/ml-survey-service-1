module.exports = class test extends AbstractController {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "criterias";
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
