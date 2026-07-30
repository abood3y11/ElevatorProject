# دليل تثبيت Claude Skills لمشروع ELMS

> هذا الدليل يشرح كيف تثبّت المهارات (Skills) المختارة من ريبو `alirezarezvani/claude-skills` على جهازك، وكيف تتأكد أنها اشتغلت، وكيف ترتبط بـ Codex Workflow Playbook.

---

## 1. ليش هذه المهارات بالذات؟

مشروع ELMS فيه أربعة جوانب: Frontend (AdminPortal + mobile apps)، Backend (FastAPI + WhatsApp)، Testing/QA، و DevOps (Docker + VPS). اخترنا المهارات اللي تخدم هذه الجوانب فقط، وتركنا المهارات اللي ما تخص المشروع (مثل ML، Computer Vision، Stripe، AWS Solution Architect…).

| المهارة                  | متى تشتغل                                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| `senior-frontend`        | تعديل واجهة AdminPortal أو المهام الـ RTL/Tailwind                      |
| `senior-backend`         | تعديل FastAPI endpoints أو services أو Alembic migrations                |
| `senior-fullstack`       | تعديل FE + BE في نفس المهمة                                              |
| `senior-architect`       | قرار معماري، تقسيم module، scaling                                       |
| `senior-qa`              | كتابة اختبارات أو استراتيجية اختبار                                       |
| `tdd-guide`              | منطق حرج (dispatch، emergency، alarms) — TDD                            |
| `senior-devops`          | Dockerfile، docker-compose، نشر VPS                                      |
| `senior-security`        | auth، secrets، تدقيق أمني                                                |
| `code-reviewer`          | مراجعة PR أو refactor                                                    |
| `adversarial-reviewer`   | رأي ثاني نقدي على تغيير حرج                                              |
| `incident-response`      | وقت ينقطع الـ admin أو الـ API في الإنتاج                                |
| `epic-design`            | الحفاظ على اتساق design system بين AdminPortal والـ apps                |

---

## 2. متطلبات قبل التثبيت

- **Git** مثبّت (`git --version` يطلع رقم).
- **Claude Code CLI** مثبّت (`claude --version`).
- إما **Git Bash** (يجي مع Git for Windows) أو **PowerShell** — الاثنين مدعومين.

---

## 3. التثبيت

اختر طريقة واحدة فقط:

### الطريقة A — Git Bash (الأسرع)

افتح Git Bash، روح لمجلد المشروع، ونفّذ:

```bash
cd /c/Dev/ElevatorProject
bash scripts/install-skills.sh
```

### الطريقة B — PowerShell

افتح PowerShell، روح لمجلد المشروع، ونفّذ:

```powershell
cd C:\Dev\ElevatorProject
powershell -ExecutionPolicy Bypass -File .\scripts\install-skills.ps1
```

كلا السكربتين:

1. يعملان clone مؤقت للريبو.
2. ينسخان فقط المهارات المختارة (12 مهارة) إلى `~/.claude/skills/`.
3. ينسخان كل مهارة بشكل مفلطح (`~/.claude/skills/senior-frontend/SKILL.md`) — مش متداخل.
4. ينظفان الـ clone المؤقت بعد التثبيت.
5. يعيدان التثبيت لو شغّلت السكربت مرة ثانية (idempotent).

---

## 4. التحقق من نجاح التثبيت

### من الـ shell

```bash
ls ~/.claude/skills/
```

المفروض تشوف 12 مجلد على الأقل:

```
adversarial-reviewer  epic-design          senior-architect   senior-devops      senior-frontend    senior-qa
code-reviewer         incident-response    senior-backend     senior-fullstack   senior-security    tdd-guide
```

تأكد أن `SKILL.md` موجود داخل أي مجلد:

```bash
ls ~/.claude/skills/senior-frontend/SKILL.md
```

### من داخل Claude Code

أعد تشغيل Claude Code (اخرج بـ `/exit` ثم افتحه)، وبعدها نفّذ:

```
/skills
```

المفروض القائمة تظهر فيها المهارات اللي ركّبتها.

---

## 5. كيف تتأكد أن المهارة تشتغل فعلاً

بعد التثبيت، افتح Claude Code داخل مجلد المشروع:

```powershell
cd C:\Dev\ElevatorProject
claude
```

جرّب طلب يحفّز مهارة محددة:

| الطلب                                                                          | المهارة المتوقعة         |
| ------------------------------------------------------------------------------ | ------------------------ |
| "اعمل component جديد لعرض حالة المصعد بدعم RTL"                                  | `senior-frontend`        |
| "أضف endpoint جديد للـ work orders مع validation"                                | `senior-backend`         |
| "اكتب unit tests لخدمة whatsapp_service"                                         | `senior-qa` + `tdd-guide`|
| "راجع آخر تغييراتي في AdminPortal"                                              | `code-reviewer`          |
| "API في الإنتاج توقف، ساعدني أحقق فيه"                                          | `incident-response`      |

Claude Code يختار المهارة تلقائياً حسب الوصف الموجود في YAML frontmatter داخل كل `SKILL.md`.

---

## 6. ارتباط المهارات بـ Codex Workflow Playbook

المهارات لا تُلغي [`CODEX_WORKFLOW_PLAYBOOK.md`](CODEX_WORKFLOW_PLAYBOOK.md). الـ playbook هو المرجع الأعلى. المهارات تعطي Claude خبرة عميقة في تخصص معين، لكن خطوات العمل (Understand → Inspect → Decide → Backend first → Frontend → Test → Commit → Deploy → Verify → Report) تبقى كما هي.

ملف `CLAUDE.md` في جذر المشروع يوجّه Claude إلى الـ playbook قبل أي تعديل غير تافه.

---

## 7. تحديث المهارات لاحقاً

شغّل نفس السكربت مرة ثانية:

```bash
bash scripts/install-skills.sh
```

السكربت يحذف النسخة القديمة من كل مهارة قبل نسخ الجديدة، فالتحديث آمن.

---

## 8. إضافة مهارة جديدة من الريبو

افتح [`scripts/install-skills.sh`](../scripts/install-skills.sh) (أو نسخة PowerShell)، وأضف سطر جديد داخل مصفوفة `SKILLS`:

```bash
SKILLS=(
  ...
  "engineering-team/skills/senior-prompt-engineer"   # مثال إضافة
)
```

ثم شغّل السكربت من جديد.

---

## 9. إزالة كل المهارات

لو احتجت تنظيف كامل:

```bash
rm -rf ~/.claude/skills
```

أعد تشغيل Claude Code بعدها.

---

## 10. استكشاف الأخطاء

| العَرَض                                          | الحل                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `git is not installed`                           | ثبّت Git for Windows من https://git-scm.com/download/win                  |
| `/skills` ما يعرض شيء                            | تأكد إنك أعدت تشغيل Claude Code بعد التثبيت                                |
| Skill ما تشتغل تلقائياً                           | افتح `SKILL.md` وتأكد إن الوصف فيه كلمات تطابق طلبك                       |
| `Permission denied` على PowerShell               | أعد التشغيل بـ `-ExecutionPolicy Bypass`                                  |
| السكربت يفشل في `git clone`                      | جرّب VPN أو تأكد إن GitHub مش محجوب                                       |

---

**ملاحظة أخيرة:** لا تركّب 245 مهارة دفعة واحدة. كل مهارة تأخذ مساحة من الـ context. القائمة المختارة هنا كافية وتغطي 95% من احتياجات ELMS.
