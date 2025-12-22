const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const { createObjectCsvWriter } = require("csv-writer");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "admin123"; // change if you want

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ===================== DATABASE ===================== */

const db = new sqlite3.Database("data.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE,
      utr TEXT,
      status TEXT DEFAULT 'PENDING',
      coupon TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      used INTEGER DEFAULT 0
    )
  `);
});

/* ===================== UTIL ===================== */

function generateOrderId() {
  return "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 999999);
}

/* ===================== CUSTOMER ===================== */

app.get("/", (req, res) => {
  const orderId = generateOrderId();

  db.run(
    "INSERT INTO orders (order_id) VALUES (?)",
    [orderId],
    () => {
      res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Genuine Shein Shop</title>
<meta http-equiv="refresh" content="5">
<style>
body{
  font-family: Arial;
  background:#050b14;
  color:#00f7ff;
  display:flex;
  justify-content:center;
  padding-top:40px;
}
.card{
  width:360px;
  background:#0b1d33;
  padding:20px;
  border-radius:12px;
}
input,button{
  width:100%;
  padding:10px;
  margin-top:10px;
  border-radius:8px;
  border:none;
}
button{
  background:#00f7ff;
  font-weight:bold;
}
</style>
</head>
<body>
<div class="card">
<h2>Genuine Shein Shop</h2>

<p><b>Your Order ID</b></p>
<p>${orderId}</p>

<p>Pay via UPI</p>
<p><b>xxxpgn.332@ptyes</b></p>

<form method="POST" action="/submit">
  <input name="utr" placeholder="Enter UTR" required>
  <input type="hidden" name="order_id" value="${orderId}">
  <button>Submit Payment</button>
</form>

<p style="font-size:12px;margin-top:10px">
Page auto-refreshes every 5 seconds after approval.
</p>
</div>
</body>
</html>
`);
    }
  );
});

app.post("/submit", (req, res) => {
  const { order_id, utr } = req.body;
  db.run(
    "UPDATE orders SET utr=? WHERE order_id=?",
    [utr, order_id],
    () => res.redirect(`/status/${order_id}`)
  );
});

app.get("/status/:order_id", (req, res) => {
  db.get(
    "SELECT * FROM orders WHERE order_id=?",
    [req.params.order_id],
    (err, o) => {
      if (!o) return res.send("Invalid order");

      res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="5">
<title>Status</title>
<style>
body{background:#050b14;color:#00f7ff;font-family:Arial;text-align:center;padding-top:60px;}
.card{display:inline-block;background:#0b1d33;padding:20px;border-radius:12px;}
</style>
</head>
<body>
<div class="card">
<h3>Status: ${o.status}</h3>
${o.coupon ? `<h2>Coupon Code</h2><h1>${o.coupon}</h1>` : `<p>Please wait for approval</p>`}
</div>
</body>
</html>
`);
    }
  );
});

/* ===================== ADMIN ===================== */

app.get("/admin", (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) return res.send("Unauthorized");

  const q = req.query.q || "";

  db.all(
    `SELECT * FROM orders WHERE order_id LIKE ? OR utr LIKE ? ORDER BY id DESC`,
    [`%${q}%`, `%${q}%`],
    (err, orders) => {

      const rows = orders.map(o => `
<tr>
<td>${o.order_id}</td>
<td>${o.utr || "-"}</td>
<td>${o.status}</td>
<td>${o.coupon || "-"}</td>
<td>
${o.status === "PENDING" ? `
<form method="POST" action="/approve?pass=${ADMIN_PASSWORD}">
<input type="hidden" name="order_id" value="${o.order_id}">
<button>Approve</button>
</form>
` : "✔"}
</td>
</tr>`).join("");

      res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Admin Panel</title>
<style>
body{font-family:Arial;background:#050b14;color:#00f7ff;padding:20px;}
table{width:100%;border-collapse:collapse;}
td,th{border:1px solid #00f7ff;padding:8px;}
input,button{padding:6px;margin:5px;}
</style>
</head>
<body>

<h2>Admin Panel</h2>

<form>
<input name="q" placeholder="Search UTR / Order ID" value="${q}">
<button>Search</button>
</form>

<form method="POST" action="/admin/add-coupon?pass=${ADMIN_PASSWORD}">
<input name="code" placeholder="Add coupon code" required>
<button>Add Coupon</button>
</form>

<a href="/export?pass=${ADMIN_PASSWORD}">Export CSV</a>

<table>
<tr>
<th>Order ID</th><th>UTR</th><th>Status</th><th>Coupon</th><th>Action</th>
</tr>
${rows}
</table>

</body>
</html>
`);
    }
  );
});

app.post("/admin/add-coupon", (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) return res.send("Unauthorized");

  db.run(
    "INSERT INTO coupons (code) VALUES (?)",
    [req.body.code],
    () => res.redirect("/admin?pass=" + ADMIN_PASSWORD)
  );
});

app.post("/approve", (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) return res.send("Unauthorized");

  const { order_id } = req.body;

  db.get(
    "SELECT * FROM coupons WHERE used=0 LIMIT 1",
    (err, coupon) => {
      if (!coupon) return res.send("No coupons left");

      db.run(
        "UPDATE orders SET status='APPROVED', coupon=? WHERE order_id=?",
        [coupon.code, order_id],
        () => {
          db.run(
            "UPDATE coupons SET used=1 WHERE id=?",
            [coupon.id],
            () => res.redirect("/admin?pass=" + ADMIN_PASSWORD)
          );
        }
      );
    }
  );
});

/* ===================== CSV EXPORT ===================== */

app.get("/export", (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) return res.send("Unauthorized");

  db.all("SELECT * FROM orders", (err, rows) => {
    const csv = createObjectCsvWriter({
      path: "orders.csv",
      header: [
        { id: "order_id", title: "Order ID" },
        { id: "utr", title: "UTR" },
        { id: "status", title: "Status" },
        { id: "coupon", title: "Coupon" }
      ]
    });

    csv.writeRecords(rows).then(() => {
      res.download("orders.csv");
    });
  });
});

/* ===================== START ===================== */

app.listen(PORT, () => console.log("Running on port", PORT));
