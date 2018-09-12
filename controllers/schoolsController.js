module.exports = class test extends AbstractController {
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

  create(req) {
    return new Promise((res, rej) => {
      cqlsh;
      res({ data: { key: "value" }, message: "success", status: 200 });
    });
  }
  find(req) {
    // req.db = "cassandra";
    return super.find(req);
  }
};
