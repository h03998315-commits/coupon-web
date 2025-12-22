import express from "express";
import sqlite3 from "sqlite3";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== CONFIG ===== */
const UPI_ID = "xxxpgn.332@ptyes";
const ADMIN_PASSWORD = "admin123";
/* ================== */

app.use(express.urlencoded({ extended: true }));
const db = new sqlite3.Database("database.db");

/* ===== DB ===== */
db.run(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE,
  utr TEXT,
  status TEXT DEFAULT 'PENDING',
  coupon TEXT,
  created_at TEXT
)
`);

/* ===== UTILS ===== */
function generateOrderId() {
  const r = Math.floor(100000 + Math.random() * 900000);
  const d = new Date().toISOString().slice(0,10).replace(/-/g,"");
  return `ORD-${d}-${r}`;
}

/* ===== PAGE TEMPLATE ===== */
function page(title, body, autoRefresh=false) {
return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${autoRefresh ? `<meta http-equiv="refresh" content="25">` : ""}
<style>
:root{--cyan:#00eaff;--blue:#007cff;--bg:#05080d;}
body{margin:0;background:radial-gradient(circle at top,#08121f,var(--bg));color:#e6edf3;font-family:system-ui}
#boot{position:fixed;inset:0;background:black;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:var(--cyan);font-family:monospace}
#boot.hide{display:none}
.hud{width:160px;height:160px;border:2px solid var(--cyan);border-radius:50%;animation:spin 2s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.container{max-width:540px;margin:auto;padding:28px}
.card{background:rgba(17,24,39,.9);border-radius:16px;padding:22px;margin-bottom:20px;box-shadow:0 0 40px rgba(0,234,255,.12)}
h1,h2{color:var(--cyan)}
.code{background:#020617;border:1px dashed rgba(0,234,255,.35);padding:12px;border-radius:10px;font-family:monospace;margin:10px 0}
button{width:100%;padding:14px;margin-top:12px;background:linear-gradient(135deg,var(--cyan),var(--blue));border:none;border-radius:12px;font-weight:800;color:#000}
input{width:100%;padding:12px;margin-top:10px;border-radius:10px;border:none}
small{color:#9ca3af}
.status{display:inline-block;padding:6px 14px;border-radius:999px;margin-top:10px}
.pending{background:rgba(255,170,0,.15);color:#ffb703}
.approved{background:rgba(0,255,170,.15);color:#00ffa6}
.progress{height:6px;background:#020617;border-radius:999px;overflow:hidden;margin-top:10px}
.progress span{display:block;height:100%;width:40%;background:linear-gradient(90deg,var(--cyan),var(--blue));animation:scan 2s infinite}
@keyframes scan{from{transform:translateX(-100%)}to{transform:translateX(300%)}}
.glow{box-shadow:0 0 30px rgba(0,255,170,.6)}
.toggle{display:flex;gap:10px;margin-top:10px}
.toggle button{flex:1}
</style>
</head>

<body>

<div id="boot">
  <div class="hud"></div>
  <div style="margin-top:16px;text-align:center">
    INITIALIZING…<br><b>SHEIN COUPON SHOP</b><br>SYSTEM ONLINE
  </div>
</div>

<div class="container">
<div class="card">
  <div class="toggle">
    <button onclick="toggleSound()">🔊 Sound</button>
    <button onclick="toggleLang()">🌐 Language</button>
  </div>
</div>
${body}
</div>

<script>
/* ===== SETTINGS ===== */
let soundOn = localStorage.getItem("sound") !== "off";
let lang = localStorage.getItem("lang") || "en";

/* ===== AUDIO CORE ===== */
let ctx;
function unlockAudio(){
  if(!soundOn || ctx) return;
  ctx = new (window.AudioContext||window.webkitAudioContext)();
  bootTone();
  ambientHum();
}
document.addEventListener("click", unlockAudio, {once:true});

function tone(f,d,g=0.04){
  const o=ctx.createOscillator(), ga=ctx.createGain();
  o.frequency.value=f; ga.gain.value=g;
  o.connect(ga); ga.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime+d);
}

function bootTone(){ tone(440,.12); setTimeout(()=>tone(660,.12),140); setTimeout(()=>tone(880,.18),280); }
function scanTone(){ tone(520,.08,.02); }
function approveTone(){ tone(600,.12); setTimeout(()=>tone(900,.18),130); }

function ambientHum(){
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.frequency.value=80; g.gain.value=0.01;
  o.connect(g); g.connect(ctx.destination);
  o.start();
}

/* ===== VOICE ===== */
const voiceLines = {
  en: ["Payment verified. Coupon unlocked.","Transaction confirmed. Access granted."],
  hi: ["Payment verify ho gaya. Coupon unlock ho chuka hai.","Transaction complete. Coupon taiyaar hai."]
};

function speak(){
  if(!soundOn || !("speechSynthesis"in window)) return;
  const u=new SpeechSynthesisUtterance(
    voiceLines[lang][Math.floor(Math.random()*voiceLines[lang].length)]
  );
  u.rate=.9; u.pitch=.8; speechSynthesis.speak(u);
}

/* ===== UI HOOKS ===== */
setTimeout(()=>document.getElementById("boot").classList.add("hide"),2000);

if(document.querySelector(".pending")){
  setInterval(()=>soundOn&&ctx&&scanTone(),4000);
}
if(document.querySelector(".approved")){
  setTimeout(()=>{soundOn&&ctx&&approveTone(); speak();},800);
}

function copyCoupon(){
  navigator.clipboard.writeText(document.getElementById("coupon").innerText);
  soundOn&&ctx&&approveTone();
}

/* ===== TOGGLES ===== */
function toggleSound(){
  soundOn=!soundOn;
  localStorage.setItem("sound", soundOn?"on":"off");
}
function toggleLang(){
  lang = lang==="en"?"hi":"en";
  localStorage.setItem("lang",lang);
}
</script>

</body>
</html>`;
}

