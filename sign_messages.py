import base64
from nacl.signing import SigningKey

def sign(bytestr_for_key_init, msg):
    """
    Takes in a bytestr to initialize a signing key and a message to sign, 0 pads the bytestr, then signs the message
    outputs the verification key, signature, and message.
    """
    while len(bytestr_for_key_init)<32:
        bytestr_for_key_init+=b"0"
    sample_key = SigningKey(bytestr_for_key_init)
    sig = sample_key.sign(msg)
    return base64.b64encode(bytes(sample_key.verify_key)), base64.b64encode(sig.signature), base64.b64encode(sig.message)

print(sign(b"seed", b"17"))
print(sign(b"otherseed", b"3"))
print(sign(b"otherseed", b"17"))

