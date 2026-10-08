# PiN TO! Quiz Arena

เว็บควิซภาษาไทยบน Cloudflare Workers + SQLite Durable Objects พร้อมโลโก้และมาสคอต PiN TO!

เว็บไซต์: https://pinto-quiz.breszdev.workers.dev

GitHub (Private): https://github.com/jatura-fakduai/pinto-quiz

มีบัญชีผู้จัดแรกและ Quiz เริ่มต้น 2 ชุดพร้อมใช้งาน ข้อมูลเข้าใช้เก็บในไฟล์ `pinto-access.txt` ของผู้ใช้ภายนอก repository และไม่ถูก commit

## ใช้งาน

- `/` — ผู้เล่นกรอก PIN
- `/play/123456` — มือถือผู้เล่น; QR เปิดเส้นทางนี้โดยไม่ต้องกรอก PIN ซ้ำ
- `/login` — Login ผู้จัด; สมัครสาธารณะปิดอยู่
- `/admin` — Quiz ของผู้จัดแต่ละบัญชี
- `/host/123456` — จอใหญ่พร้อม PIN, QR, รายชื่อ, คำถาม, เวลา, เฉลย, อันดับ และปุ่มควบคุม

สร้าง Quiz → เปิดห้อง → ผู้เล่นตั้งชื่อ → ผู้จัดเริ่ม → ตอบ → เฉลยพร้อมกัน → อันดับ → ข้อถัดไป → ผลสุดท้าย

ผู้เล่นไม่ต้องมีบัญชี ผู้จัดต้องเข้าสู่ระบบก่อนจัดการ Quiz หรือห้องของตนเอง คำตอบที่ถูกและคะแนนของข้อปัจจุบันจะไม่ถูกส่งให้มือถือก่อนเฉลย เซิร์ฟเวอร์เป็นผู้ตรวจคำตอบ เวลา และคะแนน ป้องกันการตอบซ้ำและการส่งคำตอบจากข้อก่อนหน้า

## พัฒนาในเครื่อง

ต้องมี Node.js 24 และ npm

```sh
npm ci
cp .dev.vars.example .dev.vars
# แก้ SETUP_TOKEN ใน .dev.vars เป็นค่าสุ่มยาวเฉพาะเครื่อง ห้าม commit ไฟล์นี้
npm run dev
```

เปิด `http://localhost:8787` การแก้ frontend ต้อง `npm run build` อีกครั้ง หรือเปิด Vite แยกด้วย `npx vite --host 127.0.0.1` (proxy API ไป 8787)

```sh
npm run seed
```

จำลองฐานข้อมูลในเครื่อง (ต้องเปิด `npm run dev` ไว้): สร้างบัญชี `demo@pinto.local` / `pinto-demo-2026` (Quiz 3 ชุด) และ `host2@pinto.local` / `pinto-host2-2026` (Quiz 1 ชุด) รันซ้ำได้โดยไม่สร้างซ้ำ ใช้ได้เฉพาะ localhost ล้างข้อมูลทั้งหมดได้ด้วยการลบ `.wrangler/state`

```sh
npm run account:create
```

คำสั่งจะถาม URL, อีเมล, ชื่อ, รหัสผ่าน และ SETUP_TOKEN โดยปิดการแสดงรหัสผ่าน/token บนจอ ใช้สร้างบัญชีผู้จัดที่อนุญาตเพิ่มได้ ไม่มี public signup endpoint ที่เรียกได้โดยไม่มี secret บัญชีที่มีอยู่จะไม่ถูกเปลี่ยนรหัสผ่านด้วยคำสั่งนี้

```sh
npm run check
# ต้องเปิด npm run dev ในอีก terminal ก่อน
npm run test:integration
```

Integration test ใช้ได้เฉพาะ localhost สร้างบัญชี/Quiz/ห้องชั่วคราวในฐานข้อมูลจำลอง ตรวจสิทธิ์บัญชีและผู้จัด, WebSocket, การไม่เผยเฉลยก่อนเวลา, ตอบซ้ำ/ตอบข้อเก่า, reconnect, alarm หมดเวลา, คะแนนสุดท้าย, CSRF และ logout

## Cloudflare และ GitHub Actions

Repository นี้ตั้งค่า `.github/workflows/deploy.yml`:

- Push `main` → ตรวจ TypeScript, unit tests, build, dry-run และ integration → deploy
- Pull request → ตรวจทั้งหมด แต่ไม่ deploy
- เรียก workflow ด้วยมือได้
- จำกัดสิทธิ์ workflow เป็น `contents: read`; งานจาก pull request ไม่ได้รับ deployment secrets

Repository Actions secrets ที่ต้องมี:

| Secret | หน้าที่ |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | บัญชีที่จะ deploy |
| `CLOUDFLARE_API_TOKEN` | Token ถาวรสำหรับ CI |

API token ต้อง scope เฉพาะบัญชีเป้าหมาย และมี `Account / Workers Scripts / Edit` กับ `Account / Account Settings / Read` สร้างได้จาก Cloudflare Profile → API Tokens → Create Custom Token แล้วบันทึกใน GitHub Settings → Secrets and variables → Actions ห้ามบันทึก token ใน source หรือส่งลง issue/log

หลัง deploy ครั้งแรก ให้ตั้ง runtime secret `SETUP_TOKEN` ด้วย `npx wrangler secret put SETUP_TOKEN` แล้วใช้ `npm run account:create` สร้างบัญชีแรก ผู้จัด login ได้หลังมีบัญชีเท่านั้น

