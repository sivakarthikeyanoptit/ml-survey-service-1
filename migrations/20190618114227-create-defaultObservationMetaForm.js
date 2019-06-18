module.exports = {
  async up(db) {
    global.migrationMsg = "Created default observation meta."

    let defaultObservationMeta = {
      name : "defaultObservationMetaForm",
      value : [
        {
            "field": "name",
            "label": "Title",
            "value": "",
            "visible":true,
            "editable":true,
            "input": "text"
        },
        {
            "field": "description",
            "label": "Description",
            "value": "",
            "visible":true,
            "editable":true,
            "input": "text"
        },
        {
          "field": "startDate",
          "label": "Start Date",
          "value": "",
          "visible":true,
          "editable":true,
          "input": "date"
        },
        {
            "field": "endDate",
            "label": "End Date",
            "value": "",
            "visible":true,
            "editable":true,
            "input": "date"
        }
      ],
    }
    
    return await db.collection('forms').insertMany( [
      defaultObservationMeta
    ]);

  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
