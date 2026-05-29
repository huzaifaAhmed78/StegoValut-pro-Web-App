class StegoVault {
constructor() {
this.MARK = "###STEGOVAULT###";
this.stats = { processed: 0, extracted: 0 };
this.files = {};
this.init();
}

init() {
this.bindEvents();
}
// ================= RESET =================
clearAll() {

  // Encode reset
  document.getElementById('videoInput').value = '';
  document.getElementById('message').value = '';
  document.getElementById('filePreview').innerHTML = '';

  const preview = document.getElementById('preview');
  preview.style.display = 'none';
  preview.src = '';

  document.getElementById('download').style.display = 'none';
  document.getElementById('charCount').textContent = '0 / 500';

  // Decode reset
  document.getElementById('decodeInput').value = '';
  document.getElementById('decodeResults').innerHTML = '';
  document.getElementById('result').value = '';

  // Batch reset
  document.getElementById('batchInput').value = '';
  document.getElementById('batchMessage').value = '';
  document.getElementById('batchResults').innerHTML = '';

  // Memory clear
  this.files = {};

  this.showToast('Reset done');
  this.updateProgress(0, "Ready");
}
// ================= EVENTS =================
bindEvents() {
document.querySelectorAll('.nav-item').forEach(item => {
item.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
});

this.setupFileDragDrop('dropArea', 'videoInput');
this.setupFileDragDrop('decodeDropArea', 'decodeInput');
this.setupFileDragDrop('batchDropArea', 'batchInput');

document.getElementById('message').addEventListener('input', () => this.updateCharCount());
document.getElementById('batchMessage').addEventListener('input', () => this.updateBatchCharCount());

document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
}

// ================= FILE =================
setupFileDragDrop(dropId, inputId) {
const dropArea = document.getElementById(dropId);
const input = document.getElementById(inputId);

['dragenter','dragover','dragleave','drop'].forEach(e => {
  dropArea.addEventListener(e, (ev)=>{ev.preventDefault();ev.stopPropagation();});
});

dropArea.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    input.files = files;
    this.handleFileSelect(inputId, files);
  }
});

dropArea.addEventListener('click', (e) => {
  // sirf tab trigger ho jab background pe click ho
  if (!e.target.closest('input')) {
    input.click();
  }
});

input.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    this.handleFileSelect(inputId, e.target.files);
  }
});
}

handleFileSelect(inputId, files) {

  const preview = document.getElementById(
    inputId === 'videoInput' ? 'filePreview' :
    inputId === 'decodeInput' ? 'decodeResults' : 'batchResults'
  );

  // SINGLE FILE
  if (inputId !== 'batchInput') {
    const file = files[0];

    if (file && file.type.startsWith('video/')) {
      this.files[inputId] = file;

      preview.innerHTML = `<b>${file.name}</b>`;

      if (inputId === 'videoInput') {
        const videoPreview = document.getElementById('preview');
        videoPreview.src = URL.createObjectURL(file);
        videoPreview.style.display = 'block';
      }
    }
  }

  // MULTIPLE FILES
  else {
    this.files[inputId] = files;

    let list = '';
    for (let i = 0; i < files.length; i++) {
      list += `<div>📁 ${files[i].name}</div>`;
    }

    preview.innerHTML = list;
  }

  this.showToast('✅ Files loaded');
}

// ================= NAV =================
switchTab(tabName) {

  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(tabName).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  const title = document.getElementById('pageTitle');
  const subtitle = document.getElementById('pageSubtitle');

  // 🔥 Header Change Logic
  if (tabName === 'encode') {
    title.textContent = 'Encode Message';
    subtitle.textContent = 'Secure your data in video files';
  }
  else if (tabName === 'decode') {
    title.textContent = 'Decode Message';
    subtitle.textContent = 'Extract hidden data from video';
  }
  else if (tabName === 'batch') {
    title.textContent = 'Batch Processing';
    subtitle.textContent = 'Process multiple videos at once';
  }
  else if (tabName === 'settings') {
    title.textContent = 'Settings';
    subtitle.textContent = 'Customize security and performance';
  }
}

// ================= UTIL =================
updateCharCount() {
const msg = document.getElementById('message');
if (msg.value.length > 500) msg.value = msg.value.substring(0, 500);
document.getElementById('charCount').textContent = msg.value.length + " / 500";
}

updateBatchCharCount() {
const msg = document.getElementById('batchMessage');
if (msg.value.length > 500) msg.value = msg.value.substring(0, 500);
}

updateProgress(p, text) {
document.getElementById('progressBar').style.width = p + '%';
document.getElementById('progressText').textContent = text;
}

showToast(msg){
const t=document.getElementById('toast');
t.textContent=msg;
t.className='toast show';
setTimeout(()=>t.classList.remove('show'),3000);
}

toggleTheme(){
const html=document.documentElement;
const t=html.getAttribute('data-theme')==='light'?'dark':'light';
html.setAttribute('data-theme',t);
}

readFileAsArrayBuffer(file){
return new Promise(res=>{
const r=new FileReader();
r.onload=()=>res(r.result);
r.readAsArrayBuffer(file);
});
}

