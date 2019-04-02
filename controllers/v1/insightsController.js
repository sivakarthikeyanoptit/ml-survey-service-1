module.exports = class Insights extends Abstract {
  /**
     * @apiDefine errorBody
     * @apiError {String} status 4XX,5XX
     * @apiError {String} message Error
     */

  /**
     * @apiDefine successBody
     *  @apiSuccess {String} status 200
     * @apiSuccess {String} result Data
     */


  constructor() {
    super(insightsSchema);
  }

  static get name() {
    return "insights";
  }

  /**
* @api {post} /assessment/api/v1/insights/generateFromSubmissionId/:submissionId Generates insights from submission
* @apiVersion 0.0.1
* @apiName Generate Insights From Submissions
* @apiSampleRequest /assessment/api/v1/insights/generateFromSubmissionId/5c5147ae95743c5718445eff
* @apiGroup insights
* @apiUse successBody
* @apiUse errorBody
*/

  async generateFromSubmissionId(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};

        let submissionId = (req && req.params && req.params._id) ? req.params._id : false

        if(!submissionId) throw "Submission ID is mandatory."

        let response = await this.generate(submissionId)

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }

    })
  }

  async generate(submissionId = false) {

    try {

      if(!submissionId) throw "Submission ID is mandatory."

      let submissionsQueryObject = {
        _id: submissionId,
        ratingCompletedAt : {$exists : true}
      }

      let submissionsProjectionObject = {
        schoolId: 1,
        programId: 1,
        "criterias.name": 1,
        "criterias.score": 1,
        "criterias._id": 1,
        schoolExternalId: 1,
        "schoolInformation.name" : 1,
        programExternalId: 1,
        createdAt: 1,
        completedDate: 1,
        ratingCompletedAt : 1,
        evaluationFrameworkId: 1,
        evaluationFrameworkExternalId: 1
      }

      let submissionDocument = await database.models.submissions.findOne(
        submissionsQueryObject,
        submissionsProjectionObject
      ).lean();
      
      if(!submissionDocument._id) throw "No submission found"

      let evaluationFrameworkDocument = await database.models.evaluationFrameworks.findOne(
        {_id : submissionDocument.evaluationFrameworkId},
        {themes : 1, scoringSystem : 1, levelToScoreMapping : 1}
      );

      if(!evaluationFrameworkDocument._id) throw "No evaluation framework document found."
      
      let criteriaScore = _.keyBy(submissionDocument.criterias, '_id')

      let scoreThemes =  function (themes,levelToScoreMapping,criteriaScore,hierarchyLevel = 0,hierarchyTrack = [],themeScores = [],criteriaScores = []) {
        
        themes.forEach(theme => {
          if (theme.children) {
            theme.hierarchyLevel = hierarchyLevel
            theme.hierarchyTrack = hierarchyTrack

            let hierarchyTrackToUpdate = [...hierarchyTrack]
            hierarchyTrackToUpdate.push(_.pick(theme,["type","label","externalId","name"]))

            scoreThemes(theme.children,levelToScoreMapping,criteriaScore,hierarchyLevel+1,hierarchyTrackToUpdate,themeScores,criteriaScores)
            let themeScore = 0
            let criteriaLevelCount = {}
            for(var k in levelToScoreMapping) criteriaLevelCount[k]=0;
            let criteriaScoreNotAvailable = false

            theme.children.forEach(subTheme => {
              if(subTheme.score == "NA") {
                criteriaScoreNotAvailable = true
              } else {
                if(subTheme.score) {
                  themeScore += (subTheme.weightage * subTheme.score / 100 )
                }
                if(subTheme.criteriaLevelCount) {
                  Object.keys(subTheme.criteriaLevelCount).forEach(level => {
                    criteriaLevelCount[level] += subTheme.criteriaLevelCount[level]
                  })
                }
              }
            })
            theme.score = (!criteriaScoreNotAvailable) ? themeScore.toFixed(2) : "NA"
            theme.criteriaLevelCount = criteriaLevelCount

            themeScores.push(_.omit(theme,["children"]))
          } else {

            theme.hierarchyLevel = hierarchyLevel
            theme.hierarchyTrack = hierarchyTrack

            let hierarchyTrackToUpdate = [...hierarchyTrack]
            hierarchyTrackToUpdate.push(_.pick(theme,["type","label","externalId","name"]))

            let criteriaScoreArray = new Array
            let themeScore = 0
            let criteriaLevelCount = {}
            for(var k in levelToScoreMapping) criteriaLevelCount[k]=0;
            let criteriaScoreNotAvailable = false
            theme.criteria.forEach(criteria => {
              if(criteriaScore[criteria.criteriaId.toString()]) {
                criteriaScoreArray.push({
                  name : criteriaScore[criteria.criteriaId.toString()].name,
                  level : criteriaScore[criteria.criteriaId.toString()].score,
                  score : levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score] ? levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score].points : "NA",
                  weight : criteria.weightage,
                  hierarchyLevel : hierarchyLevel+1,
                  hierarchyTrack : hierarchyTrackToUpdate
                })
                if(criteriaScoreArray[criteriaScoreArray.length - 1].score == "NA") {
                  criteriaScoreNotAvailable = true
                } else {
                  themeScore += (criteria.weightage * levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score].points / 100 )
                  criteriaLevelCount[criteriaScore[criteria.criteriaId.toString()].score] += 1
                }
              }
            })
            theme.criteria = criteriaScoreArray
            theme.score = (!criteriaScoreNotAvailable) ? themeScore.toFixed(2) : "NA"
            theme.criteriaLevelCount = criteriaLevelCount

            criteriaScores.push(...criteriaScoreArray)
            themeScores.push(_.omit(theme,["criteria"]))
          }
        })

        return {
          themeScores : themeScores,
          criteriaScores: criteriaScores
        }
      }

      let themeAndCriteriaScores = scoreThemes(evaluationFrameworkDocument.themes,evaluationFrameworkDocument.levelToScoreMapping,criteriaScore,0,[])
      _.merge(submissionDocument,themeAndCriteriaScores)

      submissionDocument.submissionId = submissionDocument._id
      submissionDocument.schoolName = submissionDocument.schoolInformation.name
      _.merge(submissionDocument, _.omit(evaluationFrameworkDocument,["themes"]))

      let score = 0
      let criteriaLevelCount = {}
      for(var k in evaluationFrameworkDocument.levelToScoreMapping) criteriaLevelCount[k]=0;
      let criteriaScoreNotAvailable = false

      evaluationFrameworkDocument.themes.forEach(theme => {
        if(theme.score == "NA") {
          criteriaScoreNotAvailable = true
        } else {
          if(theme.score) {
            score += (theme.weightage * theme.score / 100 )
          }
          if(theme.criteriaLevelCount) {
            Object.keys(theme.criteriaLevelCount).forEach(level => {
              criteriaLevelCount[level] += theme.criteriaLevelCount[level]
            })
          }
        }
      })
      
      submissionDocument.score = (!criteriaScoreNotAvailable) ? score.toFixed(2) : "NA"
      submissionDocument.criteriaLevelCount = criteriaLevelCount

      submissionDocument.submissionStartedAt = submissionDocument.createdAt
      submissionDocument.submissionCompletedAt = submissionDocument.completedDate

      delete submissionDocument.createdAt
      delete submissionDocument._id
      delete submissionDocument.updatedAt

      let insightsDocument = await database.models.insights.findOneAndUpdate(
        {submissionId : submissionDocument.submissionId},
        _.pick(submissionDocument,Object.keys(database.models.insights.schema.paths)),
        {
          upsert: true,
          setDefaultsOnInsert: true,
          returnNewDocument: true
        }
      );

      return {
        message : "Insights generated successfully."
      };


    } catch (error) {
      return {
        status: 500,
        message: "Oops! Something went wrong!",
        errorObject: error
      }

    }

  }

  /**
  * @api {post} /assessment/api/v1/insights/singleEntityReport/:schoolId Return insights for a school
  * @apiVersion 0.0.1
  * @apiName Generate Insights From Submissions
  * @apiSampleRequest /assessment/api/v1/insights/singleEntityReport/5c5147ae95743c5718445eff
  * @apiGroup insights
  * @apiUse successBody
  * @apiUse errorBody
  */

  async singleEntityReport(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};

        let programId = (req && req.params && req.params._id) ? req.params._id : false
        let schoolId = (req && req.query && req.query.school) ? req.query.school : ""

        if(!programId) throw "Program ID is mandatory."
        if(schoolId == "") throw "School ID is mandatory."

        let insights = await database.models.insights.findOne(
          {
            programExternalId : programId,
            schoolId : ObjectId(schoolId)
          }
        );

        if(!insights) throw "No insights found for this school"

        let insightResult = {}

        let noRecordsFound = false
        let hierarchyLevel = 0

        while (noRecordsFound != true) {
          let recordsToProcess = insights.themeScores.filter(theme => theme.hierarchyLevel == hierarchyLevel);
          if(recordsToProcess.length > 0) {
            if(!insightResult[hierarchyLevel]) {
              insightResult[hierarchyLevel] = {
                data : new Array
              }
            }
            recordsToProcess.forEach(record => {
              if(!record.hierarchyTrack[hierarchyLevel-1] || !record.hierarchyTrack[hierarchyLevel-1].name) {
                insightResult[hierarchyLevel].data.push(record)
              } else {
                if(!insightResult[hierarchyLevel][record.hierarchyTrack[hierarchyLevel-1].name]) {
                  insightResult[hierarchyLevel][record.hierarchyTrack[hierarchyLevel-1].name] = {
                    data : new Array
                  }
                }
                insightResult[hierarchyLevel][record.hierarchyTrack[hierarchyLevel-1].name].data.push(record)
              }
            })
            hierarchyLevel += 1
          } else {
            noRecordsFound = true
          }
        }

        let criteriaResult = new Array

        insights.criteriaScores.forEach(criteria => {
          let criteriaObject = criteriaResult.filter(criteriaGroup => _.isEqual(criteriaGroup.hierarchyTrack, criteria.hierarchyTrack));
          if(criteriaObject.length > 0) {
            criteriaObject[0].data.push(_.omit(criteria,"hierarchyTrack"))
          } else {
            criteria.data = new Array
            criteria.data.push(_.omit(criteria,["hierarchyTrack","data"]))
            criteriaResult.push(_.pick(criteria,["hierarchyTrack","data"]))
          }
        })

        let responseObject = {}
        responseObject.heading = "Performance report for - "+insights.schoolName
        responseObject.summary = [
          {
            title: "Name of Entity",
            value: insights.schoolName
          },
          {
            title:"Date of Assessment",
            value:insights.ratingCompletedAt.toDateString()
          }
        ]

        responseObject.sections = new Array

        let themeSummary = new Array

        let themeSummarySectionHeaders = new Array
        themeSummarySectionHeaders.push({
          name: "name",
          value: ""
        })
        for(var k in insights.levelToScoreMapping) themeSummarySectionHeaders.push({name: k,value: insights.levelToScoreMapping[k].label})


        let generateSections = function(content,hierarchyLevel) {

          if(content.data.length > 0) {

            let tableData = new Array
            let subThemeLabel = ""
            let parentThemeType = ""
            let parentThemeName = ""
            content.data.forEach(row => {
              subThemeLabel = row.label
              parentThemeType = (row.hierarchyTrack[row.hierarchyTrack.length-1]) ? row.hierarchyTrack[row.hierarchyTrack.length-1].label : ""
              parentThemeName = (row.hierarchyTrack[row.hierarchyTrack.length-1]) ? row.hierarchyTrack[row.hierarchyTrack.length-1].name : ""
              row.score = Number(row.score)
              tableData.push(_.pick(row, ["name","score"]))
            })

            let sectionHeading = (hierarchyLevel > 0) ? parentThemeType + " - " + parentThemeName : "" 
            let graphTitle = (hierarchyLevel > 0) ? "Performance in " + parentThemeName : "Performance by "+subThemeLabel
            let graphSubTitle = (hierarchyLevel > 0) ? "Performance of school in sub categories of "+parentThemeName : "Performance of school acorss "+ subThemeLabel + " in the school development framework" 

            let graphHAxisTitle = (hierarchyLevel > 0) ?  "Categories within  "+parentThemeName : subThemeLabel+" in the school development framework"

            let eachSubSection = {
              table: true,
              graph: true,
              graphData: {
                title: graphTitle,
                subTitle: graphSubTitle,
                chartType: 'ColumnChart',
                chartOptions: {
                  is3D: true,
                  isStack: true,
                  vAxis: {
                    title: 'Percentage of development (out of 100%)',
                    minValue: 0
                  },
                  hAxis: {
                    title: graphHAxisTitle,
                    showTextEvery: 1
                  }
                }
              },
              data: tableData,
              tabularData: {
                headers: [
                  {
                    name: "name",
                    value: subThemeLabel
                  },
                  {
                    name: "score",
                    value: "Performance Index In %"
                  }
                ]
              }
            }


            responseObject.sections.push({
              heading: sectionHeading,
              subSections : [
                eachSubSection
              ]
            })

            let tableSummaryTotal = {
              "name" : "Total"
            }
            let tableSummaryPercentage = {
              "name" : "% for all themes"
            }
            for(var k in insights.levelToScoreMapping) {
              tableSummaryTotal[k] = 0
              tableSummaryPercentage[k] = 0
            }

            let summaryTableData = new Array
            let totalThemeCount = 0
            content.data.forEach(row => {
              for(var k in insights.levelToScoreMapping) {
                row[k] = row.criteriaLevelCount[k]
                tableSummaryTotal[k] += row.criteriaLevelCount[k]
                totalThemeCount += row.criteriaLevelCount[k]
              }
              summaryTableData.push(_.pick(row, ["name",...Object.keys(insights.levelToScoreMapping)]))
            })

            for(var k in insights.levelToScoreMapping) {
              tableSummaryPercentage[k] = Number(((tableSummaryTotal[k] / totalThemeCount) * 100).toFixed(2))
            }
            summaryTableData.push(tableSummaryTotal)
            summaryTableData.push(tableSummaryPercentage)
            
            let summaryTableSectionHeading = (hierarchyLevel > 0) ? "Performance report for " +insights.schoolName + " for each " : "Performance Report for " + insights.schoolName + " by "

            let eachSummarySection = {
              table: true,
              graph: false,
              data: summaryTableData,
              tabularData: {
                headers: themeSummarySectionHeaders
              }
            }
  
            themeSummary.push({
              heading: summaryTableSectionHeading,
              subSections: eachSummarySection
            })
          } else {
            Object.keys(content).forEach(subTheme => {
              if (subTheme != "data") {
                generateSections(content[subTheme],hierarchyLevel + 1)
              }
            })
          }
          
        }

        Object.keys(insightResult).forEach(hierarchyLevel => {
          let eachLevelContent = insightResult[hierarchyLevel]
          generateSections(eachLevelContent,hierarchyLevel)
        })

        criteriaResult.forEach(criteriaGroup => {

          let tableData = new Array
          let criteriaParent = criteriaGroup.hierarchyTrack[criteriaGroup.hierarchyTrack.length -1].label

          let sectionSummary = new Array
          criteriaGroup.hierarchyTrack.forEach(hierarchyLevel => {
            sectionSummary.push({
              value: hierarchyLevel.name,
              label: hierarchyLevel.label
            })
          })

          criteriaGroup.data.forEach(row => {
            row.level = Number(row.level.substr(1))
            tableData.push(_.pick(row, ["name","level"]))
          })

          let sectionHeading = "Detailed report for each "+criteriaParent
          let graphTitle = "Distribution of levels by criteria"
          let graphSubTitle = "Performance index"

          let eachSubSection = {
            table: true,
            graph: true,
            graphData: {
              title: graphTitle,
              subTitle: graphSubTitle,
              chartType: 'ColumnChart',
              chartOptions: {
                is3D: true,
                isStack: true,
                vAxis: {
                  title: 'Level',
                  minValue: 0
                },
                hAxis: {
                  title: "Criteria",
                  showTextEvery: 1
                }
              }
            },
            data: tableData,
            tabularData: {
              headers: [
                {
                  name: "name",
                  value: "Criteria"
                },
                {
                  name: "level",
                  value: "Levels"
                }
              ]
            }
          }

          responseObject.sections.push({
            heading: sectionHeading,
            summary: sectionSummary,
            subSections : [
              eachSubSection
            ]
          })
        })

        responseObject.sections = _.concat(responseObject.sections, ...themeSummary)

        let response = {
          message: "Insights report fetched successfully.",
          result: responseObject
        };

        return resolve(response);
      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }


  /**
  * @api {post} /assessment/api/v1/insights/singleEntityHighLevelReport/PROGID01?:schoolId Return high level insights for a school
  * @apiVersion 0.0.1
  * @apiName Generate Insights From Submissions
  * @apiSampleRequest /assessment/api/v1/insights/singleEntityHighLevelReport/PROGID01?school=5c5147ae95743c5718445eff
  * @apiGroup insights
  * @apiUse successBody
  * @apiUse errorBody
  */

  async singleEntityHighLevelReport(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};

        let programId = (req && req.params && req.params._id) ? req.params._id : false
        let schoolId = (req && req.query && req.query.school) ? req.query.school : ""

        if(!programId) throw "Program ID is mandatory."
        if(schoolId == "") throw "School ID is mandatory."

        let insights = await database.models.insights.findOne(
          {
            programExternalId : programId,
            schoolId : ObjectId(schoolId)
          }
        );

        if(!insights) throw "No insights found for this school"

        let insightResult = {}
        let hierarchyLevel = 0

        let recordsToProcess = insights.themeScores.filter(theme => theme.hierarchyLevel == hierarchyLevel);
        if(recordsToProcess.length > 0) {
          if(!insightResult[hierarchyLevel]) {
            insightResult[hierarchyLevel] = {
              data : new Array
            }
          }
          recordsToProcess.forEach(record => {
            if(!record.hierarchyTrack[hierarchyLevel-1] || !record.hierarchyTrack[hierarchyLevel-1].name) {
              insightResult[hierarchyLevel].data.push(record)
            } else {
              if(!insightResult[hierarchyLevel][record.hierarchyTrack[hierarchyLevel-1].name]) {
                insightResult[hierarchyLevel][record.hierarchyTrack[hierarchyLevel-1].name] = {
                  data : new Array
                }
              }
              insightResult[hierarchyLevel][record.hierarchyTrack[hierarchyLevel-1].name].data.push(record)
            }
          })
        }

        let responseObject = {}
        responseObject.heading = insights.schoolName+" - (Performance across domains)"
        responseObject.summary = [
          {
            title: "Name of Entity",
            value: insights.schoolName
          },
          {
            title:"Date of Assessment",
            value:insights.ratingCompletedAt.toDateString()
          }
        ]

        responseObject.sections = new Array

        let summarySectionTableHeaders = new Array
        summarySectionTableHeaders.push({
          name: "name",
          value: ""
        })
        for(var k in insights.levelToScoreMapping) summarySectionTableHeaders.push({name: k,value: insights.levelToScoreMapping[k].label})

        if(insightResult[0].data.length > 0) {

          let tableData = new Array

          let tableSummaryTotal = {
            "name" : "Total"
          }
          let tableSummaryPercentage = {
            "name" : "Summary"
          }
          for(var k in insights.levelToScoreMapping) {
            tableSummaryTotal[k] = 0
            tableSummaryPercentage[k] = 0
          }

          let totalThemeCount = 0
          insightResult[0].data.forEach(row => {
            for(var k in insights.levelToScoreMapping) {
              row[k] = row.criteriaLevelCount[k]
              tableSummaryTotal[k] += row.criteriaLevelCount[k]
              totalThemeCount += row.criteriaLevelCount[k]
            }
            tableData.push(_.pick(row, ["name",...Object.keys(insights.levelToScoreMapping)]))
          })

          for(var k in insights.levelToScoreMapping) {
            tableSummaryPercentage[k] = ((tableSummaryTotal[k] / totalThemeCount) * 100).toFixed(2)+"%"
          }
          tableData.push(tableSummaryPercentage)

          let sectionSummary = [
            {
              label: "Number of Key Domains",
              value: insightResult[0].data.length
            },
            {
              label: "Number of Criteria",
              value: totalThemeCount
            }
          ]
          for(var k in insights.levelToScoreMapping) {
            sectionSummary.push({
              label: "% of criteria in "+k,
              value: Number(((tableSummaryTotal[k] / totalThemeCount) * 100).toFixed(2))
            })
          }


          let graphTitle = ""
          let graphSubTitle = ""
          let graphHAxisTitle = "Percentage"

          let eachSubSection = {
            table: true,
            graph: true,
            graphData: {
              title: graphTitle,
              subTitle: graphSubTitle,
              chartType: 'ColumnChart',
              chartOptions: {
                is3D: true,
                isStack: true,
                vAxis: {
                  title: 'Key domain and totals',
                  minValue: 0
                },
                hAxis: {
                  title: graphHAxisTitle,
                  showTextEvery: 1
                }
              }
            },
            data: tableData,
            tabularData: {
              headers: summarySectionTableHeaders
            }
          }


          responseObject.sections.push({
            heading: "",
            summary: sectionSummary,
            subSections : [
              eachSubSection
            ]
          })
          
        }
        
        // let generateSections = function(content,hierarchyLevel) {

        //   if(content.data.length > 0) {

        //     let table1Headers = [
        //       {
        //         name: "name",
        //         value: "Core Standard"
        //       },
        //       {
        //         name: "level",
        //         value: "Availability"
        //       }
        //     ]
        //     let table1Data = new Array

        //     let table2Headers = [
        //       {
        //         name: "level",
        //         value: "Levels"
        //       },
        //       {
        //         name: "noOfCriteria",
        //         value: "# of Criteria"
        //       }
        //     ]
        //     let table2Data = new Array


        //     let tableSummaryTotal = {}
        //     for(var k in insights.levelToScoreMapping) {
        //       tableSummaryTotal[k] = 0
        //     }



        //     let sectionHeading = (hierarchyLevel > 0) ? parentThemeType + " - " + parentThemeName : "" 
        //     let graphTitle = (hierarchyLevel > 0) ? "Performance in " + parentThemeName : "Performance by "+subThemeLabel
        //     let graphSubTitle = (hierarchyLevel > 0) ? "Performance of school in sub categories of "+parentThemeName : "Performance of school acorss "+ subThemeLabel + " in the school development framework" 

        //     let graphHAxisTitle = (hierarchyLevel > 0) ?  "Categories within  "+parentThemeName : subThemeLabel+" in the school development framework"

        //     let eachSubSection = {
        //       table: true,
        //       graph: true,
        //       graphData: {
        //         title: graphTitle,
        //         subTitle: graphSubTitle,
        //         chartType: 'ColumnChart',
        //         chartOptions: {
        //           is3D: true,
        //           isStack: true,
        //           vAxis: {
        //             title: 'Percentage of development (out of 100%)',
        //             minValue: 0
        //           },
        //           hAxis: {
        //             title: graphHAxisTitle,
        //             showTextEvery: 1
        //           }
        //         }
        //       },
        //       data: tableData,
        //       tabularData: {
        //         headers: [
        //           {
        //             name: "name",
        //             value: subThemeLabel
        //           },
        //           {
        //             name: "score",
        //             value: "Performance Index In %"
        //           }
        //         ]
        //       }
        //     }


        //     responseObject.sections.push({
        //       heading: sectionHeading,
        //       subSections : [
        //         eachSubSection
        //       ]
        //     })

        //     let tableSummaryTotal = {
        //       "name" : "Total"
        //     }
        //     let tableSummaryPercentage = {
        //       "name" : "% for all themes"
        //     }
        //     for(var k in insights.levelToScoreMapping) {
        //       tableSummaryTotal[k] = 0
        //       tableSummaryPercentage[k] = 0
        //     }

        //     let summaryTableData = new Array
        //     let totalThemeCount = 0
        //     content.data.forEach(row => {
        //       for(var k in insights.levelToScoreMapping) {
        //         row[k] = row.criteriaLevelCount[k]
        //         tableSummaryTotal[k] += row.criteriaLevelCount[k]
        //         totalThemeCount += row.criteriaLevelCount[k]
        //       }
        //       summaryTableData.push(_.pick(row, ["name",...Object.keys(insights.levelToScoreMapping)]))
        //     })

        //     for(var k in insights.levelToScoreMapping) {
        //       tableSummaryPercentage[k] = Number(((tableSummaryTotal[k] / totalThemeCount) * 100).toFixed(2))
        //     }
        //     summaryTableData.push(tableSummaryTotal)
        //     summaryTableData.push(tableSummaryPercentage)
            
        //     let summaryTableSectionHeading = (hierarchyLevel > 0) ? "Performance report for " +insights.schoolName + " for each " : "Performance Report for " + insights.schoolName + " by "

        //     let eachSummarySection = {
        //       table: true,
        //       graph: false,
        //       data: summaryTableData,
        //       tabularData: {
        //         headers: themeSummarySectionHeaders
        //       }
        //     }

        //     themeSummary.push({
        //       heading: summaryTableSectionHeading,
        //       subSections: eachSummarySection
        //     })

        //   } else {
        //     Object.keys(content).forEach(subTheme => {
        //       if (subTheme != "data") {
        //         generateSections(content[subTheme],hierarchyLevel + 1)
        //       }
        //     })
        //   }
          
        // }

        // Object.keys(insightResult).forEach(hierarchyLevel => {
        //   if(hierarchyLevel > 0) {
        //     let eachLevelContent = insightResult[hierarchyLevel]
        //     generateSections(eachLevelContent,hierarchyLevel)
        //   }
        // })

        let response = {
          message: "Insights report fetched successfully.",
          result: responseObject
        };

        return resolve(response);
      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }


  /**
  * @api {post} /assessment/api/v1/insights/mutltiEntityReport/:programId Return insights for a school
  * @apiVersion 0.0.1
  * @apiName Generate Insights From Submissions
  * @apiSampleRequest /assessment/api/v1/insights/mutltiEntityReport/5c5147ae95743c5718445eff
  * @apiGroup insights
  * @apiUse successBody
  * @apiUse errorBody
  */

  async multiEntityReport(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};

        let programId = (req && req.params && req.params._id) ? req.params._id : false
        let schoolIdArray = (req && req.query && req.query.school) ? req.query.school.split(",") : []

        if(!programId) throw "Program ID is mandatory."
        if(!(schoolIdArray.length > 0)) throw "School ID is mandatory."

        let insights = await database.models.insights.find(
          {
            programExternalId : programId,
            schoolId : { $in: schoolIdArray }
          },
          {
            schoolId : 1,
            themeScores : 1,
            criteriaScores : 1,
            programId: 1,
            levelToScoreMapping : 1
          }
        );

        if(!insights) throw "No insights found for this school"
        
        let insightResult = {}
        let subThemeLabel = ""
        insights[0].themeScores.forEach(theme => {
          if(theme.hierarchyLevel == 1) {
              (!insightResult[theme.hierarchyTrack[0].name]) ? insightResult[theme.hierarchyTrack[0].name] = {} : ""
              if(!insightResult[theme.hierarchyTrack[0].name][theme.name]) {
                insightResult[theme.hierarchyTrack[0].name][theme.name] = {}
              }
              for(var k in insights[0].levelToScoreMapping) insightResult[theme.hierarchyTrack[0].name][theme.name][k] = 0;
              subThemeLabel = theme.label
          }
        })

        insights.forEach(insight => {
          insight.themeScores.forEach(theme => {
            if(theme.hierarchyLevel == 1) {
              for(var k in theme.criteriaLevelCount) insightResult[theme.hierarchyTrack[0].name][theme.name][k]+=theme.criteriaLevelCount[k];
            }
          })
        })

        let responseObject = {}
        responseObject.heading = "Performance Summary for all School in Block/ District  to be passed in API "
        responseObject.summary = [
          {
            label : "Name of the Block",
            value: "Title of the Block"
          },
          {
            label : "Total number of schools",
            value: insights.length
          },
          {
            label : "Date",
            value: new Date()
          }
        ]
        responseObject.subTitle = "Categorization of schools at different level - %"
        responseObject.sections = new Array

        let sectionHeaders = new Array
        sectionHeaders.push({
          name: "subtheme",
          value: subThemeLabel
        })
        for(var k in insights[0].levelToScoreMapping) sectionHeaders.push({name: k,value: insights[0].levelToScoreMapping[k].label})


        Object.keys(insightResult).forEach(themeName=>{
          
          let tableData = new Array
          Object.keys(insightResult[themeName]).forEach(subTheme => {
            let eachRow = {}
            eachRow.subTheme = subTheme
            _.merge(eachRow,insightResult[themeName][subTheme])
            tableData.push(eachRow)
          })

          let eachSubSection = {
            table: true,
            graph: true,
            heading: themeName,
            graphData: {
              title: 'Block performance report',
              subTitle: 'Perfomance of schools in a block across '+subThemeLabel,
              chartType: 'ColumnChart',
              chartOptions: {
                is3D: true,
                isStack: true,
                vAxis: {
                  title: 'Core standards of school improvement',
                  minValue: 0
                },
                hAxis: {
                  title: 'Percentage of Schools',
                  showTextEvery: 1
                }
              }
            },
            data: tableData,
            tabularData: {
              headers: sectionHeaders
            }
          }

          responseObject.sections.push({
            heading: themeName,
            subSections : [
              eachSubSection
            ]
          })

        })


        let response = {
          message: "Insights report fetched successfully.",
          result: responseObject
        };

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

  /**
  * @api {post} /assessment/api/v1/insights/multiEntityDrilldownReport/:programId Return insights for a school
  * @apiVersion 0.0.1
  * @apiName Generate Insights From Submissions
  * @apiSampleRequest /assessment/api/v1/insights/multiEntityDrilldownReport/5c5147ae95743c5718445eff
  * @apiGroup insights
  * @apiUse successBody
  * @apiUse errorBody
  */

  async multiEntityDrilldownReport(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};

        let programId = (req && req.params && req.params._id) ? req.params._id : false
        let schoolIdArray = (req && req.query && req.query.school) ? req.query.school.split(",") : []

        if(!programId) throw "Program ID is mandatory."
        if(!(schoolIdArray.length > 0)) throw "School ID is mandatory."

        let insights = await database.models.insights.find(
          {
            programExternalId : programId,
            schoolId : { $in: schoolIdArray }
          },
          {
            schoolId : 1,
            themeScores : 1,
            criteriaScores : 1,
            programId: 1,
            levelToScoreMapping : 1
          }
        );

        if(!insights) throw "No insights found for this school"
        
        // let insightResult = {}
        // let subThemeLabel = ""
        // insights[0].themeScores.forEach(theme => {
        //   if(theme.hierarchyLevel == 1) {
        //       (!insightResult[theme.hierarchyTrack[0].name]) ? insightResult[theme.hierarchyTrack[0].name] = {} : ""
        //       if(!insightResult[theme.hierarchyTrack[0].name][theme.name]) {
        //         insightResult[theme.hierarchyTrack[0].name][theme.name] = {}
        //       }
        //       for(var k in insights[0].levelToScoreMapping) insightResult[theme.hierarchyTrack[0].name][theme.name][k] = 0;
        //       subThemeLabel = theme.label
        //   }
        // })

        // insights.forEach(insight => {
        //   insight.themeScores.forEach(theme => {
        //     if(theme.hierarchyLevel == 1) {
        //       for(var k in theme.criteriaLevelCount) insightResult[theme.hierarchyTrack[0].name][theme.name][k]+=theme.criteriaLevelCount[k];
        //     }
        //   })
        // })

        let responseObject = {}
        responseObject.heading = "Performance Report for all Schools in the cluster/ hub"
        responseObject.summary = [
          {
            label : "Cluster Name",
            value: "Name of the Cluster"
          },
          {
            label : "Number of schools",
            value: insights.length
          },
          {
            label : "Date",
            value: new Date()
          }
        ]

        // ,
        //   {
        //     label : "No. Of Criteria in Each School",
        //     value: new Date()
        //   }
        // for(var k in insights[0].levelToScoreMapping) responseObject.summary.push({label: "% of "+insights[0].levelToScoreMapping[k].label})

        // responseObject.subTitle = "Categorization of schools at different level - %"
        responseObject.sections = new Array

        // let sectionHeaders = new Array
        // sectionHeaders.push({
        //   name: "subtheme",
        //   value: subThemeLabel
        // })
        // for(var k in insights[0].levelToScoreMapping) sectionHeaders.push({name: k,value: insights[0].levelToScoreMapping[k].label})

        insights[0].themeScores.forEach(eachTheme => {
          if(eachTheme.hierarchyLevel == 0) {

            let subThemeLabel = ""
            let subThemes = insights[0].themeScores.filter(theme => {
              if(theme.hierarchyLevel == 1) {
                let isChildOfCurrentTheme  = theme.hierarchyTrack.filter(parentTheme => parentTheme.name == eachTheme.name)
                if(isChildOfCurrentTheme.length > 0) {
                  subThemeLabel = theme.label
                  return true
                }
              }
              return false
            });

            let sectionHeaders = new Array
            sectionHeaders.push({
              name: "schoolName",
              value: subThemeLabel
            })

            subThemes.forEach(eachSubTheme => {
              sectionHeaders.push({
                name: eachSubTheme.externalId,
                value: eachSubTheme.name
              })
            })

            let eachSubSection = {
              table: true,
              graph: true,
              heading: eachTheme.label+" - "+eachTheme.name,
              graphData: {
                title: 'Cluster performance report across schools',
                subTitle: "Schools in the cluster performance across different "+ subThemeLabel +" in "+eachTheme.label+" - "+eachTheme.name,
                chartType: 'ColumnChart',
                chartOptions: {
                  is3D: true,
                  isStack: true,
                  vAxis: {
                    title: 'Levels',
                    minValue: 0
                  },
                  hAxis: {
                    title: 'Schools in the cluster',
                    showTextEvery: 1
                  }
                }
              },
              data: new Array,
              tabularData: {
                headers: sectionHeaders
              }
            }

            responseObject.sections.push({
              heading: eachTheme.label+" - "+eachTheme.name,
              subSections : [
                eachSubSection
              ]
            })
          }
        })

        // Object.keys(insightResult).forEach(themeName=>{
          
        //   let tableData = new Array
        //   Object.keys(insightResult[themeName]).forEach(subTheme => {
        //     let eachRow = {}
        //     eachRow.subTheme = subTheme
        //     _.merge(eachRow,insightResult[themeName][subTheme])
        //     tableData.push(eachRow)
        //   })

        //   let eachSubSection = {
        //     table: true,
        //     graph: true,
        //     heading: themeName,
        //     graphData: {
        //       title: 'Block performance report',
        //       subTitle: 'Perfomance of schools in a block across '+subThemeLabel,
        //       chartType: 'ColumnChart',
        //       chartOptions: {
        //         is3D: true,
        //         isStack: true,
        //         vAxis: {
        //           title: 'Core standards of school improvement',
        //           minValue: 0
        //         },
        //         hAxis: {
        //           title: 'Percentage of Schools',
        //           showTextEvery: 1
        //         }
        //       }
        //     },
        //     data: tableData,
        //     tabularData: {
        //       headers: sectionHeaders
        //     }
        //   }

        //   responseObject.sections.push({
        //      heading: themeName,
        //      subSections : [
        //        eachSubSection
        //      ]
        //    })
        // })


        let response = {
          message: "Insights report fetched successfully.",
          result: responseObject
        };

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

};
