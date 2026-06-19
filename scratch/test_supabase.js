const https = require('https');

const url = "https://qpwynaxfsyybpfznuivg.supabase.co/rest/v1/";
const apiKey = "sb_publishable_ZluXlj-471bzYqiRA0Mzig_gVtEuHwm";

const options = {
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`
  }
};

console.log("Testing connection to Supabase...");

https.get(url, options, (res) => {
  let data = '';
  console.log("Status Code:", res.statusCode);
  console.log("Headers:", res.headers);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log("Connection successful!");
      console.log("Available paths/tables:", Object.keys(parsed.paths || {}));
    } catch (e) {
      console.log("Error parsing response:", e.message);
      console.log("Raw Response:", data);
    }
  });
}).on('error', (err) => {
  console.error("HTTP Request Error:", err.message);
});