// ================= AES =================
async generateKey(password) {
const enc = new TextEncoder();
const keyMaterial = await crypto.subtle.importKey(
"raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
);

return crypto.subtle.deriveKey(
{
name: "PBKDF2",
salt: enc.encode("stegovault"),
iterations: 100000,
hash: "SHA-256"
},
keyMaterial,
{ name: "AES-GCM", length: 256 },
false,
["encrypt", "decrypt"]
);
}

async encryptAES(message, password) {
const enc = new TextEncoder();
const key = await this.generateKey(password);
const iv = crypto.getRandomValues(new Uint8Array(12));

const encrypted = await crypto.subtle.encrypt(
{ name: "AES-GCM", iv },
key,
enc.encode(message)
);

const buffer = new Uint8Array(encrypted);
let binary = '';
buffer.forEach(b => binary += String.fromCharCode(b));

return btoa(JSON.stringify({
iv: Array.from(iv),
data: btoa(binary)
}));
}

async decryptAES(data, password) {
const obj = JSON.parse(atob(data));
const key = await this.generateKey(password);

const binary = atob(obj.data);
const bytes = new Uint8Array(binary.length);

for (let i = 0; i < binary.length; i++) {
bytes[i] = binary.charCodeAt(i);
}

const decrypted = await crypto.subtle.decrypt(
{ name: "AES-GCM", iv: new Uint8Array(obj.iv) },
key,
bytes
);

return new TextDecoder().decode(decrypted);
}

// ================= ENCODE =================
async encode() {
const file = this.files['videoInput'];
let message = document.getElementById('message').value;
const level = document.getElementById('encryptionLevel').value;

if (!file || !message) return this.showToast('❌ Missing input');

try {
this.updateProgress(10, "Processing...");
if (level === 'basic') {
  message = btoa(message);
}
else if (level === 'strong') {
  const password = prompt("Enter password:");
  if (!password) return;

  try {
    message = await this.encryptAES(message, password);
  } catch {
    message = btoa(password + "::" + message);
  }
}

const buffer = await this.readFileAsArrayBuffer(file);
const msgBytes = new TextEncoder().encode(this.MARK + message);

const combined = new Uint8Array(buffer.byteLength + msgBytes.length);
combined.set(new Uint8Array(buffer),0);
combined.set(msgBytes, buffer.byteLength);

const blob = new Blob([combined], {type:file.type});
const url = URL.createObjectURL(blob);

const dl = document.getElementById('download');
dl.href = url;
dl.download = 'stego_'+file.name;
dl.style.display = 'inline-flex';

this.showToast('✅ Encoded');
this.updateProgress(100, "Done");
} catch {
this.showToast('❌ Error');
}
}

// ================= DECODE =================
async decode() {
const file = this.files['decodeInput'];
if (!file) return this.showToast('❌ Select file');

const level = document.getElementById('encryptionLevel').value;

const buffer = await this.readFileAsArrayBuffer(file);
const bytes = new Uint8Array(buffer);
const markBytes = new TextEncoder().encode(this.MARK);

let index = -1;

for (let i=0;i<bytes.length;i++){
let found=true;
for(let j=0;j<markBytes.length;j++){
if(bytes[i+j]!==markBytes[j]){found=false;break;}
}
if(found){index=i;break;}
}

if (index === -1) {
  document.getElementById('result').value = "❌ No message found";
  return;
}

let msg = new TextDecoder().decode(
  bytes.slice(index + markBytes.length)
);

try {
if (level === 'basic') msg = atob(msg);
else if (level === 'strong') {
const password = prompt("Enter password:");
try {
msg = await this.decryptAES(msg, password);
} catch {
const decoded = atob(msg);
const [p,m] = decoded.split("::");
msg = (password===p)?m:"❌ Wrong password";
}
}
} catch { msg="❌ Error"; }

document.getElementById('result').value = msg;
}

// ================= BATCH =================
async batchEncode() {

  const files = this.files['batchInput'];   // ✅ FIXED
  const msg = document.getElementById('batchMessage').value;

  if(!files || !files.length || !msg) {
    this.showToast('❌ Missing files or message');
    return;
  }

  let out = '';

  for(let f of files){

    const buf = await this.readFileAsArrayBuffer(f);
    const msgBytes = new TextEncoder().encode(this.MARK + msg);

    const comb = new Uint8Array(buf.byteLength + msgBytes.length);
    comb.set(new Uint8Array(buf), 0);
    comb.set(msgBytes, buf.byteLength);

    const url = URL.createObjectURL(new Blob([comb], { type: f.type }));

    out += `
      <div class="batch-item">
        <h4>📁 ${f.name}</h4>
        <a href="${url}" download="stego_${f.name}" class="download-link">
          ⬇ Download
        </a>
      </div>
    `;
  }

  document.getElementById('batchResults').innerHTML = out;
  this.showToast('✅ Batch encoded');
}

