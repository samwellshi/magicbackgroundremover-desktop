// electron 主进程入口文件
const path = require('path');
const electron = require('electron');
const {app, ipcMain} = electron;
const fs = require('fs');
const os = require("os");
// 创建原生浏览器窗口的模块。
const {BrowserWindow} = electron;
const Menu = electron.Menu
const packageInfo = require("../package.json");
// 是否是开发环境
const isDev = process.env.IS_DEV == "true" ? true : false;
const { randomUUID } = require('crypto');

const apptmpdir = os.tmpdir() + "/mbgremover/";
if (!fs.existsSync(apptmpdir)){
  fs.mkdirSync(apptmpdir);
}

function createWindow() {
  Menu.setApplicationMenu(null);
  // 创建主窗口
  const mainWindow = new BrowserWindow({
    // 窗口宽度
    width: 1200,
    // 窗口高度
    height: 1000,
    icon:path.join(__dirname, '../public/icon.ico'),
    // 窗口预设配置
    webPreferences: {
      // 指定预加载脚本
      preload: path.join(__dirname, 'preload.js'),
      // 允许在窗口中使用 Node.js 的 API
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  // 主窗口加载URL
  mainWindow.loadURL(isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/index.html')}`);
  // 如果是开发环境，打开调试工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.webContents.send('active', 1);
}

function getInfo(){
  process.env.OS_TYPE = os.type();
  process.env.APP_VERSION = packageInfo.version;
  let filename = "client";
  let filepath = apptmpdir + filename;
  if (fs.existsSync(filepath)) {
    const clientid = fs.readFileSync(filepath);
    process.env.CLIENT_ID = clientid;
  }else{
    const clientid = randomUUID();
    fs.writeFile(filepath, clientid, (err) => {
      if (err) {
        console.error(err);
      }else{
        process.env.CLIENT_ID = clientid;
      }
    });
  }
// console.log(os.networkInterfaces());  
}


// Electron应用程序入口，应用程序准备好后执行回调函数
app.whenReady().then(() => {
  read_last_popup();
  getInfo();
  createWindow();
  // 监听激活事件
  app.on('activate', function () {
    // 如果当前没有打开的窗口，则创建一个新的窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  function read_last_popup(){
    process.env.SHOW_BUY_COFFEE = "no";
    let filename = "magicbackgroundremover.log";
    let filepath = apptmpdir + filename;
    if (fs.existsSync(filepath)) {
      const lasttime = fs.readFileSync(filepath);
      let curtimesec = Math.floor(Date.now()/1000);
      if((curtimesec - lasttime) > 60*60*24*7){
        process.env.SHOW_BUY_COFFEE = "yes";
      }
      console.log('exists');
    }else{
      console.log('not exists');
      process.env.SHOW_BUY_COFFEE = "yes";
    }
  }
  ipcMain.on('update_time', (event) => {
    process.env.SHOW_BUY_COFFEE = "no";
    let filename = "magicbackgroundremover.log";
    let filepath = apptmpdir + filename;
    let timesec = Math.floor(Date.now()/1000);
    console.log(filepath);
    fs.writeFile(filepath, ''+timesec, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });
  // 在主进程中监听保存文件请求
  ipcMain.on('savefile', (event, data) => {
    // 打开保存文件对话框
    // const filePath = result.filePath;
    // console.log("aaaa");
    if(data && data.filepath && data.blobdata){
      // 使用fs模块将数据保存到磁盘
      // console.log(data.filepath);
      // const blobdata = base64ToBlob(data.blobdata);
      // var base64Data = data.blobdata.replace(/^data:image\/png;base64,/, "");
      const base64String = data.blobdata;
      // console.log(base64String);
      const arr = base64String.split(';base64,');
      // console.log(arr);
      const base64Data = arr.pop();

      const buffer = Buffer.from(base64Data, 'base64');      
      // console.log(base64Data);
      fs.writeFile(data.filepath, buffer, (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log('save success.');
        }
      });
    }else{
      console.log('save file fail. invalid arguments');
    }

  });  
});

// 监听窗口关闭事件，当所有的窗口都关闭了执行回调函数
app.on('window-all-closed', () => {
  // 当当前系统不是macOS，退出应用程序
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
