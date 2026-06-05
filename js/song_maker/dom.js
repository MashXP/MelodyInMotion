export const dom = {
  songId: null,
  songTitle: null,
  songDesc: null,
  songBpm: null,
  songBpmVal: null,
  activeDuration: null,
  jsonTextarea: null,
  btnCopyJson: null,
  btnImportDialog: null,
  btnDownloadSong: null,
  btnPreviewPlay: null,
  btnPreviewStop: null,
  snapResolution: null,
  timelineLength: null,
  btnLoadSample: null,
  btnClearTimeline: null,
  rollScrollWrapper: null,
  rulerBeatsTimeline: null,
  pianoRollLabels: null,
  pianoRollTracks: null,
  pianoRollGrid: null,
  timelinePlayhead: null,
  timelineTotalNotes: null,
  btnExportGame: null,
  successModal: null,
  btnModalClose: null,
  modalSuccessMsg: null,
  importModal: null,
  importTextarea: null,
  btnImportCancel: null,
  btnImportConfirm: null
};

export function initDom() {
  dom.songId = document.getElementById("song-id");
  dom.songTitle = document.getElementById("song-title");
  dom.songDesc = document.getElementById("song-desc");
  dom.songBpm = document.getElementById("song-bpm");
  dom.songBpmVal = document.getElementById("song-bpm-val");
  dom.activeDuration = document.getElementById("active-duration");
  dom.jsonTextarea = document.getElementById("json-textarea");
  dom.btnCopyJson = document.getElementById("btn-copy-json");
  dom.btnImportDialog = document.getElementById("btn-import-dialog");
  dom.btnDownloadSong = document.getElementById("btn-download-song");
  dom.btnPreviewPlay = document.getElementById("btn-preview-play");
  dom.btnPreviewStop = document.getElementById("btn-preview-stop");
  dom.snapResolution = document.getElementById("snap-resolution");
  dom.timelineLength = document.getElementById("timeline-length");
  dom.btnLoadSample = document.getElementById("btn-load-sample");
  dom.btnClearTimeline = document.getElementById("btn-clear-timeline");
  dom.rollScrollWrapper = document.getElementById("roll-scroll-wrapper");
  dom.rulerBeatsTimeline = document.getElementById("ruler-beats-timeline");
  dom.pianoRollLabels = document.getElementById("piano-roll-labels");
  dom.pianoRollTracks = document.getElementById("piano-roll-tracks");
  dom.pianoRollGrid = document.getElementById("piano-roll-grid");
  dom.timelinePlayhead = document.getElementById("timeline-playhead");
  dom.timelineTotalNotes = document.getElementById("timeline-total-notes");
  dom.btnExportGame = document.getElementById("btn-export-game");
  dom.successModal = document.getElementById("success-modal");
  dom.btnModalClose = document.getElementById("btn-modal-close");
  dom.modalSuccessMsg = document.getElementById("modal-success-msg");
  dom.importModal = document.getElementById("import-modal");
  dom.importTextarea = document.getElementById("import-textarea");
  dom.btnImportCancel = document.getElementById("btn-import-cancel");
  dom.btnImportConfirm = document.getElementById("btn-import-confirm");
}