/* ===== ROUTES ===== */
app.get("/",(req,res)=>{
const oid=generateOrderId();
res.send(page("Shop",`
<div class="card">
<h1>Genuine Shein Shop</h1>
<ul>
<li>₹500 – ₹7</li><li>₹1000 – ₹14</li><li>₹2000 – ₹28</li><li>₹4000 – ₹56</li>
</ul>
<small>Order ID</small><div class="code">${oid}</div>
<small>UPI</small><div class="code">${UPI_ID}</div>
<form method="POST" action="/submit">
<input type="hidden" name="order_id" value="${oid}">
<input name="utr" placeholder="UTR" required>
<button>Submit</button>
</form>
</div>`));
});

app.post("/submit",(req,res)=>{
db.run(`INSERT INTO orders(order_id,utr,status,created_at)VALUES(?,?, 'PENDING', datetime('now'))`,
[req.body.order_id,req.body.utr],()=>res.redirect(`/order/${req.body.order_id}`));
});

app.get("/order/:id",(req,res)=>{
db.get("SELECT * FROM orders WHERE order_id=?",[req.params.id],(e,o)=>{
let h=`<div class="card"><h2>Status</h2><div class="code">${o.order_id}</div>`;
h+=o.status==="APPROVED"
?`<div class="status approved">Approved</div><div id="coupon" class="code glow">${o.coupon}</div><button onclick="copyCoupon()">Copy</button>`
:`<div class="status pending">Pending</div><div class="progress"><span></span></div><button onclick="location.reload()">Refresh</button>`;
h+=`</div>`;
res.send(page("Order",h,o.status!=="APPROVED"));
});
});

app.get("/admin",(req,res)=>{
if(req.query.pass!==ADMIN_PASSWORD)return res.send("Unauthorized");
db.all("SELECT * FROM orders",(e,rows)=>{
res.send(page("Admin",`<div class="card">${rows.map(o=>`
<form method="POST" action="/approve?pass=${ADMIN_PASSWORD}">
${o.order_id} | ${o.status}<br>
<input type="hidden" name="order_id" value="${o.order_id}">
<input name="coupon" placeholder="Coupon">
<button>Approve</button>
</form>`).join("")}</div>`));
});
});

app.post("/approve",(req,res)=>{
db.run(`UPDATE orders SET status='APPROVED', coupon=? WHERE order_id=?`,
[req.body.coupon,req.body.order_id],()=>res.redirect(`/admin?pass=${ADMIN_PASSWORD}`));
});

app.listen(PORT,()=>console.log("EDITH-style system online"));
