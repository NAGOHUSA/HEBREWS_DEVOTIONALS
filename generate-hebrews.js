// generate-hebrews.js — HeBrews (coffee-based Christian devotionals)
// Multi-provider: OpenAI → Groq → DeepSeek. Node 18+ (global fetch). No deps.

import fs from "node:fs/promises";
import path from "node:path";

// ===== Provider order (edit via env if desired) =====
const PROVIDERS = (process.env.DEVOTIONAL_PROVIDERS || "openai,groq,deepseek")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

// ===== Common content controls =====
const WORDS_MIN = Number(process.env.DEVOTIONAL_WORDS_MIN || 250);
const WORDS_MAX = Number(process.env.DEVOTIONAL_WORDS_MAX || 350);
const MAX_TOKENS = Number(process.env.DEVOTIONAL_MAX_TOKENS || 500);
const TEMPERATURE = Number(process.env.DEVOTIONAL_TEMPERATURE || 0.7);
const TIMEOUT_MS  = Number(process.env.DEVOTIONAL_TIMEOUT_MS  || 25000);
const MAX_ATTEMPTS_PER_PROVIDER = Number(process.env.DEVOTIONAL_MAX_ATTEMPTS || 2);

// Optional seasonal theme (kept, but coffee focus is built-in)
const THEME = process.env.DEVO_THEME || "";

// ===== Provider config =====
const OA = {
  apiKey: process.env.OPENAI_API_KEY,
  model:  process.env.OPENAI_MODEL || "gpt-4o-mini",
  url:    "https://api.openai.com/v1/chat/completions",
};
const GQ = {
  apiKey: process.env.GROQ_API_KEY,
  model:  process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  url:    "https://api.groq.com/openai/v1/chat/completions",
};
const DS = {
  apiKey: process.env.DEEPSEEK_API_KEY,
  model:  process.env.DEEPSEEK_MODEL || "deepseek-chat",
  url:    "https://api.deepseek.com/chat/completions",
};

// ===== Prompt (coffee-focused, same sections) =====
function messagesFor(dateISO) {
  const themeLine = THEME ? `Theme: ${THEME}\n` : "";
  return [
    {
      role: "system",
      content: [
        "You are a pastoral devotional writer for an iOS app called “HeBrews.”",
        "Write a COFFEE-THEMED Christian devotional that is theologically sound, warm, and practical.",
        `Length: ${WORDS_MIN}-${WORDS_MAX} words total. Markdown only (no HTML).`,
        "Weave coffee imagery naturally (e.g., aroma, brew, pour-over, extraction, roasting, crema, morning ritual).",
        "Prefer one clear metaphor extended through the piece; avoid cheesy puns overload.",
        "Sections in order, exact headers:",
        "1) Title — ≤8 words (may hint at coffee).",
        "2) Scripture — exactly ONE verse/passage, ≤50 words quoted, include reference.",
        "3) Reflection — 150–220 words: connect Scripture to everyday discipleship using coffee process as metaphor.",
        "4) Prayer — 30–50 words, first-person plural (“we”).",
        "5) One-Line Application — one sentence, ≤12 words.",
        "No prefaces, no duplicate sections."
      ].join(" ")
    },
    {
      role: "user",
      content: [
        `Date: ${dateISO}`,
        "App: HeBrews (iOS coffee-based devotionals).",
        themeLine,
        "Output using exactly these headers:",
        "# Title",
        "",
        "## Scripture",
        "",
        "## Reflection",
        "",
        "## Prayer",
        "",
        "## One-Line Application"
      ].join("\n")
    }
  ];
}

// ===== Utils =====
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function wordCount(s){ return s ? s.trim().split(/\s+/).length : 0; }
async function postJSON(url, body, headers, timeoutMs){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally { clearTimeout(timer); }
}
function parseContent(jsonText){
  try{ const j = JSON.parse(jsonText); return (j.choices?.[0]?.message?.content || "").trim(); }
  catch{ return ""; }
}

