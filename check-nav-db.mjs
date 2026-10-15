import mysql from 'mysql2/promise';

async function checkNav() {
  try {
    const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'rasinniDB' });
    const [rows] = await conn.execute('SELECT id, application_id, label, route, url, external_url FROM iam_navigation_menus');
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkNav();
