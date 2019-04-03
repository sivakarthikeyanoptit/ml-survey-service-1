module.exports = class ReportOptions extends Abstract {
    constructor() {
        super(reportOptionsSchema);
    }

    static get name() {
        return "reportOptions";
    }

};