async batchDecode() {
  const files = document.getElementById('batchInput').files;
  if (!files.length) return this.showToast('❌ No files');

  let out = '';
  const markBytes = new TextEncoder().encode(this.MARK);

  for (let f of files) {
    const buf = await this.readFileAsArrayBuffer(f);
    const bytes = new Uint8Array(buf);

    let index = -1;

    for (let i = 0; i < bytes.length; i++) {
      let found = true;
      for (let j = 0; j < markBytes.length; j++) {
        if (bytes[i + j] !== markBytes[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        index = i;
        break;
      }
    }

    let message = "❌ No message found";

    if (index !== -1) {
      let msg = new TextDecoder().decode(
        bytes.slice(index + markBytes.length)
      );

      const level = document.getElementById('encryptionLevel').value;

      try {
        if (level === 'basic') {
          msg = atob(msg);
        }
        else if (level === 'strong') {
          const password = prompt(`Enter password for ${f.name}:`);

          try {
            msg = await this.decryptAES(msg, password);
          } catch {
            const decoded = atob(msg);
            const [p, m] = decoded.split("::");
            msg = (password === p) ? m : "❌ Wrong password";
          }
        }
      } catch {
        msg = "❌ Decryption error";
      }

      message = msg;
    }

    // 🔥 MISSING PART (FIX)
    out += `
      <div class="batch-item">
        <h4>📁 ${f.name}</h4>
        <textarea readonly>${message}</textarea>
      </div>
    `;
  }

  document.getElementById('batchResults').innerHTML = out;
  this.showToast('✅ Batch decode complete');
}
}

// ================= GLOBAL =================
document.addEventListener('DOMContentLoaded',()=>{
window.stegoVault=new StegoVault();
});

function encode(){stegoVault.encode();}
function decode(){stegoVault.decode();}
function clearAll(){stegoVault.clearAll();}
function batchEncode(){stegoVault.batchEncode();}
function batchDecode(){stegoVault.batchDecode();}
function copyText(){
navigator.clipboard.writeText(document.getElementById('result').value);
}
function clearResult(){
document.getElementById('result').value='';
}

function resetBatch(){

  // file input clear
  document.getElementById('batchInput').value = '';

  // message clear
  document.getElementById('batchMessage').value = '';

  // status / results clear
  const status = document.getElementById('batchStatus');
  const output = document.getElementById('batchOutput');
  const old = document.getElementById('batchResults');

  if (status) status.innerHTML = '';
  if (output) output.value = '';
  if (old) old.innerHTML = '';

  // optional progress clear
  const progress = document.getElementById('batchProgress');
  if (progress) progress.innerHTML = '';

  // memory clear
  if (window.stegoVault) {
    stegoVault.files['batchInput'] = null;
  }

  // toast
  const t = document.getElementById('toast');
  t.textContent = '🧹 Batch Reset Done';
  t.className = 'toast show';
  setTimeout(()=>t.classList.remove('show'),3000);
}
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('overlay');

  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}
// ================= SOCKET CONNECTION =================
const socket = io("http://192.168.100.3:5000");
socket.on("video-status", (data) => {

  console.log("STATUS RECEIVED:", data);

  stegoVault.showToast(data.message);

});

// ================= USER ID =================
const username = prompt("Enter Your ID");

socket.emit("register-user", username);

socket.on("receive-video", (video) => {

  console.log("Received Video");

  // receive code...

});

// ================= SHARE VIDEO FUNCTION =================
async function shareVideo() {

  const file = stegoVault.files['videoInput'];

  if (!file) {
    stegoVault.showToast('❌ Select video first');
    return;
  }

  const receiver = document.getElementById("receiverId").value;

  if (!receiver) {
    stegoVault.showToast('❌ Enter Receiver ID');
    return;
  }

  console.log("Sending Started");

  const reader = new FileReader();

  reader.onload = function(event) {

    console.log("File Loaded");

    socket.emit("send-video", {

      to: receiver,
      name: file.name,
      type: file.type,

      // 🔥 BUFFER SEND
      buffer: event.target.result

    });

    console.log("Video Sent");

  };

  // 🔥 IMPORTANT
  reader.readAsArrayBuffer(file);
}

// ================= RECEIVE VIDEO =================
socket.on("receive-video", (video) => {

  console.log("Received Video");

  // AUTO OPEN DECODE TAB
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.remove('active')
  );

  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.remove('active')
  );

  document.getElementById('decode').classList.add('active');

  document.querySelector('[data-tab="decode"]')
    .classList.add('active');

  // 🔥 BUFFER → BLOB
  const blob = new Blob(
    [video.buffer],
    { type: video.type }
  );

  const videoURL = URL.createObjectURL(blob);

  const container = document.getElementById("decodeResults");

  container.innerHTML = `

  <div class="received-video-box">

    <video controls playsinline class="received-video">
      <source src="${videoURL}" type="${video.type}">
    </video>

    <a href="${videoURL}"
       download="received_${video.name}"
       class="download-btn">

       <i class="fas fa-download"></i>
       Download ${video.name}

    </a>

  </div>
`;

});
socket.on("video-sent", () => {

  stegoVault.showToast("✅ Video sent");

});

socket.on("user-not-found", () => {

  stegoVault.showToast("❌ User not found");

});