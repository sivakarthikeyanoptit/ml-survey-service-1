module.exports = class ObservationSubmissions extends Abstract {

  constructor() {
    super(observationSubmissionsSchema);
  }

  static get name() {
    return "observationSubmissions";
  }

};
