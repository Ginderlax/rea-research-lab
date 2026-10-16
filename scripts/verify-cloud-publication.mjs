// Hosted publication metadata producer. No commit, push, finalizer or product suite.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { runPublicationControls } from './publication-integrity-controls.mjs';
import { createHistoricalCarrierPolicyFromRoot } from './historical-carrier-policy.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true'); assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
for (const name of ['RUNNER_TEMP', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_REPOSITORY']) assert.ok(process.env[name]);
assert.match(process.env.GITHUB_SHA, /^[0-9a-f]{40}$/); assert.match(process.env.GITHUB_RUN_ID, /^\d+$/); assert.match(process.env.GITHUB_RUN_ATTEMPT, /^\d+$/);
assert.equal(process.env.GITHUB_REPOSITORY, 'Ginderlax/rea-research-lab');
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--evidence'); assert.ok(path.isAbsolute(process.argv[3]));
const temporary = fs.realpathSync(process.env.RUNNER_TEMP), evidence = path.resolve(process.argv[3]);
const evidenceRelative = path.relative(temporary, evidence);
assert.ok(evidenceRelative && evidenceRelative !== '..' && !evidenceRelative.startsWith('..' + path.sep) && !path.isAbsolute(evidenceRelative));
assert.equal(fs.existsSync(evidence), false); fs.mkdirSync(evidence); assert.equal(fs.realpathSync(evidence).toLowerCase(), evidence.toLowerCase());
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
const DERIVED = ['PUBLICATION-MANIFEST.json', 'VALIDATION.json'];
const REVIEWED = {
  'scripts/verify-archive-integration-records.mjs': [6451, '4e945c7ccbd9833a460f0d609e298ac94a53081635afa971d07ce7f3358071e0'],
  'products/rea-studio/apps/archive/results/aes-followup/publication-index.json': [31564, 'cb1547b75fa9039f21b71ab40952c8b348c4253e47f9df3272e799375d8ab7dc'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/client.mjs.snapshot': [8881, '21a5ee67b639ebb56208defd56b195d6fe9ee2bbe911976033d106951ffe6b01'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/LZMA-COMPATIBILITY.md.snapshot': [8171, '6e29d723e149422bc1ba69988b9780b55cb4cad9667c7b33824d28fe54aa1b11'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/README.md.snapshot': [14861, 'f796caf227929a00bec27df7e912e1f634e1d0fadbf6dc66c0f3310c26d668e0'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/server.mjs.snapshot': [11633, 'f64a7d232552eb351ee15563b53abfe88afac667c7b005747b590ab9a580410d'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/SEVENZIP-COMPATIBILITY.md.snapshot': [10417, '1d8041a403c4de8f2bedaf6ed8fcb75fe237c49b6cdbd7190f1caca72a81fd89'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/sevenzip.mjs.snapshot': [25949, '7b8b775816951bd7fdbc25821503236732831169e0e35e7f4dfc3b9d719f016c'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/preservation-manifest.json': [17491, '2587f9e158445a5ce48533aa92d0c7b4568a267a6ebe669387addb5e00b45e1d'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration-group-edit-document-route.mjs.snapshot': [74644, '1c11ce481db1d51e1d8f2e0483c78f02e8ad59f7a53510be2df517715cd1568e'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration-historical-carrier-policy.mjs.snapshot': [71277, '32c55edd351ea5145bc0b7c973fac32d8480386f7c172248aa90a340ac50903b'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration-requirement-evidence-provenance.mjs.snapshot': [77007, '44d91261320d1ba3abbe57a2bdb2ca4466f8c2921602457cd83a1f602bbafd2c'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration-windows-observer-correction.mjs.snapshot': [69184, 'c9fe15f147349c9be6565cfaa3d6316a808a2a8d21d76e753601886f8d80e5c2'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot': [67667, '2be4c15851395d5e537d5cc0f031fd53fcf09e7db2659a169907a03f7f7725e2'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/verify-records-historical-carrier-policy.mjs.snapshot': [148558, 'a78a9467ecd76ae44c3d2413b6d341c735bb1f98a657646d3b00a13dccf066f8'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/verify-records-requirement-evidence-provenance.mjs.snapshot': [148688, 'cd524543c7b6c9bf2050194994667e3e805165a934da209957ecbb5559d211c4'],
  'products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/verify-records.mjs.snapshot': [148351, 'a81c2f4b53fd346a6b86e4dcb63c9b39fb07a4f1e551bcfdbc3c755fce394046'],
  'products/rea-studio/experiments/archive-aes/bundle.json': [80331, 'ed6d16f52f9209ac144f1f08d395c3e86e4c124c73a3a18a488654506ff155bb'],
  'products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/preservation-manifest.json': [87704, '0231c511359d8ed8cf0de75b23a9b703fbfdbb65d816d74bf6a1a563e83dec0d'],
  'products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/4fe7b114341199fa31d5553ffb3505db0e3427337ea8c72c637a8d5a3501a042.snapshot': [59327, '4fe7b114341199fa31d5553ffb3505db0e3427337ea8c72c637a8d5a3501a042'],
  'products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/d2d167211228cb4eb201fc89aa14013d0da38e396b0a88505ebbc6eadea88fcd.snapshot': [16422, 'd2d167211228cb4eb201fc89aa14013d0da38e396b0a88505ebbc6eadea88fcd'],
  'products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/6be0d1c908d5fc78cf574bca48f7d7f2b7e824e708fd9f9281f6cf1fc9b4b3fd.snapshot': [1779, '6be0d1c908d5fc78cf574bca48f7d7f2b7e824e708fd9f9281f6cf1fc9b4b3fd'],
  'products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/7bfc912b2f275c1569a9c1b5b83ed4dde684f79ce97d73ed8655255fa64eaffe.snapshot': [4851, '7bfc912b2f275c1569a9c1b5b83ed4dde684f79ce97d73ed8655255fa64eaffe'],
  'products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/462e22b9b4dda4f6a3700aa8ebec671863924c6381c7fd1926d0e190bac1025a.snapshot': [145442, '462e22b9b4dda4f6a3700aa8ebec671863924c6381c7fd1926d0e190bac1025a'],
  'products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/e3ff73273bfaf6ea0724b99f649dc781cc8f48c1f73b145e69f032e519ef1fac.snapshot': [86926, 'e3ff73273bfaf6ea0724b99f649dc781cc8f48c1f73b145e69f032e519ef1fac'],
  'products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/d89c78840a1096cf6d89816c8b407a4d5dd1b41f5aebca451d0b2a61b1005d12.snapshot': [47453, 'd89c78840a1096cf6d89816c8b407a4d5dd1b41f5aebca451d0b2a61b1005d12'],
  'products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/payload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.snapshot': [0, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  'scripts/historical-carrier-policy.mjs': [4327, '671de635f8f3289b51e9ad5296706e4d884202e2ebdd4ba3fbe7038803fe51fd'],
  'scripts/verify-editor-save-followup.mjs': [8581, '2e32b4443efc07aa4a7d14a32629e2009ab94671cace973324ca5cd126c1dce8'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/failed-publication-attempt.json.snapshot': [2488, 'e8b877d8a0e28048a6cab3a9e41ebb00492a1776357fd3c0b1729a4acd9eab73'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/failed-publication-write.stderr.txt.snapshot': [1849, '5db76577828ac6fd87f12860dcbff9707c77af3d6bc20071bd29fd8c3c74f00a'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/passed26-controls.json.snapshot': [10693, 'fe590260050944d444f16657842819731eff07d1d71eb7a2c7f75bf96b5c8806'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/preservation-manifest.json': [3291, '543db5761be73b19447bb6d0d9113efd77d80c105a3c894a38baa524a27d76c9'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot': [50750, '8e72b3b70a9b44d1ef5ab33c11a7c28a0cda90d79f22375771a2a4dceee22f48'],
  'products/rea-studio/results/publication-editor-save-git-closure-20261015/verifier-before/verify-editor-save-followup.mjs.snapshot': [7424, 'fb3f465eaaefab1197c170410355f30764308e3f5b4e58e30d0c8059fe3e96c3'],
  'scripts/verify-records.mjs': [149123, 'b5d48417f94e9464c071610ffc2720451cebae126b94b674e67c8f6fe16967d8'],
  'scripts/editor-vault-proof-migration.mjs': [177855, '5ef7065c6681de938d64b78ddf2e0cc50da50498a95fabb42e3d8a13b69753b8'],
  'scripts/verify-cloud-recovery-records.mjs': [15778, '405c90ac8c68acdc2b281e9563637cc391e1e0574705c1cbcdf7be8e1f794482'],
  'products/rea-studio/results/cloud-publication-source-transition-20261015/preservation-manifest.json': [3069, '8daf5506d935254110dadf2c32e394d6b02f773692867b3a30120a14055ee576'],
  'products/rea-studio/results/cloud-publication-source-transition-20261015/verifier-middle/verify-records.mjs.snapshot': [142684, '42f2c1c25325867d9b366a71d9e17e87349fe258cdb1b24f9f5f5585b38d77c6'],
  'products/rea-studio/results/cloud-publication-source-transition-20261015/verifier-middle/editor-vault-proof-migration.mjs.snapshot': [47841, '3d0a4ee0b5e9eef36c357c9a3c6170008a2bb0882cc8a755756358aabdf6ced1'],
  'scripts/verify-followup-records.mjs': [46118, '4129e5ea25fca6b91804a6ee1ab12a3b0f7a9efa8f0e9bf8c766738a2e4ed019'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/preservation-manifest.json': [7382, '37b34ad5324719094e9842343d7649af4ffbd5606f47488137e04a6ee380e49b'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/payload/d29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8.snapshot': [7, 'd29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/verifier-before/verify-followup-records.mjs.snapshot': [37879, '92a23a59963713966f8e6c630ea6f89e2dfe8248d8dadfacd662bf349bcd6f7e'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/failed-publication-attempt.json.snapshot': [2450, '52c79743bf97f55243d8f556801a4d70e9b95a95c2696da378a8141d8e516e3e'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/passed21-controls.json.snapshot': [8748, '5e5a2b99bad3c5969bd6c15ecedceb8e12a39e9ad631b62e2c3af5e951de8e66'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/failed-publication-write.stderr.txt.snapshot': [18720, '70f73fbb752aff2329e2ea3b21a7f0cd2ae5df218020a788b2d14dc771d9f599'],
  'products/rea-studio/results/publication-git-directory-closure-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot': [49253, '4175770874c4e00e0c22f13741e4224f28bc933e4447cd78adb889bac01dc81f'],
  'products/rea-studio/results/windows-path-source-transition-20261015/preservation-manifest.json': [5631, 'eda0b8a73da84ba425d726760b76868ddd4c4aced8130d55f79f626b659ba385'],
  'products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/editor/git.test.mjs.snapshot': [11853, 'c40c070ab2dc74e6d1de1d8b80a02744740864b566d2e5de695baf3ca00da3a2'],
  'products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot': [15511, 'fa04b006d713e493827540fa04bf5e420762b5dd0bfe33e3b2e23d43c909dbbc'],
  'products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/sync/webdav.windows-path.test.mjs.snapshot': [6871, 'd8cf54ed4c03321c7782c2f23fd9b3d390ea1e6660d90087183d8d528a1f4c7c'],
  'products/rea-studio/results/windows-path-source-transition-20261015/before/products/rea-studio/apps/editor/git.test.mjs.snapshot': [11458, 'ab8213c182d1568254ea73db57133affbd48304b98f0d275d27c1fcf8b33f0cc'],
  'products/rea-studio/results/windows-path-source-transition-20261015/before/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot': [14717, '591146243ed9b378aed70ce4beedceeec1b12319d7747b1e21fad2282286c9bb'],
  'products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot': [50750, '8e72b3b70a9b44d1ef5ab33c11a7c28a0cda90d79f22375771a2a4dceee22f48'],
  'products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/verify-records.mjs.snapshot': [147529, '82fc7f36c0805ee163a93aa1720ed708629ac455d90a9bdd343b30f554335304'],
  'products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/editor-vault-proof-migration-editor-save-closure.mjs.snapshot': [52393, 'f0c0b3e47c153e31764686f14d07834ad27f40bf82fe35f4c1ad6fb6dcff7651'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/preservation-manifest.json': [78616, 'ffe6e1976f896cb50991460f598f8cb714762c6eff42087896e0096ae22d9b1d'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/126e1a9fb2e939ab8a767b6facd723cb823505846711de4114d6c560a6861212.snapshot': [85162, '126e1a9fb2e939ab8a767b6facd723cb823505846711de4114d6c560a6861212'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/41d3a9da24ee7effedbd2af7bc6dd6952a5a59895edc92b5cff7f8a33cba72c0.snapshot': [4234, '41d3a9da24ee7effedbd2af7bc6dd6952a5a59895edc92b5cff7f8a33cba72c0'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2.snapshot': [144298, '41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/7774bfa56f708adbe35eacebc21385a9eed56175e2df6f67c8fec0350af4b7b0.snapshot': [4286, '7774bfa56f708adbe35eacebc21385a9eed56175e2df6f67c8fec0350af4b7b0'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/adf03e13193e81997ee515bb0e0c4ea4f790120c35ff5bf351f5a5b19bce4ea1.snapshot': [3167, 'adf03e13193e81997ee515bb0e0c4ea4f790120c35ff5bf351f5a5b19bce4ea1'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/d5b87bec1e71b8ca96821de21fa2d6c7520586cf0cef4cdfa0f28392f5504dca.snapshot': [11300, 'd5b87bec1e71b8ca96821de21fa2d6c7520586cf0cef4cdfa0f28392f5504dca'],
  'products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.snapshot': [0, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/preservation-manifest.json': [4222, '0fde86c42377c6267ba08dfa11366582d9f4d8ed9662a6a566619d5f0015c3b5'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot': [67667, '2be4c15851395d5e537d5cc0f031fd53fcf09e7db2659a169907a03f7f7725e2'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/workflow-before/publication-integrity-cloud.yml.snapshot': [5654, '03204750f68365bac66221b73aa47435cd1556f968947967b74a45b3d8278be4'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/attempt-validation.json.snapshot': [2488, '8a57203e9c1aa6e8fd652f397e9160a3f07a9666aa8759457762a4814d9baa42'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/controls.json.snapshot': [27379, '1c7e155df622d1dc772213b641c52604b37eb6c82a57df2c58f56b1a6bde4bcd'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/events.jsonl.snapshot': [39406, 'e2515ece6446363d021bd271fd6acdec0d898bab90939a345eb741b5ad63f3a7'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/publication-write.stderr.txt.snapshot': [4787, '9b8d0b0e3d24a912b3e5816a82dee369c4e310f5b508313cc149416e1f3fcb76'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/storage-failure.json.snapshot': [400, '4f4a3daf42ae421324e3bcf51ab40c19a92d58165fb2c2a2a68b421d82c57763'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/workflow-attempt.json.snapshot': [419, '903841dc5e67ab46e4e86e0ab83bb90e10392cfef3a9c208c4115da9f7b3d34c'],
  'products/rea-studio/results/publication-editor-git-observer-20261015/wrapper-job-116702343166.log.snapshot': [29564, '06cf6158b6dfb691ff5a3c02af2a8eefff3b4b918b635438efcc2fd65f9dabbd'],
};
const NOTES_INSTALLED_TOOLING={
  "products/rea-studio/scripts/verify-notes-installed-cloud.mjs": [
    16764,
    "2248d91efbcdcefbf66ec933575076e2a3073d1cf13fb1da39ad31d4698e31c9"
  ],
  ".github/workflows/notes-installed-cloud.yml": [
    14895,
    "3cfb0b71128ad57c19162dd3dc1722689ea6c4831c5cd2f793c0a45e91519c5f"
  ],
  "products/rea-studio/scripts/verify-cloud.mjs": [
    86074,
    "e58d4ba706b0d127a82d6ba66a7369f1401eb16a3bb2705110ec1b068a67312e"
  ],
  "products/rea-studio/scripts/verify-cloud-browser.mjs": [
    48600,
    "86dc714b3c9bb14f9a374028ab6df36c5c8e4468a18da5cac0ff83422832b3df"
  ]
};
const NOTES_REVIEWED={
  "products/rea-studio/apps/notes/server.mjs": [
    24800,
    "492ab5fb79a077a888376f8f8b6b13c830fc4004e21a0e2033546e90e0e36181"
  ],
  "products/rea-studio/apps/notes/client.mjs": [
    28048,
    "09f7a63badf83336b1b0fd36935256461babcb31333ff500b192307b587928db"
  ],
  "products/rea-studio/apps/notes/README.md": [
    18406,
    "65b8eec8da3295d44adb0afd0b9840fe38107b676af750d0a2be27243857705d"
  ],
  "products/rea-studio/apps/notes/core.mjs": [
    2657,
    "06bf9ad2485e39d6c7dea51a3be9a232fefe9d1a2ed1e46482b0459d605aa44c"
  ],
  "products/rea-studio/apps/notes/todo.test.mjs": [
    10873,
    "38c66f3b553888923098c98bb083899f00ca42df45dab30ad66548d4ff576e18"
  ],
  "products/rea-studio/apps/notes/todo.ui.test.mjs": [
    8623,
    "65de552f75be2e7b6ebbd45723740c76e55bda09d13d550bf38ec6228e4d83f5"
  ],
  "products/rea-studio/apps/notes/todo.integration.test.mjs": [
    5802,
    "442da2522755a4a0c02a6602a8a63ce367a20d2a65d940a53062a7dc08e9d05e"
  ],
  "products/rea-studio/apps/notes/todo-original.test.mjs": [
    4397,
    "51e4f9594525b046ae3b6a5ed2af92736df158743049e792fff50e9b774717d0"
  ],
  "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/server.mjs.snapshot": [
    24800,
    "492ab5fb79a077a888376f8f8b6b13c830fc4004e21a0e2033546e90e0e36181"
  ],
  "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/server.mjs.snapshot": [
    23320,
    "e592e599c414cd38e8b3b278896792713e001a51950b8a4b3f3e0bc6662f900d"
  ],
  "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/client.mjs.snapshot": [
    28048,
    "09f7a63badf83336b1b0fd36935256461babcb31333ff500b192307b587928db"
  ],
  "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/client.mjs.snapshot": [
    23038,
    "90886819feef847847fcae8c442e0a401a1146a7a4aa1fd862a54b5e01f41da9"
  ],
  "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/README.md.snapshot": [
    18406,
    "65b8eec8da3295d44adb0afd0b9840fe38107b676af750d0a2be27243857705d"
  ],
  "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/README.md.snapshot": [
    16506,
    "6325d142e7dfeb0bebb625699eb2b0d3967ab47f94d6b929fd73c49616a49524"
  ],
  "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/core.mjs.snapshot": [
    2657,
    "06bf9ad2485e39d6c7dea51a3be9a232fefe9d1a2ed1e46482b0459d605aa44c"
  ],
  "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.test.mjs.snapshot": [
    10873,
    "38c66f3b553888923098c98bb083899f00ca42df45dab30ad66548d4ff576e18"
  ],
  "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.ui.test.mjs.snapshot": [
    8623,
    "65de552f75be2e7b6ebbd45723740c76e55bda09d13d550bf38ec6228e4d83f5"
  ],
  "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.integration.test.mjs.snapshot": [
    5802,
    "442da2522755a4a0c02a6602a8a63ce367a20d2a65d940a53062a7dc08e9d05e"
  ],
  "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo-original.test.mjs.snapshot": [
    4397,
    "51e4f9594525b046ae3b6a5ed2af92736df158743049e792fff50e9b774717d0"
  ],
  "products/rea-studio/experiments/notes-todo/original/to-dos.md.snapshot": [
    1821,
    "69032c8f30c6aa782b105fe852a38a7756cfa16bcc3fcd426e2b09d9fedb1c11"
  ],
  "products/rea-studio/experiments/notes-todo/original/LICENSE.snapshot": [
    998,
    "f6b29267fe2c4251ed95cf9c846b47774a970c5960be9eb8a409f21ffd98425e"
  ],
  "products/rea-studio/experiments/notes-todo/SOURCE-CONTRACT.md.snapshot": [
    7826,
    "18ef024b4262a9534837683d819cdefb82d6f50dad1b370441b534e6db2ca24a"
  ],
  "products/rea-studio/experiments/notes-todo/source-authority.json.snapshot": [
    6217,
    "335d78a02f53174f8c33a0fe918157418a23eceb80d6ba0e02371f0e8aee32f0"
  ],
  "products/rea-studio/experiments/notes-todo/independent-r2-review.json.snapshot": [
    4156,
    "3ffa761a14ab2ed2f853b1cd3c36e3ed6099ea045fd92ca6c0ed190c021ec0c9"
  ],
  "products/rea-studio/experiments/notes-todo/README.txt": [
    866,
    "0789e3f28ba6c87c8c32a83058db4ca4bfe0bf39d49be826508595b8e180a01c"
  ],
  "products/rea-studio/experiments/notes-todo/bundle.json": [
    10977,
    "6489170855483748eaff4ece03bdbadc29f79ab87cf9a16015dede504891bd62"
  ],
  "products/rea-studio/apps/notes/results/notebooks-followup/stage/original/packages/lib/models/Note.ts.snapshot.snapshot": [
    45302,
    "5f1a200dc970179ad6fd193f7ffc47f09f88261cff8f893ccc793517ebbe9647"
  ],
  "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-records.mjs.snapshot": [
    149064,
    "3878efc73e671246305e4368f7d3c52f288473591a4fe1697b343ab70249ae1e"
  ],
  "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/editor-vault-proof-migration.mjs.snapshot": [
    107538,
    "8e5a048dba78b58faeed3455cc19f60981f5a6320babd60cf837120b54aef1d8"
  ],
  "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-followup-records.mjs.snapshot": [
    45876,
    "856eeba61b820260f7e1bdc8d9bb9e8924e3ae3183a0c3c0495471e6152a8b5f"
  ],
  "products/rea-studio/results/notes-todo-source-transition-20261016/preservation-manifest.json": [
    7317,
    "234cb40ab67e6d27efccfd174ad2eaee0676f7e5a5cab0bfd1ba34e49c57aee9"
  ],
  "products/rea-studio/apps/notes/results/todo-followup/publication-index.json": [
    5086,
    "3889a8d676930dde323edd5a37a74393093dc334ee7557ded90804ed925cc731"
  ],
  "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/preservation-manifest.json": [
    109749,
    "b8fce979bcc24c869c51ae745f7f6df9280b0cbf19b688777b799f6f3bbf1bee"
  ],
  "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/36f83a2bdc7b7b4ada8430da0428052d513eae4891c716a87d3ae344d34e0166.snapshot": [
    5856,
    "36f83a2bdc7b7b4ada8430da0428052d513eae4891c716a87d3ae344d34e0166"
  ],
  "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/d9b56b119f60edf8525f216484b50401f5b0717cf09dee571ad5a9d8be9b5b25.snapshot": [
    9081,
    "d9b56b119f60edf8525f216484b50401f5b0717cf09dee571ad5a9d8be9b5b25"
  ],
  "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/13c4f7a431ba827a92d284b03eaa8be92ea75e482c886fa9ac517cb8cfc8474c.snapshot": [
    6282,
    "13c4f7a431ba827a92d284b03eaa8be92ea75e482c886fa9ac517cb8cfc8474c"
  ],
  "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/2e0ff567a871d045e3dc0fba1abac5a629780f72f486dbfb68a5398e0f3f8bf2.gz.snapshot": [
    31881,
    "36bf4d6f211b8085ebc85ff9e58c7da8094df14bb9448c70b06bf1d587f07a04"
  ],
  "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/cd86d1b3a47f06d71d16ba896dbdf9ab2ae36d68e1c03b124cffd5a0a5175c59.gz.snapshot": [
    19670,
    "7772c363ab9ee665033610ca9f418a427d9749e1feb1b72c8dec85a4964fb245"
  ],
  "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/3a596c108f7ac1de40121eeec135c0925a7f51f3e8dd49d26d3e663403f9c529.snapshot": [
    29616,
    "3a596c108f7ac1de40121eeec135c0925a7f51f3e8dd49d26d3e663403f9c529"
  ],
  "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.snapshot": [
    0,
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/preservation-manifest.json": [
    61825,
    "47b21811f00088b895107f9122c98adab97268ed9ba6393eb63dfe55883f6291"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/dc7f8c101111836973a84a8f5ca76de2d1a4315b30b5cd457ada0faef8e46751.snapshot": [
    14926,
    "dc7f8c101111836973a84a8f5ca76de2d1a4315b30b5cd457ada0faef8e46751"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/7e55bf8dabd1f4a056901703055aae258ceaf76d6e175e0a3e9fa9d31df37c8b.snapshot": [
    9081,
    "7e55bf8dabd1f4a056901703055aae258ceaf76d6e175e0a3e9fa9d31df37c8b"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/03576df3955385fef0601b24256dfb56d3aa30dbe040ed5ffd1cfe5c54029614.snapshot": [
    6282,
    "03576df3955385fef0601b24256dfb56d3aa30dbe040ed5ffd1cfe5c54029614"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/c99c82c51eae708f23a29a563738d8dc47dc45ee324a83c4f0c6355ae958e98b.snapshot": [
    3896,
    "c99c82c51eae708f23a29a563738d8dc47dc45ee324a83c4f0c6355ae958e98b"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/8ea77373c45541a6e59ea9fac6f60804424a484064f937923219c1f88928bb14.gz.snapshot": [
    20053,
    "9b9d9588f4a77620053f546d52213b341b7d78ce8fb254be1806b0dca0bac871"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/3c72cb8b46819c5bd645530775afa187b2a2a2daafa6b17f29bbe12c6592f3e0.snapshot": [
    15264,
    "3c72cb8b46819c5bd645530775afa187b2a2a2daafa6b17f29bbe12c6592f3e0"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/e62bc7de93399cabbd9b5c67264ec7676283e424afa7b0364a899164d0b33917.snapshot": [
    1961,
    "e62bc7de93399cabbd9b5c67264ec7676283e424afa7b0364a899164d0b33917"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/f15997348b7e81ebb287b16a14949aad4fbb67408ec46ff9548b86ec794ae69a.snapshot": [
    631,
    "f15997348b7e81ebb287b16a14949aad4fbb67408ec46ff9548b86ec794ae69a"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/859eeeaee3d90d295b45d08e6c6de8ab4a9de9efa34405588090a5cf9f71ee31.gz.snapshot": [
    32126,
    "ac0b982d1dbef559ed63c03a2248012df1dd63e82a5460458772fd13788c99cc"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/b3a90572fb2f976047a344393c742b3bf9a973e6a1f248c5cd48e974af3fefcc.snapshot": [
    5372,
    "b3a90572fb2f976047a344393c742b3bf9a973e6a1f248c5cd48e974af3fefcc"
  ],
  "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/66d5f61b136007f6e3dfec51ff95c9599b19b31034cc6a11a35e3a06fa4203ee.gz.snapshot": [
    30629,
    "65ef99b06bc942d7442bf9a7b623001a32f55979db0600dfc43f351397d97ae3"
  ]
};
// BEGIN exact publication repeat projection (only three owned observation clocks).
function publicationRepeatProjection(value, phase) {
  function utc(value, label) {
    assert.equal(typeof value, 'string', label + ' must be an exact UTC timestamp');
    assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, label + ' must use millisecond UTC ISO');
    const parsed = Date.parse(value); assert.ok(Number.isFinite(parsed), label + ' must be a real timestamp');
    assert.equal(new Date(parsed).toISOString(), value, label + ' must round trip exactly'); return parsed;
  }
  assert.ok(phase && ['publication-write', 'publication-recheck'].includes(phase.name));
  assert.equal(phase.status, 'passed'); assert.equal(phase.exitCode, 0); assert.equal(phase.closeObserved, true);
  const phaseStart = utc(phase.startedAtUtc, 'owned phase start'), phaseEnd = utc(phase.completedAtUtc, 'owned phase end');
  assert.ok(phaseStart <= phaseEnd, 'Owned phase clocks must be ordered');
  assert.equal(value.status, 'passed');
  const checked = utc(value.checked_at_utc, 'root checked_at_utc');
  const sketch = value.followup_evidence?.notesLayoutValueApiCheckpoint?.sketch;
  assert.ok(sketch); assert.equal(sketch.schema, 'rea-sketch-layout-installed-source-proof/v1'); assert.equal(sketch.sourceOnly, true);
  const started = utc(sketch.started, 'Sketch source proof start'), finished = utc(sketch.finished, 'Sketch source proof finish');
  assert.ok(phaseStart <= started && started <= finished && finished <= checked && checked <= phaseEnd, 'Observation clocks must be ordered inside their own observed child phase');
  const stable = structuredClone(value); delete stable.checked_at_utc;
  delete stable.followup_evidence.notesLayoutValueApiCheckpoint.sketch.started;
  delete stable.followup_evidence.notesLayoutValueApiCheckpoint.sketch.finished;
  return { stable, clocks: { checked_at_utc: value.checked_at_utc, sketchStarted: sketch.started, sketchFinished: sketch.finished,
    phaseStartedAtUtc: phase.startedAtUtc, phaseCompletedAtUtc: phase.completedAtUtc } };
}
// END exact publication repeat projection.

const receipt = { schema: 'rea-hosted-publication-validation-attempt/v1', status: 'running', startedAtUtc: new Date().toISOString(),
  scope: 'Publication integrity, syntax, links, credential patterns, immutable historical sources and finite cloud records; no behavioral-suite rerun.',
  execution: Object.fromEntries(['CI', 'GITHUB_ACTIONS', 'RUNNER_ENVIRONMENT', 'RUNNER_OS', 'RUNNER_ARCH', 'GITHUB_SHA', 'GITHUB_REPOSITORY', 'GITHUB_REF', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'].map(name => [name, process.env[name] ?? null])),
  runtime: process.version, sourceRoot: root, sourceCommit: process.env.GITHUB_SHA, candidateOverlay: false, phases: [],
  historicalReceiptsRewritten: false, fullDevelopmentSuiteAcceptance: false, fullParity: false, superiority: false, applicationTestsExecuted: 0, originalExecutions: 0 };
const events = fs.openSync(path.join(evidence, 'events.jsonl'), 'wx'); let sequence = 0, interrupted = null, activeStop = null;
function event(type, details = {}) { fs.writeFileSync(events, JSON.stringify({ sequence: ++sequence, at: new Date().toISOString(), type, ...details }) + '\n'); fs.fsyncSync(events); }
function save() { const target = path.join(evidence, 'attempt-validation.json'), temporary = target + '.tmp', fd = fs.openSync(temporary, 'wx'); try { fs.writeFileSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } fs.renameSync(temporary, target); }
function write(name, bytes) { const target = path.join(evidence, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' }); }
function live() { assert.equal(interrupted, null, 'Interrupted: ' + interrupted); }
function git(argv, allowDetached = false) {
  const result = spawnSync('git', argv, { cwd: root, shell: false, windowsHide: true, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' } });
  if (allowDetached && result.status === 1) return null; assert.equal(result.status, 0, result.stderr || result.error?.message); return result.stdout;
}
function safe(name) { assert.ok(typeof name === 'string' && name && name.length <= 4096 && !/[\\:\x00-\x1f\x7f]/.test(name) && !name.startsWith('/') && name.split('/').every(part => part && part !== '.' && part !== '..')); return name; }
function publicFile(name) { safe(name); let target = root; for (const part of name.split('/')) { target = path.join(target, part); assert.equal(fs.lstatSync(target).isSymbolicLink(), false); } const stat = fs.lstatSync(target); assert.ok(stat.isFile() && stat.size <= 32 * 1024 * 1024); return target; }
const handlers = new Map(['SIGINT', 'SIGTERM', 'SIGBREAK'].map(signal => [signal, () => { interrupted = signal; activeStop?.('received ' + signal); }]));
for (const [signal, handler] of handlers) process.on(signal, handler);
for (const stream of [process.stdout, process.stderr]) stream.on('error', () => {});
save(); event('running');

async function child(name, argv) {
  live(); const row = { name, status: 'running', command: [process.execPath, ...argv], startedAtUtc: new Date().toISOString(), timeoutMs: 20 * 60000,
    stdoutBytes: 0, stderrBytes: 0, droppedBytes: 0, stdoutLimit: 2 * 1024 * 1024, stderrLimit: 1024 * 1024 };
  receipt.phases.push(row); save(); event('child-starting', { name });
  const stdout = fs.openSync(path.join(evidence, name + '.stdout.txt'), 'wx'), stderr = fs.openSync(path.join(evidence, name + '.stderr.txt'), 'wx');
  try {
    const outcome = await new Promise(resolve => {
      const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
      const processChild = spawn(process.execPath, argv, { cwd: root, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let done = false, failure = null, cleanup = null, stopping = false;
      function finish(exitCode, signal, closeObserved = true) { if (done) return; done = true; clearTimeout(deadline); clearInterval(heartbeat); clearTimeout(cleanup); activeStop = null; resolve({ exitCode, signal, closeObserved, failure }); }
      function stop(reason) {
        if (stopping) return; stopping = true; failure ??= reason;
        try { event('child-stop', { name, reason, pid: processChild.pid ?? null }); } catch {}
        if (processChild.pid) { const stopped = spawnSync('taskkill.exe', ['/PID', String(processChild.pid), '/T', '/F'], { windowsHide: true, shell: false, stdio: 'ignore', timeout: 10000 }); if (stopped.status !== 0) processChild.kill('SIGKILL'); }
        cleanup = setTimeout(() => { processChild.stdout.destroy(); processChild.stderr.destroy(); finish(null, null, false); }, 5000);
      }
      activeStop = stop;
      const deadline = setTimeout(() => stop('publication child deadline exceeded'), row.timeoutMs);
      const heartbeat = setInterval(() => { try { event('child-progress', { name, stdoutBytes: row.stdoutBytes, stderrBytes: row.stderrBytes }); } catch { stop('progress event storage failed'); } }, 10000);
      for (const [kind, fd] of [['stdout', stdout], ['stderr', stderr]]) {
        processChild[kind].on('data', bytes => { if (done) return; try { const key = kind + 'Bytes', retain = Math.min(bytes.length, Math.max(0, row[kind + 'Limit'] - row[key])); if (retain) { fs.writeFileSync(fd, bytes.subarray(0, retain)); fs.fsyncSync(fd); row[key] += retain; } row.droppedBytes += bytes.length - retain; if (retain !== bytes.length) stop(kind + ' evidence cap exceeded'); } catch { stop(kind + ' evidence storage failed'); } });
        processChild[kind].on('error', error => { if (!done) stop(kind + ' stream failed: ' + error.message); });
      }
      processChild.on('error', error => { failure = 'spawn failed: ' + error.message; }); processChild.on('close', (code, signal) => finish(code, signal));
      row.pid = processChild.pid ?? null; try { event('child-started', { name, pid: row.pid }); } catch { stop('start event storage failed'); }
    });
    Object.assign(row, outcome); assert.equal(outcome.failure, null); assert.equal(outcome.closeObserved, true); assert.equal(outcome.exitCode, 0); assert.equal(outcome.signal, null); assert.equal(row.droppedBytes, 0); live(); row.status = 'passed';
    return JSON.parse(fs.readFileSync(path.join(evidence, name + '.stdout.txt'), 'utf8').trim().split(/\r?\n/).at(-1));
  } catch (error) { row.status = 'failed'; row.failure = { name: error.name, message: error.message }; throw error; }
  finally { row.completedAtUtc = new Date().toISOString(); activeStop = null; for (const fd of [stdout, stderr]) { fs.fsyncSync(fd); fs.closeSync(fd); } save(); event('child-terminal', { name, status: row.status }); }
}

try {
  assert.equal(git(['rev-parse', 'HEAD']).trim(), process.env.GITHUB_SHA); assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all', '-z']), '');
  receipt.branch = git(['symbolic-ref', '-q', '--short', 'HEAD'], true)?.trim() ?? null; receipt.gitTree = git(['rev-parse', 'HEAD^{tree}']).trim();
  const objectFormat = git(['rev-parse', '--show-object-format']).trim(); assert.ok(['sha1', 'sha256'].includes(objectFormat));
  const tree = git(['ls-tree', '-r', '-z', '--full-tree', 'HEAD']).split('\0').filter(Boolean).map(row => { const index = row.indexOf('\t'), [mode, type, oid] = row.slice(0, index).split(' '), name = row.slice(index + 1); safe(name); assert.ok(['100644', '100755'].includes(mode) && type === 'blob'); assert.match(oid, objectFormat === 'sha1' ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/); return { path: name, gitSHA: oid }; });
  assert.ok(tree.length > 24000 && tree.length <= 30000); assert.equal(new Set(tree.map(row => row.path)).size, tree.length);
  const tracked = new Set(tree.map(row => row.path));
  for (const [name, [bytes, sha256]] of Object.entries(REVIEWED)) { assert.ok(tracked.has(name), 'Reviewed source must already be committed: ' + name); const content = fs.readFileSync(publicFile(name)); assert.deepEqual(identity(content), { bytes, sha256 }); write('reviewed-sources/' + name + '.snapshot', content); }
  const notesRows=[];let notesBytes=0;assert.equal(Object.keys(NOTES_REVIEWED).length,52);
  for(const[name,[bytes,sha256]]of Object.entries(NOTES_REVIEWED)){assert.ok(tracked.has(name),'Notes proof must already be committed: '+name);const content=fs.readFileSync(publicFile(name));assert.deepEqual(identity(content),{bytes,sha256});assert.ok(content.length<=256*1024);notesBytes+=content.length;assert.ok(notesRows.length<64&&notesBytes<=8*1024*1024);notesRows.push({path:name,...identity(content),base64:content.toString('base64')});}
  assert.equal(Object.keys(NOTES_INSTALLED_TOOLING).length,4);for(const[name,[bytes,sha256]]of Object.entries(NOTES_INSTALLED_TOOLING)){assert.ok(tracked.has(name));const content=fs.readFileSync(publicFile(name));assert.deepEqual(identity(content),{bytes,sha256});assert.ok(content.length<=256*1024);notesBytes+=content.length;assert.ok(notesRows.length<64&&notesBytes<=8*1024*1024);notesRows.push({path:name,...identity(content),base64:content.toString('base64'),group:'installed-Notes-tooling'});}assert.equal(notesRows.length,56);
  const notesEnvelope=Buffer.from(JSON.stringify({schema:'rea-closed-Notes-source-proof-envelope/v1',sourceCommit:process.env.GITHUB_SHA,sourceFiles:notesRows.length,rawSourceBytes:notesBytes,rows:notesRows}));assert.ok(notesEnvelope.length<=8*1024*1024);const notesGzip=gzipSync(notesEnvelope,{mtime:0});assert.ok(notesGzip.length<=4*1024*1024);write('notes-reviewed-sources.json.gz.snapshot',notesGzip);receipt.notesSourceProofEnvelope={path:'notes-reviewed-sources.json.gz.snapshot',sourceFiles:56,proofSourceFiles:52,installedToolingSourceFiles:4,rawSourceBytes:notesBytes,decoded:identity(notesEnvelope),stored:identity(notesGzip),separateReadBudget:true};save();
  for (const name of ['scripts/verify-cloud-publication.mjs', 'scripts/publication-integrity-controls.mjs', '.github/workflows/publication-integrity-cloud.yml']) { assert.ok(tracked.has(name)); write('collector-sources/' + name + '.snapshot', fs.readFileSync(publicFile(name))); }
  const oldManifestBytes = fs.readFileSync(publicFile(DERIVED[0])), oldValidationBytes = fs.readFileSync(publicFile(DERIVED[1]));
  write('metadata-before/' + DERIVED[0] + '.snapshot', oldManifestBytes); write('metadata-before/' + DERIVED[1] + '.snapshot', oldValidationBytes);
  const old = JSON.parse(oldManifestBytes); assert.equal(old.schema, 'rea-publication-manifest/v1'); assert.equal(old.algorithm, 'sha256'); assert.deepEqual(old.derived_records_excluded, DERIVED);
  const historicalCarrierPolicy = createHistoricalCarrierPolicyFromRoot(root);
  const forbidden = /(^|\/)(artifacts|node_modules|tooling|__pycache__|work|\.local)(\/|$)|\.(exe|dll|zip|tgz|bundle|tar|7z|pyc)$/i;
  const credentials = /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
  function payload(label) {
    live(); const rows = []; let bytes = 0;
    for (const entry of tree) {
      if (DERIVED.includes(entry.path)) continue;
      const content = fs.readFileSync(publicFile(entry.path)), sha256 = sha(content); bytes += content.length; assert.ok(bytes <= 2 * 1024 * 1024 * 1024);
      assert.equal(createHash(objectFormat).update('blob ' + content.length + '\0').update(content).digest('hex'), entry.gitSHA, 'Working bytes differ from committed Git: ' + entry.path);
      assert.ok(!forbidden.test(entry.path) || entry.path === 'products/rea-studio/apps/archive/fixtures/zstd/native-zip93.zip' && sha256 === 'e9282f76dbd3c080d0e12ef95489458523ebbc65c2951f4b8f3cb880a16c5d8b' || historicalCarrierPolicy.allows({ path: entry.path, bytes: content.length, sha256 }));
      assert.equal(credentials.test(content.toString('utf8')), false, 'Credential-shaped content requires review: ' + entry.path);
      rows.push({ path: entry.path, bytes: content.length, sha256 });
      if (rows.length % 1000 === 0) event('payload-progress', { label, files: rows.length, bytes });
    }
    rows.sort((a, b) => a.path.localeCompare(b.path)); event('payload-complete', { label, files: rows.length, bytes }); return { rows, bytes };
  }
  const before = payload('before'); receipt.payloadBefore = { files: before.rows.length, bytes: before.bytes, rowsIdentity: identity(Buffer.from(JSON.stringify(before.rows))) }; save();
  const controls = await runPublicationControls(root, path.join(temporary, 'rea-publication-controls-' + process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT), event);
  write('controls.json', JSON.stringify(controls, null, 2) + '\n'); receipt.controls = { status: controls.status, checks: controls.checks }; save();
  const nextManifest = Buffer.from(JSON.stringify({ ...old, files: before.rows }, null, 2)); fs.writeFileSync(path.join(root, DERIVED[0]), nextManifest); write('derived/' + DERIVED[0], nextManifest); receipt.generatedManifest = identity(nextManifest); receipt.generatedManifestValidated = false; save(); event('publication-manifest-generated', receipt.generatedManifest);
  const first = await child('publication-write', ['scripts/verify-records.mjs', '--write']); assert.equal(first.status, 'passed');
  const validationBytes = fs.readFileSync(path.join(root, DERIVED[1])), validation = JSON.parse(validationBytes); assert.deepEqual(first, validation); write('derived/' + DERIVED[1], validationBytes); receipt.firstRootWritePassed = true; save();
  const second = await child('publication-recheck', ['scripts/verify-records.mjs']); assert.equal(second.status, 'passed');
  const firstProjection = publicationRepeatProjection(first, receipt.phases[0]), secondProjection = publicationRepeatProjection(second, receipt.phases[1]);
  assert.ok(Date.parse(receipt.phases[0].completedAtUtc) <= Date.parse(receipt.phases[1].startedAtUtc), 'Owned publication phases must be sequential');
  assert.deepEqual(secondProjection.stable, firstProjection.stable);
  receipt.repeatComparison = { status: 'passed', onlyNamedObservationClocksProjected: true, allOtherFieldsDeepEqual: true,
    first: { clocks: firstProjection.clocks, rawStdout: identity(fs.readFileSync(path.join(evidence, 'publication-write.stdout.txt'))) },
    second: { clocks: secondProjection.clocks, rawStdout: identity(fs.readFileSync(path.join(evidence, 'publication-recheck.stdout.txt'))) } }; save();
  const after = payload('after'); assert.deepEqual(after.rows, before.rows); receipt.payloadAfter = { files: after.rows.length, bytes: after.bytes, rowsIdentity: identity(Buffer.from(JSON.stringify(after.rows))) }; receipt.payloadStable = true;
  assert.equal(git(['rev-parse', 'HEAD']).trim(), process.env.GITHUB_SHA);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all', '-z']).split('\0').filter(Boolean); assert.ok(status.every(row => row.slice(0, 2) === ' M' && DERIVED.includes(row.slice(3)))); receipt.derivedWorktreePaths = status.map(row => row.slice(3)).sort();
  assert.deepEqual(fs.readFileSync(path.join(root, DERIVED[0])), nextManifest); assert.deepEqual(fs.readFileSync(path.join(root, DERIVED[1])), validationBytes);
  for (const name of DERIVED) assert.deepEqual(fs.readFileSync(path.join(evidence, 'derived', name)), fs.readFileSync(path.join(root, name)));
  receipt.generatedManifestValidated = true;
  receipt.derived = DERIVED.map(name => ({ path: name, ...identity(fs.readFileSync(path.join(root, name))) }));
  receipt.publicationResult = { status: validation.status, payloadFiles: validation.payload_files, syntaxChecks: validation.javascript_syntax_checks,
    credentialPatternScan: validation.credential_pattern_scan_passed, rootLinksResolve: validation.root_document_links_resolve,
    historical937Tests: validation.product_development.historical_937_recorded_tests_passed, finiteHosted282Tests: validation.finite_cloud_flow_vault.recordedPass };
  assert.equal(receipt.publicationResult.historical937Tests, 937); assert.equal(receipt.publicationResult.finiteHosted282Tests, 282);
  receipt.status = 'passed'; receipt.completedAtUtc = new Date().toISOString(); save(); event('terminal', { status: 'passed' }); console.log(JSON.stringify({ status: receipt.status, payload: receipt.payloadAfter, controls: receipt.controls, publication: receipt.publicationResult }));
} catch (error) {
  receipt.status = interrupted ? 'interrupted' : 'failed'; receipt.completedAtUtc = new Date().toISOString(); receipt.failure = { name: error.name, code: error.code ?? null, message: error.message }; save(); event('terminal', { status: receipt.status, failure: receipt.failure }); console.error(error.stack ?? error.message); process.exitCode = 1;
} finally { for (const [signal, handler] of handlers) process.off(signal, handler); fs.fsyncSync(events); fs.closeSync(events); }
