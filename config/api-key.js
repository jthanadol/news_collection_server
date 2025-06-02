require('dotenv').config();

//api key ของ newsdata api
module.exports.newsDataKey = process.env.NEWSDATA_API_KEY.split(',');
module.exports.newsDataForSearchKey = process.env.NEWSDATA_API_KEY_FOR_SEARCH;
module.exports.newsDataEndpoint = process.env.NEWSDATA_ENDPOINT;

//api key ของ Azure AI Translator
module.exports.translateKey = [
  {
    key: process.env.AZURE_TRAN_SOUTHEASTASIA,
    region: 'southeastasia',
  },
  {
    key: process.env.AZURE_TRAN_EASTASIA,
    region: 'eastasia',
  },
  {
    key: process.env.AZURE_TRAN_GLOBAL,
    region: 'global',
  },
  {
    key: process.env.AZURE_TRAN_EASTUS,
    region: 'eastus',
  },
  {
    key: process.env.AZURE_TRAN_JAPANEAST,
    region: 'japaneast',
  }
];
module.exports.translateEndpoint = process.env.AZURE_TRAN_ENDPOINT + "api-version=3.0";

//api key ของ bing serach new api
module.exports.bingSearchKey = process.env.BING_SEARCH_KEY.split(",");
module.exports.bingSearchEndpoint = process.env.BING_SEARCH_ENDPOINT;

//api key ของ fact check tool api
module.exports.factCheckToolKey = process.env.FACTCHECK_API_KEY;
module.exports.factCheckToolEndpoint = process.env.FACTCHECK_ENDPOINT;

//api key ของ Ai For Thai
module.exports.aiForThaiKey = process.env.AIFORTHAI_API_KEY.split(',');
module.exports.tposEndpoint = process.env.TPOS_ENDPOINT;
module.exports.vaja9Endpoint = process.env.VAJA9_ENDPOINT;
