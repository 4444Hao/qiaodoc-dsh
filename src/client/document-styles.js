// Shared by the plugin and the local visual preview.
export const DOCUMENT_STYLES = `
.qmr-doc-button{font:inherit;color:var(--dsw-alias-label-primary);background:transparent;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:6px;padding:5px 9px;cursor:pointer;white-space:nowrap}
.qmr-doc-button:hover{background:var(--dsw-alias-interactive-bg-hover,#eee)}
.qmr-doc-button:focus-visible{outline:2px solid var(--dsw-alias-label-secondary);outline-offset:2px}
.qmr-doc-button:disabled{opacity:.5;cursor:default}
.qmr-doc-trigger{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-color:#3b967577;background:var(--dsw-alias-bg-base,#fff);box-shadow:inset 0 0 0 999px #20a36a0b}
.qmr-doc-trigger:hover,.qmr-doc-trigger[aria-expanded=true]{background:var(--dsw-alias-bg-base,#fff);border-color:#42ac83;box-shadow:inset 0 0 0 999px #20a36a20}
.qmr-doc-menu{position:fixed;z-index:2000;display:flex;flex-wrap:wrap;align-items:center;gap:4px;box-sizing:border-box;max-width:calc(100vw - 16px);padding:6px;background:#123e35;color:#f0fff6;border:1px solid #65cba1;border-radius:12px;box-shadow:0 6px 24px #001d2540,0 0 0 1px #072d2333;font-size:14px;line-height:20px;color-scheme:dark}
.qmr-doc-brand{display:flex;align-items:center;padding:0 7px 0 1px;margin-right:2px;border-right:1px solid #65cba166;pointer-events:none}
.qmr-doc-menu .qmr-doc-button{border:0;border-radius:7px;min-height:34px;padding:7px 10px;color:#f0fff6;font-weight:550;background:transparent}
.qmr-doc-menu .qmr-doc-button:hover{background:#2b6252}
.qmr-doc-menu .qmr-doc-action-explain{background:#20563f}
.qmr-doc-menu .qmr-doc-action-translate{background:#c2f2d4;color:#123e35}
.qmr-doc-menu .qmr-doc-action-translate:hover{background:#e2ffe9}
.qmr-doc-menu .qmr-doc-button:focus-visible{outline:2px solid #fcd34d;outline-offset:1px}
.qmr-doc-menu .qmr-doc-button:disabled{opacity:.55;cursor:default}
@media(forced-colors:active){.qmr-doc-menu{background:Canvas;color:CanvasText;border-color:CanvasText;box-shadow:none}.qmr-doc-menu .qmr-doc-button{color:ButtonText;background:ButtonFace;border:1px solid ButtonText}.qmr-doc-brand{border-color:CanvasText}.qmr-doc-menu .qmr-doc-button:focus-visible{outline-color:Highlight}}
.qmr-doc-notice{position:fixed;z-index:2001;bottom:30px;right:24px;max-width:360px;padding:12px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#222);border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;font-size:13px}
.qmr-doc-picker{position:fixed;z-index:2000;right:24px;top:72px;box-sizing:border-box;width:min(390px,calc(100vw - 48px));padding:16px;border:1px solid #4fae8977;border-radius:12px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#222);box-shadow:0 8px 28px #001d2529;display:flex;flex-direction:column;gap:14px;font-size:13px;line-height:1.5}
.qmr-doc-picker-heading{display:flex;align-items:center;gap:8px}
.qmr-doc-picker-heading strong{flex:1;font-size:14px}
.qmr-doc-picker .qmr-doc-close{border:0;padding:3px 6px;font-size:12px;color:var(--dsw-alias-label-secondary,#647469)}
.qmr-doc-picker-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.qmr-doc-picker-actions .qmr-doc-button{white-space:normal;overflow-wrap:anywhere;min-height:36px}
.qmr-doc-picker .qmr-doc-local,.qmr-doc-picker .qmr-doc-save{background:#c2f2d4;border-color:#76c99d;color:#123e35;font-weight:550}
.qmr-doc-picker .qmr-doc-local:hover,.qmr-doc-picker .qmr-doc-save:hover{background:#a8e9c1}
.qmr-doc-picker .qmr-doc-paste-toggle{border-color:#4fae8977}
.qmr-doc-picker .qmr-doc-paste-toggle[aria-expanded=true]{box-shadow:inset 0 0 0 999px #20a36a18}
.qmr-doc-empty{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary,#647469)}
.qmr-doc-files{display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;min-height:0}
.qmr-doc-files>.qmr-doc-file{flex-shrink:0;min-height:32px}
.qmr-doc-files>small{flex-shrink:0}
.qmr-doc-files>small,.qmr-doc-paste>small{color:var(--dsw-alias-label-secondary,#647469)}
.qmr-doc-path{display:flex;align-items:flex-end;gap:8px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);padding-top:12px}
.qmr-doc-path label{display:flex;flex:1;min-width:0;flex-direction:column;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary,#647469)}
.qmr-doc-path>.qmr-doc-button{min-height:36px;flex-shrink:0;font-size:12px}
.qmr-doc-path input{color:var(--dsw-alias-label-primary,#222)!important;min-width:0}
.qmr-doc-picker input[type=text],.qmr-doc-picker textarea,.qmr-doc-picker select{box-sizing:border-box;width:100%;padding:8px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:5px;color:inherit;background:var(--dsw-alias-bg-base,#fff);font:inherit}
.qmr-doc-picker{max-height:calc(100vh - 110px);overflow-y:auto}
.qmr-doc-picker textarea{min-height:160px;resize:vertical}
.qmr-doc-paste{display:flex;flex-direction:column;gap:10px}
.qmr-doc-paste label{display:flex;flex-direction:column;gap:5px;font-size:12px}
.qmr-doc-file{display:block;text-align:left;overflow:hidden;text-overflow:ellipsis}
@media(forced-colors:active){.qmr-doc-trigger,.qmr-doc-picker,.qmr-doc-picker .qmr-doc-button{border-color:ButtonText;box-shadow:none}.qmr-doc-picker .qmr-doc-local,.qmr-doc-picker .qmr-doc-save{background:ButtonFace;color:ButtonText}}
`;
