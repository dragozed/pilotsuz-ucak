const XLSX = require("xlsx");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const SESSCOOKIE = "29ebb2a0eac2afd2558e4d7f938f4b88";

//sheet header names
const workSheetColumnName = [
  "Name",
  "EndDate",
  "Price",
  "TotalBids",
  "StartedBy",
  "AuctionID",
];
const workSheetName = "Auctions";
const filePath = "./auctions.xlsx";
let List = [{ name: "", price: "" }];

const removeElementsWithNoBids = (arr) => {
  var i = arr.length;
  while (i--) {
    if (arr[i].totalbids == 0) {
      arr.splice(i, 1);
    }
  }
  return arr;
};

const addElementsWithTimeLeft = (auctions, auction, time) => {
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
  //DATE CODES END
  auction.enddate = enddate;
  ("");
  if (timeleft <= time) {
    //if less than 2mins left push
    auctions.push(auction);
  }
  return auctions;
};
const exportToExcel = (List, workSheetColumnName, workSheetName, filePath) => {
  const data = List.map((auction) => {
    return [
      auction.name,
      auction.enddate,
      auction.price,
      auction.totalbids,
      auction.startedby,
      auction.id,
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
  let datar = dr.map((auction) => {
    return [
      auction.Name,
      auction.EndDate,
      auction.Price,
      auction.TotalBids,
      auction.StartedBy,
      auction.AuctionID,
    ];
  });

  for (let i = 0; i < data.length; i++) {
    //if id values same write in datar, delete data
    for (let j = 0; j < datar.length; j++) {
      if (data[i][5] == datar[j][5]) {
        datar[j] = data[i];
        data.splice(i, 1);
        i--;
        break;
      }
    }
  }

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
      headers: { Cookie: "SESS=" + SESSCOOKIE + ";" }, //setcookie
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
      id: "",
    };
    // Store the textcontent in the above object
    auction.name = $(el).children(".text-left").text();
    auction.enddate = $(el).children("td:nth-of-type(3)").text();
    auction.price = parseFloat(
      $(el).children("td:nth-of-type(4)").text().replaceAll(",", "")
    );
    auction.totalbids = parseFloat($(el).children("td:nth-of-type(5)").text());
    auction.startedby = $(el).children("td:nth-of-type(6)").text();
    let onclickvalue = $(el).children(".text-left").find("a").attr("onclick");
    auction.id = parseFloat(onclickvalue.split("/")[3]);

    addElementsWithTimeLeft(auctions, auction, 60 * 5);
  });
  removeElementsWithNoBids(auctions);
  console.log(auctions);
  console.log("Pushed those auctions because bids");
  List = auctions;
  exportToExcel(List, workSheetColumnName, workSheetName, filePath);
}

let flag = false;
setInterval(function () {
  const dateNow = new Date();
  if (dateNow.getSeconds() >= 50 && flag == false) {
    //if current seconds >= 50 scrapeData
    scrapeData();
    flag = true;
  } else if (dateNow.getSeconds() >= 50 && flag == true) {
    flag = true;
  } else {
    flag = false;
  }
  console.log(dateNow.getSeconds());
}, 1000);
