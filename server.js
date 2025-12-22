const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ================= DATABASE =================
const db = new sqlite3.Database(":memory:");

db.serialize(() => {
  db.run(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE,
      utr TEXT,
      status TEXT DEFAULT 'PENDING',
      coupon TEXT
    )
  `);

  db.run(`
    CREATE TABLE coupons (
      code TEXT,
      used INTEGER DEFAULT 0
    )
  `);

  // Preload coupons (EDIT THESE)
  const coupons = ["SHEIN500A", "SHEIN500B", "SHEIN1000A"];
  coupons.forEach(c =>
    db.run("INSERT INTO coupons (code) VALUES (?)", [c])
  );
});

// ================= HELPERS =================
function generateOrderId() {
  return "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
}

// ================= USER UI =================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Genuine Shein Shop</title>
<style>
body{
  background:#050b14;
  font-family:Arial;
  color:#00f6ff;
  display:flex;
  justify-content:center;
  align-items:center;
  height:100vh;
}
.card{
  background:#0a1a2f;
  padding:25px;
  border-radius:15px;
  width:320px;
  box-shadow:0 0 20px #00f6ff33;
}
input,button{
  width:100%;
  padding:10px;
  margin-top:10px;
  border-radius:8px;
  border:none;
}
button{
  background:#00f6ff;
  color:#000;
  font-weight:bold;
}
.status{
  margin-top:10px;
  font-size:14px;
}
</style>
</head>
<body>

<div class="card">
  <h3>Genuine Shein Shop</h3>

  <button onclick="createOrder()">Generate Order</button>

  <div id="order"></div>

  <input id="utr" placeholder="Enter UTR">
  <button onclick="submitUTR()">Submit Payment</button>

  <div class="status" id="status"></div>
</div>

<script>
let currentOrder = null;

function createOrder(){
  fetch("/create-order",{method:"POST"})
  .then(r=>r.json())
  .then(d=>{
    currentOrder = d.order_id;
    document.getElementById("order").innerHTML =
      "<b>Your Order ID:</b><br>"+d.order_id;
  });
}

function submitUTR(){
  if(!currentOrder) return alert("Generate order first");
  fetch("/submit-utr",{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      order_id:currentOrder,
      utr:document.getElementById("utr").value
    })
  }).then(()=>{
    document.getElementById("status").innerText =
      "Payment submitted. Waiting for approval...";
    setInterval(()=>location.reload(),5000);
  });
}
</script>

</body>
</html>
`);
});

// ================= API =================
app.post("/create-order", (req, res) => {
  const id = generateOrderId();
  db.run("INSERT INTO orders (order_id) VALUES (?)",[id],()=>{
    res.json({order_id:id});
  });
});

app.post("/submit-utr",(req,res)=>{
  db.run(
    "UPDATE orders SET utr=? WHERE order_id=?",
    [req.body.utr, req.body.order_id],
    ()=>res.sendStatus(200)
  );
});

// ================= ADMIN PANEL =================
app.get("/admin",(req,res)=>{
  db.all("SELECT * FROM orders",(err,rows)=>{
    let html = `
    <h2 style="color:#00f6ff">Admin Panel</h2>
    <table border="1" cellpadding="8" style="color:white">
    <tr>
      <th>Order ID</th><th>UTR</th><th>Status</th><th>Coupon</th><th>Action</th>
    </tr>`;
    rows.forEach(r=>{
      html+=`
      <tr>
        <td>${r.order_id}</td>
        <td>${r.utr||"-"}</td>
        <td>${r.status}</td>
        <td>${r.coupon||"-"}</td>
        <td>${
          r.status==="PENDING"
          ? `<a href="/approve/${r.order_id}">Approve</a>`
          : "✔"
        }</td>
      </tr>`;
    });
    html+="</table>";
    res.send(html);
  });
});

app.get("/approve/:id",(req,res)=>{
  db.get(
    "SELECT code FROM coupons WHERE used=0 LIMIT 1",
    (e,coupon)=>{
      if(!coupon) return res.send("No coupons left");
      db.run("UPDATE coupons SET used=1 WHERE code=?",[coupon.code]);
      db.run(
        "UPDATE orders SET status='APPROVED', coupon=? WHERE order_id=?",
        [coupon.code, req.params.id],
        ()=>res.redirect("/admin")
      );
    }
  );
});

// ================= START =================
app.listen(PORT,()=>console.log("Running on",PORT));
