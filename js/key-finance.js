// Kunci privat tanda tangan nota finance.
// HANYA dipakai di aplikasi lokal (http://localhost / file://). Kunci tidak pernah dikirim ke GitHub.
(function(){
  "use strict";

  const STORE = "akioFinance.signing.v1";
  const SESSION = "akioFinance.unlock";
  const KEY_FILE = "./data/signing-key.enc.json";
  // Cloudflare Workers membatasi PBKDF2 maksimal 100.000 iterasi.
  // Gunakan 100.000 agar kotak kunci yang sama bisa dibuka lokal DAN oleh Worker.
  const ITER = 100000;
  const FORMAT = "AKIOFIN1";

  let signKeys = null;
  let keyPass = "";
  let ready = false;
  try{ keyPass = sessionStorage.getItem(SESSION) || ""; }catch(e){}

  function isLocal(){
    return location.protocol === "http:" || location.protocol === "file:";
  }
  function b64url(buf){
    const bytes = new Uint8Array(buf);
    let s = "";
    for(let i=0;i<bytes.length;i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function fromB64url(str){
    const s = String(str||"").replace(/-/g,"+").replace(/_/g,"/");
    const pad = s + "=".repeat((4 - s.length % 4) % 4);
    const bin = atob(pad);
    const out = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function deriveKey(pass, salt, iterations){
    const material = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name:"PBKDF2", salt: salt, iterations: iterations || ITER, hash:"SHA-256" },
      material, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]
    );
  }
  async function sealPrivate(obj, pass){
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aes = await deriveKey(pass, salt);
    const cipher = await crypto.subtle.encrypt(
      { name:"AES-GCM", iv: iv }, aes, new TextEncoder().encode(JSON.stringify(obj))
    );
    return {
      app:"akio-finance", type:"signing-key", version:1,
      alg:"ECDSA-P256-SHA256", enc:"PBKDF2-SHA256/AES-GCM", iterations:ITER,
      salt:b64url(salt), iv:b64url(iv), data:b64url(cipher),
      publicJwk:obj.publicJwk, fingerprint:obj.fingerprint, createdAt:Date.now()
    };
  }
  async function openPrivate(box, pass){
    if(!box || !box.salt || !box.iv || !box.data) throw new Error("Berkas kunci tidak lengkap");
    const aes = await deriveKey(pass, fromB64url(box.salt), box.iterations || ITER);
    const plain = await crypto.subtle.decrypt(
      { name:"AES-GCM", iv:fromB64url(box.iv) }, aes, fromB64url(box.data)
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }
  async function readBox(){
    let raw = null;
    try{ raw = localStorage.getItem(STORE); }catch(e){}
    if(raw){
      try{ return JSON.parse(raw); }
      catch(e){ throw new Error("Kunci di browser rusak"); }
    }
    if(isLocal()){
      try{
        const res = await fetch(KEY_FILE, { cache:"no-store" });
        if(res.ok) return await res.json();
      }catch(e){}
    }
    return null;
  }
  async function ensureKeys(){
    if(ready && signKeys) return signKeys;
    if(!(window.crypto && crypto.subtle)) throw new Error("Browser tidak mendukung Web Crypto");
    const box = await readBox();
    if(!box) throw new Error(isLocal()
      ? "Berkas kunci nota tidak ditemukan di perangkat ini"
      : "Kunci privat tidak tersedia di halaman publik");
    if(!keyPass) throw new Error("Kunci nota terkunci. Buka Pengaturan → isi kata sandi → Buka kunci.");
    let plain;
    try{ plain = await openPrivate(box, keyPass); }
    catch(e){ throw new Error("Kata sandi kunci salah, atau berkas kunci rusak"); }
    if(!plain.privateJwk || !plain.publicJwk) throw new Error("Isi kunci tidak lengkap");
    signKeys = plain;
    ready = true;
    try{ localStorage.setItem(STORE, JSON.stringify(box)); }catch(e){}
    return signKeys;
  }
  async function unlock(pass){
    if(!pass) throw new Error("Isi kata sandi kunci dulu");
    const box = await readBox();
    if(!box) throw new Error("Berkas kunci nota tidak ditemukan di perangkat ini");
    const plain = await openPrivate(box, pass);
    if(!plain.privateJwk || !plain.publicJwk) throw new Error("Isi kunci tidak lengkap");
    if(plain.fingerprint && box.fingerprint && plain.fingerprint !== box.fingerprint){
      throw new Error("Sidik kunci tidak cocok");
    }
    signKeys = plain;
    keyPass = pass;
    ready = true;
    try{
      localStorage.setItem(STORE, JSON.stringify(box));
      sessionStorage.setItem(SESSION, pass);
    }catch(e){}
    return true;
  }
  async function changePassword(oldPass, newPass){
    if(String(newPass||"").length < 10) throw new Error("Kata sandi baru minimal 10 karakter");
    const box = await readBox();
    if(!box) throw new Error("Berkas kunci nota tidak ditemukan");
    const plain = await openPrivate(box, oldPass);
    const sealed = await sealPrivate(plain, newPass);
    try{
      localStorage.setItem(STORE, JSON.stringify(sealed));
      sessionStorage.setItem(SESSION, newPass);
    }catch(e){}
    signKeys = plain;
    keyPass = newPass;
    ready = true;
    return true;
  }
  function canonical(no, tanggal, nama, total, kid){
    return JSON.stringify([
      FORMAT, String(no||""), String(tanggal||""), String(nama||""), String(total||""), String(kid||"")
    ]);
  }
  async function signCanonical(canon){
    const keys = await ensureKeys();
    const key = await crypto.subtle.importKey(
      "jwk", keys.privateJwk, { name:"ECDSA", namedCurve:"P-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign(
      { name:"ECDSA", hash:"SHA-256" }, key, new TextEncoder().encode(canon)
    );
    return b64url(sig);
  }
  async function status(){
    const box = await readBox();
    let storedCreatedAt = null;
    try{
      const raw = localStorage.getItem(STORE);
      if(raw) storedCreatedAt = JSON.parse(raw).createdAt || null;
    }catch(e){}
    let fileCreatedAt = null;
    if(isLocal()){
      try{
        const res = await fetch(KEY_FILE, { cache:"no-store" });
        if(res.ok) fileCreatedAt = (await res.json()).createdAt || null;
      }catch(e){}
    }
    return {
      ready: ready && !!signKeys,
      isLocal: isLocal(),
      hasBox: !!box,
      hasStoredBox: storedCreatedAt !== null,
      storedCreatedAt,
      fileCreatedAt,
      stale: !!(storedCreatedAt && fileCreatedAt && storedCreatedAt !== fileCreatedAt),
      fingerprint: (box && box.fingerprint) || (window.AKIO_FINANCE_VERIFY && window.AKIO_FINANCE_VERIFY.fingerprint) || "—"
    };
  }
  async function exportEncrypted(){
    const box = await readBox();
    if(!box) throw new Error("Tidak ada kunci untuk diekspor");
    return JSON.stringify(Object.assign({ app:"akio-finance", type:"signing-key", version:1 }, box), null, 2);
  }
  function lock(){
    signKeys = null;
    ready = false;
    try{ sessionStorage.removeItem(SESSION); }catch(e){}
  }

  window.FinanceKey = {
    format: FORMAT,
    isLocal,
    ensureKeys,
    unlock,
    changePassword,
    lock,
    canonical,
    signCanonical,
    status,
    exportEncrypted
  };

  // Coba membuka otomatis memakai kata sandi sesi ini (jika ada). Gagal ditoleransi.
  window.addEventListener("DOMContentLoaded", () => {
    ensureKeys().catch(() => {});
  });
})();
