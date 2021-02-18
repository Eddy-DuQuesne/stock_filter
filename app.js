import fs from 'fs';
import axios from 'axios';
import csv from 'csv-parser';
import { apiToken } from './apiKeys.js';

const baseUrl = "https://cloud.iexapis.com/stable/";
const [action] = process.argv.slice(2);
const newLine = '\r\n';
const headers = `symbol,companyName,latestPrice,week52High,week52Low,day200MovingAvg,day50MovingAvg,${newLine}`;
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
    let filtCounter = 0;
    stockSymbolsArray = stockSymbolsArray.slice(startIndex);
    const filteredStockSymbols = stockSymbolsArray.filter((stock) => {
        if (stock.type === "cs" && (stock.exchange === "NYS" || stock.exchange === "NAS")
        ) {
            filtCounter += 1;
            return stock;
        }    
    });
    getStocksFromSymbols(filteredStockSymbols);
};

const getStocksFromSymbols = async (symbolsArray) => {
    for (let i = 0; symbolsArray.length > i; i++) {
        const stockSymbol = symbolsArray[i].symbol;
        const stockData = await getStock(stockSymbol);
        const keyStats = await getKeyStats(stockSymbol);
        counter += 1;
        if (stockData != null && keyStats != null) {
            const stock = {
                symbol: stockData.data.symbol,
                companyName: stockData.data.companyName.replace(",", ""),
                latestPrice: stockData.data.latestPrice,
                week52High: stockData.data.week52High,
                week52Low: stockData.data.week52Low,
                day200MovingAvg: keyStats.data.day200MovingAvg || null,
                day50MovingAvg: keyStats.data.day50MovingAvg || null,
            }
            writeStockToCsvFile(stock);
            const percentageDone = Math.floor(((i + 1) / symbolsArray.length) * 100);
            process.stdout.write(`\r Percantage Done: ${percentageDone}%`)
            if (percentageDone === 100) {
                console.log('\u0007');
            }
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

const getKeyStats = async (symbol) => {
    return axios.get(
        `${baseUrl}/stock/${symbol}/stats?token=${apiToken}`
    ).catch(err => {
        console.log(`Error fetching stats for symbol: ${symbol}`);
    });
}

const writeStockToCsvFile = (stock) => {    
    let stockString = "";
    const stockKeys = Object.keys(stock);
    const fileName = `./data-${getCurrentDate()}.csv`;
    stockKeys.forEach(key => {
        stockString += `${stock[key]},`
    });
    stockString += newLine;
    fs.stat(fileName, function (err, stat) {        
        if (err == null) {
            fs.appendFile(fileName, stockString, function (err) {
                if (err) throw err;            
            });
        } else {
            fs.writeFile(fileName, headers, function (err) {
                if (err) throw err;
            });
            fs.appendFile(fileName, stockString, function (err) {
                if (err) throw err;            
            });
        }
    });
}

const loadStockData = () => {
    getStockSymbols();
}

const filterStocks = async () => {  
    const stocks = await parseCSVFile('./data.csv');
    const validStocks = [];
    const fileName = `./filtered-data-${getCurrentDate()}.csv`
    validStocks.push(headers);
    stocks.forEach(stock => {
        const highLowDiff = stock.week52High - stock.week52Low;
        const lowMargin = highLowDiff * .25;
        const topLimit = +stock.week52Low + +lowMargin;        
        if (stock.latestPrice < topLimit && stock.latestPrice < stock.day200MovingAvg) {
            let validStock = "";
            const stockKeys = Object.keys(stock);
            stockKeys.forEach(key => {
                validStock += `${stock[key]},`
            });
            validStocks.push(validStock);
        }
    });
    fs.writeFile(fileName, validStocks.join("\r\n"), (err) => {
        // console.log(err || "done");
    });
}

const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
        const stockArray = [];
        fs.createReadStream(file)
        .pipe(csv())
        .on('data', (row) => {
            delete row[''];
          stockArray.push(row);
        })
        .on('end', () => {
          console.log('CSV file successfully processed');
          resolve(stockArray);
        });
    })
}

const getCurrentDate = () => {
    const date = new Date();
    const day = date.getDate();
    let month = date.getMonth() + 1;
    month = month < 10 ? `0${month}` : `${month}`;
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

if (action === "filter") {
    filterStocks();   
} else if (action === "load-stocks") {
    loadStockData();
}