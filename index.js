// Dependencies
const playwright = require("playwright");
const queryString = require("query-string");
const { zeroPad } = require("./lib/utils");
const parseDate = require("date-fns/parse");
const eachDayOfInterval = require("date-fns/eachDayOfInterval");
const formatDate = require("date-fns/format");

const { chromium } = playwright;
const DATA_PROVIDER_URL = "https://tarifaluzhora.es";

const FORMAT_DATE = "dd/MM/yyyy";
const LOCATIONS = {
  pcb: "Península, Canarias, Baleares",
  cym: "Ceuta y Melilla",
};

const FIRST_DATE = "01/06/2021";
const firstParsedDate = parseDate(FIRST_DATE, FORMAT_DATE, new Date());

const datesForSearch = eachDayOfInterval({
  start: firstParsedDate,
  end: new Date(),
});

// Promise.all(
//   datesForSearch.map((item) => {
//     const date = formatDate(item, FORMAT_DATE);
//     return getData(date, "pcb");
//   })
// )
//   .then((a) => console.log(a))
//   .catch((err) => console.log(err));

function pageURLByParams(date, type) {
  const query = queryString.stringify({ tarifa: type, fecha: date });
  const finalURL = `${DATA_PROVIDER_URL}/?${query}`;
  return finalURL;
}

// const getLowestPrice = (prices) => {
//   const lowestPrice = Math.min(...prices.map((item) => item.price));
//   return prices.find((item) => item.price === lowestPrice);
// };
// const getHighestPrice = (prices) => {
//   const highestPrice = Math.max(...prices.map((item) => item.price));
//   return prices.find((item) => item.price === highestPrice);
// };

// const getAveragePrice = (prices) => {
//   const average = prices
//     .map((item) => item.price)
//     .reduce((avg, value, _, { length }) => {
//       return avg + value / length;
//     }, 0);

//   return average;
// };

const formatSegmentDates = (date, initHour, endHour) => {
  const FORMAT_DATE = "dd/MM/yyyy HH:mm";
  const initHourValue = parseInt(initHour);
  const endHourValue = parseInt(endHour);
  const completeInitDate = `${date} ${zeroPad(initHourValue, 2)}:00`;
  const completeEndDate = `${date} ${zeroPad(endHourValue - 1, 2)}:59`;
  return {
    initDate: parseDate(completeInitDate, FORMAT_DATE, new Date()),
    endDate: parseDate(completeEndDate, FORMAT_DATE, new Date()),
  };
};

async function getData(date, location) {
  const pageProvider = pageURLByParams(date, location);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pageProvider);
  const content = await page.textContent("#hour_prices");

  const data = content
    .split("\t")
    .filter((item) => item)
    .join("")
    .split("\n")
    .filter((item) => item)
    .map((item) => item.trim())
    .map((item) => {
      const initHour = item.substring(0, 2);
      const endHour = item.slice(6, (item.length - 8) * -1);
      const euroPrice = item.split(" ").reverse()[1];
      const parsedDates = formatSegmentDates(date, initHour, endHour);
      return {
        ...parsedDates,
        price: parseFloat(euroPrice),
        location,
      };
    });

  await page.close();
  await browser.close();
  return data;
}

getData("01/02/2022", "pcb").then((data) => {
  console.log(data);
});
