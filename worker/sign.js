// Cloudflare Worker penandatangan QR nota AKIO FLORIST.
// Kunci privat TIDAK pernah disimpan di repo. Isi secret SIGNING_KEY_BOX dengan
// berkas terenkripsi web/data/signing-key.enc.json (PBKDF2-SHA256 + AES-GCM).
// Kata sandi kunci dikirim per request oleh user, TIDAK disimpan di Worker.

const FORMAT = "AKIOFIN1";
const EXPECTED_FINGERPRINT = "142D3FB5";
const ITERATIONS_HINT = "PBKDF2-SHA256/AES-GCM";

function b64urlToBytes(str) {
  const s = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function deriveKey(pass, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

async function openPrivate(box, pass) {
  if (!box || !box.salt || !box.iv || !box.data) {
    throw new Error("SIGNING_KEY_BOX tidak lengkap");
  }
  const aes = await deriveKey(pass, b64urlToBytes(box.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64urlToBytes(box.iv) },
    aes,
    b64urlToBytes(box.data)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

function canonical(no, tanggal, nama, total, kid) {
  return JSON.stringify([
    FORMAT,
    String(no || ""),
    String(tanggal || ""),
    String(nama || ""),
    String(total || ""),
    String(kid || "")
  ]);
}

function jsonResponse(origin, status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return jsonResponse(origin, 405, { error: "Gunakan POST" });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse(origin, 400, { error: "Body harus JSON" });
    }

    const password = String(body.password || "");
    if (!password) {
      return jsonResponse(origin, 401, { error: "Kata sandi kunci wajib diisi" });
    }
    if (!env.SIGNING_KEY_BOX) {
      return jsonResponse(origin, 500, { error: "Secret SIGNING_KEY_BOX belum diset" });
    }

    let box;
    try {
      box = JSON.parse(env.SIGNING_KEY_BOX);
    } catch (e) {
      return jsonResponse(origin, 500, { error: "SIGNING_KEY_BOX bukan JSON" });
    }
    if (!box.fingerprint || box.fingerprint !== EXPECTED_FINGERPRINT) {
      return jsonResponse(origin, 500, { error: "Sidik kunci Worker tidak cocok" });
    }

    let plain;
    try {
      plain = await openPrivate(box, password);
    } catch (e) {
      return jsonResponse(origin, 401, { error: "Kata sandi kunci salah, atau berkas kunci rusak" });
    }
    if (!plain.privateJwk || !plain.publicJwk) {
      return jsonResponse(origin, 500, { error: "Isi kunci tidak lengkap" });
    }

    try {
      const key = await crypto.subtle.importKey(
        "jwk",
        plain.privateJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
      );
      const canon = canonical(
        body.no,
        body.tanggal,
        body.nama,
        body.total,
        box.fingerprint
      );
      const sig = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        key,
        new TextEncoder().encode(canon)
      );
      return jsonResponse(origin, 200, {
        signature: bytesToB64url(sig),
        k: box.fingerprint,
        alg: "ECDSA-P256-SHA256",
        format: FORMAT,
        enc: ITERATIONS_HINT
      });
    } catch (e) {
      return jsonResponse(origin, 500, { error: "Gagal menandatangani: " + e.message });
    }
  }
};
