module.exports = {
    name: "userRoles",
    schema: {
      code: {
        type: String,
        required: true
      },
      title: {
        type: String,
        required: true
      },
      createdBy: String,
      updatedBy: String,
      status: {
        type: String,
        default: "active"
      },
      isDeleted: {
        type: Boolean,
        default: false
      }
    }
  };
  