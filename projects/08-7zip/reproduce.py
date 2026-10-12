"""Preserve historical evidence while replaying 7za.dll property comparisons.

Default: compare the model with captured released-export observations.
--live: invoke hash-verified local x64 7za.dll exports with synthetic integers.
SPDX-License-Identifier: LGPL-2.1-or-later
"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import uuid

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "reconstruction"))
from property_model import property_value, signature_candidate

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--live", action="store_true")
parser.add_argument("--dll", type=Path, default=ROOT / "artifacts/extra/x64/7za.dll")
args = parser.parse_args()
run = ROOT / "artifacts" / ("replay-" + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8])
run.mkdir(parents=True, exist_ok=False)
cases = json.loads((ROOT / "evidence/heldout-cases.json").read_text(encoding="utf-8-sig"))
oracle_path = ROOT / "evidence/heldout-oracle.json"
expected_hash = "e70d353e9a0f2d1755ab0a7a7100060ab1e70e47141c248e968364579a329a94"
if args.live:
    assert hashlib.sha256(args.dll.read_bytes()).hexdigest() == expected_hash, "DLL SHA-256 mismatch"
    oracle_path = run / "heldout-oracle.json"
    subprocess.run(["powershell.exe", "-NoProfile", "-File", str(ROOT / "reconstruction/verify-oracle.ps1"),
                    "-DllPath", str(args.dll.resolve()), "-CasesPath", str(ROOT / "evidence/heldout-cases.json"),
                    "-OutputPath", str(oracle_path)], check=True)
oracle = json.loads(oracle_path.read_text(encoding="utf-8-sig"))
assert oracle["assembly_sha256"] == expected_hash and oracle["format_count"] == 1, "Oracle artifact mismatch"
assert len(cases) == len(oracle["rows"]) == 400, "Missing or extra oracle rows"
failures = []
for case, row in zip(cases, oracle["rows"]):
    assert case["index"] == row["index"] and case["property"] == row["property"], "Oracle row order mismatch"
    value = property_value(case["index"], case["property"])
    if value != row:
        failures.append({"case": case, "model": value, "oracle": row})
unique = {(c["index"], c["property"]) for c in cases}
calibration = json.loads((ROOT / "evidence/native-oracle.json").read_text(encoding="utf-8-sig"))
calibration_inputs = {(r["index"], r["property"]) for r in calibration["rows"]}
magic = bytes.fromhex("377abcaf271c")
signature_cases = [(b"", False), (magic[:5], False), (magic, True), (magic + b"invalid", True), (b"\0" + magic, False)]
for i in range(6):
    altered = bytearray(magic)
    altered[i] ^= 1
    signature_cases.append((bytes(altered), False))
signature_pass = all(signature_candidate(data) == wanted for data, wanted in signature_cases)
result = {"mode": "live-differential" if args.live else "captured-oracle-replay", "cases": len(cases),
          "unique_inputs": len(unique), "novel_unique_inputs_after_calibration": len(unique - calibration_inputs),
          "passed": len(cases) - len(failures), "failures": failures, "model_only_signature_checks": len(signature_cases),
          "signature_candidate_passed": signature_pass, "oracle_sha256": hashlib.sha256(oracle_path.read_bytes()).hexdigest(),
          "scope": "single descriptor export behavior; signature candidate checks do not validate archives"}
(run / "verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({**result, "output_directory": str(run)}, indent=2))
assert not failures and signature_pass and len(unique) == 255 and len(unique - calibration_inputs) == 207
