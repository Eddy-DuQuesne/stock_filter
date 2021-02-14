import fs from 'fs';
import axios from 'axios';
import { apiToken } from './apiKeys.js';

const baseUrl = "https://cloud.iexapis.com/stable/";

const newLine = '\r\n';
let counter = 0;
let invalidSymbols = [];
const startIndex = 16;
const endIndex = 1000;

const stockSymbolsPromise = async () => {
    return new Promise((resolve, reject) => {
        axios.get(`${baseUrl}/ref-data/region/us/symbols?token=${apiToken}`)
            .then(stockSymbols => {
                resolve(stockSymbols);
            }).catch(error => {
                reject(error);
            });
    });
}

const getStockSymbols = async () => {
    let stockSymbols = await stockSymbolsPromise();
    stockSymbols = Object.values(stockSymbols);

    let stockSymbolsArray = [];
    stockSymbols.forEach(array => {
        stockSymbolsArray = stockSymbolsArray.concat(array);
    });
    stockSymbolsArray = stockSymbolsArray.slice(startIndex);
    getStocksFromSymbols(stockSymbolsArray);
};

const getStocksFromSymbols = async (symbolsArray) => {
    for (let i = 0; symbolsArray.length > i; i++) {
        const stockSymbol = symbolsArray[i].symbol;
        const stockData = await getStock(stockSymbol);
        counter += 1;
        if (stockData != null) {
            const stock = {
                symbol: stockData.data.symbol,
                companyName: stockData.data.companyName,
                latestPrice: stockData.data.latestPrice,
                week52High: stockData.data.week52High,
                week52Low: stockData.data.week52Low,
            }
            writeStockToCsvFile(stock);
            const percentageDone = Math.floor(((i + 1) / symbolsArray.length) * 100);
            process.stdout.write(`\r Percantage Done: ${percentageDone}%`)
        }
    }
}

const getStock = async (symbol) => {
    return axios.get(
        `${baseUrl}/stock/${symbol}/quote?token=${apiToken}`
    ).catch(err => {
        console.log(`Error fetching stock symbol: ${symbol}`);
        invalidSymbols.push(symbol);
    });
}

const writeStockToCsvFile = (stock) => {    
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
    getStockSymbols();
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