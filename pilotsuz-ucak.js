const XLSX = require("xlsx");
const path = require("path");

const axios = require("axios");
const cheerio = require("cheerio");

//sheet header names
const workSheetColumnName = [
  "Name",
  "EndDate",
  "Price",
  "TotalBids",
  "StartedBy",
];
const workSheetName = "Auctions";
const filePath = "./auctions.xlsx";
let List = [{ name: "", price: "" }];

function removeElementsWithNoBids(arr) {
  var i = arr.length;
  while (i--) {
    if (arr[i].totalbids == 0) {
      arr.splice(i, 1);
    }
  }
  return arr;
}
const exportToExcel = (List, workSheetColumnName, workSheetName, filePath) => {
  const data = List.map((auction) => {
    return [
      auction.name,
      auction.enddate,
      auction.price,
      auction.totalbids,
      auction.startedby,
    ];
  });

  const file = XLSX.readFile(filePath);
  let dr = [];
  const sheets = file.SheetNames;
  for (let i = 0; i < sheets.length; i++) {
    const temp = XLSX.utils.sheet_to_json(file.Sheets[file.SheetNames[i]]);
    temp.forEach((res) => {
      dr.push(res);
    });
  }
  const datar = dr.map((auction) => {
    return [
      auction.Name,
      auction.EndDate,
      auction.Price,
      auction.TotalBids,
      auction.StartedBy,
    ];
  });

  const workBook = XLSX.utils.book_new(); //create new workbook
  const workSheetData = [workSheetColumnName, ...data, ...datar];
  const workSheet = XLSX.utils.aoa_to_sheet(workSheetData);
  XLSX.utils.book_append_sheet(workBook, workSheet, workSheetName);
  XLSX.writeFile(workBook, path.resolve(filePath));
  return true;
};

async function scrapeData() {
  const { data } = await axios.get(
    "https://www.pokemon-vortex.com/pokebay/browse/",
    {
      headers: { Cookie: "SESS=e47bea86a3536a6b0cc4776818009116;" }, //setcookie
    }
  );

  const $ = cheerio.load(data);
  const listItems = $(".height-56px");
  const auctions = [];
  let enddate = "";
  listItems.each((idx, el) => {
    const auction = {
      name: "",
      enddate: "",
      price: "",
      totalbids: 0,
      startedby: "",
    };
    // Select the text content of a and span elements
    // Store the textcontent in the above object
    auction.name = $(el).children(".text-left").text();
    auction.enddate = $(el).children("td:nth-of-type(3)").text();
    auction.price = $(el).children("td:nth-of-type(4)").text();
    auction.totalbids = $(el).children("td:nth-of-type(5)").text();
    auction.startedby = $(el).children("td:nth-of-type(6)").text();

    //DATE CODES START
    let day = auction.enddate.split(" on ")[1];
    day = day.split("-")[1] + " " + day.split("-")[0] + ", ";
    let hour = auction.enddate.split(" on ")[0];
    ampm = hour.slice(-2);
    if (ampm == "am") {
      ampm = " AM";
    } else {
      ampm = " PM";
    }
    hour = hour.slice(0, -2) + ampm;
    enddate = new Date(day + hour).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    var today = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    var timeleft = (Date.parse(enddate) - Date.parse(today)) / 1000; //as seconds
    console.log(timeleft);
    //DATE CODES END

    if (timeleft <= 120) {
      //if less than 2mins left push
      auctions.push(auction);
    }
  });

  removeElementsWithNoBids(auctions);
  List = auctions;
  exportToExcel(List, workSheetColumnName, workSheetName, filePath);
}

let i = 0;
setInterval(function () {
  i++;
  console.log(i);
  if (i == 120) {
    //after 2mins
    scrapeData();
    i = 0;
  }
}, 1000);
