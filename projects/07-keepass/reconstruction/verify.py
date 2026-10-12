"""Generate a deterministic held-out differential corpus and compare its oracle."""
import json
from pathlib import Path
import random
import subprocess
from otp_model import generate, time_otp

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / "evidence"
rng = random.Random(76112026)
cases = []


def add(**case):
    case["id"] = f"K{len(cases):04d}"
    cases.append(case)


key = b"12345678901234567890".hex()
for counter in range(10):
    add(kind="hotp", secret_hex=key, counter=str(counter), digits=6,
        checksum=False, offset=-1, algorithm="HMAC-SHA-1")
for algorithm, size in [(None, 20), ("", 20), ("HMAC-SHA-1", 20),
                        ("HMAC-SHA-256", 32), ("HMAC-SHA-512", 64),
                        ("hmac-sha-1", 20), ("unknown", 20)]:
    for digits in [0, 1, 6, 8, 9]:
        for offset in [-2, -1, 0, size-5, size-4, size-3, 99]:
            add(kind="hotp", secret_hex=key, counter="123456789", digits=digits,
                checksum=bool(rng.getrandbits(1)), offset=offset, algorithm=algorithm)
for i in range(200):
    secret = None if i % 17 == 0 else rng.randbytes(rng.choice([0, 1, 8, 20, 32, 64, 100])).hex()
    add(kind="hotp", secret_hex=secret,
        counter=str(rng.choice([0, 1, 2**32-1, 2**32, 2**64-1, rng.getrandbits(64)])),
        digits=rng.randint(1, 8), checksum=bool(rng.getrandbits(1)),
        offset=rng.choice([-1, 0, 15, 16, 27, 28, 59, 60, 2147483647]),
        algorithm=rng.choice([None, "", "HMAC-SHA-1", "HMAC-SHA-256", "HMAC-SHA-512"]))
for seconds in [0, 1, 29, 30, 59, 1111111109, 1111111111, 1234567890, 2000000000, 20000000000]:
    for step in [0, 30, 60]:
        add(kind="totp", secret_hex=key, seconds=seconds, step=step, digits=8, algorithm="HMAC-SHA-1")
EVIDENCE.mkdir(exist_ok=True)
(EVIDENCE / "test-cases.json").write_text(json.dumps(cases, indent=2), encoding="utf-8")
subprocess.run(["powershell.exe", "-NoProfile", "-File", str(ROOT / "reconstruction/collect-oracle.ps1")], check=True)
oracle = json.loads((EVIDENCE / "oracle-results.json").read_text(encoding="utf-8-sig"))
failures = []
for case, row in zip(cases, oracle["rows"]):
    secret = None if case["secret_hex"] is None else bytes.fromhex(case["secret_hex"])
    expected = (time_otp(secret, case["seconds"], case["step"], case["digits"], case["algorithm"])
                if case["kind"] == "totp" else
                generate(secret, int(case["counter"]), case["digits"], case["checksum"], case["offset"], case["algorithm"]))
    if row["error"] or expected != row["value"]:
        failures.append(dict(id=case["id"], model=expected, oracle=row["value"], error=row["error"]))
rfc4226 = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"]
rfc_pass = [r["value"] for r in oracle["rows"][:10]] == rfc4226
summary = dict(cases=len(cases), passed=len(cases)-len(failures), failures=failures,
               rfc4226_known_answer_passed=rfc_pass, seed=76112026,
               claim="finite corpus agreement only; no whole-program equivalence")
(EVIDENCE / "verification.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
print(json.dumps(summary, indent=2))
assert not failures and rfc_pass
