module.exports = class Programs extends AbstractController {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "programs";
  }

  find(req) {
    return super.find(req);
  }
};
