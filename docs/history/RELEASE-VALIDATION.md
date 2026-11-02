# Release validation / 发布验证

> 历史归档（2026-11-02）：保留上游阶段的版本、环境与结论，不代表当前 QiaoDoc 功能或安装步骤。当前资料见 [维护文档](../README.md)，历史路径说明见 [归档索引](README.md)。

Date: 2026-09-30. Platform: macOS. Host: DeepSeek Harness 0.2.0-rc.2.

## Build and package

`npm ci`, `npm run check` and `npm pack` passed. The prepack guard checks package exports, bundle patch, README, license and screenshot paths. Home: 21 tests. Reader: 47 tests. RSS: all seven test scripts passed. Counts refer to the corresponding repository only.

## Isolated host

Installed the built tarball into a fresh Web profile with a separate DSH_HOME, without a development-directory symlink. Started the full host and exercised the visible plugin:

Reader: displayed six starter books, opened Tao Te Ching and its chapter navigation.

Screenshots were captured from this environment. No model key was configured; live AI inference was not verified in this pass. Other operating systems, mobile devices, all real-world files and long-running behavior are outside this verification.

## Distribution

PR checks and merge are visible on GitHub. Releases include a prebuilt tarball and SHA256 file. Public download and reinstall evidence is recorded in the Release notes after publication. Topics and prepared marketplace metadata do not mean marketplace acceptance. No marketplace submission or npm publication is claimed.


## v1.0.2 — 2026-10-01

Build, 47 existing tests and the package export/README/license guard passed. Client activation fixtures were synchronized with the existing React DOM portal dependency and the reading-context Remote descriptor.

Installed the prebuilt v1.0.2 tarball into an independent Web profile with separate DSH_HOME and DSH_WORKSPACE directories. The installed package is a pnpm tarball installation, not a link to the source checkout. The composed profile contains the qiaomu-reader-dsh bundle and the full Harness host starts successfully.

In the installed UI: six starter books appeared; Tao Te Ching opened; Pure white was available beside Paper; choosing it made the page and reading header rgb(255,255,255). Selected a three-line passage in chapter three using the mouse, created a pink highlight, clicked it to open the annotation panel, and observed is-focused=true, border=0px, outline=none and box-shadow=none. The host saved theme=white and one highlight in the isolated book state file. See docs/qa/white-borderless-harness.png, which contains only a default test workspace and public-domain book.

Source release preparation covers the prior library and companion UI refinements too. Live AI inference, real user-file imports and other operating systems were not exercised in this release pass. GitHub CI, Release upload and public asset checksum are checked separately at publication time.

## v1.1.0 — 2026-10-27

Reconciled the tested local 1.1.0 implementation with the existing public repository at `1a640ee`. Preserved the repository's CI, prepack/export guard, portable starter-book script, GPL license, third-party notices and older screenshots. Added Marked, parse5 and entities notices. The rebuilt Host and Client bundles match the previously verified local candidate byte-for-byte.

`npm ci` and `npm run check` passed: 84 tests, build, exports, bundle, README/license and screenshot-path verification. CI additionally rebuilds on Node 22 / Linux and compares committed bundles.

Runtime evidence comes from macOS, bundled DSH 0.2.1-rc.3, an isolated Web profile installed from a tarball. Verified: Markdown table/task rendering, remove/reload/restore with saved vocabulary and progress, native lookup-session UI and manual meanings, Markdown export/backlinks, actual macOS audio playback/pause and cross-chapter/resume, Gutenberg search/download/import, 10,008-book metadata search and end-of-list virtualization, and 390px simulated viewport. See READER-ADAPTATION.md and `docs/qa/adaptation-*.png`.

The ordinary desktop process has not been reloaded. Actual model replies and real Anki cards remain unverified. Kindle transport, activated Qiaomu Library, extra speech engines, MOBI/FB2/comics and stable whole-book page numbers remain outside this first-stage release. These are not described as completed.

Public-distribution evidence (merge SHA, tarball SHA256, unauthenticated download and second-profile install) is recorded in the v1.1.0 Release notes after publication. Preparing this source does not itself prove public availability. No new marketplace submission or npm publication is claimed.
