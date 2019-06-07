module.exports = class EntityAssessorsTrackers extends Abstract {
    constructor() {
        super(entityAssessorsTrackersSchema);
    }

    static get name() {
        return "entityAssessorsTrackers";
    }

};
