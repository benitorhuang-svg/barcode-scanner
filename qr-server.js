import http from 'http';
import https from 'https';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const PORT = 3000;

const requestHandler = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname === '/api/qr') {
      const text = url.searchParams.get('text');
      
      if (!text) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('缺少 "text" 參數。使用方式：/api/qr?text=你的文字');
        return;
      }

      const buffer = await QRCode.toBuffer(text, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 2,
        width: 150
      });

      res.writeHead(200, { 
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000'
      });
      res.end(buffer);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('找不到網頁。請使用 /api/qr?text=你的文字');
    }
  } catch (err) {
    console.error('產生 QR Code 時發生錯誤:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('內部伺服器錯誤');
  }
};

(async () => {
  try {
    // 讀取 mkcert 產生的憑證檔案
    const options = {
      key: fs.readFileSync(path.resolve('localhost-key.pem')),
      cert: fs.readFileSync(path.resolve('localhost.pem'))
    };
    
    const server = https.createServer(options, requestHandler);
    
    server.listen(PORT, () => {
      console.log(`\n===========================================`);
      console.log(`🟢 本地 HTTPS API 伺服器已成功啟動！`);
      console.log(`===========================================`);
      console.log(`請在 Excel 的「姓名_Qrcode」欄位輸入以下公式：`);
      console.log(``);
      console.log(`  =IMAGE("https://localhost:${PORT}/api/qr?text=" & ENCODEURL(B7))`);
      console.log(``);
      console.log(`===========================================\n`);
    });
  } catch (err) {
    console.error('❌ 找不到憑證檔案 localhost.pem 或 localhost-key.pem，改用一般 HTTP 連線...', err.message);
    const server = http.createServer(requestHandler);
    server.listen(PORT, () => {
      console.log(`一般 HTTP 伺服器已啟動於 http://localhost:${PORT}`);
    });
  }
})();
