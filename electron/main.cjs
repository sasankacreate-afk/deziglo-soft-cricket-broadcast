const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Allow the embedded YouTube advertisement to autoplay with audio.
// This is required because Chromium normally blocks audible autoplay without a user gesture.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow;
let serverStarted = false;
let updateCheckInProgress = false;

const GITHUB_RELEASES_URL = 'https://github.com/sasankacreate-afk/deziglo-soft-cricket-broadcast/releases';

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;

function sendUpdaterStatus(status, payload = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('deziglo-updater-status', { status, ...payload });
  }
}

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    updateCheckInProgress = true;
    sendUpdaterStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    updateCheckInProgress = false;
    sendUpdaterStatus('available', { version: info.version, releaseDate: info.releaseDate });
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'DEZIGLO SOFT Update Available',
      message: `Version ${info.version} is available.`,
      detail: 'The update will download automatically in the background. You can continue using the application.',
      buttons: ['OK'],
    }).catch(() => {});
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdaterStatus('downloading', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateCheckInProgress = false;
    sendUpdaterStatus('downloaded', { version: info.version });
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'DEZIGLO SOFT Update Ready',
      message: `Version ${info.version} is ready to install.`,
      detail: 'Restart DEZIGLO SOFT Cricket Broadcast to install the update.',
      buttons: ['Restart & Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) autoUpdater.quitAndInstall(false, true);
    }).catch(() => {});
  });

  autoUpdater.on('update-not-available', (info) => {
    updateCheckInProgress = false;
    sendUpdaterStatus('not-available', { version: info.version });
  });

  autoUpdater.on('error', (error) => {
    updateCheckInProgress = false;
    sendUpdaterStatus('error', { message: error && error.message ? error.message : String(error) });
  });

  ipcMain.handle('deziglo-updater:get-version', () => app.getVersion());
  ipcMain.handle('deziglo-updater:check', async () => {
    if (!app.isPackaged) {
      return { ok: false, status: 'dev-mode', message: 'Updates are available only in the packaged Windows application.' };
    }
    if (updateCheckInProgress) {
      return { ok: true, status: 'checking' };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        ok: true,
        status: result && result.updateInfo ? 'checked' : 'checking',
        version: result && result.updateInfo ? result.updateInfo.version : null,
      };
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      sendUpdaterStatus('error', { message });
      return { ok: false, status: 'error', message };
    }
  });
  ipcMain.handle('deziglo-updater:open-releases', async () => {
    await shell.openExternal(GITHUB_RELEASES_URL);
    return { ok: true };
  });
}

function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      err ? reject(err) : resolve();
    };

    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          finish();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(1500, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (settled) return;
      if (Date.now() - start > timeout) {
        finish(new Error('Local server startup timed out.'));
        return;
      }
      setTimeout(check, 250);
    };

    check();
  });
}

function startLocalServer(logStream) {
  // IMPORTANT: Run the bundled Express/WebSocket server in Electron's main
  // process. This avoids trying to execute a JavaScript file from inside
  // app.asar with a second Electron process, which can silently fail on Windows.
  process.env.NODE_ENV = 'production';

  const serverPath = path.join(app.getAppPath(), 'dist', 'server.cjs');
  logStream.write(`[startup] Loading server: ${serverPath}\n`);

  try {
    require(serverPath);
    serverStarted = true;
    logStream.write('[startup] Bundled local server module loaded successfully.\n');
  } catch (err) {
    logStream.write(`[startup] Server load failed: ${err && err.stack ? err.stack : err}\n`);
    throw err;
  }
}

async function createWindow() {
  const appPath = app.getAppPath();
  const logPath = path.join(app.getPath('userData'), 'deziglo-cricket-broadcast.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  logStream.write(`\n===== DEZIGLO SOFT startup ${new Date().toISOString()} =====\n`);
  logStream.write(`[startup] appPath=${appPath}\n`);
  logStream.write(`[startup] process.execPath=${process.execPath}\n`);
  logStream.write(`[startup] app.isPackaged=${app.isPackaged}\n`);

  try {
    startLocalServer(logStream);
    await waitForServer('http://127.0.0.1:3000/api/health');
    logStream.write('[startup] Local server health check passed.\n');
  } catch (err) {
    const detail = err && err.stack ? err.stack : String(err);
    logStream.write(`[startup] FAILED: ${detail}\n`);
    logStream.end();

    dialog.showErrorBox(
      'DEZIGLO SOFT could not start',
      `${err && err.message ? err.message : 'Local server failed to start.'}\n\nLog:\n${logPath}`
    );
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 640,
    minHeight: 480,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    icon: path.join(appPath, 'build-assets', 'deziglo-logo.ico'),
    webPreferences: {
      preload: path.join(appPath, 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#020617',
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    logStream.write(
      `[renderer] did-fail-load code=${errorCode} description=${errorDescription} url=${validatedURL} mainFrame=${isMainFrame}\n`
    );
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logStream.write(`[renderer] render-process-gone reason=${details.reason} exitCode=${details.exitCode}\n`);
  });

  mainWindow.webContents.on('unresponsive', () => {
    logStream.write('[renderer] webContents became unresponsive\n');
  });

  mainWindow.webContents.on('responsive', () => {
    logStream.write('[renderer] webContents responsive\n');
  });

  try {
    await mainWindow.loadURL('http://127.0.0.1:3000/');
    logStream.write('[startup] BrowserWindow loaded successfully.\n');
  } catch (err) {
    logStream.write(`[startup] BrowserWindow load failed: ${err.stack || err}\n`);
    dialog.showErrorBox('DEZIGLO SOFT could not open', `${err.message}\n\nLog:\n${logPath}`);
    return;
  }

  sendUpdaterStatus('ready', { version: app.getVersion() });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  setupAutoUpdater();
  await createWindow();
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 5000);
  }
}).catch((err) => {
  dialog.showErrorBox('DEZIGLO SOFT startup error', err.stack || String(err));
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  // The local server runs in the Electron main process in this build,
  // so no child process needs to be killed here.
  serverStarted = false;
});
