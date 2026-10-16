import localtunnel from 'localtunnel';
import fs from 'fs';

async function start() {
  console.log('Opening localtunnel to port 8000...');
  try {
    const tunnel = await localtunnel({ port: 8000 });
    console.log('PUBLIC_URL=' + tunnel.url);
    fs.writeFileSync('../tunnel_url.txt', tunnel.url, 'utf-8');

    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err);
  }
}

start();
