const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('./app');

// Starta servern på en ledig testport och stäng den efteråt.
async function withServer(callback) {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}

test('servern svarar på hälsokontroll', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', application: 'MittCSN' });
  });
});

test('okänd API-adress ger 404', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/saknas`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, 'API-adressen finns inte.');
  });
});

test('startsidan levereras från servern', async () => {
  await withServer(async (url) => {
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /MittCSN/);
  });
});
