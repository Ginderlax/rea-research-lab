"""Original bounded reconstruction from KeePass 2.61.1 HmacOtp CIL observations.

This module does not import KeePass. It models Generate, including its observed
case-sensitive algorithm labels and strict explicit-offset admission boundary.
"""
import hashlib
import hmac

ALGORITHMS = {"HMAC-SHA-1": hashlib.sha1,
              "HMAC-SHA-256": hashlib.sha256,
              "HMAC-SHA-512": hashlib.sha512}


def checksum(value, digits):
    doubled = (0, 2, 4, 6, 8, 1, 3, 5, 7, 9)
    total = 0
    for position in range(digits):
        digit = value % 10
        value //= 10
        total += doubled[digit] if position % 2 == 0 else digit
    return (-total) % 10


def generate(secret, counter, digits=6, add_checksum=False, offset=-1, algorithm=None):
    if digits == 0 or digits > 8:
        return ""
    selected = "HMAC-SHA-1" if algorithm is None or algorithm == "" else algorithm
    if selected not in ALGORITHMS:
        return ""
    digest = hmac.new(secret or b"", counter.to_bytes(8, "big"), ALGORITHMS[selected]).digest()
    selected_offset = digest[-1] & 15
    # IL_00CB..IL_00DB: offset equal to len(digest)-4 falls back to dynamic.
    if 0 <= offset < len(digest) - 4:
        selected_offset = offset
    value = int.from_bytes(digest[selected_offset:selected_offset + 4], "big") & 0x7fffffff
    value %= 10 ** digits
    if add_checksum:
        value = value * 10 + checksum(value, digits)
    return str(value).zfill(digits + int(add_checksum))


def time_otp(secret, unix_seconds, step=30, digits=6, algorithm=None):
    """Explicit nonnegative UTC seconds only; current-clock overload is excluded."""
    return generate(secret, int(unix_seconds) // (step or 30), digits, False, -1, algorithm)
