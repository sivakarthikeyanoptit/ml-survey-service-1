module.exports = {
  async up(db) {
    
    let sourceDB = global.transferFromDb

    let programs = await sourceDB.collection('programs').find({}).toArray();

    let schoolEntity = await db.collection('entityTypes').find({
      name : "school"
    }).toArray();

    let teacherEntity = await db.collection('entityTypes').find({
      name : "teacher"
    }).toArray();

    let programsArray = new Array

    let solutionsArray = new Array

    let startDate = new Date()
    startDate.setFullYear( startDate.getFullYear() - 1 );
    let endDate = new Date()
    endDate.setFullYear( endDate.getFullYear() + 1 );
    
    let indexOfSolutions = -1

    function getCriteriaIds(themes) {
      let allCriteriaIds = [];
      themes.forEach(theme => {
        let criteriaIdArray = [];
        if (theme.children) {
          criteriaIdArray = getCriteriaIds(theme.children);
        } else {
          criteriaIdArray = theme.criteria;
        }
        criteriaIdArray.forEach(eachCriteria => {
          if(eachCriteria.criteriaId) {
            allCriteriaIds.push(eachCriteria.criteriaId);
          } else {
            allCriteriaIds.push(eachCriteria);
          }
        })
      })
      return allCriteriaIds;
    }
    
    let sectionCode = {
      'Survey Questions': {
        code : "SQ",
        name: 'Survey Questions'
      },
      'Data to be Filled': {
        code : "DF",
        name: 'Data to be Filled'
      },
      'Group Interview': {
        code : "GI",
        name: 'Group Interview'
      },
      'Individual Interview': {
        code : "II",
        name: 'Individual Interview'
      },
      'Reading Fluency - English': {
        code : "RFE",
        name: 'Reading Fluency - English'
      },
      'Reading Comprehension': {
        code : "RC",
        name: 'Reading Comprehension'
      },
      'Math Assessment': {
        code : "MA",
        name: 'Math Assessment'
      },
      'Reading Fluency - Telugu': {
        code : "RFT",
        name: 'Reading Fluency - Telugu'
      }
    }

    
    for (let programsCounter = 0; programsCounter < programs.length; programsCounter++) {

      indexOfSolutions = solutionsArray.findIndex(solution => {
        return solution._id.toString() == programs[programsCounter].components[0].id.toString()
      });

      if (indexOfSolutions < 0) {

        let evaluationFrameworkDocument = await sourceDB.collection('evaluationFrameworks').find({
          _id : programs[programsCounter].components[0].id
        }).toArray();

        let frameworkCriteriaArray = getCriteriaIds(evaluationFrameworkDocument[0].themes)


        let criterias = await sourceDB.collection('criterias').find(
          { _id: { $in: frameworkCriteriaArray } },
          {
              resourceType: 0,
              language: 0,
              keywords: 0,
              concepts: 0,
              createdFor: 0
          }
        ).toArray();

        let evidenceMethods = {};
        let sections = {};

        criterias.forEach(criteria => {
          criteria.evidences.forEach(evidence => {
            evidenceMethods[evidence.externalId] = _.omit(evidence, [
              "sections"
            ])
            evidence.sections.forEach(section => {
              sections[sectionCode[section.name].code] = sectionCode[section.name].name
            })
          })
        })

        evaluationFrameworkDocument[0].entityId = (programs[programsCounter].components[0].entities && programs[programsCounter].components[0].entities.length > 0) ? teacherEntity[0]._id : schoolEntity[0]._id
        evaluationFrameworkDocument[0].entityType = (programs[programsCounter].components[0].entities && programs[programsCounter].components[0].entities.length > 0) ? teacherEntity[0].name : schoolEntity[0].name

        evaluationFrameworkDocument[0].type = "assessment"
        evaluationFrameworkDocument[0].subType = (programs[programsCounter].components[0].entities && programs[programsCounter].components[0].entities.length > 0) ? "individual" : "institutional"
        evaluationFrameworkDocument[0].entities = (programs[programsCounter].components[0].entities && programs[programsCounter].components[0].entities.length > 0) ? programs[programsCounter].components[0].entities : programs[programsCounter].components[0].schools

        evaluationFrameworkDocument[0].programId = programs[programsCounter]._id
        evaluationFrameworkDocument[0].programExternalId = programs[programsCounter].externalId

        evaluationFrameworkDocument[0].startDate = startDate
        evaluationFrameworkDocument[0].endDate = endDate
        evaluationFrameworkDocument[0].status = "active"
        evaluationFrameworkDocument[0].isDeleted = false

        evaluationFrameworkDocument[0].evidenceMethods = evidenceMethods
        evaluationFrameworkDocument[0].sections = sections

        solutionsArray.push(evaluationFrameworkDocument[0])

      }

      programs[programsCounter].solutions = [
        programs[programsCounter].components[0].id
      ]
      programs[programsCounter].startDate = startDate
      programs[programsCounter].endDate = endDate
      programs[programsCounter].status = "active"
      programs[programsCounter].isDeleted = false
      programs[programsCounter].updatedBy = "INITIALIZE"
      programs[programsCounter].createdBy = "INITIALIZE"
      programs[programsCounter].createdAt = "INITIALIZE"
      programsArray.push(_.omit(programs[programsCounter],[
        "components"
      ]))

    }

    global.migrationMsg = "Total programs transferred - "+programsArray.length

    await db.collection('solutions').insertMany(solutionsArray);

    return await db.collection('programs').insertMany(programsArray);
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
