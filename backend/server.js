require('dotenv').config();
const app = require('./app');

const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT måste vara ett heltal mellan 1 och 65535.');
  process.exit(1);
}

app.listen(port, () => {
  console.log(`MittCSN körs på http://localhost:${port}`);
});
