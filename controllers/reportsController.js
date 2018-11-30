const Json2csvParser = require("json2csv").Parser;
const _ = require("lodash");
// const fs = require("fs");
// var fields = ["schoolId", "programId", "status"];

module.exports = class Reports {
  async school(req) {
    return new Promise(async resolve => {
      var resultArray = new Array();
      // let result = {};
      // let queryObjectId = {
      //   schoolId: ObjectId(req.params._id)
      // };
      let reportsDocument = await database.models.submissions.find(
        // queryObjectId
        {}
      );
      reportsDocument.forEach(arrayOfElement => {
        let res = new Array();
        var result = {};
        result.schoolId = arrayOfElement.schoolId;
        result.status = arrayOfElement.status;
        result.programId = arrayOfElement.programId;
        var data = arrayOfElement.evidences;
        // console.log(data);
        // // result.isSubmitted = Object.entries(data).map(item => ({
        //   [item[0]]: item[1].isSubmitted
        // }));
        var isSubmitted = Object.entries(data).map(item => ({
          [item[0]]: item[1].isSubmitted
        }));
        // isSubmitted.forEach(itemElement => {
        //   result.isSubmitted = itemElement;
        // });
        res.push(result);
        res.forEach(childItem => {
          resultArray.push(childItem);
        });
        isSubmitted.forEach(itemArray => {
          resultArray.push(...itemArray);
        });
      });
      let finalResult = {
        message: "Successfully set status based on schoolId",
        resultArray: resultArray
      };
      resolve(finalResult);
      // console.log(resultArray);
      const fields = ["schoolId", "programId", "status", "BL", "LW", "SI"];
      const json2csvParser = new Json2csvParser({ fields });
      const csv = json2csvParser.parse(resultArray);
      console.log(csv);

      // var results = { "1": [1, 2, 3], "2": [2, 4, 6] };
      // var out = _.each(results, (value, key) => {
      //   console.log(key, value);
      // });

      // console.log(res);

      // resolve(res);
      //   result.schoolId = reportsDocument.schoolId;
      //   result.programId = reportsDocument.programId;
      //   result.status = reportsDocument.status;
      //   var data = reportsDocument.evidences;
      //   result.isSubmitted = Object.entries(data).map(item => ({
      //     [item[0]]: item[1].isSubmitted
      //   }));
      //   let res = {
      //     message: "Successfully set status based on schoolId",
      //     result: result
      //   };
      //   const resultArray = Object.entries(res.result).map(item => ({
      //     [item[0]]: item[1]
      //   }));
      //   const resultObject = Object.assign({}, ...resultArray);

      //   console.log(csv);
      //   resolve(res);
      // }).catch(error => {
      //   console.log(error);
      // });
    });
  }
};
const Json2csvParser1 = require("json2csv").Parser;
const fields1 = ["car", "price", "color"];
const myCars1 = [
  {
    car: "Audi",
    price: 40000,
    color: "blue"
  },
  {
    car: "BMW",
    price: 35000,
    color: "black"
  },
  {
    car: "Porsche",
    price: 60000,
    color: "green"
  }
];

const json2csvParser2 = new Json2csvParser1({ fields1 });
const csv1 = json2csvParser2.parse(myCars1);

console.log(csv1);
