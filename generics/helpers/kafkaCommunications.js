const kafkaCommunicationsOnOff = (!process.env.KAFKA_COMMUNICATIONS_ON_OFF || process.env.KAFKA_COMMUNICATIONS_ON_OFF != "OFF") ? "ON" : "OFF"
const observationSubmissionKafkaTopic = (process.env.OBSERVATION_SUBMISSION_TOPIC && process.env.OBSERVATION_SUBMISSION_TOPIC != "OFF") ? process.env.OBSERVATION_SUBMISSION_TOPIC : "sl-observations-dev"

const pushObservationSubmissionToKafka = function (message) {
  return new Promise(async (resolve, reject) => {
      try {

          let kafkaPushStatus = await pushMessageToKafka([{
            topic: observationSubmissionKafkaTopic,
            messages: JSON.stringify(message)
          }])

          console.log(kafkaPushStatus)

          return resolve(kafkaPushStatus)

      } catch (error) {
          return reject(error);
      }
  })
}

const pushMessageToKafka = function(payload) {
  return new Promise((resolve, reject) => {

    if (kafkaCommunicationsOnOff != "ON") {
      throw reject("Kafka configuration is not done")
    }

    kafkaClient.kafkaProducer.send(payload, (err, data) => {
      if (err) {
        return reject("Kafka push to topic "+ payload[0].topic +" failed.")
      } else {
        return resolve(data)
      }
    })

  }).then(result => {
    
    console.log(result)
    return result

  }).catch((err) => {
    console.log(err)
    return {
      status : "failed",
      message: err
    }
  })
}

module.exports = {
  pushObservationSubmissionToKafka: pushObservationSubmissionToKafka
};

