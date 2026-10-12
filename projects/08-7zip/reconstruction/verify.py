import json
from pathlib import Path
import random
import subprocess
from property_model import property_value, signature_candidate

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / "evidence"
rng = random.Random(726042026)
cases = []
# Property IDs beyond calibration scope, plus boundary indices and exact valid IDs.
for index in [0, 1, 2, 2**16-1, 2**31, 2**32-1]:
    for prop in list(range(20)) + [255, 2**16-1, 2**31, 2**32-1]:
        cases.append(dict(index=index, property=prop))
for _ in range(256):
    cases.append(dict(index=rng.choice([0, 1, rng.getrandbits(32)]),
                      property=rng.choice(list(range(15)) + [rng.getrandbits(32)])))
(EVIDENCE / "heldout-cases.json").write_text(json.dumps(cases, indent=2), encoding="utf-8")
subprocess.run(["powershell.exe", "-NoProfile", "-File", str(ROOT / "reconstruction/verify-oracle.ps1")], check=True)
oracle = json.loads((EVIDENCE / "heldout-oracle.json").read_text(encoding="utf-8-sig"))
failures=[]
for case, row in zip(cases, oracle["rows"]):
    model = property_value(**dict(index=case["index"], prop=case["property"]))
    if model != row:
        failures.append(dict(case=case, model=model, oracle=row))
magic=bytes.fromhex("377abcaf271c")
signature_cases=[(b"",False),(magic[:5],False),(magic,True),(magic+b"invalid",True),(b"\0"+magic,False)]
for position in range(6):
    data=bytearray(magic);data[position]^=1;signature_cases.append((bytes(data),False))
signature_pass=all(signature_candidate(data)==expected for data,expected in signature_cases)
result=dict(cases=len(cases),passed=len(cases)-len(failures),failures=failures,
            signature_candidate_tests=len(signature_cases),signature_candidate_passed=signature_pass,
            seed=726042026,claim="finite export behavior agreement, one released descriptor; no archive decompressor reconstruction")
(EVIDENCE / "verification.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
print(json.dumps(result,indent=2))
assert not failures and signature_pass
