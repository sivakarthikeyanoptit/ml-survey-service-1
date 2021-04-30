console.log("-------Deployment testing starts here------------------");
console.log(APPLICATION_PORT)
console.log(APPLICATION_ENV)
console.log(MONGODB_URL)
console.log(USER_SERVICE_URL)
console.log(INTERNAL_ACCESS_TOKEN)
console.log(KAFKA_COMMUNICATIONS_ON_OFF)
console.log(KAFKA_URL)
console.log(SUBMISSION_RATING_QUEUE_TOPIC)
console.log(COMPLETED_OBSERVATION_SUBMISSION_TOPIC)
console.log(INCOMPLETE_OBSERVATION_SUBMISSION_TOPIC)
console.log(COMPLETED_SURVEY_SUBMISSION_TOPIC)
console.log(KAFKA_GROUP_ID)
console.log(IMPROVEMENT_PROJECT_SUBMISSION_TOPIC)
console.log(ELASTICSEARCH_COMMUNICATIONS_ON_OFF)
console.log(ELASTICSEARCH_HOST_URL)
console.log(ELASTIC_SEARCH_SNIFF_ON_START)
console.log(ELASTICSEARCH_ENTITIES_INDEX)
console.log(ML_CORE_SERVICE_URL)
console.log(ML_PROJECT_SERVICE_URL)
console.log(KEYCLOAK_PUBLIC_KEY_PATH)
console.log("-------Deployment testing ends   here------------------");

require("dotenv").config();

//express
const express = require("express");
let app = express();

// Health check
require("./healthCheck")(app);

//config and routes
require("./config");
require("./config/globalVariable")();

let environmentData = require("./envVariables")();

if(!environmentData.success) {
  console.log("Server could not start . Not all environment variable is provided");
  process.exit();
}

let router = require("./routes");

//required modules
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const cors = require("cors");
var fs = require("fs");
var path = require("path");
var expressValidator = require('express-validator');

//To enable cors
app.use(cors());
app.use(expressValidator())

app.use(fileUpload());
app.use(bodyParser.json({ limit: '50MB' }));
app.use(bodyParser.urlencoded({ limit: '50MB', extended: false }));
app.use(express.static("public"));

fs.existsSync("logs") || fs.mkdirSync("logs");


app.all("*", (req, res, next) => {
  
  console.log("-------Request log starts here------------------");
  console.log(
    "%s %s on %s from ",
    req.method,
    req.url,
    new Date(),
    req.headers["user-agent"]
  );
  console.log("Request Headers: ", req.headers);
  console.log("Request Body: ", req.body);
  console.log("Request Files: ", req.files);
  console.log("-------Request log ends here------------------");
  next();
});


//add routing
router(app);

//listen to given port
app.listen(process.env.APPLICATION_PORT, () => {
  console.log("Environment: " + process.env.APPLICATION_ENV );
  console.log("Application is running on the port:" + process.env.APPLICATION_PORT);
});