// ===== Provider callers =====
async function tryOpenAI(messages){
  if(!OA.apiKey) throw new Error("MISSING_KEY_OPENAI");
  for(let a=1;a<=MAX_ATTEMPTS_PER_PROVIDER;a++){
    const {ok,status,text}=await postJSON(
      OA.url,{model:OA.model,messages,temperature:TEMPERATURE,max_tokens:MAX_TOKENS},
      {Authorization:`Bearer ${OA.apiKey}`}, TIMEOUT_MS
    );
    if(!ok){
      if(status===429||status===408||(status>=500&&status<=599)){
        if(a<MAX_ATTEMPTS_PER_PROVIDER){ const d=900*(2**(a-1))+Math.floor(Math.random()*250);
          console.warn(`[OpenAI] transient ${status}, retry in ${d}ms`); await sleep(d); continue; }
      }
      throw new Error(`[OpenAI] error ${status}: ${text}`);
    }
    const content=parseContent(text); if(!content) throw new Error("[OpenAI] empty content");
    return {provider:"openai",model:OA.model,content};
  }
  throw new Error("[OpenAI] exhausted retries");
}
async function tryGroq(messages){
  if(!GQ.apiKey) throw new Error("MISSING_KEY_GROQ");
  for(let a=1;a<=MAX_ATTEMPTS_PER_PROVIDER;a++){
    const {ok,status,text}=await postJSON(
      GQ.url,{model:GQ.model,messages,temperature:TEMPERATURE,max_tokens:MAX_TOKENS},
      {Authorization:`Bearer ${GQ.apiKey}`}, TIMEOUT_MS
    );
    if(!ok){
      if(status===429||status===408||(status>=500&&status<=599)){
        if(a<MAX_ATTEMPTS_PER_PROVIDER){ const d=900*(2**(a-1))+Math.floor(Math.random()*250);
          console.warn(`[Groq] transient ${status}, retry in ${d}ms`); await sleep(d); continue; }
      }
      throw new Error(`[Groq] error ${status}: ${text}`);
    }
    const content=parseContent(text); if(!content) throw new Error("[Groq] empty content");
    return {provider:"groq",model:GQ.model,content};
  }
  throw new Error("[Groq] exhausted retries");
}
async function tryDeepSeek(messages){
  if(!DS.apiKey) throw new Error("MISSING_KEY_DEEPSEEK");
  for(let a=1;a<=MAX_ATTEMPTS_PER_PROVIDER;a++){
    const {ok,status,text}=await postJSON(
      DS.url,{model:DS.model,messages,temperature:TEMPERATURE,max_tokens:MAX_TOKENS},
      {Authorization:`Bearer ${DS.apiKey}`}, TIMEOUT_MS
    );
    if(!ok){
      if(status===402) throw Object.assign(new Error("DS_402"),{code:"INSUFFICIENT_BALANCE"});
      if(status===429||status===408||(status>=500&&status<=599)){
        if(a<MAX_ATTEMPTS_PER_PROVIDER){ const d=900*(2**(a-1))+Math.floor(Math.random()*250);
          console.warn(`[DeepSeek] transient ${status}, retry in ${d}ms`); await sleep(d); continue; }
      }
      throw new Error(`[DeepSeek] error ${status}: ${text}`);
    }
    const content=parseContent(text); if(!content) throw new Error("[DeepSeek] empty content");
    return {provider:"deepseek",model:DS.model,content};
  }
  throw new Error("[DeepSeek] exhausted retries");
}

// ===== Main =====
async function main(){
  const dateISO = new Date().toISOString().slice(0,10);
  const messages = messagesFor(dateISO);

  const order = { openai:tryOpenAI, groq:tryGroq, deepseek:tryDeepSeek };
  const errors = [];
  for(const p of PROVIDERS){
    try{
      if(!order[p]){ console.warn(`Unknown provider "${p}" — skipping`); continue; }
      const result = await order[p](messages);
      return await writeResult(result, dateISO);
    }catch(e){
      errors.push(`${p}: ${e.code || ""} ${e.message}`);
      console.warn(`Provider ${p} failed: ${e.message}`);
    }
  }
  throw new Error(`All providers failed. Details: ${errors.join(" | ")}`);
}

async function writeResult({provider,model,content}, dateISO){
  const wc = wordCount(content);
  if(wc < 120) throw new Error(`Too short (${wc} words) from ${provider}`);

  const outDir = path.resolve("devotionals/"); // keep RSM separate
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${dateISO}.json`);
  const payload = {
    app: "HeBrews",
    date: dateISO,
    provider, model,
    max_tokens: MAX_TOKENS, temperature: TEMPERATURE,
    words: wc, theme: THEME || "coffee",
    content_markdown: content,
    meta: {
      version: "hebrews-coffee-1",
      constraints: {
        scripture_quote_words_max: 50,
        total_words_target: [WORDS_MIN, WORDS_MAX],
        coffee_focus: true
      }
    }
  };
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`✅ Wrote ${outPath} via ${provider}/${model} (${wc} words)`);
}

main().catch(err => { console.error("❌ Generation failed:", err); process.exit(1); });
