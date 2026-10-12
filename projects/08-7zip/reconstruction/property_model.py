"""Original bounded 7za.dll 26.04 property-dispatch model.

Control flow comes from REA/Ghidra GetHandlerProperty2 pseudocode. The single
7z descriptor constants were calibrated from released export observations.
Allocation failures and arbitrary memory/ABI misuse are outside this model.
"""
DESCRIPTOR = {"name": "7z", "extension": "7z", "alternate": None,
              "identifier_byte": 7, "signature": "377abcaf271c",
              "signature_length": 6, "signature_offset": 0,
              "flags": 868360, "time_flags": 1, "can_update": True}
VT_EMPTY, VT_BSTR, VT_BOOL, VT_UI4 = 0, 8, 11, 19


def property_value(index, prop):
    result = dict(index=index, property=prop, hresult=0, variant_type=VT_EMPTY, value=None)
    if index >= 1:
        result["hresult"] = 0x80070057
        return result
    d = DESCRIPTOR
    flags = d["flags"]
    if prop == 0:
        result.update(variant_type=VT_BSTR, value=d["name"])
    elif prop == 1:
        # Little-endian byte layout emitted by two native stack writes.
        raw = bytes.fromhex("690f1723c1408a271000000110000000")
        raw = raw[:13] + bytes([d["identifier_byte"]]) + raw[14:]
        result.update(variant_type=VT_BSTR, value=raw.hex())
    elif prop == 2:
        result.update(variant_type=VT_BSTR, value=d["extension"])
    elif prop == 3 and d["alternate"] is not None:
        result.update(variant_type=VT_BSTR, value=d["alternate"])
    elif prop in (4, 5, 9, 10):
        value = d["can_update"] if prop == 4 else bool(flags & (1 << {5: 0, 9: 1, 10: 2}[prop]))
        result.update(variant_type=VT_BOOL, value=str(value).lower())
    elif prop in (6, 7) and d["signature_length"] and bool(flags & 16) == (prop == 7):
        result.update(variant_type=VT_BSTR, value=d["signature"])
    elif prop in (8, 11, 12):
        value = {8: d["signature_offset"], 11: flags, 12: d["time_flags"]}[prop]
        result.update(variant_type=VT_UI4, value=str(value))
    return result


def signature_candidate(data):
    """Candidate at offset zero only; it does not validate archive integrity."""
    magic = bytes.fromhex(DESCRIPTOR["signature"])
    return len(data) >= len(magic) and data.startswith(magic)
