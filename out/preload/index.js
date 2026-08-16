"use strict";
const electron = require("electron");
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
const api = {
  getSettings: () => electron.ipcRenderer.invoke(IPC.settingsGet),
  setSettings: (settings) => electron.ipcRenderer.invoke(IPC.settingsSet, settings),
  listNiches: () => electron.ipcRenderer.invoke(IPC.nichesList),
  saveNiche: (niche) => electron.ipcRenderer.invoke(IPC.nichesSave, niche),
  deleteNiche: (id) => electron.ipcRenderer.invoke(IPC.nichesDelete, id),
  listProjects: () => electron.ipcRenderer.invoke(IPC.projectsList),
  saveProject: (project) => electron.ipcRenderer.invoke(IPC.projectsSave, project),
  deleteProject: (id) => electron.ipcRenderer.invoke(IPC.projectsDelete, id),
  generateScript: (request) => electron.ipcRenderer.invoke(IPC.scriptGenerate, request),
  pickMaterial: (kind) => electron.ipcRenderer.invoke(IPC.materialPick, kind),
  analyzeStyle: (request) => electron.ipcRenderer.invoke(IPC.styleAnalyze, request),
  startRender: (spec) => electron.ipcRenderer.invoke(IPC.renderStart, spec),
  cancelRender: (jobId) => electron.ipcRenderer.invoke(IPC.renderCancel, jobId),
  showOutput: (path) => electron.ipcRenderer.invoke(IPC.outputShow, path),
  pickDirectory: () => electron.ipcRenderer.invoke(IPC.pickDirectory),
  listAccounts: () => electron.ipcRenderer.invoke(IPC.accountsList),
  saveAccount: (account) => electron.ipcRenderer.invoke(IPC.accountsSave, account),
  deleteAccount: (id) => electron.ipcRenderer.invoke(IPC.accountsDelete, id),
  listAccountSnapshots: () => electron.ipcRenderer.invoke(IPC.snapshotsList),
  saveAccountSnapshot: (snapshot) => electron.ipcRenderer.invoke(IPC.snapshotsSave, snapshot),
  deleteAccountSnapshot: (id) => electron.ipcRenderer.invoke(IPC.snapshotsDelete, id),
  listTrackedVideos: () => electron.ipcRenderer.invoke(IPC.trackedList),
  saveTrackedVideo: (video) => electron.ipcRenderer.invoke(IPC.trackedSave, video),
  deleteTrackedVideo: (id) => electron.ipcRenderer.invoke(IPC.trackedDelete, id),
  listOptimizations: () => electron.ipcRenderer.invoke(IPC.optimizationsList),
  saveOptimization: (optimization) => electron.ipcRenderer.invoke(IPC.optimizationsSave, optimization),
  deleteOptimization: (id) => electron.ipcRenderer.invoke(IPC.optimizationsDelete, id),
  listKnowledge: () => electron.ipcRenderer.invoke(IPC.knowledgeList),
  saveKnowledgeEntry: (entry) => electron.ipcRenderer.invoke(IPC.knowledgeSave, entry),
  deleteKnowledgeEntry: (id) => electron.ipcRenderer.invoke(IPC.knowledgeDelete, id),
  onRenderProgress: (callback) => {
    const listener = (_event, progress) => {
      callback(progress);
    };
    electron.ipcRenderer.on(IPC.renderProgress, listener);
    return () => {
      electron.ipcRenderer.removeListener(IPC.renderProgress, listener);
    };
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