```sh
npx wrangler login
npm run deploy
npx wrangler secret put SETUP_TOKEN
```

Durable Objects ใช้ SQLite (`new_sqlite_classes`) ซึ่งรองรับ Free plan; frontend ใช้ Workers Static Assets ไม่มี D1/R2 หรือบริการเสียเงินอื่นที่ต้อง provision เพิ่ม โควตาของ Cloudflare ยังมีผลเมื่อใช้งานมาก ไม่ได้เปิดการซื้อแพ็กเกจหรืออัปเกรดโดยอัตโนมัติ

## การออกแบบและข้อจำกัดเวอร์ชันแรก

- ธีมเขียว ครีม กรมท่า พร้อม mascot chibi รุ่นใหม่และการ์ดสีพาสเทล; assets ต้นฉบับยังเก็บไว้
- Responsive สำหรับ Mobile, Tablet และ Desktop; editor เลื่อนแถบคำถามบนมือถือได้
- จอผู้จัดขณะเล่นบนจอขนาดตั้งแต่ 700×500 จะจัดฉากให้พอดีหนึ่งหน้าจอ ปรับสเกลตามเนื้อหาและพื้นที่โดยไม่ตัดคำอธิบาย; หน้าเฉลยแยกสองฝั่งและปุ่มควบคุมอยู่ครบ
- จอผู้จัดแสดง podium 3 อันดับและรายการ 5 อันดับแรก; มือถือยังเห็นอันดับของตัวเองจากผู้เล่นทั้งห้อง
- ทุกข้อมีช่วงเตรียมตัว 3–2–1 ที่เซิร์ฟเวอร์ควบคุม ก่อนเริ่มเวลาตอบจริง; ซ่อนคำถามและปฏิเสธคำตอบในช่วงนี้
- ตัวจับเวลาแบบวงแหวนและแถบเวลา คะแนนที่คาดหากตอบถูก เอฟเฟกต์เฉลย และ podium 3 อันดับแรก
- ลด animation ตาม `prefers-reduced-motion`; confetti หยุดเองหลังเล่นจบ
- ปิดรับคำตอบและเฉลยอัตโนมัติเมื่อหมดเวลา ด้วย Durable Object alarm
- หากผู้เล่นทุกคนในห้องตอบครบ จะปิดข้อและเฉลยทันที; ผู้เล่นที่หลุดยังนับอยู่และใช้เวลาหมดเป็น fallback
- คะแนนตอบถูก 50–100% ของคะแนนสูงสุดตามเวลาที่เซิร์ฟเวอร์ได้รับ; ตอบผิด/หลัง deadline = 0
- เสียงต้นฉบับอยู่ในคีย์ F# major และ tempo เดียวกับเพลง theme: เสียงเตรียมตัว/เริ่ม/ส่งคำตอบ/ถูก/ผิด/จบเกม render จาก `scripts/render-sfx.ts` (marimba, kalimba, ไม้เคาะ; `npm run sfx` ต้องมี ffmpeg) ส่วนจังหวะนับถอยหลัง เสียง tick ทุกวินาที (เมื่อไม่มีเพลง) และเสียงเร่ง 5 วินาทีสุดท้ายเป็นเสียงไม้ที่สังเคราะห์สดด้วย Web Audio; ต้องกดเปิดเสียงในแต่ละการโหลดหน้า และผู้จัดปิดเสียงทั้ง Quiz ได้
- ห้องมีอายุ 24 ชั่วโมง; ข้อมูลผู้เล่น/คำตอบลบเมื่อหมดอายุ
- ตั้งเพดาน 300 ผู้เล่นต่อห้อง เป็นเพดานของแอป **ยังไม่ใช่ความจุที่ยืนยันด้วย load test 300 คน**
- จำกัด 100 Quiz ต่อบัญชี และ 100 คำถามต่อ Quiz
- เก็บคำตอบและคะแนนใน SQLite; WebSocket ใช้ Hibernation และ ping auto-response
- Session ผู้จัด 24 ชั่วโมง ผ่าน HttpOnly/SameSite cookie; HTTPS ใช้ Secure cookie; เก็บ token เป็น hash
- ผู้ดูแลที่ถือ `SETUP_TOKEN` เปลี่ยนอีเมล/รหัสผ่านผ่าน `POST /api/accounts/change-login` ได้ (`currentEmail`, `email`, `password`); endpoint นี้ไม่เปิดใน UI สมัครสมาชิก และเปลี่ยนแล้วจะยกเลิกทุก session เดิม
- เปลี่ยนข้อมูล Login โดยใช้ alias ของอีเมล เพื่อคง storage, ID ของ Quiz และเจ้าของห้องเดิม; รหัสผ่านสำหรับ endpoint เปลี่ยนบัญชีมี 8–128 ตัวอักษร ส่วนสร้างบัญชีใหม่ยังเป็น 12–128
- รองรับหลายบัญชีด้วย storage แยกตาม account; สมัครสาธารณะ, reset password, email verification และ billing ยังไม่ได้เปิด
- ถ้าใช้จากหลายอุปกรณ์จริง ให้ใช้ URL ที่ deploy แล้ว หรือ development URL ที่โทรศัพท์เข้าถึงได้; QR localhost เปิดบนมือถืออื่นไม่ได้

## โครงสร้าง

`web/` UI, QR และเสียง · `src/worker.ts` API · `src/accounts.ts` บัญชี/Quiz/rate limits · `src/room.ts` ห้องเกม · `src/shared.ts` validation/scoring · `scripts/` provisioning/integration/render เสียง · `.github/workflows/` CI/CD
