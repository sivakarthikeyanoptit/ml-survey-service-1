/**
 * name : elasticSearch.js
 * author : Aman Jung Karki
 * created-date : 11-Jun-2020
 * Description : Elastic search configuration file.
 */


//dependencies
const { Client : esClient } = require('@elastic/elasticsearch');

/**
 * Elastic search connection.
 * @function
 * @name connect
 * @param {Object} config Elastic search configurations.
 * @return {Object} elastic search client 
 */

var connect = function (config) {

  const elasticSearchClient = new esClient({
    node : config.host,
    maxRetries : process.env.ELASTIC_SEARCH_MAX_RETRIES,
    requestTimeout : process.env.ELASTIC_SEARCH_REQUEST_TIMEOUT,
    sniffOnStart : process.env.ELASTIC_SEARCH_SNIFF_ON_START
  });

  elasticSearchClient.ping({
  }, function (error) {
    if (error) {
      log.error('Elasticsearch cluster is down!');
    } else {
      log.debug('Elasticsearch connection established.');
    }
  });

  return {
    client : elasticSearchClient
  };

};

module.exports = connect;
