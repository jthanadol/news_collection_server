const connectdb = require('./db-config');

let category = null;
let country = null;

async function getCategory() {
  if (category === null) {
    category = new Map();
    let res = await connectdb.promise().query('SELECT * FROM category');
    for (let index = 0; index < res[0].length; index++) {
      const element = res[0][index];
      category.set(element.category_name, element.category_id);
    }
  }

  return category;
}

async function getCountry() {
  if (country === null) {
    country = new Map();
    let res = await connectdb.promise().query('SELECT * FROM country');
    for (let index = 0; index < res[0].length; index++) {
      const element = res[0][index];
      country.set(element.country_name.toLowerCase(), element.country_code);
    }
  }

  return country;
}

module.exports.getCategory = getCategory;
module.exports.getCountry = getCountry;
