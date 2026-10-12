"""Preserve historical evidence while replaying the bounded OTP comparison.

Default: compare the published model with captured released-assembly observations.
--live: call the hash-verified local released assembly, using synthetic inputs only.
SPDX-License-Identifier: GPL-2.0-or-later
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
from otp_model import generate, time_otp

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--live", action="store_true")
parser.add_argument("--assembly", type=Path, default=ROOT / "artifacts/portable/KeePass.exe")
args = parser.parse_args()
run = ROOT / "artifacts" / ("replay-" + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8])
run.mkdir(parents=True, exist_ok=False)
cases = json.loads((ROOT / "evidence/test-cases.json").read_text(encoding="utf-8-sig"))
oracle_path = ROOT / "evidence/oracle-results.json"
expected_hash = "04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a"
if args.live:
    assert hashlib.sha256(args.assembly.read_bytes()).hexdigest() == expected_hash, "Assembly SHA-256 mismatch"
    oracle_path = run / "oracle-results.json"
    subprocess.run(["powershell.exe", "-NoProfile", "-File", str(ROOT / "reconstruction/collect-oracle.ps1"),
                    "-AssemblyPath", str(args.assembly.resolve()), "-CasesPath", str(ROOT / "evidence/test-cases.json"),
                    "-OutputPath", str(oracle_path)], check=True)
oracle = json.loads(oracle_path.read_text(encoding="utf-8-sig"))
assert oracle["assembly_sha256"] == expected_hash, "Oracle artifact mismatch"
assert len(cases) == len(oracle["rows"]) == 485, "Missing or extra oracle rows"
failures = []
for case, row in zip(cases, oracle["rows"]):
    assert case["id"] == row["id"], "Oracle row order mismatch"
    secret = None if case["secret_hex"] is None else bytes.fromhex(case["secret_hex"])
    value = (time_otp(secret, case["seconds"], case["step"], case["digits"], case["algorithm"])
             if case["kind"] == "totp" else
             generate(secret, int(case["counter"]), case["digits"], case["checksum"], case["offset"], case["algorithm"]))
    if row["error"] or value != row["value"]:
        failures.append({"id": case["id"], "model": value, "oracle": row})
unique = len({json.dumps({k: v for k, v in c.items() if k != "id"}, sort_keys=True) for c in cases})
normalized_inputs = []
for case in cases:
    normalized = {k: v for k, v in case.items() if k != "id"}
    normalized["secret_hex"] = normalized["secret_hex"] or ""
    normalized["algorithm"] = normalized["algorithm"] or "HMAC-SHA-1"
    if normalized["kind"] == "totp":
        normalized["step"] = normalized["step"] or 30
    normalized_inputs.append(json.dumps(normalized, sort_keys=True))
rfc = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"]
result = {"mode": "live-differential" if args.live else "captured-oracle-replay", "cases": len(cases),
          "unique_inputs": unique, "normalized_unique_inputs": len(set(normalized_inputs)),
          "normalization": "null secret to empty; null/empty algorithm to HMAC-SHA-1; TOTP zero step to 30",
          "passed": len(cases) - len(failures), "failures": failures,
          "rfc4226_known_answer_passed": [r["value"] for r in oracle["rows"][:10]] == rfc,
          "oracle_sha256": hashlib.sha256(oracle_path.read_bytes()).hexdigest(),
          "scope": "finite synthetic OTP corpus; no vault or whole-product claim"}
(run / "verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({**result, "output_directory": str(run)}, indent=2))
assert not failures and result["rfc4226_known_answer_passed"] and unique == 485 and len(set(normalized_inputs)) == 430
