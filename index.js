const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// 保持对窗口对象的全局引用，否则当JavaScript对象被垃圾回收时，窗口将自动关闭
let mainWindow;

function createWindow() {
  // 读取size.config文件获取窗口尺寸配置
  const fs = require('fs');
  const sizeConfigPath = path.join(__dirname, 'www', 'size.config');
  let windowWidth = 1200;
  let windowHeight = 800;
  
  try {
    const sizeConfig = fs.readFileSync(sizeConfigPath, 'utf8');
    const lines = sizeConfig.trim().split('\n');
    
    lines.forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const parts = line.split('=');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const value = parts[1].trim();
          
          if (key === 'windowWidth') {
            windowWidth = parseInt(value) || 1200;
          } else if (key === 'windowHeight') {
            windowHeight = parseInt(value) || 800;
          }
        }
      }
    });
  } catch (err) {
    // 配置文件不存在或读取失败，使用默认值
    console.log('使用默认窗口尺寸');
  }
  
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    frame: false, // 无边框窗口
    backgroundColor: '#f0e6ff', // 淡紫色背景
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true // 启用webview标签
    },
    icon: path.join(__dirname, 'icon.svg') // 设置窗口图标
  });

  // 加载应用的index.html
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // 打开开发者工具，用于调试
  // mainWindow.webContents.openDevTools();

  // 忽略所有证书错误
  mainWindow.webContents.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // 允许所有证书
    event.preventDefault();
    callback(true);
  });

  // 忽略webview中的证书错误
  mainWindow.webContents.on('select-client-certificate', (event, webContents, url, list, callback) => {
    // 选择第一个证书
    event.preventDefault();
    if (list.length > 0) {
      callback(list[0]);
    } else {
      callback();
    }
  });

  // 允许不安全的连接
  mainWindow.webContents.on('security-policy-violation', (event, webContents, details) => {
    // 忽略安全策略违规
    event.preventDefault();
  });

  // 当窗口关闭时触发
  mainWindow.on('closed', function () {
    // 取消引用窗口对象，如果应用支持多窗口，通常会将窗口存储在数组中，此时应该删除相应元素
    mainWindow = null;
  });

  // 创建菜单栏
  createMenu();
}

// 创建菜单栏
function createMenu() {
  const template = [
    {
      label: '浏览器',
      submenu: [
        {
          label: '打开网址',
          accelerator: 'Ctrl+O',
          click() {
            console.log('Ctrl+O pressed, sending show-url-dialog message...');
            // 发送消息给渲染进程，让渲染进程显示网址输入对话框
            mainWindow.webContents.send('show-url-dialog');
          }
        },
        {
          label: '前进',
          accelerator: 'Ctrl+Right',
          click() {
            mainWindow.webContents.send('go-forward');
          }
        },
        {
          label: '后退',
          accelerator: 'Ctrl+Left',
          click() {
            mainWindow.webContents.send('go-back');
          }
        },
        {
          label: '刷新',
          accelerator: 'Ctrl+R',
          click() {
            mainWindow.webContents.send('reload');
          }
        },
        {
          label: '停止',
          accelerator: 'Esc',
          click() {
            mainWindow.webContents.send('stop-loading');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Ctrl+Q',
          click() {
            app.quit();
          }
        }
      ]
    },
    {
      label: '窗口',
      submenu: [
        {
          label: '最大化',
          accelerator: 'F11',
          click() {
            if (mainWindow.isMaximized()) {
              mainWindow.unmaximize();
            } else {
              mainWindow.maximize();
            }
          }
        },
        {
          label: '最小化',
          accelerator: 'Ctrl+M',
          click() {
            mainWindow.minimize();
          }
        },
        {
          label: '关闭',
          accelerator: 'Ctrl+W',
          click() {
            mainWindow.close();
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click() {
            dialog.showMessageBox(mainWindow, {
              title: '关于本地浏览器',
              message: '本地网页浏览器 v1.0.0',
              detail: '基于Electron框架开发',
              type: 'info'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.on('ready', createWindow);

// 当所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  // 在macOS上，除非用户用Cmd+Q明确退出，否则大部分应用及其菜单栏会保持活动状态
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时，通常会在应用中重新创建一个窗口
  if (mainWindow === null) {
    createWindow();
  }
});

// 监听渲染进程发送的窗口控制消息
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});
