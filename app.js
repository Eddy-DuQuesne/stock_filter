// import { stockSymbolArray } from "./stockSymbolsTest.js";
import { stockSymbolArray } from "./stockSymbols.js";
import fs from 'fs';
import axios from 'axios';
import { apiToken } from './apiKeys.js';

const baseUrl = "https://cloud.iexapis.com/stable/";

const newLine = '\r\n';
let counter = 0;
let invalidSymbols = [];
const getStockSymbols = async () => {
    return new Promise((resolve, reject) => {
        axios.get(`${baseUrl}/ref-data/region/us/symbols?token=${apiToken}`)
            .then(stockSymbols => {
                resolve(stockSymbols);
            }).catch(error => {
                reject(error);
            });
    });
}

const getStockData = async () => {
    const startIndex = 16;
    const endIndex = 2000;
    let stockSymbols = await getStockSymbols();
    stockSymbols = Object.values(stockSymbols);

    let stockSymbolsArray = [];
    stockSymbols.forEach(array => {
        stockSymbolsArray = stockSymbolsArray.concat(array);
    });


    stockSymbolsArray = stockSymbolsArray.slice(startIndex,endIndex);
    stockSymbolsArray.forEach(async ({ symbol }) => {
        console.log(symbol);
        const stockData = await getStock(symbol);
        counter += 1;
        console.log(counter);
        if (stockData != null) {
            const stock = {
                symbol: stockData.data.symbol,
                companyName: stockData.data.companyName,
                latestPrice: stockData.data.latestPrice,
                week52High: stockData.data.week52High,
                week52Low: stockData.data.week52Low,
            }
            writeStockToCsvFile(stock);
        }
    });
};

const getStock = async (symbol) => {
    return axios.get(
        `${baseUrl}/stock/${symbol}/quote?token=${apiToken}`
    ).catch(err => {
        console.log(`Error fetching stock symbol: ${symbol}`);
        invalidSymbols.push(symbol);
    });
}

const writeStockToCsvFile = (stock) => {
    counter += 1;
    process.stdout.write(`${counter}`);
    
    let stockString = "";
    const stockKeys = Object.keys(stock);
    stockKeys.forEach(key => {
        stockString += `${stock[key]},`
    });
    stockString += newLine;
    fs.stat('./data.csv', function (err, stat) {
        const headers = `symbol,companyName,latestPrice,week52High,week52Low,${newLine}`;
        if (err == null) {
            fs.appendFile('./data.csv', stockString, function (err) {
                if (err) throw err;            
            });
        } else {
            fs.writeFile('./data.csv', headers, function (err) {
                if (err) throw err;
            });
            fs.appendFile('./data.csv', stockString, function (err) {
                if (err) throw err;            
            });
        }
    });
}

const loadStockData = () => {
    getStockData();
}

// const filterStocks = async () => {
//     stocks.forEach(stock => {
//         const highLowDiff = stock.week52High - stock.week52Low;
//         const lowMargin = highLowDiff * .10;
//         const topLimit = stock.week52Low + lowMargin;

//         if (stock.latestPrice < topLimit) {
//             let validStock = "";
//             const stockKeys = Object.keys(stock);
//             stockKeys.forEach(key => {
//                 validStock += `${stock[key]},`
//             });
//             validStocks.push(validStock);
//         }
//     });
//     fs.writeFile("./data.csv", validStocks.join("\r\n"), (err) => {
//         // console.log(err || "done");
//     });
// }

loadStockData();
// const data = getStockSymbols();