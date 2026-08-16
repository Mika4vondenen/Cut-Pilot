"use strict";
const electron = require("electron");
const path$1 = require("path");
const promises = require("node:fs/promises");
const node_crypto = require("node:crypto");
const path = require("node:path");
const Anthropic = require("@anthropic-ai/sdk");
const zod = require("zod");
const node_child_process = require("node:child_process");
const ffmpegStaticPath = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");
const node_fs = require("node:fs");
const OpenAI = require("openai");
const IPC = {
  settingsGet: "settings:get",
  settingsSet: "settings:set",
  nichesList: "niches:list",
  nichesSave: "niches:save",
  nichesDelete: "niches:delete",
  projectsList: "projects:list",
  projectsSave: "projects:save",
  projectsDelete: "projects:delete",
  scriptGenerate: "script:generate",
  materialPick: "material:pick",
  styleAnalyze: "style:analyze",
  renderStart: "render:start",
  renderCancel: "render:cancel",
  outputShow: "output:show",
  pickDirectory: "dialog:pickDirectory",
  renderProgress: "render:progress",
  accountsList: "accounts:list",
  accountsSave: "accounts:save",
  accountsDelete: "accounts:delete",
  snapshotsList: "snapshots:list",
  snapshotsSave: "snapshots:save",
  snapshotsDelete: "snapshots:delete",
  trackedList: "tracked:list",
  trackedSave: "tracked:save",
  trackedDelete: "tracked:delete",
  optimizationsList: "optimizations:list",
  optimizationsSave: "optimizations:save",
  optimizationsDelete: "optimizations:delete",
  knowledgeList: "knowledge:list",
  knowledgeSave: "knowledge:save",
  knowledgeDelete: "knowledge:delete"
};
const DEFAULT_SCRIPT_MODEL = "claude-opus-5";
const DEFAULT_SETTINGS = {
  anthropicApiKey: "",
  openaiApiKey: "",
  scriptModel: DEFAULT_SCRIPT_MODEL,
  outputDir: ""
};
const DEFAULT_CAPTION_STYLE = {
  enabled: true,
  fontFamily: "Arial Black",
  fontSize: 64,
  primaryColor: "#FFFFFF",
  highlightColor: "#FBBF24",
  uppercase: true,
  position: "center",
  maxWordsPerLine: 4
};
const DEFAULT_STYLE_PROFILE = {
  medianShotSec: 2.5,
  minShotSec: 1.2,
  maxShotSec: 5,
  transition: "cut",
  captions: DEFAULT_CAPTION_STYLE,
  zoomEffect: true,
  zoomMode: "alternating",
  zoomIntensity: 1.08,
  musicVolumeDb: -18,
  notes: ""
};
const FORMAT_PRESETS = {
  shortform: { width: 1080, height: 1920, fps: 30, defaultLengthSec: 45 },
  longform: { width: 1920, height: 1080, fps: 30, defaultLengthSec: 480 }
};
const SOURCE = "CutPilot (Starter)";
const SEEDS = [
  {
    category: "hook",
    trigger: { metric: "hookRetention3sPct", comparator: "below", value: 65 },
    title: "Hook verliert zu viele Zuschauer",
    insight: "Sind nach 3 Sekunden weniger als 65 % der Zuschauer übrig, entscheidet der Hook das Video. Die ersten 1–3 Sekunden müssen eine offene Frage oder eine starke Behauptung setzen — kein Intro, kein Logo, kein Aufwärmen.",
    recommendation: "Hook neu schreiben: mit der spannendsten Aussage des Videos beginnen. Visuell in Sekunde 1 einen Szenenwechsel oder Zoom setzen, damit sofort Bewegung im Bild ist."
  },
  {
    category: "cut",
    trigger: { metric: "watchRatioPct", comparator: "below", value: 50 },
    title: "Zuschauer steigen mitten im Video aus",
    insight: "Eine durchschnittliche Sehdauer unter 50 % der Videolänge heißt: Das Tempo fällt ab oder einzelne Passagen ziehen sich.",
    recommendation: "Schnitttempo erhöhen (kürzere Shots im Stilprofil), Füllsätze aus dem Skript streichen und alle 2–3 Sekunden eine sichtbare Veränderung ins Bild bringen."
  },
  {
    category: "visuals",
    trigger: { metric: "engagementRatePct", comparator: "below", value: 3 },
    title: "Wenig Interaktion — Bilder wirken statisch",
    insight: "Unter 3 % Engagement (Likes, Kommentare, Shares, Saves geteilt durch Views) wirkt das Video oft wie eine Diashow: Standbilder ohne Bewegung laden nicht zum Bleiben ein.",
    recommendation: "Mehr Bewegung: Ken-Burns-Zoom aktivieren, Keyframe-Bewegung auf Bildern nutzen, Schnitte auf Musik-Akzente legen. Zusätzlich im Video eine konkrete Frage stellen, die Kommentare provoziert."
  },
  {
    category: "script",
    trigger: { metric: "completionRatePct", comparator: "below", value: 25 },
    title: "Kaum jemand schaut bis zum Ende",
    insight: "Eine Abschlussrate unter 25 % bei Shortform zeigt: Das Video löst sein Anfangs-Versprechen zu früh oder gar nicht ein.",
    recommendation: "Offenen Loop bauen: Am Anfang etwas versprechen, das erst im letzten Satz aufgelöst wird. Für Rewatches den letzten Satz so schreiben, dass er zurück zum Anfang führt."
  },
  {
    category: "posting",
    trigger: { metric: "followConversionPct", comparator: "below", value: 0.5 },
    title: "Views, aber keine neuen Follower",
    insight: "Wenn unter 0,5 % der Zuschauer folgen, fehlt die Serien-Identität: Zuschauer sehen ein einzelnes Video, keinen Kanal, den man abonnieren will.",
    recommendation: "Wiedererkennbares Serienformat etablieren (gleicher Aufbau, gleicher Look), Cliffhanger auf den nächsten Teil setzen und eine klare Folgen-Aufforderung einbauen („Folge für Teil 2“)."
  },
  {
    category: "general",
    title: "Absprungstellen in der Retention-Kurve lesen",
    insight: "TikTok zeigt in den Insights die Zuschauerbindungs-Kurve. Jeder Knick markiert die Sekunde, in der gescrollt wird — meist ein Themenwechsel, ein langweiliger Satz oder ein zu lange stehendes Bild.",
    recommendation: "Die Sekunde des Knicks im Video ansehen und die Stelle in den Absprung-Notizen des Videos festhalten. Im nächsten Skript genau diese Passage straffen oder streichen."
  },
  {
    category: "cut",
    title: "Muster viraler Konkurrenzvideos übernehmen",
    insight: "Virale Videos einer Nische teilen fast immer dasselbe Schnittmuster: ähnliche Shot-Längen, ähnliche Caption-Optik, ähnliches Tempo.",
    recommendation: "Die besten 3–5 Konkurrenzvideos herunterladen und im Stil-Schritt als Referenz analysieren lassen — das Stilprofil übernimmt ihr Schnitttempo automatisch."
  },
  {
    category: "audio",
    title: "Sound treibt die Retention",
    insight: "Musik mit klarem Beat gibt dem Schnitt Struktur und hält Zuschauer im Rhythmus; komplette Stille oder monotone Flächen lassen die Aufmerksamkeit abreißen.",
    recommendation: "Passende Musik dezent unterlegen (etwa −18 bis −24 dB unter dem Voice-Over) und Schnitte auf die Beats legen."
  },
  {
    category: "script",
    title: "Ein Video = eine Idee",
    insight: "Skripte, die mehrere Ideen mischen, verlieren Zuschauer bei jedem Themenwechsel. Die stärksten Faceless-Videos erzählen genau eine Kernaussage.",
    recommendation: "Vor dem Dreh die Kernaussage in einem Satz notieren. Jeder Skript-Satz, der nicht auf diesen Satz einzahlt, fliegt raus — lieber ein zweites Video daraus machen."
  }
];
function buildSeedKnowledge() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return SEEDS.map((seed) => ({
    id: node_crypto.randomUUID(),
    title: seed.title,
    insight: seed.insight,
    recommendation: seed.recommendation,
    category: seed.category,
    trigger: seed.trigger,
    source: SOURCE,
    createdAt: now,
    updatedAt: now
  }));
}
const SETTINGS_FILE = "settings.json";
const NICHES_FILE = "niches.json";
const PROJECTS_FILE = "projects.json";
const ACCOUNTS_FILE = "accounts.json";
const SNAPSHOTS_FILE = "account-snapshots.json";
const TRACKED_FILE = "tracked-videos.json";
const OPTIMIZATIONS_FILE = "optimizations.json";
const KNOWLEDGE_FILE = "knowledge.json";
function dataDir() {
  return path.join(electron.app.getPath("userData"), "data");
}
const fileQueues = /* @__PURE__ */ new Map();
function enqueue(fileName, task) {
  const previous = fileQueues.get(fileName) ?? Promise.resolve();
  const run = previous.then(task, task);
  fileQueues.set(
    fileName,
    run.then(
      () => void 0,
      () => void 0
    )
  );
  return run;
}
async function readJsonFile(fileName, fallback) {
  try {
    const raw = await promises.readFile(path.join(dataDir(), fileName), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
async function writeJsonFileAtomic(fileName, value) {
  const dir = dataDir();
  await promises.mkdir(dir, { recursive: true });
  const target = path.join(dir, fileName);
  const tmp = path.join(dir, `${fileName}.${node_crypto.randomUUID()}.tmp`);
  try {
    await promises.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
    await promises.rename(tmp, target);
  } catch (err) {
    await promises.rm(tmp, { force: true }).catch(() => void 0);
    throw err;
  }
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
async function readArrayFile(fileName) {
  const parsed = await readJsonFile(fileName, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (entry) => isPlainObject(entry) && typeof entry.id === "string"
  );
}
async function getSettings() {
  const stored = await readJsonFile(SETTINGS_FILE, {});
  const merged = { ...DEFAULT_SETTINGS };
  if (isPlainObject(stored)) {
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const value = stored[key];
      if (typeof value === typeof DEFAULT_SETTINGS[key]) {
        merged[key] = value;
      }
    }
  }
  return merged;
}
async function setSettings(settings) {
  await enqueue(SETTINGS_FILE, () => writeJsonFileAtomic(SETTINGS_FILE, settings));
}
async function listNiches() {
  const niches = await readArrayFile(NICHES_FILE);
  return niches.map((n) => ({
    ...n,
    requiredMaterials: Array.isArray(n.requiredMaterials) ? n.requiredMaterials : [],
    customMaterials: Array.isArray(n.customMaterials) ? n.customMaterials.filter((m) => typeof m === "string") : [],
    audienceComments: typeof n.audienceComments === "string" ? n.audienceComments : "",
    audienceWants: typeof n.audienceWants === "string" ? n.audienceWants : "",
    audienceAvoid: typeof n.audienceAvoid === "string" ? n.audienceAvoid : "",
    cuttingRules: typeof n.cuttingRules === "string" ? n.cuttingRules : ""
  }));
}
async function saveNiche(niche) {
  return enqueue(NICHES_FILE, async () => {
    const saved = {
      ...niche,
      id: niche.id || node_crypto.randomUUID(),
      createdAt: niche.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    const niches = await readArrayFile(NICHES_FILE);
    const index = niches.findIndex((n) => n.id === saved.id);
    if (index >= 0) {
      niches[index] = saved;
    } else {
      niches.push(saved);
    }
    await writeJsonFileAtomic(NICHES_FILE, niches);
    return saved;
  });
}
async function deleteNiche(id) {
  await enqueue(NICHES_FILE, async () => {
    const niches = await readArrayFile(NICHES_FILE);
    await writeJsonFileAtomic(
      NICHES_FILE,
      niches.filter((n) => n.id !== id)
    );
  });
}
let reconciledStaleRendering = false;
async function reconcileStaleRendering() {
  await enqueue(PROJECTS_FILE, async () => {
    const projects = await readArrayFile(PROJECTS_FILE);
    let changed = false;
    for (const project of projects) {
      if (project.status === "rendering") {
        project.status = "draft";
        changed = true;
      }
    }
    if (changed) await writeJsonFileAtomic(PROJECTS_FILE, projects);
  });
}
async function listProjects() {
  if (!reconciledStaleRendering) {
    reconciledStaleRendering = true;
    await reconcileStaleRendering().catch(() => {
    });
  }
  return readArrayFile(PROJECTS_FILE);
}
async function saveProject(project) {
  return enqueue(PROJECTS_FILE, async () => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const saved = {
      ...project,
      id: project.id || node_crypto.randomUUID(),
      createdAt: project.createdAt || now,
      updatedAt: now
    };
    const projects = await readArrayFile(PROJECTS_FILE);
    const index = projects.findIndex((p) => p.id === saved.id);
    if (index >= 0) {
      projects[index] = saved;
    } else {
      projects.push(saved);
    }
    await writeJsonFileAtomic(PROJECTS_FILE, projects);
    return saved;
  });
}
async function deleteProject(id) {
  await enqueue(PROJECTS_FILE, async () => {
    const projects = await readArrayFile(PROJECTS_FILE);
    await writeJsonFileAtomic(
      PROJECTS_FILE,
      projects.filter((p) => p.id !== id)
    );
  });
}
function collection(fileName, prepare) {
  return {
    list: () => readArrayFile(fileName),
    save: (item) => enqueue(fileName, async () => {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let saved = { ...item, id: item.id || node_crypto.randomUUID() };
      if (prepare) saved = prepare(saved, now);
      const items = await readArrayFile(fileName);
      const index = items.findIndex((entry) => entry.id === saved.id);
      if (index >= 0) {
        items[index] = saved;
      } else {
        items.push(saved);
      }
      await writeJsonFileAtomic(fileName, items);
      return saved;
    }),
    remove: (id) => enqueue(fileName, async () => {
      const items = await readArrayFile(fileName);
      await writeJsonFileAtomic(
        fileName,
        items.filter((entry) => entry.id !== id)
      );
    })
  };
}
const stampCreated = (item, now) => ({
  ...item,
  createdAt: item.createdAt || now
});
const stampCreatedUpdated = (item, now) => ({
  ...item,
  createdAt: item.createdAt || now,
  updatedAt: now
});
const accounts = collection(ACCOUNTS_FILE, stampCreated);
const snapshots = collection(SNAPSHOTS_FILE);
const trackedVideos = collection(TRACKED_FILE, stampCreatedUpdated);
const optimizations = collection(OPTIMIZATIONS_FILE, stampCreatedUpdated);
const knowledge = collection(KNOWLEDGE_FILE, stampCreatedUpdated);
const listAccounts = accounts.list;
const saveAccount = accounts.save;
const deleteAccount = accounts.remove;
const listAccountSnapshots = snapshots.list;
const saveAccountSnapshot = snapshots.save;
const deleteAccountSnapshot = snapshots.remove;
const listTrackedVideos = trackedVideos.list;
const saveTrackedVideo = trackedVideos.save;
const deleteTrackedVideo = trackedVideos.remove;
const listOptimizations = optimizations.list;
const saveOptimization = optimizations.save;
const deleteOptimization = optimizations.remove;
let knowledgeSeedChecked = false;
async function listKnowledge() {
  if (!knowledgeSeedChecked) {
    knowledgeSeedChecked = true;
    await enqueue(KNOWLEDGE_FILE, async () => {
      try {
        await promises.access(path.join(dataDir(), KNOWLEDGE_FILE));
      } catch {
        await writeJsonFileAtomic(KNOWLEDGE_FILE, buildSeedKnowledge());
      }
    }).catch(() => {
    });
  }
  return knowledge.list();
}
const saveKnowledgeEntry = knowledge.save;
const deleteKnowledgeEntry = knowledge.remove;
const MAX_TOKENS = 8192;
const WORDS_PER_SECOND = 2.4;
const scriptSectionSchema = zod.z.object({
  heading: zod.z.string(),
  text: zod.z.string(),
  // Tolerate a missing/invalid visualHint instead of failing the whole parse.
  visualHint: zod.z.string().catch("")
});
const videoScriptSchema = zod.z.object({
  hook: zod.z.string(),
  sections: zod.z.array(scriptSectionSchema),
  cta: zod.z.string(),
  fullText: zod.z.string().catch(""),
  titleIdeas: zod.z.array(zod.z.string()).catch([])
});
function buildSystemPrompt(niche, request) {
  const targetWords = Math.max(20, Math.round(request.targetLengthSec * WORDS_PER_SECOND));
  const language = niche.language || "Deutsch";
  const lines = [
    "You are an expert scriptwriter for faceless online videos (YouTube, TikTok, Instagram Reels).",
    "You write scripts that are spoken word-for-word by a voiceover artist.",
    "",
    "## Niche",
    `Name: ${niche.name}`
  ];
  if (niche.description) lines.push(`Description: ${niche.description}`);
  lines.push(`Language: ${language}`);
  if (niche.knowledgeBase) {
    lines.push("", "## Knowledge base (use this as factual grounding)", niche.knowledgeBase);
  }
  if (niche.styleNotes) {
    lines.push("", "## Style notes for this niche", niche.styleNotes);
  }
  lines.push("", "## Format rules");
  if (request.format === "shortform") {
    lines.push(
      "- Shortform (vertical video, e.g. YouTube Shorts/TikTok/Reels).",
      "- The hook must grab attention within the first 3 seconds — no greetings, no intro.",
      "- High pacing: short sentences, no filler words, constant forward momentum.",
      "- Exactly ONE core idea for the whole video.",
      "- End with a short, natural call to action (CTA)."
    );
  } else {
    lines.push(
      "- Longform (horizontal YouTube video).",
      "- Structure: a strong intro (the hook), then clearly separated chapters (sections), then an outro.",
      "- Each section covers one sub-topic with a clear heading and flowing spoken text.",
      "- End with an outro including a call to action (CTA)."
    );
  }
  lines.push(
    "",
    "## Length",
    `Target length: about ${request.targetLengthSec} seconds of spoken audio.`,
    `At a realistic speaking pace of about ${WORDS_PER_SECOND} words per second this is roughly ${targetWords} words in total (hook + sections + CTA). Match this length closely.`
  );
  if (request.extraInstructions) {
    lines.push("", "## Extra instructions from the user", request.extraInstructions);
  }
  if (request.referenceNotes) {
    lines.push("", "## Reference notes (style/structure of reference videos)", request.referenceNotes);
  }
  lines.push(
    "",
    "## Output format (STRICT)",
    `All spoken text (hook, section texts, cta, fullText) MUST be written in: ${language}.`,
    "Respond with ONLY a single JSON object — no markdown code fences, no commentary, no text before or after it.",
    "The JSON object must have exactly this shape:",
    "{",
    '  "hook": "spoken opening line(s)",',
    '  "sections": [',
    '    { "heading": "short section heading", "text": "spoken text of this section", "visualHint": "what should be shown on screen" }',
    "  ],",
    '  "cta": "spoken call to action",',
    '  "fullText": "the complete spoken script: hook + all section texts + cta",',
    '  "titleIdeas": ["video title idea 1", "video title idea 2", "video title idea 3"]',
    "}"
  );
  return lines.join("\n");
}
function buildUserPrompt(request) {
  return [
    `Thema: ${request.topic}`,
    `Format: ${request.format}`,
    `Ziel-Länge: ${request.targetLengthSec} Sekunden`,
    "",
    "Erstelle jetzt das Videoskript. Antworte NUR mit dem JSON-Objekt."
  ].join("\n");
}
function extractText(response) {
  return response.content.filter((block) => block.type === "text").map((block) => block.text).join("\n").trim();
}
function stripJsonFences(text) {
  let candidate = text.trim();
  const fenced = candidate.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i);
  if (fenced && typeof fenced[1] === "string") {
    candidate = fenced[1].trim();
  }
  return candidate;
}
function parseVideoScript(rawText) {
  const candidate = stripJsonFences(rawText);
  let data;
  try {
    data = JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first < 0 || last <= first) {
      throw new Error("Die Antwort enthielt kein JSON-Objekt.");
    }
    data = JSON.parse(candidate.slice(first, last + 1));
  }
  const result = videoScriptSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(`JSON entspricht nicht dem Skript-Schema: ${issues}`);
  }
  return result.data;
}
function finalizeScript(script) {
  if (!script.fullText.trim()) {
    const parts = [script.hook, ...script.sections.map((s) => s.text), script.cta];
    script.fullText = parts.filter((part) => part && part.trim()).join("\n\n");
  }
  return script;
}
function mapApiError(err, model) {
  if (err instanceof Anthropic.AuthenticationError) {
    return new Error(
      "Der Anthropic-API-Key ist ungültig oder abgelaufen. Bitte überprüfe ihn in den Einstellungen."
    );
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new Error(
      "Das Anthropic-Rate-Limit wurde erreicht. Bitte warte einen Moment und versuche es erneut."
    );
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new Error(
      `Das Modell "${model}" wurde nicht gefunden. Bitte überprüfe das Skript-Modell in den Einstellungen.`
    );
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new Error(
      "Keine Verbindung zur Claude-API möglich. Bitte überprüfe deine Internetverbindung."
    );
  }
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === "number" ? ` (HTTP ${err.status})` : "";
    return new Error(`Die Anfrage an die Claude-API ist fehlgeschlagen${status}. Bitte versuche es erneut.`);
  }
  return err instanceof Error ? err : new Error(String(err));
}
async function generateScript(request) {
  const settings = await getSettings();
  if (!settings.anthropicApiKey) {
    throw new Error("Kein Anthropic-API-Key hinterlegt. Bitte trage ihn in den Einstellungen ein.");
  }
  const niches = await listNiches();
  const niche = niches.find((n) => n.id === request.nicheId);
  if (!niche) {
    throw new Error("Die gewählte Nische wurde nicht gefunden. Bitte lege sie erneut an.");
  }
  const client = new Anthropic({ apiKey: settings.anthropicApiKey });
  const model = settings.scriptModel || DEFAULT_SCRIPT_MODEL;
  const system = buildSystemPrompt(niche, request);
  const messages = [{ role: "user", content: buildUserPrompt(request) }];
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response;
    try {
      response = await client.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system,
        messages
      });
    } catch (err) {
      throw mapApiError(err, model);
    }
    if (response.stop_reason === "refusal") {
      throw new Error(
        "Die Skript-Erstellung wurde vom Modell abgelehnt. Bitte formuliere das Thema um."
      );
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error(
        "Das Skript ist zu lang für eine einzelne Antwort. Bitte reduziere die Ziel-Länge oder teile das Thema in mehrere Videos auf."
      );
    }
    const text = extractText(response);
    try {
      return finalizeScript(parseVideoScript(text));
    } catch (parseErr) {
      if (attempt >= maxAttempts) break;
      const reason = parseErr instanceof Error ? parseErr.message : String(parseErr);
      messages.push({ role: "assistant", content: text || "(leere Antwort)" });
      messages.push({
        role: "user",
        content: `Deine Antwort war kein gültiges JSON im geforderten Format. Fehler: ${reason}
Antworte erneut und gib AUSSCHLIESSLICH das JSON-Objekt im geforderten Schema zurück — ohne Markdown-Zäune, ohne Kommentar.`
      });
    }
  }
  throw new Error(
    "Die Antwort des Modells konnte nicht als Skript gelesen werden. Bitte versuche es erneut."
  );
}
class CancelledError extends Error {
  constructor() {
    super("Render abgebrochen.");
    this.name = "CancelledError";
  }
}
function throwIfCancelled(job) {
  if (job.cancelled) throw new CancelledError();
}
function resolveUnpacked(binaryPath) {
  return binaryPath.includes("app.asar") ? binaryPath.replace("app.asar", "app.asar.unpacked") : binaryPath;
}
function getFfmpegPath() {
  if (!ffmpegStaticPath) {
    throw new Error("FFmpeg wurde nicht gefunden. Bitte die Anwendung neu installieren.");
  }
  return resolveUnpacked(ffmpegStaticPath);
}
function getFfprobePath() {
  const probePath = ffprobeStatic.path;
  if (!probePath) {
    throw new Error("FFprobe wurde nicht gefunden. Bitte die Anwendung neu installieren.");
  }
  return resolveUnpacked(probePath);
}
function lastStderrLines(stderr, maxLines = 3) {
  const lines = stderr.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  return lines.slice(-maxLines).join(" | ");
}
function parseOutTimeSec(line) {
  if (line.startsWith("out_time_us=") || line.startsWith("out_time_ms=")) {
    const raw = line.slice(line.indexOf("=") + 1).trim();
    const micros = Number(raw);
    if (!Number.isFinite(micros) || micros < 0) return null;
    return micros / 1e6;
  }
  if (line.startsWith("out_time=")) {
    const match = /^out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line);
    if (!match) return null;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  }
  return null;
}
function runFfmpeg(job, args, options = {}) {
  if (job.cancelled) return Promise.reject(new CancelledError());
  const ffmpegPath = getFfmpegPath();
  return new Promise((resolve, reject) => {
    const proc = node_child_process.spawn(
      ffmpegPath,
      ["-hide_banner", "-nostdin", "-loglevel", "error", "-progress", "pipe:1", "-y", ...args],
      { cwd: options.cwd, windowsHide: true }
    );
    job.currentProc = proc;
    let stdoutBuffer = "";
    let stderrTail = "";
    proc.stdout?.on("data", (chunk) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      if (!options.onTimeSec) return;
      for (const line of lines) {
        const seconds = parseOutTimeSec(line.trim());
        if (seconds !== null) options.onTimeSec(seconds);
      }
    });
    proc.stderr?.on("data", (chunk) => {
      stderrTail = (stderrTail + chunk.toString("utf8")).slice(-4e3);
    });
    proc.on("error", (err) => {
      job.currentProc = null;
      reject(new Error(`FFmpeg konnte nicht gestartet werden: ${err.message}`));
    });
    proc.on("close", (code) => {
      job.currentProc = null;
      if (job.cancelled) {
        reject(new CancelledError());
      } else if (code === 0) {
        resolve();
      } else {
        const detail = lastStderrLines(stderrTail);
        reject(
          new Error(
            `FFmpeg ist fehlgeschlagen (Code ${code ?? "?"})${detail ? `: ${detail}` : "."}`
          )
        );
      }
    });
  });
}
const PROBE_TIMEOUT_MS = 15e3;
function runCapture(binaryPath, args) {
  return new Promise((resolve, reject) => {
    const proc = node_child_process.spawn(binaryPath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(
        new Error("Die Datei-Analyse hat zu lange gedauert und wurde abgebrochen.")
      );
    }, PROBE_TIMEOUT_MS);
    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    proc.stderr?.on("data", (chunk) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-2e3);
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`FFprobe konnte nicht gestartet werden: ${err.message}`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`FFprobe ist fehlgeschlagen: ${lastStderrLines(stderr)}`));
    });
  });
}
async function probeViaFfprobe(filePath) {
  const stdout = await runCapture(getFfprobePath(), [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    filePath
  ]);
  const parsed = JSON.parse(stdout);
  const info = {};
  const rawDuration = parsed.format?.duration ?? parsed.streams?.find((s) => typeof s.duration === "string")?.duration;
  const duration = Number(rawDuration);
  if (Number.isFinite(duration) && duration > 0) info.durationSec = duration;
  const video = parsed.streams?.find(
    (s) => s.codec_type === "video" && typeof s.width === "number" && s.width > 0 && typeof s.height === "number" && s.height > 0
  );
  if (video) {
    info.width = video.width;
    info.height = video.height;
  }
  return info;
}
function captureFfmpegBanner(filePath) {
  const ffmpegPath = getFfmpegPath();
  return new Promise((resolve, reject) => {
    const proc = node_child_process.spawn(ffmpegPath, ["-hide_banner", "-nostdin", "-i", filePath], {
      windowsHide: true
    });
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(
        new Error("Die Datei-Analyse hat zu lange gedauert und wurde abgebrochen.")
      );
    }, PROBE_TIMEOUT_MS);
    proc.stderr?.on("data", (chunk) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-2e4);
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`FFmpeg konnte nicht gestartet werden: ${err.message}`));
    });
    proc.on("close", () => {
      clearTimeout(timer);
      resolve(stderr);
    });
  });
}
function parseFfmpegBanner(stderr) {
  const info = {};
  const durationMatch = /Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(stderr);
  if (durationMatch) {
    const seconds = Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]);
    if (Number.isFinite(seconds) && seconds > 0) info.durationSec = seconds;
  }
  const videoLine = stderr.split("\n").find((line) => /Stream #\d+:\d+.*Video:/.test(line));
  if (videoLine) {
    const dims = /,\s*(\d{2,5})x(\d{2,5})(?=[\s,[])/.exec(videoLine);
    if (dims) {
      info.width = Number(dims[1]);
      info.height = Number(dims[2]);
    }
  }
  return info;
}
async function probeMediaInfo(filePath) {
  try {
    return await probeViaFfprobe(filePath);
  } catch {
  }
  return parseFfmpegBanner(await captureFfmpegBanner(filePath));
}
async function probeDurationSec(filePath) {
  const info = await probeMediaInfo(filePath);
  if (info.durationSec === void 0) {
    throw new Error(`Die Dauer von „${path.basename(filePath)}“ konnte nicht ermittelt werden.`);
  }
  return info.durationSec;
}
const IMAGE_EXTENSIONS$1 = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "webp"]);
const AUDIO_EXTENSIONS$1 = /* @__PURE__ */ new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac"]);
function deriveKind(filePath, kindHint) {
  if (kindHint) return kindHint;
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (IMAGE_EXTENSIONS$1.has(ext)) return "image";
  if (AUDIO_EXTENSIONS$1.has(ext)) return "voiceover";
  return "video";
}
async function probeFiles(paths, kindHint) {
  const assets = [];
  for (const filePath of paths) {
    const asset = {
      id: node_crypto.randomUUID(),
      kind: deriveKind(filePath, kindHint),
      path: filePath,
      fileName: path.basename(filePath)
    };
    try {
      const info = await probeMediaInfo(filePath);
      if (asset.kind !== "image" && info.durationSec !== void 0) {
        asset.durationSec = info.durationSec;
      }
      if (info.width !== void 0 && info.height !== void 0) {
        asset.width = info.width;
        asset.height = info.height;
      }
    } catch {
    }
    assets.push(asset);
  }
  return assets;
}
const VIDEO_EXTENSIONS$1 = /* @__PURE__ */ new Set(["mp4", "mov", "webm", "mkv", "avi"]);
const MIN_SHOT_SEC = 0.5;
const MAX_SHOT_SEC = 15;
const MIN_MEANINGFUL_GAP_SEC = 0.1;
function isVideoFile(filePath) {
  return VIDEO_EXTENSIONS$1.has(path.extname(filePath).slice(1).toLowerCase());
}
function cloneDefaultProfile() {
  return {
    ...DEFAULT_STYLE_PROFILE,
    captions: { ...DEFAULT_STYLE_PROFILE.captions }
  };
}
function clamp$1(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}
function detectShotLengths(binary, referencePath) {
  return new Promise((resolve, reject) => {
    const child = node_child_process.spawn(
      binary,
      [
        "-hide_banner",
        "-i",
        referencePath,
        "-vf",
        "select='gt(scene,0.3)',showinfo",
        "-f",
        "null",
        "-"
      ],
      { windowsHide: true }
    );
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      const times = [];
      const pattern = /pts_time:\s*([0-9]+(?:\.[0-9]+)?)/g;
      let match;
      while ((match = pattern.exec(stderr)) !== null) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) times.push(value);
      }
      times.sort((a, b) => a - b);
      const lengths = [];
      let previous = 0;
      for (const time of times) {
        const gap = time - previous;
        if (gap >= MIN_MEANINGFUL_GAP_SEC) {
          lengths.push(gap);
          previous = time;
        }
      }
      resolve(lengths);
    });
  });
}
function applyShotStats(profile, lengths) {
  if (lengths.length === 0) return;
  const med = clamp$1(median(lengths), MIN_SHOT_SEC, MAX_SHOT_SEC);
  const min = clamp$1(Math.min(...lengths), MIN_SHOT_SEC, MAX_SHOT_SEC);
  const max = clamp$1(Math.max(...lengths), MIN_SHOT_SEC, MAX_SHOT_SEC);
  profile.minShotSec = Math.min(min, med);
  profile.medianShotSec = med;
  profile.maxShotSec = Math.max(max, med);
}
function applyPromptHeuristics(profile, stylePrompt) {
  const prompt = stylePrompt.toLowerCase();
  if (!prompt.trim()) return;
  const has = (...needles) => needles.some((n) => prompt.includes(n));
  if (has("schnell")) {
    profile.medianShotSec = clamp$1(profile.medianShotSec * 0.6, MIN_SHOT_SEC, MAX_SHOT_SEC);
    profile.minShotSec = clamp$1(profile.minShotSec * 0.6, MIN_SHOT_SEC, profile.medianShotSec);
    profile.maxShotSec = clamp$1(profile.maxShotSec * 0.6, profile.medianShotSec, MAX_SHOT_SEC);
  }
  if (has("langsam", "ruhig")) {
    profile.medianShotSec = clamp$1(profile.medianShotSec * 1.5, MIN_SHOT_SEC, MAX_SHOT_SEC);
    profile.minShotSec = clamp$1(profile.minShotSec * 1.5, MIN_SHOT_SEC, profile.medianShotSec);
    profile.maxShotSec = clamp$1(profile.maxShotSec * 1.5, profile.medianShotSec, MAX_SHOT_SEC);
  }
  if (has("keine untertitel", "keine captions", "ohne untertitel", "ohne captions")) {
    profile.captions.enabled = false;
  }
  if (has("fade", "übergänge weich", "weiche übergänge", "weicher übergang")) {
    profile.transition = "fade";
  }
  if (has("harte schnitte", "harter schnitt")) {
    profile.transition = "cut";
  }
  if (has("kein zoom", "ohne zoom", "keinen zoom", "nicht zoomen")) {
    profile.zoomEffect = false;
  }
  if (has("keyframe")) {
    profile.zoomEffect = true;
  }
  const lastMention = (...needles) => Math.max(...needles.map((n) => prompt.lastIndexOf(n)));
  const outAt = lastMention("zoom raus", "rauszoomen", "zoom out", "zoom-out");
  const inAt = lastMention("zoom rein", "reinzoomen", "zoom in", "zoom-in");
  const altMatch = /abwechselnd[^.!\n]{0,40}zoom|zoom[^.!\n]{0,40}abwechselnd/.exec(prompt);
  const altAt = altMatch ? altMatch.index : -1;
  const bestAt = Math.max(outAt, inAt, altAt);
  if (bestAt >= 0) {
    profile.zoomMode = bestAt === altAt ? "alternating" : bestAt === inAt ? "in" : "out";
  }
  if (has("stark zoomen", "starker zoom")) {
    profile.zoomIntensity = 1.14;
  }
  if (has("leichter zoom", "subtiler zoom", "dezenter zoom")) {
    profile.zoomIntensity = 1.04;
  }
  if (has("musik leise", "leise musik")) {
    profile.musicVolumeDb = -24;
  }
  if (has("musik laut", "laute musik")) {
    profile.musicVolumeDb = -12;
  }
}
async function analyzeStyle(request) {
  const profile = cloneDefaultProfile();
  const referencePaths = Array.isArray(request.referencePaths) ? request.referencePaths : [];
  const videoRefs = referencePaths.filter(isVideoFile);
  if (videoRefs.length > 0) {
    const ffmpegPath = getFfmpegPath();
    const allLengths = [];
    for (const ref of videoRefs) {
      try {
        allLengths.push(...await detectShotLengths(ffmpegPath, ref));
      } catch {
      }
    }
    applyShotStats(profile, allLengths);
  }
  applyPromptHeuristics(profile, request.stylePrompt || "");
  profile.notes = request.stylePrompt || "";
  return profile;
}
const VARIATION_PATTERN = [1, 0.82, 1.18, 0.68, 1.3, 0.9, 1.12, 0.75];
const MIN_SLOT_SEC = 0.4;
const MAX_SLOTS = 1200;
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function planTimeline(visualAssets, styleProfile, format, voiceoverDurationSec, targetLengthSec) {
  const usable = visualAssets.filter(
    (a) => a.kind === "image" || a.kind === "video" && (a.durationSec ?? 0) >= MIN_SLOT_SEC
  );
  if (usable.length === 0) {
    throw new Error(
      "Kein verwendbares Bild- oder Videomaterial vorhanden. Bitte Material hinzufügen."
    );
  }
  const preset = FORMAT_PRESETS[format];
  const minShot = Math.max(
    MIN_SLOT_SEC,
    Math.min(styleProfile.minShotSec, styleProfile.maxShotSec)
  );
  const maxShot = Math.max(minShot, styleProfile.maxShotSec);
  const median2 = clamp(styleProfile.medianShotSec, minShot, maxShot);
  let totalDurationSec;
  if (voiceoverDurationSec !== null && voiceoverDurationSec > 0) {
    totalDurationSec = voiceoverDurationSec;
  } else if (targetLengthSec !== void 0 && targetLengthSec > 0) {
    totalDurationSec = targetLengthSec;
  } else {
    const videoSum = usable.reduce(
      (acc, a) => acc + (a.kind === "video" ? a.durationSec ?? 0 : 0),
      0
    );
    totalDurationSec = videoSum > 0 ? videoSum : preset.defaultLengthSec;
  }
  const slots = [];
  const consumedByAsset = /* @__PURE__ */ new Map();
  let remaining = totalDurationSec;
  let assetIndex = 0;
  while (remaining > 0.05 && slots.length < MAX_SLOTS) {
    const asset = usable[assetIndex % usable.length];
    assetIndex++;
    const factor = VARIATION_PATTERN[slots.length % VARIATION_PATTERN.length];
    let duration = clamp(median2 * factor, minShot, maxShot);
    let sourceStartSec = 0;
    if (asset.kind === "video" && asset.durationSec) {
      let offset = consumedByAsset.get(asset.id) ?? 0;
      if (asset.durationSec - offset < MIN_SLOT_SEC) offset = 0;
      sourceStartSec = offset;
      duration = Math.min(duration, asset.durationSec - offset);
    }
    duration = Math.min(duration, remaining);
    if (duration < 0.25) {
      const last = slots[slots.length - 1];
      if (last) {
        let extension = remaining;
        if (last.asset.kind === "video" && last.asset.durationSec) {
          extension = Math.min(
            extension,
            Math.max(0, last.asset.durationSec - last.sourceStartSec - last.durationSec)
          );
        }
        last.durationSec += extension;
      }
      remaining = 0;
      break;
    }
    slots.push({ asset, durationSec: duration, sourceStartSec });
    if (asset.kind === "video") {
      consumedByAsset.set(asset.id, sourceStartSec + duration);
    }
    remaining -= duration;
  }
  if (slots.length === 0) {
    throw new Error("Die Timeline konnte nicht geplant werden (zu wenig Material).");
  }
  return { slots, totalDurationSec };
}
const MIN_CHUNK_SEC = 0.35;
async function transcribeWithWhisper(apiKey, filePath) {
  try {
    const client = new OpenAI({ apiKey });
    const result = await client.audio.transcriptions.create({
      file: node_fs.createReadStream(filePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"]
    });
    const words = result.words;
    if (!Array.isArray(words)) return null;
    const timings = words.filter(
      (w) => typeof w.word === "string" && typeof w.start === "number" && typeof w.end === "number"
    ).map((w) => ({
      word: w.word.trim(),
      startSec: Math.max(0, w.start),
      endSec: Math.max(w.end, w.start)
    })).filter((w) => w.word.length > 0);
    return timings.length > 0 ? timings : null;
  } catch {
    return null;
  }
}
function distributeWordsProportionally(fullText, durationSec) {
  const words = fullText.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0 || durationSec <= 0) return [];
  const weights = words.map((w) => w.length + 2);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const timings = [];
  let cursor = 0;
  for (let i = 0; i < words.length; i++) {
    const wordDuration = durationSec * weights[i] / totalWeight;
    timings.push({ word: words[i], startSec: cursor, endSec: cursor + wordDuration });
    cursor += wordDuration;
  }
  return timings;
}
function chunkWords(words, maxWordsPerLine) {
  const perLine = Math.max(1, Math.floor(maxWordsPerLine) || 1);
  const chunks = [];
  for (let i = 0; i < words.length; i += perLine) {
    const group = words.slice(i, i + perLine);
    const first = group[0];
    const last = group[group.length - 1];
    chunks.push({
      text: group.map((w) => w.word).join(" "),
      startSec: first.startSec,
      endSec: Math.max(last.endSec, first.startSec + MIN_CHUNK_SEC)
    });
  }
  for (let i = 0; i < chunks.length - 1; i++) {
    const current = chunks[i];
    const next = chunks[i + 1];
    if (current.endSec > next.startSec) {
      current.endSec = Math.max(next.startSec, current.startSec + 0.15);
      if (current.endSec > next.startSec) {
        next.startSec = current.endSec;
        if (next.endSec < next.startSec) next.endSec = next.startSec;
      }
    }
  }
  return chunks;
}
async function buildCaptions(options) {
  let words = [];
  const apiKey = options.openaiApiKey?.trim();
  if (apiKey && options.voiceoverPath) {
    const transcribed = await transcribeWithWhisper(apiKey, options.voiceoverPath);
    if (transcribed === null) {
      options.onTranscriptionFailed?.();
    }
    words = transcribed ?? [];
  }
  if (words.length === 0 && options.scriptFullText && options.scriptFullText.trim()) {
    const timingBaseSec = options.voiceoverDurationSec ?? options.totalDurationSec;
    words = distributeWordsProportionally(options.scriptFullText, timingBaseSec);
  }
  if (words.length === 0) return [];
  return chunkWords(words, options.maxWordsPerLine);
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatAssTime(seconds) {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor(total % 3600 / 60);
  const s = Math.floor(total % 60);
  const cs = Math.min(99, Math.floor((total - Math.floor(total)) * 100));
  return `${h}:${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
}
function hexToAssColor(hex) {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  const value = match ? match[1] : "FFFFFF";
  const r = value.slice(0, 2);
  const g = value.slice(2, 4);
  const b = value.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}
function sanitizeAssText(text) {
  return text.replace(/[{}]/g, " ").replace(/\\/g, "/").replace(/\s+/g, " ").trim();
}
function buildAssContent(chunks, style, width, height) {
  const scale = width / 1080;
  const fontSize = Math.max(12, Math.round(style.fontSize * scale));
  const alignment = style.position === "center" ? 5 : 2;
  const marginV = style.position === "center" ? 0 : Math.round(height * 0.12);
  const marginH = Math.round(width * 0.05);
  const outline = Math.max(2, Math.round(fontSize * 0.08));
  const fontName = style.fontFamily.replace(/,/g, " ").trim() || "Arial";
  const primary = hexToAssColor(style.primaryColor);
  const secondary = hexToAssColor(style.highlightColor);
  const events = chunks.map((chunk) => {
    let text = sanitizeAssText(chunk.text);
    if (style.uppercase) text = text.toUpperCase();
    return `Dialogue: 0,${formatAssTime(chunk.startSec)},${formatAssTime(chunk.endSec)},Default,,0,0,0,,${text}`;
  });
  return [
    "[Script Info]",
    "; CutPilot - generated captions",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${fontName},${fontSize},${primary},${secondary},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,${outline},1,${alignment},${marginH},${marginH},${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    ""
  ].join("\n");
}
function escapeSubtitlesFilterPath(filePath) {
  const filterLevel = filePath.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
  return filterLevel.replace(/[\\'[\],;:]/g, (c) => `\\${c}`);
}
const PCT = {
  preparingStart: 0,
  transcribingStart: 5,
  timelineStart: 15,
  pass1Start: 20,
  pass1End: 75,
  pass2End: 90,
  done: 100
};
const ASS_FILE = "captions.ass";
const CONCAT_FILE = "concat.txt";
const FINAL_FILE = "final.mp4";
const ZOOM_INTENSITY_MIN = 1.02;
const ZOOM_INTENSITY_MAX = 1.2;
const ZOOM_MODE_FALLBACK = "alternating";
const ZOOM_INTENSITY_FALLBACK = 1.08;
function resolveZoomSettings(profile) {
  const rawIntensity = profile.zoomIntensity ?? ZOOM_INTENSITY_FALLBACK;
  const intensity = Number.isFinite(rawIntensity) ? Math.min(ZOOM_INTENSITY_MAX, Math.max(ZOOM_INTENSITY_MIN, rawIntensity)) : ZOOM_INTENSITY_FALLBACK;
  return {
    enabled: profile.zoomEffect,
    mode: profile.zoomMode ?? ZOOM_MODE_FALLBACK,
    intensity
  };
}
const jobs = /* @__PURE__ */ new Map();
async function startRender(spec, onProgress) {
  const jobId = node_crypto.randomUUID();
  const job = { id: jobId, cancelled: false, currentProc: null };
  jobs.set(jobId, job);
  setImmediate(() => {
    void runJob(job, spec, onProgress);
  });
  return jobId;
}
function cancelRender(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.cancelled = true;
  const proc = job.currentProc;
  if (proc && proc.exitCode === null && !proc.killed) {
    try {
      proc.kill("SIGKILL");
    } catch {
    }
  }
}
async function runJob(job, spec, onProgress) {
  const preset = FORMAT_PRESETS[spec.format];
  const tempDir = path.join(electron.app.getPath("temp"), "autocut-studio", job.id);
  let lastPercent = 0;
  let lastPhase = "";
  let lastMessage = "";
  const emit = (phase, percent, message, extra) => {
    const rounded = Math.max(0, Math.min(100, Math.round(percent)));
    lastPercent = rounded;
    lastPhase = phase;
    lastMessage = message;
    onProgress({
      jobId: job.id,
      projectId: spec.projectId,
      phase,
      percent: rounded,
      message,
      ...extra
    });
  };
  const tick = (phase, percent, message) => {
    const rounded = Math.max(0, Math.min(100, Math.round(percent)));
    if (phase === lastPhase && rounded === lastPercent && message === lastMessage) return;
    emit(phase, rounded, message);
  };
  try {
    emit("preparing", PCT.preparingStart, "Bereite Material vor …");
    getFfmpegPath();
    await promises.mkdir(tempDir, { recursive: true });
    throwIfCancelled(job);
    const { visuals, voiceoverDurationSec } = await prepareAssets(
      job,
      spec,
      (fraction) => tick(
        "preparing",
        PCT.preparingStart + fraction * (PCT.transcribingStart - PCT.preparingStart),
        "Bereite Material vor …"
      )
    );
    throwIfCancelled(job);
    const plan = planTimeline(
      visuals,
      spec.styleProfile,
      spec.format,
      voiceoverDurationSec,
      spec.targetLengthSec
    );
    let captionChunks = [];
    let captionWarning = false;
    if (spec.styleProfile.captions.enabled) {
      emit("transcribing", PCT.transcribingStart, "Erstelle Untertitel …");
      captionChunks = await buildCaptions({
        openaiApiKey: spec.openaiApiKey,
        voiceoverPath: spec.voiceover?.path ?? null,
        voiceoverDurationSec,
        scriptFullText: spec.scriptText?.trim() ? spec.scriptText : null,
        totalDurationSec: plan.totalDurationSec,
        maxWordsPerLine: spec.styleProfile.captions.maxWordsPerLine,
        onTranscriptionFailed: () => {
          captionWarning = true;
          emit(
            "transcribing",
            PCT.transcribingStart,
            "Whisper-Transkription fehlgeschlagen — Untertitel werden näherungsweise verteilt."
          );
        }
      });
      throwIfCancelled(job);
    }
    let assFileName = null;
    if (captionChunks.length > 0) {
      assFileName = ASS_FILE;
      const assContent = buildAssContent(
        captionChunks,
        spec.styleProfile.captions,
        preset.width,
        preset.height
      );
      await promises.writeFile(path.join(tempDir, assFileName), assContent, "utf8");
    }
    throwIfCancelled(job);
    emit("timeline", PCT.timelineStart, `Plane Timeline … (${plan.slots.length} Szenen)`);
    if (spec.styleProfile.transition === "fade") {
      emit("timeline", PCT.timelineStart + 2, "Übergänge: Schnitt (Fade folgt in einem Update)");
    }
    const totalSec = plan.totalDurationSec;
    const zoomSettings = resolveZoomSettings(spec.styleProfile);
    let doneSec = 0;
    let imageSlotCount = 0;
    for (let i = 0; i < plan.slots.length; i++) {
      throwIfCancelled(job);
      const slot = plan.slots[i];
      const zoomIndex = slot.asset.kind === "image" ? imageSlotCount++ : 0;
      const label = `Schneide Video … (Clip ${i + 1}/${plan.slots.length})`;
      tick("rendering", pass1Percent(doneSec, totalSec), label);
      await runFfmpeg(job, buildSlotArgs(slot, i, preset, zoomSettings, zoomIndex), {
        cwd: tempDir,
        onTimeSec: (t) => tick(
          "rendering",
          pass1Percent(doneSec + Math.min(t, slot.durationSec), totalSec),
          label
        )
      });
      doneSec += slot.durationSec;
    }
    throwIfCancelled(job);
    const concatContent = plan.slots.map((_, i) => `file '${slotFileName(i)}'`).join("\n") + "\n";
    await promises.writeFile(path.join(tempDir, CONCAT_FILE), concatContent, "utf8");
    const finalLabel = "Schneide Video … (finaler Export)";
    tick("rendering", PCT.pass1End, finalLabel);
    await runFfmpeg(job, buildFinalArgs(spec, preset, assFileName), {
      cwd: tempDir,
      onTimeSec: (t) => tick(
        "rendering",
        PCT.pass1End + Math.min(t / totalSec, 1) * (PCT.pass2End - PCT.pass1End),
        finalLabel
      )
    });
    throwIfCancelled(job);
    emit("finalizing", PCT.pass2End, "Finalisiere …");
    const outputPath = await resolveOutputPath(spec);
    await promises.copyFile(path.join(tempDir, FINAL_FILE), outputPath);
    const doneHint = captionWarning ? " Hinweis: Die Whisper-Transkription ist fehlgeschlagen — die Untertitel wurden näherungsweise verteilt." : "";
    emit("done", PCT.done, `Fertig! Gespeichert unter ${outputPath}${doneHint}`, { outputPath });
  } catch (err) {
    if (job.cancelled || err instanceof CancelledError) {
      emit("cancelled", lastPercent, "Render abgebrochen.");
    } else {
      const message = err instanceof Error ? err.message : String(err);
      emit("error", lastPercent, `Fehler beim Rendern: ${message}`, { error: message });
    }
  } finally {
    jobs.delete(job.id);
    await promises.rm(tempDir, { recursive: true, force: true }).catch(() => {
    });
  }
}
function pass1Percent(renderedSec, totalSec) {
  const fraction = totalSec > 0 ? Math.min(renderedSec / totalSec, 1) : 1;
  return PCT.pass1Start + fraction * (PCT.pass1End - PCT.pass1Start);
}
async function prepareAssets(job, spec, onStep) {
  const candidates = spec.assets.filter((a) => a.kind === "image" || a.kind === "video");
  const visuals = [];
  for (let i = 0; i < candidates.length; i++) {
    throwIfCancelled(job);
    const asset = candidates[i];
    if (asset.kind === "video" && !(asset.durationSec && asset.durationSec > 0)) {
      try {
        const durationSec = await probeDurationSec(asset.path);
        visuals.push({ ...asset, durationSec });
      } catch {
      }
    } else {
      visuals.push(asset);
    }
    onStep((i + 1) / candidates.length);
  }
  let voiceoverDurationSec = null;
  if (spec.voiceover) {
    throwIfCancelled(job);
    if (spec.voiceover.durationSec && spec.voiceover.durationSec > 0) {
      voiceoverDurationSec = spec.voiceover.durationSec;
    } else {
      try {
        voiceoverDurationSec = await probeDurationSec(spec.voiceover.path);
      } catch {
        throw new Error("Die Voiceover-Datei konnte nicht gelesen werden. Bitte Datei prüfen.");
      }
    }
  }
  return { visuals, voiceoverDurationSec };
}
function slotFileName(index) {
  return `slot-${String(index + 1).padStart(4, "0")}.mp4`;
}
function buildSlotArgs(slot, index, preset, zoom, zoomIndex) {
  const { width, height, fps } = preset;
  const durationStr = slot.durationSec.toFixed(3);
  const output = slotFileName(index);
  const encode = ["-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18"];
  if (slot.asset.kind === "image") {
    let filter2;
    if (zoom.enabled) {
      const frames = Math.max(2, Math.round(slot.durationSec * fps));
      const zoomIn = zoom.mode === "in" || zoom.mode === "alternating" && zoomIndex % 2 === 0;
      const span = (zoom.intensity - 1).toFixed(4);
      const zoomExpr = zoomIn ? `1+${span}*in/${frames}` : `${zoom.intensity.toFixed(4)}-${span}*in/${frames}`;
      filter2 = [
        `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase`,
        `crop=${width * 2}:${height * 2}`,
        `zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps}`,
        "setsar=1",
        `fps=${fps}`,
        "format=yuv420p"
      ].join(",");
    } else {
      filter2 = [
        `scale=${width}:${height}:force_original_aspect_ratio=increase`,
        `crop=${width}:${height}`,
        "setsar=1",
        `fps=${fps}`,
        "format=yuv420p"
      ].join(",");
    }
    return [
      "-loop",
      "1",
      "-framerate",
      String(fps),
      "-t",
      durationStr,
      "-i",
      slot.asset.path,
      "-vf",
      filter2,
      ...encode,
      output
    ];
  }
  const filter = [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    "setsar=1",
    `fps=${fps}`,
    "format=yuv420p"
  ].join(",");
  const args = [];
  if (slot.sourceStartSec > 0) {
    args.push("-ss", slot.sourceStartSec.toFixed(3));
  }
  args.push("-i", slot.asset.path, "-t", durationStr, "-vf", filter, ...encode, output);
  return args;
}
function buildFinalArgs(spec, preset, assFileName) {
  const args = ["-f", "concat", "-safe", "0", "-i", CONCAT_FILE];
  let inputIndex = 1;
  let voiceIndex = -1;
  let musicIndex = -1;
  if (spec.voiceover) {
    voiceIndex = inputIndex++;
    args.push("-i", spec.voiceover.path);
  }
  if (spec.music) {
    musicIndex = inputIndex++;
    args.push("-i", spec.music.path);
  }
  const videoChain = assFileName ? `subtitles=filename=${escapeSubtitlesFilterPath(assFileName)},format=yuv420p` : "format=yuv420p";
  const filterParts = [`[0:v]${videoChain}[vout]`];
  const musicVolume = `volume=${spec.styleProfile.musicVolumeDb}dB`;
  const hasAudio = voiceIndex > 0 || musicIndex > 0;
  if (voiceIndex > 0 && musicIndex > 0) {
    filterParts.push(
      `[${musicIndex}:a]${musicVolume}[mus]`,
      `[${voiceIndex}:a][mus]amix=inputs=2:duration=first:normalize=0[aout]`
    );
  } else if (voiceIndex > 0) {
    filterParts.push(`[${voiceIndex}:a]anull[aout]`);
  } else if (musicIndex > 0) {
    filterParts.push(`[${musicIndex}:a]${musicVolume},apad[aout]`);
  }
  args.push("-filter_complex", filterParts.join(";"), "-map", "[vout]");
  if (hasAudio) {
    args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "-shortest");
  } else {
    args.push("-an");
  }
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(preset.fps),
    "-movflags",
    "+faststart",
    FINAL_FILE
  );
  return args;
}
async function fileExists(filePath) {
  try {
    await promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}
function localDateStamp() {
  const d = /* @__PURE__ */ new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function slugify(value) {
  const map = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
  const slug = value.toLowerCase().replace(/[äöüß]/g, (c) => map[c] ?? c).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return slug || "video";
}
async function resolveOutputPath(spec) {
  const dir = spec.outputDir.trim() !== "" ? spec.outputDir.trim() : electron.app.getPath("videos");
  await promises.mkdir(dir, { recursive: true });
  const base = `${localDateStamp()}_${slugify(spec.title?.trim() || spec.projectId)}_${spec.format}`;
  let candidate = path.join(dir, `${base}.mp4`);
  let suffix = 2;
  while (await fileExists(candidate)) {
    candidate = path.join(dir, `${base}-${suffix}.mp4`);
    suffix++;
  }
  return candidate;
}
const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "ogg", "flac"];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "mkv", "avi"];
const FILE_FILTERS = {
  image: [{ name: "Bilder", extensions: IMAGE_EXTENSIONS }],
  video: [{ name: "Videos", extensions: VIDEO_EXTENSIONS }],
  voiceover: [{ name: "Audio", extensions: AUDIO_EXTENSIONS }],
  music: [{ name: "Audio", extensions: AUDIO_EXTENSIONS }],
  any: [
    {
      name: "Medien",
      extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS]
    }
  ]
};
function showOpenDialogFor(sender, options) {
  const win = electron.BrowserWindow.fromWebContents(sender);
  return win ? electron.dialog.showOpenDialog(win, options) : electron.dialog.showOpenDialog(options);
}
let handlersRegistered = false;
function registerIpcHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  electron.ipcMain.handle(IPC.settingsGet, () => getSettings());
  electron.ipcMain.handle(IPC.settingsSet, (_e, settings) => setSettings(settings));
  electron.ipcMain.handle(IPC.nichesList, () => listNiches());
  electron.ipcMain.handle(IPC.nichesSave, (_e, niche) => saveNiche(niche));
  electron.ipcMain.handle(IPC.nichesDelete, (_e, id) => deleteNiche(id));
  electron.ipcMain.handle(IPC.projectsList, () => listProjects());
  electron.ipcMain.handle(IPC.projectsSave, (_e, project) => saveProject(project));
  electron.ipcMain.handle(IPC.projectsDelete, (_e, id) => deleteProject(id));
  electron.ipcMain.handle(IPC.scriptGenerate, (_e, request) => generateScript(request));
  electron.ipcMain.handle(IPC.materialPick, async (event, kind) => {
    const result = await showOpenDialogFor(event.sender, {
      properties: ["openFile", "multiSelections"],
      filters: FILE_FILTERS[kind] ?? FILE_FILTERS.any
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return probeFiles(result.filePaths, kind === "any" ? void 0 : kind);
  });
  electron.ipcMain.handle(IPC.styleAnalyze, (_e, request) => analyzeStyle(request));
  electron.ipcMain.handle(
    IPC.renderStart,
    (_e, spec) => startRender(spec, (progress) => {
      for (const target of electron.BrowserWindow.getAllWindows()) {
        if (!target.isDestroyed()) target.webContents.send(IPC.renderProgress, progress);
      }
    })
  );
  electron.ipcMain.handle(IPC.renderCancel, (_e, jobId) => cancelRender(jobId));
  electron.ipcMain.handle(IPC.outputShow, (_e, path2) => {
    electron.shell.showItemInFolder(path2);
  });
  electron.ipcMain.handle(IPC.pickDirectory, async (event) => {
    const result = await showOpenDialogFor(event.sender, {
      properties: ["openDirectory", "createDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle(IPC.accountsList, () => listAccounts());
  electron.ipcMain.handle(IPC.accountsSave, (_e, account) => saveAccount(account));
  electron.ipcMain.handle(IPC.accountsDelete, (_e, id) => deleteAccount(id));
  electron.ipcMain.handle(IPC.snapshotsList, () => listAccountSnapshots());
  electron.ipcMain.handle(
    IPC.snapshotsSave,
    (_e, snapshot) => saveAccountSnapshot(snapshot)
  );
  electron.ipcMain.handle(IPC.snapshotsDelete, (_e, id) => deleteAccountSnapshot(id));
  electron.ipcMain.handle(IPC.trackedList, () => listTrackedVideos());
  electron.ipcMain.handle(IPC.trackedSave, (_e, video) => saveTrackedVideo(video));
  electron.ipcMain.handle(IPC.trackedDelete, (_e, id) => deleteTrackedVideo(id));
  electron.ipcMain.handle(IPC.optimizationsList, () => listOptimizations());
  electron.ipcMain.handle(
    IPC.optimizationsSave,
    (_e, optimization) => saveOptimization(optimization)
  );
  electron.ipcMain.handle(IPC.optimizationsDelete, (_e, id) => deleteOptimization(id));
  electron.ipcMain.handle(IPC.knowledgeList, () => listKnowledge());
  electron.ipcMain.handle(IPC.knowledgeSave, (_e, entry) => saveKnowledgeEntry(entry));
  electron.ipcMain.handle(IPC.knowledgeDelete, (_e, id) => deleteKnowledgeEntry(id));
}
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "CutPilot",
    backgroundColor: "#0a0705",
    webPreferences: {
      preload: path$1.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path$1.join(__dirname, "../renderer/index.html"));
  }
  return win;
}
electron.app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
