#!/usr/bin/env python3
"""Sprachdateien für die Übungsansagen erzeugen (F16, B10, F23).

Liest den Satzkatalog der App (tests/snapshots/voice-katalog.json, erzeugt von der Testseite mit „Sprachkatalog
exportieren“ bzw. dem Test voice.test.js) und legt für jeden Satz ohne Datei eine MP3 an:

    public/audio/voice/<sprache>/<schlüssel>.mp3     MPEG-2 Layer III, mono, 32 kbit/s (LAME wählt bei 32 kbit/s 22,05 kHz;
                                                     die ersten 296 Dateien haben 24 kHz, beides spielen alle Browser)
    public/audio/voice/manifest.json                 {voice:{de,en}, items:{de:{schlüssel:[datei, ms]}, en:{…}}}

Schlüssel: FNV-1a 32 Bit über „<stimme>|<sprache>|<text>“, identisch mit vcKey() in src/js/45-stimme.js.
Stimmen: Piper (https://github.com/OHF-Voice/piper1-gpl), de_DE-thorsten-high und en_GB-cori-high.

Einrichten (einmalig, lokal im Projekt, nicht im Repository):
    python3 -m venv .tools/venv && .tools/venv/bin/pip install piper-tts lameenc
    cd .tools/voices && ../venv/bin/python -m piper.download_voices de_DE-thorsten-high en_GB-cori-high

Aufruf:
    .tools/venv/bin/python tools/tts/generate.py            fehlende Dateien erzeugen, Manifest aktualisieren
    .tools/venv/bin/python tools/tts/generate.py --check    nur prüfen (Rückgabewert 1, wenn Dateien fehlen)
    .tools/venv/bin/python tools/tts/generate.py --prune    zusätzlich Dateien entfernen, die kein Satz mehr nutzt
"""
import json
import os
import sys
import wave
import io

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VOICE_DIR = os.path.join(ROOT, 'public', 'audio', 'voice')
MANIFEST = os.path.join(VOICE_DIR, 'manifest.json')
CATALOG = os.path.join(ROOT, 'tests', 'snapshots', 'voice-katalog.json')
MODELS = os.path.join(ROOT, '.tools', 'voices')
VOICES = {'de': 'de_DE-thorsten-high', 'en': 'en_GB-cori-high'}
KBPS = 32
# Ein MPEG-2-Layer-III-Frame hat 576 Abtastwerte. Browser geben ohne LAME-Kopf Encoder-Verzögerung und Auffüllung mit aus;
# die Sprechdauer im Manifest ist die dekodierte Länge (gemessen an den bestehenden Dateien, siehe frames_ms).
FRAME = 576


def fnv(s):
    h = 0x811c9dc5
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return '%08x' % h


def key(lang, text):
    return fnv(f'piper:{VOICES[lang]}|{lang}|{text}')


def frames(mp3):
    """Anzahl MPEG-Frames und Abtastrate (Kopf-für-Kopf, ohne ID3)."""
    n, i, rate = 0, 0, 0
    while i + 4 <= len(mp3):
        h = int.from_bytes(mp3[i:i + 4], 'big')
        if (h >> 21) & 0x7ff != 0x7ff:
            break
        ver, layer, br_i, sr_i, pad = (h >> 19) & 3, (h >> 17) & 3, (h >> 12) & 15, (h >> 10) & 3, (h >> 9) & 1
        if layer != 1 or br_i in (0, 15) or sr_i == 3:
            break
        mpeg2 = ver != 3
        br = ([0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] if mpeg2 else [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320])[br_i] * 1000
        sr = ([22050, 24000, 16000] if ver == 2 else [11025, 12000, 8000] if ver == 0 else [44100, 48000, 32000])[sr_i]
        size = (72 if mpeg2 else 144) * br // sr + pad
        n, rate = n + 1, sr
        i += size
    return n, rate


def frames_ms(mp3):
    """Dekodierte Länge in ms, wie Chrome/Safari sie ausgeben (Frames × 576 / Abtastrate, siehe DECODER_LAG)."""
    n, rate = frames(mp3)
    return round((n * FRAME - DECODER_LAG) * 1000 / rate)


DECODER_LAG = 0  # Abtastwerte. Mit lameenc erzeugte Dateien (22,05 kHz): Browser geben alle Frames aus (gemessen ±1 ms).
                 # Die ersten 296 Dateien (24 kHz, anderer Encoder) haben im Manifest gemessene Werte und bleiben unberührt.


def synth(voice, text):
    import lameenc
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        voice.synthesize_wav(text, w)
    buf.seek(0)
    with wave.open(buf, 'rb') as r:
        sr, pcm = r.getframerate(), r.readframes(r.getnframes())
    enc = lameenc.Encoder()
    enc.set_bit_rate(KBPS)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    return bytes(enc.encode(pcm) + enc.flush())


def main():
    check, prune = '--check' in sys.argv, '--prune' in sys.argv
    with open(CATALOG, encoding='utf-8') as f:
        cat = json.load(f)
    cat = cat.get('katalog', cat)
    with open(MANIFEST, encoding='utf-8') as f:
        man = json.load(f)
    if man.get('voice') != {l: 'piper:' + v for l, v in VOICES.items()}:
        raise SystemExit('Manifest nennt andere Stimmen als dieses Skript.')
    missing = [(l, t) for l in ('de', 'en') for t in cat[l] if key(l, t) not in man['items'][l]
               or not os.path.isfile(os.path.join(VOICE_DIR, l, man['items'][l][key(l, t)][0]))]
    unused = {l: [k for k in man['items'][l] if k not in {key(l, t) for t in cat[l]}] for l in ('de', 'en')}
    print(f'Katalog: {len(cat["de"])} de, {len(cat["en"])} en · fehlend: {len(missing)} · ungenutzt: {sum(map(len, unused.values()))}')
    if check:
        for l, t in missing[:20]:
            print(f'  fehlt [{l}] {t}')
        sys.exit(1 if missing else 0)
    if missing:
        from piper import PiperVoice
        loaded = {}
        for i, (l, t) in enumerate(missing, 1):
            if l not in loaded:
                loaded[l] = PiperVoice.load(os.path.join(MODELS, VOICES[l] + '.onnx'))
            k, mp3 = key(l, t), synth(loaded[l], t)
            with open(os.path.join(VOICE_DIR, l, k + '.mp3'), 'wb') as f:
                f.write(mp3)
            man['items'][l][k] = [k + '.mp3', frames_ms(mp3)]
            print(f'  [{i}/{len(missing)}] {l} {k} {len(mp3) / 1024:.1f} KB  {t[:70]}')
    if prune:
        for l, ks in unused.items():
            for k in ks:
                p = os.path.join(VOICE_DIR, l, man['items'][l][k][0])
                if os.path.isfile(p):
                    os.remove(p)
                del man['items'][l][k]
        print('Entfernt:', sum(map(len, unused.values())))
    for l in ('de', 'en'):
        man['items'][l] = dict(sorted(man['items'][l].items()))
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, separators=(',', ':'))
    size = sum(os.path.getsize(os.path.join(VOICE_DIR, l, v[0])) for l in ('de', 'en') for v in man['items'][l].values())
    print(f'Manifest: {len(man["items"]["de"])} de, {len(man["items"]["en"])} en · Audio gesamt {size / 1024 / 1024:.2f} MB')


if __name__ == '__main__':
    main()
