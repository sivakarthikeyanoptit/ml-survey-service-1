const json2csvTransform = require('json2csv').Transform;
const stream = require("stream");
const fs = require("fs");
const moment = require("moment-timezone");
const filePath = "./public/csvFileBackup/";
const currentDate = new Date();
const timeWithFileExtension = moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".csv";

let FileStream = class FileStream {

  constructor(fileName) {
    this.input = new stream.Readable({ objectMode: true });
    this.fileName = filePath + fileName + "_" + timeWithFileExtension || null;
    this.output = fs.createWriteStream(this.fileName, { encoding: 'utf8' });
    this.processor = null;
  }

  initStream() {
    this.input._read = () => { };
    const opts = {};
    const transformOpts = { objectMode: true };
    const json2csv = new json2csvTransform(opts, transformOpts);
    this.processor = this.input.pipe(json2csv).pipe(this.output);
    return this.input;
  }

  getProcessorPromise() {
    const processor = this.processor
    return new Promise(function (resolve, reject) {
      processor.on('finish', resolve);
    });
  }

  fileNameWithPath(){
    return this.fileName;
  }

};

module.exports = FileStream;
