---
status: validation-pending
owner: team
milestone: 1
---

# Algorithm implementation demo

## What is implemented

**Algorithm:** Magic Byte Signature & MIME Validation with Quality Pre-Screening
(Algorithm 3 in the approved proposal).

**Paradigm:** bounded header inspection followed by structural image validation.

**Feature:** screening registration photo/ID files before private storage.

The production backend module is written; owner-run checks below must pass before
calling it validated. It is not mounted on a public upload route yet. Storage and
mobile submission integration remain T014–T017. CART and the proposed lifecycle FSM
are not demonstrated by this work. Existing authentication/OTP can be shown separately
as working security controls, not as substitutes for the proposed algorithms.

## Run before class

No API, database, Expo session, credentials or real documents are needed. Sharp is
already installed. The owner runs each command and stops on failure:

```powershell
cd C:\Dev\School\oak-sports-academy
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --project apps/api/tsconfig.tests.json --noEmit
cd apps/api
& C:\Users\ventura\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe ../../node_modules/vitest/vitest.mjs run tests/registration/image-validation.test.ts
node --import tsx scripts/demo-image-validation.ts
```

Expected: both typechecks pass, the focused suite passes, and the demo prints
`12/12 expected outcomes matched.` Any other result is pending/failing evidence,
not a successful demo. No installation or migration is part of this checkpoint.

For the live presentation, run only the last command from `apps/api`. It generates
deterministic synthetic images in memory and prints actual header bytes, byte counts,
accept/reject categories and measured local durations. These timings are illustrative,
not a complexity proof or a deployed performance benchmark.

## Three-minute walkthrough

1. Open `apps/api/src/modules/documents/image-validation.ts` and show the production
   function `validateRegistrationImage`.
2. Explain the PNG signature `89 50 4E 47 0D 0A 1A 0A` and JPEG prefix `FF D8 FF`.
   Renaming executable data to `.png` does not change those bytes.
3. Run the demo. Show genuine PNG/JPEG accepted, executable/SVG data rejected, and
   a genuine PNG rejected when its MIME/extension disagrees.
4. Show the forged-signature and truncated-pixel cases: a matching header alone
   is insufficient, so the decoder must successfully read the actual pixel data.
5. Show the 5 KiB–5 MiB and 400×400 minimum checks. Explain the additional decoder
   caps: 16 million pixels, 8192 pixels per side, four channels and a five-second
   processing timeout. Sharp's timeout excludes waiting for an available worker.
6. Show SHA-256 over the accepted byte snapshot and UUID-generated object names.
   The original filename is never used as a storage key. A checksum supports integrity
   comparison; it does not prove a document is authentic.

## Algorithm and complexity

```text
reject if actual bytes are outside allowed bounds
reject if an optional declared byte count disagrees
snapshot bytes before asynchronous work
detect PNG/JPEG from fixed signature bytes; reject other formats
reject if declared MIME or filename extension disagrees
read dimensions and reject unsupported/over-limit geometry
fully decode original pixels with bounded maintained decoder
reject any malformed/truncated input or decoder failure
return canonical MIME, dimensions, byte count, SHA-256, random filename and snapshot
```

Let n be encoded bytes and p be decoded pixels (with bounded channels). Fixed header
matching is O(1) time/additional space. The complete screening is O(n+p) work in the
input/decoded-data model and O(n+p) bounded working memory, including snapshot and
raw pixel output; do not describe the whole upload pipeline as O(1). Native codec
details are delegated to maintained Sharp/libvips, not a custom image decoder.

## Security controls and limits

The checks enforce an allowlist, reject misleading declarations, bound input and
decoded resources, discard supplied paths, and return safe errors. This module does
not fetch URLs or write files, make a bucket public, authenticate applicants, run OCR,
scan for all malware, or establish ID authenticity. Full authorization/consent before
storage is enforced by the later integration tasks. Request body and concurrency
limits must be enforced at the upload boundary before this buffer-based function.

Sharp documents that [metadata does not decode pixels](https://sharp.pixelplumbing.com/api-input/#metadata),
which is why this implementation also forces raw decoding. It uses the documented
[untrusted-input options](https://sharp.pixelplumbing.com/api-constructor/) and
[processing timeout](https://sharp.pixelplumbing.com/api-output/#timeout).

## GitHub links to prepare

Repository: [Oak Sports Academy](https://github.com/hex-xel/oak-sports-academy).
These branch links show the implementation **only after the owner commits and pushes**:

- [Production validator](https://github.com/hex-xel/oak-sports-academy/blob/feat/student-registration/apps/api/src/modules/documents/image-validation.ts)
- [Focused real-decoder tests](https://github.com/hex-xel/oak-sports-academy/blob/feat/student-registration/apps/api/tests/registration/image-validation.test.ts)
- [Offline demo runner](https://github.com/hex-xel/oak-sports-academy/blob/feat/student-registration/apps/api/scripts/demo-image-validation.ts)

After pushing, open each link in a browser before class. GitHub's file menu can copy
a permalink to the pushed commit so later branch changes do not alter the evidence.
Do not stage `.env`, private images, generated output or unrelated agent folders.

Suggested spoken status after validation passes:

> We have implemented the backend module for our proposed magic-byte and MIME
> validation algorithm and tested it against genuine, disguised and damaged image
> inputs. This demo runs the production validator directly. Integration into private
> document upload is next; CART and the lifecycle FSM remain in development.
