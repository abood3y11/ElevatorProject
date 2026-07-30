كيف اسوي 3d elevator ب١٤٤ هرتز مثل الألعاب 

تبغى “مصعد 3D على 144Hz مثل الألعاب”؟ ركّز على هذي الحقيقة أول: 144Hz يعني عندك 6.94ms فقط لكل فريم. أي شيء ثقيل (إضاءة ديناميكية كثيرة، خامات 4K، فيزياء مبالغ فيها) بيكسر الرقم فورًا.

الخيار الصحيح حسب هدفك
1) أقرب لنتيجة ألعاب فعلًا (أنصح فيه): Unity / Unreal

تعطيك تحكم كامل بالأداء + Profilers + إدارة LOD/Batching بسهولة.

على الجوال/PC تقدر تستهدف 144Hz بشكل واقعي (إذا الجهاز والشاشة تدعم).

2) ويب (ممكن يوصل 144 على PC قوي، لكن أصعب): Babylon.js أو Three.js

تقدر، بس لازم تكون شديد في “التخفيف” (تقليل draw calls، إضاءة مخبوزة، خامات خفيفة…).

على الجوال غالبًا 144 مش مضمون.

3) React Native “كـ RN صِرف” (أقولها زي ما هي):

مو البيئة المثالية لـ 144Hz 3D.

تقدر تعمل 3D عبر expo-gl/Three.js أو WebView، بس الاستقرار على 144 أصعب بكثير من Unity.

قواعد ذهبية عشان 144Hz (مختصر مفيد)
ميزانية الفريم (6.94ms)

قسّمها تقريبًا:

Render/GPU: 4–5ms

Game logic/CPU: 1–2ms

UI + overhead: أقل شيء ممكن

خفّف الرسم (أهم شيء)

إضاءة مخبوزة (Baked) بدل إضاءة ديناميكية.

لا تستخدم ظلال ديناميكية إلا للضرورة وبجودة قليلة جدًا.

قلّل عدد المجسمات وخصوصًا المواد المختلفة (Materials).

استخدم:

Instancing

Static batching

Frustum culling

Occlusion culling (لو عندك ممرات/أدوار)

خامات وموديل المصعد

استخدم glTF/GLB (خفيف وممتاز للويب/الألعاب).

خامات: 1K كحد أعلى غالبًا، وابتعد عن 4K.

قلّل الـ polycount: المصعد ما يحتاج تفاصيل هندسية مجنونة—خلّ التفاصيل بالخامة Normal Map.

الحركة (مصعد = حركة خطية بسيطة)

لا تسوي فيزياء ثقيلة.

حركة الكابينة:

Spline/Curve أو حركة Y مباشرة.

أبواب المصعد: Animation جاهزة (Keyframes) بدل حسابات معقدة.

لو بتسويها في Unity (أسهل طريق للـ 144Hz)
إعداد 144FPS
using UnityEngine;

public class TargetFPS : MonoBehaviour
{
    void Awake()
    {
        QualitySettings.vSyncCount = 0;   // مهم
        Application.targetFrameRate = 144; // الهدف
    }
}
حركة الكابينة + فتح/قفل الباب (فكرة بسيطة)

الكابينة تتحرك بين نقاط (Floors) بزمن ثابت + easing.

البابين يتحركون Local X يمين/يسار بـ Animation أو Tween.

نصيحة أداء في Unity:

استخدم URP + Baked Lighting

فعّل SRP Batcher

قلّل Post Processing (أو ألغِه تمامًا بالبداية)

لو بتسويها للويب (Babylon.js أنسب من Three.js للأداء/الأدوات)
Loop مضبوط مع تحديثات خفيفة

خلي حساباتك خارج حلقة الرسم قدر الإمكان.

أي شيء يتكرر كل فريم لازم يكون “خفيف جدًا”.

مبادئ عملية:

استخدم Mesh merging أو thin instances.

إضاءة واحدة Directional + baked lightmaps (أو HDR خفيف جدًا).

لا تستخدم SSAO/SSR/DoF وأنت تستهدف 144.

كيف تعرف أنك “قريب من 144”؟

بدون قياس أنت تتخيل.

Unity: استخدم Profiler وشوف CPU/GPU time.

Web: افتح DevTools Performance + عدّ الفريمات، وراقب:

long tasks

garbage collection spikes

“مصعد لعبة” عمليًا: أقل مشهد ممكن

ابدأ بمشهد شبه فاضي:

غرفة + فتحة باب + كابينة + بابين

خامة واحدة أو اثنتين

بدون ظلال
إذا وصلت 144 بسهولة، بعدها أضف التفاصيل تدريجيًا (مو العكس).

إذا تقول لي وين بتبنيه بالضبط: Unity؟ ولا Web (Babylon/Three)؟ ولا داخل Expo/React Native؟
بعطيك خطة تنفيذ جاهزة (هيكل مشروع + موديل + أنيميشن + كود الحركة) على الخيار اللي تختاره.

لا بس هيكل المصعد والكابينه و الماكينه بس 

تمام. دامك تبغى هيكل المصعد + الكابينة + الماكينة فقط (بدون مبنى/أدوار/ديكور)، هذا أسهل بكثير وتقدر تخليه “ستايل لعبة” وخفيف جدًا.

سأعطيك تصميم موديل 3D نظيف + جاهز للتحريك بأي محرك (Unity/Unreal/Babylon/Three). ركّز على ثلاث قطع رئيسية + Pivot مضبوط.

1) التقسيم الصحيح للمجسمات (Game-Ready)

خلّها 3 مجاميع (Groups):

A) shaft_frame (هيكل/سكة المصعد)

إطار خارجي بسيط (مستطيل مجوف).

سكتين يمين ويسار (Guide rails) — مجرد قضبان طولية.

(اختياري) كروس بيم أعلى/أسفل.

مهم: هذا ثابت ما يتحرك.

B) cab_group (الكابينة)

داخلها:

cab_shell جسم الكابينة

cab_door_L و cab_door_R (حتى لو ما تبغى أبواب الآن، وجودها مفيد لاحقًا)

(اختياري) counterweight ثقل موازن بسيط (لو تبي شكل واقعي)

Pivot الكابينة: في مركزها، بحيث تحريكها يكون فقط على محور Y.

C) machine_group (الماكينة فوق)

داخلها:

motor_block (كتلة المحرك)

sheave (بكرة/قرص) — هذا اللي يلف لو بتسوي أنيميشن

rope (اختياري) حبل بسيط خط/اسطوانة

Pivot البكرة: في مركزها تمامًا عشان تدويرها يكون نظيف.

2) مقاسات واقعية “لكن خفيفة”

استخدم وحدات متر (مريح للألعاب):

ارتفاع الهيكل: 6m

عرض الهيكل الداخلي: 2m

عمق الهيكل الداخلي: 2m

الكابينة: 1.6m × 1.6m × 2.2m

سكة: سماكة 0.05m

الماكينة فوق: كتلة 1.2m × 0.8m × 0.6m

البكرة: قطر 0.6m، سماكة 0.12m

هذي أرقام “كفاية” وتعطي إحساس مصعد بدون تعقيد.

3) Polygon Budget (عشان يكون سريع مثل الألعاب)

Shaft frame: 200–800 tris

Cab: 300–1500 tris

Machine: 300–1200 tris

Sheave (البكرة): 24–32 segments كفاية (لا تسويها 128)

الإجمالي تحت 5k tris ممتاز جدًا، وبيطير على أي جهاز.

4) خامات بسيطة لكن شكل “محترم”

لا تكثر Materials:

Material 1: معدن رمادي (الهيكل والسكة)

Material 2: معدن غامق (الكابينة)

Material 3: أصفر/تحذير بسيط (تفاصيل اختيارية)

لو تبي لمعة “game-like” بدون ثقل:

استخدم PBR roughness متوسط (0.4–0.6)

metallic عالي (0.8–1.0)

5) أسماء وترتيب (عشان التصدير ما يخرب)

سمّها كذا حرفيًا:

elevator_root
  shaft_frame
    rail_L
    rail_R
  cab_group
    cab_shell
    cab_door_L
    cab_door_R
  machine_group
    motor_block
    sheave
    rope

هذا يخليك تربط الأنيميشن/الكود بسهولة بأي محرك.

6) الحركة لاحقًا (حتى لو الآن “هيكل فقط”)

تحريك الكابينة: تحريك cab_group.position.y

تدوير البكرة: sheave.rotation.z (أو المحور اللي يناسبك)

لو تبغى واقعية بسيطة: دوران البكرة يتناسب مع مسافة حركة الكابينة:

زاوية = مسافة / نصف قطر البكرة

7) بأي برنامج تسويه بسرعة؟

Blender (الأفضل والأسرع ومجاني)

Modifiers: Mirror / Array

Apply transforms قبل التصدير

Export: GLB/GLTF أو FBX (حسب محركك)

“كلام واضح”

إذا هدفك 144Hz: خلك على GLB + خامات قليلة + بدون تفاصيل هندسية. المصعد ما يحتاج تعقيد؛ اللي يعطي الإحساس هو النِّسب + الحواف (bevel خفيف) + خامة PBR مرتبة.

إذا تبي، أعطيك بلان Blender خطوة بخطوة (اختصارات + إعداد pivots + export settings) أو أعطيك موديل هندسي جاهز بمقاسات على شكل مخطط تبني عليه—بس قلّي: تشتغل على Blender ولا تبغاه مباشرة لـ Unity/Web؟

طيب هل unity يندمج مع رياكت نيتف

نعم، يمكن دمج Unity مع React Native، لكن الحقيقة التقنية: ليس اندماجًا مباشرًا طبيعيًا. لأن كل واحد يعمل بمحرك مختلف:

Unity يشغّل محرك رسوميات كامل (C# + Engine).

React Native يشغّل واجهات Native عبر JavaScript.

لذلك الدمج يتم بثلاث طرق معروفة.

1️⃣ أفضل طريقة عمليًا: Unity كـ Native Module

الفكرة:
تجعل Unity جزء داخل التطبيق، وتستدعيه من React Native.

الشكل يكون هكذا:

React Native App
│
├─ UI (React Native)
│
└─ Unity Module
      └─ 3D Elevator
كيف يعمل

تبني مشروع المصعد في Unity.

تصدره كمكتبة Android (.aar) أو iOS Framework.

تربطه داخل تطبيق React Native.

مثال تشغيل Unity من React Native
import { UnityView } from "react-native-unity-view";

export default function Elevator3D() {
  return (
    <UnityView
      style={{ flex: 1 }}
      onUnityMessage={(msg) => console.log(msg)}
    />
  );
}
إرسال رسالة من React إلى Unity
UnityModule.postMessage(
  "ElevatorController",
  "MoveElevator",
  "5"
);

وفي Unity:

public class ElevatorController : MonoBehaviour
{
    public void MoveElevator(string floor)
    {
        Debug.Log("Move to floor: " + floor);
    }
}
2️⃣ طريقة أخرى: Unity كتطبيق منفصل

بدل دمجه داخل React Native:

React Native App
        │
        └── يفتح تطبيق Unity

يعني تضغط زر:

Open 3D Elevator

يفتح تطبيق Unity.

هذه أسهل لكن ليست تجربة سلسة.

3️⃣ طريقة أخف: 3D بدون Unity

لو المصعد بسيط (هيكل + كابينة):

استخدم WebGL داخل React Native:

Three.js

Babylon.js

expo-gl

وهذا أسهل كثير للتطبيقات.

الحقيقة التقنية (التي كثير لا يقولها)

لو مشروعك تطبيق أعمال مثل ELMS الذي تبنيه:

دمج Unity قد يسبب:

حجم التطبيق يزيد 100MB+

وقت تشغيل أطول

تعقيد في البناء (Android/iOS)

لذلك غالبًا يستخدم Unity فقط إذا:

3D ثقيل

فيزياء

تجربة تفاعلية مثل الألعاب

نصيحتي لمشروعك

بما أنك تبني تطبيق إدارة مصاعد ELMS + React Native Worker App:

الأفضل:

3D بسيط باستخدام WebGL

بدل Unity.

لأن المصعد الذي وصفته:

هيكل + كابينة + ماكينة

هذا خفيف جدًا ولا يحتاج محرك ألعاب كامل.

💡 إذا أردت، أشرح لك فكرة أقوى بكثير:

كيف تبني مصعد 3D داخل React Native يعمل 120–144 FPS بدون Unity
ويكون حجمه أقل من 2MB فقط.

وغالبًا هذا الحل سيكون أفضل لتطبيقك.

طيب كيف اصمم ٣d 

إذا هدفك تصميم هيكل مصعد + كابينة + ماكينة 3D فقط، فأسهل وأقوى طريق هو استخدام Blender. هو مجاني ويستخدمه حتى مطورو الألعاب لتصميم المجسمات قبل إدخالها إلى Unity أو Three.js.

سأعطيك الطريقة الصحيحة التي يستخدمها مطورو الألعاب، خطوة بسيطة لكن نظيفة.

1️⃣ تجهيز البرنامج

حمّل Blender

افتحه

احذف المكعب الافتراضي

زر:

A
Delete
2️⃣ تصميم هيكل المصعد (Shaft)

أضف مكعب يمثل الهيكل.

Shift + A
Mesh
Cube

غير المقاسات من اليمين:

X = 2
Y = 2
Z = 6

الآن أصبح لدينا عمود المصعد.

لجعل الهيكل مجوف:

ادخل Edit Mode

Tab

اختر الوجه العلوي

اضغط

I

لعمل إطار داخلي

ثم

E

واسحب للأسفل.

هكذا يصبح الهيكل مجوف.

3️⃣ إضافة السكة (Guide Rails)

أضف قضيبين على الجانبين.

Shift + A
Cube

غير المقاس:

X = 0.05
Y = 0.1
Z = 6

انسخه للطرف الآخر:

Shift + D
4️⃣ تصميم الكابينة

أضف مكعب جديد.

Shift + A
Cube

المقاسات:

X = 1.6
Y = 1.6
Z = 2.2

هذا جسم الكابينة.

لجعلها مجوفة:

نفس الطريقة:

Tab
I
E
5️⃣ إضافة ماكينة المصعد

أعلى الهيكل.

المحرك
Shift + A
Cube

المقاسات:

X = 1.2
Y = 0.8
Z = 0.6
البكرة
Shift + A
Cylinder

غير:

Vertices = 32
Radius = 0.3
Depth = 0.1

هذه بكرة الحبل.

6️⃣ تحسين الشكل (لمسة ألعاب)

الحواف الحادة لا تبدو واقعية.

أضف Bevel:

Ctrl + B

قليل فقط.

7️⃣ إضافة الخامات

اذهب إلى Material.

الهيكل

لون معدني رمادي

الكابينة

رمادي غامق

الماكينة

لون صناعي (أصفر أو أسود)

8️⃣ تصدير للمشاريع

للاستخدام في التطبيقات:

File
Export
GLB / glTF

هذا أفضل تنسيق لـ:

Unity

WebGL

React Native

Three.js

9️⃣ عدد المضلعات (مهم للأداء)

اجعل المجسم خفيف:

الهيكل: ~500 polygons

الكابينة: ~800

الماكينة: ~600

المجموع أقل من 3000 ممتاز.

فكرة احترافية

لو أردت أن يبدو مثل مشاهد الألعاب:

أضف:

إضاءة صناعية

ظل خفيف

حركة الكابينة

حتى لو النموذج بسيط سيبدو واقعي.

💡 إذا أحببت، أستطيع أيضًا أن أريك:

مخطط تصميم مصعد كامل 3D مثل الألعاب

أو أعطيك ملف Blender جاهز للمصعد يمكنك استخدامه مباشرة في تطبيقك.

اعطيني الاثنين وجهز لي برومت لهذا

سأعطيك شيئين كما طلبت:
1️⃣ مخطط تصميم مصعد 3D واضح تبني عليه.
2️⃣ برومبت جاهز لتوليد موديل 3D احترافي (باستخدام أدوات الذكاء الاصطناعي).

أولاً: مخطط تصميم مصعد 3D (Game-Ready)
4

هذا الهيكل المستخدم في أغلب النماذج ثلاثية الأبعاد في الألعاب أو المحاكاة.

1️⃣ Elevator Shaft (هيكل المصعد)

المكونات:

ارتفاع الهيكل: 6m
عرض: 2m
عمق: 2m

الأجزاء:

Guide Rails (السكتين)

Cross Beam

Frame Structure

وظيفته: المسار الذي تتحرك فيه الكابينة.

2️⃣ Elevator Cabin (الكابينة)

المقاسات الواقعية:

1.6m × 1.6m × 2.2m

المكونات:

Cabin Shell
Cabin Floor
Left Door
Right Door
Ceiling Light

في النماذج البسيطة يمكن الاكتفاء بـ:

Cabin Shell
Cabin Door
3️⃣ Machine System (الماكينة)

تكون أعلى الهيكل.

الأجزاء:

Motor
Sheave (البكرة)
Steel Rope
Counterweight

المقاسات التقريبية:

Motor Block: 1.2m
Sheave Diameter: 0.6m
4️⃣ الهيكل الكامل (Hierarchy)

أفضل ترتيب للموديل:

elevator_root
│
├── shaft_frame
│   ├── rail_left
│   └── rail_right
│
├── cabin_group
│   ├── cabin_shell
│   ├── door_left
│   └── door_right
│
└── machine_group
    ├── motor
    ├── sheave
    └── rope

هذا الترتيب يجعل التحريك سهل في أي محرك 3D.

ثانياً: برومبت توليد موديل 3D

يمكن استخدامه في أدوات توليد النماذج ثلاثية الأبعاد.

مثال:

Meshy

Luma AI

Kaedim

البرومبت الاحترافي
Create a clean industrial 3D elevator system model optimized for real-time rendering.

The model should include:

1. Elevator shaft frame structure (6 meters height)
2. Two metal guide rails inside the shaft
3. Elevator cabin with modern metallic design
4. Sliding cabin doors
5. Machine system on top including motor and rotating sheave
6. Simple steel cable connected to the cabin
7. Industrial mechanical style

Requirements:
- Low poly game-ready model
- Under 5000 polygons
- Clean topology
- PBR materials
- Realistic proportions
- Separate objects for shaft, cabin, motor, and sheave
- Pivot points centered correctly for animation
- Export as GLB / FBX
- Suitable for Unity or WebGL applications
برومبت أقوى (لو تبغى شكل ألعاب)
Design a realistic industrial elevator 3D model for a simulation or game environment.

Include:
• elevator shaft structure
• elevator cabin with metallic interior
• guide rails
• elevator motor and sheave system
• steel cables
• mechanical details

Style:
modern industrial engineering
clean mechanical design
game ready

Technical requirements:
low polygon optimized
PBR materials
separate animation parts
correct pivot points
GLB format
real world scale meters
optimized for 120-144 FPS rendering

💡 بما أنك تبني تطبيق مصاعد ELMS، هناك فكرة أقوى بكثير:

يمكنك عمل مصعد 3D تفاعلي بحيث:

الفني يرى المصعد

يضغط زر

الكابينة تتحرك

يظهر حالة العطل

هذا يعطي ميزة قوية جدًا للتطبيق.

إذا أردت، أستطيع أن أريك أيضاً:

كيف تصنع مصعد 3D كامل يعمل داخل React Native

أو كيف تبني محاكاة مصعد مثل الألعاب بسرعة 144FPS.

كيف تصنع مصعد 3D كامل يعمل داخل React Native
قام بالتفكير لمدة 14s

نعم، وتقدر تسويه داخل React Native نفسه بدون Unity، وهذا هو الطريق الأنظف لمشروع مثل ELMS عندك:
React Native + Expo + @react-three/fiber/native + three.
مكتبة React Three Fiber تدعم React Native، ونسخة الـ native تُستورد من @react-three/fiber/native، وهي تعتمد تحت الغطاء على expo-gl و expo-asset. كذلك GLView من Expo هو طبقة OpenGL/WebGL التي ترسم عليها المشاهد ثلاثية الأبعاد.

الفكرة الصحيحة

قسّم التطبيق إلى جزأين:

واجهة React Native: أزرار، معلومات المصعد، حالة الباب، رقم الدور.

مشهد 3D: الهيكل، الكابينة، الماكينة، وحركة الكابينة.

يعني لا تجعل كل التطبيق 3D. اجعل 3D مجرد شاشة أو Component داخل التطبيق. هذا أسهل في الصيانة وأوضح في الأداء. React Three Fiber مبني ليجعل بناء المشهد declarative داخل React، ويمكنك تحريك العناصر عبر useFrame والتفاعل معها مثل أي state في React.

المسار الذي أنصحك به
1) ابدأ بمشروع Expo

Expo اليوم ما زال الطريق العملي الأسهل لبدء تطبيق React Native، ويمكنك تثبيت حزم SDK عبر npx expo install.

ثبّت الأساسيات:

npx create-expo-app@latest elms-elevator-3d
cd elms-elevator-3d
npm install three @react-three/fiber
npx expo install expo-gl expo-asset

مهم: React Three Fiber يحتاج أن يوافق إصدار React المستخدم؛ التوثيق يذكر أن v8 يقترن مع React 18 و v9 مع React 19.

2) ابنِ أول نسخة بدون موديل خارجي

ابدأ بصناديق بسيطة:

Box للهيكل

Box للكابينة

Cylinder للماكينة أو البكرة

هذا أفضل من أن تبدأ مباشرة بملف Blender. أولًا أثبت الحركة، ثم بدّل الصناديق بموديل GLB لاحقًا.

مثال عملي كامل

هذا مثال بسيط لشاشة مصعد 3D داخل React Native:

import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

function Shaft() {
  return (
    <>
      <mesh position={[0, 0, -0.8]}>
        <boxGeometry args={[2, 6, 0.05]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[-0.7, 0, 0]}>
        <boxGeometry args={[0.08, 6, 0.08]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[0.7, 0, 0]}>
        <boxGeometry args={[0.08, 6, 0.08]} />
        <meshStandardMaterial />
      </mesh>
    </>
  );
}

function Machine() {
  const ref = React.useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 1.2;
  });

  return (
    <group position={[0, 3.2, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.1, 0.5, 0.7]} />
        <meshStandardMaterial />
      </mesh>

      <mesh ref={ref} position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 24]} />
        <meshStandardMaterial />
      </mesh>
    </group>
  );
}

function Cabin({ targetY }: { targetY: number }) {
  const group = React.useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      targetY,
      Math.min(delta * 2.5, 1)
    );
  });

  return (
    <group ref={group} position={[0, -2, 0]}>
      <mesh>
        <boxGeometry args={[1.4, 1.8, 1.4]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[-0.35, 0, 0.71]}>
        <boxGeometry args={[0.3, 1.5, 0.03]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[0.35, 0, 0.71]}>
        <boxGeometry args={[0.3, 1.5, 0.03]} />
        <meshStandardMaterial />
      </mesh>
    </group>
  );
}

function ElevatorScene({ targetY }: { targetY: number }) {
  return (
    <Canvas camera={{ position: [4, 2, 6], fov: 45 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} />
      <Shaft />
      <Cabin targetY={targetY} />
      <Machine />
    </Canvas>
  );
}

export default function App() {
  const floors = useMemo(() => [-2, 0, 2], []);
  const [floorIndex, setFloorIndex] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.viewer}>
        <ElevatorScene targetY={floors[floorIndex]} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.title}>3D Elevator</Text>

        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={() => setFloorIndex(0)}>
            <Text style={styles.btnText}>Floor 1</Text>
          </Pressable>

          <Pressable style={styles.btn} onPress={() => setFloorIndex(1)}>
            <Text style={styles.btnText}>Floor 2</Text>
          </Pressable>

          <Pressable style={styles.btn} onPress={() => setFloorIndex(2)}>
            <Text style={styles.btnText}>Floor 3</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  viewer: { flex: 1 },
  panel: { padding: 16, borderTopWidth: 1, borderColor: '#ddd' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    backgroundColor: '#0C3C78',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});

هذا المثال يسوي لك:

هيكل مبسط

كابينة تتحرك بين 3 أدوار

ماكينة علوية تدور

أزرار تحكم من واجهة React Native

3) بعد ما تنجح الحركة، انقل التصميم من Blender

أفضل صيغة للنماذج هنا هي GLTF/GLB؛ توثيق React Three Fiber يذكر تحميل GLTF وFBX وOBJ عبر useLoader، وGLTF هو الخيار المعتاد الأنظف للمشاريع الحديثة.

مثال تحميل موديل GLB

بعد أن تصمم المصعد في Blender وتصدره elevator.glb، تضعه داخل assets/models/.

import React from 'react';
import { Canvas, useLoader } from '@react-three/fiber/native';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function ElevatorModel() {
  const gltf = useLoader(GLTFLoader, require('./assets/models/elevator.glb'));
  return <primitive object={gltf.scene} scale={1} />;
}

export default function ElevatorScreen() {
  return (
    <Canvas camera={{ position: [4, 2, 6], fov: 45 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 6, 5]} intensity={1.5} />
      <ElevatorModel />
    </Canvas>
  );
}
4) كيف تجهّز موديل Blender صح

صمّم المجسمات مفصولة بهذا الشكل:

elevator_root
  shaft_frame
  cabin_group
  machine_group
    motor
    sheave

الأهم:

cabin_group يكون Pivot في وسط الكابينة

sheave يكون Pivot في وسط البكرة

لا تكثر التفاصيل

استخدم خامات قليلة

حاول تخلي الموديل Low Poly

هذا ليس ترفًا. هذا هو الفرق بين مشروع يشتغل ومشروع ينهار على الجوال.

5) كيف تربط 3D ببيانات المصعد الفعلية

هنا القيمة الحقيقية لمشروعك.

مثلًا:

من API عندك تجيب حالة المصعد

هل هو متوقف؟

بأي دور؟

هل الباب مفتوح؟

هل فيه Fault؟

ثم تربطها بالـ state:

const [elevatorState, setElevatorState] = useState({
  floor: 2,
  doorOpen: false,
  status: 'idle',
});

ثم:

floor يحدد targetY

doorOpen يحرك البابين

status === 'fault' يغير لون جزء من الماكينة أو يظهر وميض

هذه الحركة هي التي تجعل 3D مفيدًا، لا مجرد شكل.

6) فتح الأبواب

مثال مبسط:

function Doors({ open }: { open: boolean }) {
  const left = React.useRef<THREE.Mesh>(null!);
  const right = React.useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    const target = open ? 0.22 : 0;
    if (left.current) {
      left.current.position.x = THREE.MathUtils.lerp(left.current.position.x, -0.35 - target, Math.min(delta * 5, 1));
    }
    if (right.current) {
      right.current.position.x = THREE.MathUtils.lerp(right.current.position.x, 0.35 + target, Math.min(delta * 5, 1));
    }
  });

  return (
    <>
      <mesh ref={left} position={[-0.35, 0, 0.71]}>
        <boxGeometry args={[0.3, 1.5, 0.03]} />
        <meshStandardMaterial />
      </mesh>

      <mesh ref={right} position={[0.35, 0, 0.71]}>
        <boxGeometry args={[0.3, 1.5, 0.03]} />
        <meshStandardMaterial />
      </mesh>
    </>
  );
}
7) الأداء على الجوال

هنا الكلام الصريح:
لا تفكر في 144Hz أول شيء على React Native وتضيّع وقتك. أولًا اجعل المشهد:

ثابت

نظيف

خفيف

بدون تقطيع

ثم حسّن لاحقًا.

أسباب ذلك:

GLView له قيود، وحتى التوثيق ينبه أن remote debugging لا يعمل معه كما ينبغي لأن GLView يحتاج synchronous native calls.

وكل ما زاد عدد المجسمات والخامات والإضاءات، بدأ الجوال يتعب أسرع من الويب المكتبي.

قواعد الأداء

ابدأ بـ أشكال بسيطة

استخدم GLB واحد أو عدد قليل من المجسمات

لا تستخدم خامات 4K

لا تكثر الإضاءات

لا تكثر الظلال

لا تسوّي أنيميشنات معقدة على كل قطعة كل frame

8) متى تستخدم WebView بدل R3F Native؟

لو أردت مشهد 3D أعقد أو أردت إعادة استخدام نسخة ويب جاهزة مبنية بـ Three/Babylon، عندها react-native-webview خيار عملي لأنه يتيح عرض محتوى ويب داخل View أصلي. Expo يوثّق وجود react-native-webview كحل لعرض web content داخل native view.

لكن في مشروعك، طالما المشهد:

هيكل

كابينة

ماكينة

فـ R3F Native أنظف من WebView.

9) الخطة العملية التي أنصحك بها

امشِ هكذا:

المرحلة 1
ابنِ المشهد بصناديق بسيطة داخل React Native.

المرحلة 2
أضف حركة:

صعود/نزول

فتح/إغلاق أبواب

دوران بكرة

المرحلة 3
صمّم موديل Blender نظيف وصدّره GLB.

المرحلة 4
استبدل الصناديق بالموديل الحقيقي.

المرحلة 5
اربطه ببيانات ELMS من FastAPI.

هذا هو الطريق الصحيح. غيره غالبًا تضييع وقت وزخرفة مبكرة.

ماذا يناسب ELMS تحديدًا؟

بما أنك تبني نظام مصاعد، أفضل استخدام للمشهد 3D ليس “لعبة”، بل:

عرض حالة المصعد

محاكاة وضع العطل

تدريب الفني

عرض أجزاء المصعد

شاشة تشخيص بصري

يعني 3D عندك يجب أن يكون أداة تشغيل وفهم، لا مجرد استعراض.

إذا تريد، أكتب لك الآن نسخة مشروع Expo جاهزة بملفات كاملة:
app.tsx + ElevatorScene.tsx + Cabin.tsx + Machine.tsx
بحيث تنسخها مباشرة وتبدأ التشغيل.


<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تطبيق العميل — ELMS Blueprint</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800&display=swap');
  
  :root {
    --bg: #070B14;
    --surface: #0D1420;
    --card: #111B2E;
    --border: #1A2845;
    --accent: #00D4AA;
    --accent2: #4F8EF7;
    --warn: #F59E0B;
    --danger: #EF4444;
    --purple: #8B5CF6;
    --text1: #E8F0FE;
    --text2: #8899B4;
    --text3: #3D5273;
    --wire-bg: #0F1825;
    --wire-block: #1A2845;
    --wire-line: #243654;
    --wire-accent: #00D4AA;
    --wire-text: #5577AA;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    background: var(--bg);
    color: var(--text1);
    font-family: 'IBM Plex Sans Arabic', sans-serif;
    line-height: 1.6;
  }

  /* ── LAYOUT ── */
  .container { max-width: 1400px; margin: 0 auto; padding: 0 32px; }
  
  /* ── HEADER ── */
  .hero {
    padding: 60px 0 40px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 60px;
  }
  .hero-tag {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(0,212,170,0.08); border: 1px solid rgba(0,212,170,0.2);
    border-radius: 20px; padding: 6px 16px;
    color: var(--accent); font-size: 12px; font-weight: 700;
    letter-spacing: 1px; margin-bottom: 20px;
  }
  .hero h1 {
    font-size: 44px; font-weight: 800; line-height: 1.2;
    background: linear-gradient(135deg, #E8F0FE, #00D4AA);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    margin-bottom: 16px;
  }
  .hero p { color: var(--text2); font-size: 16px; max-width: 600px; }

  /* ── SECTION ── */
  .section { margin-bottom: 80px; }
  .section-header {
    display: flex; align-items: center; gap: 16px;
    margin-bottom: 40px; padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .section-num {
    width: 44px; height: 44px; border-radius: 14px;
    background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 800; color: var(--accent); flex-shrink: 0;
  }
  .section-title { font-size: 26px; font-weight: 800; }
  .section-sub { color: var(--text2); font-size: 14px; margin-top: 2px; }

  /* ── PROMPT CARDS ── */
  .prompt-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
  .prompt-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 18px;
    padding: 24px; position: relative; overflow: hidden;
    transition: border-color 0.2s;
  }
  .prompt-card::before {
    content: ''; position: absolute; top: 0; right: 0;
    width: 80px; height: 80px; border-radius: 50%;
    background: var(--card-glow, rgba(0,212,170,0.08));
    transform: translate(20px, -20px); filter: blur(20px);
  }
  .prompt-card:hover { border-color: rgba(0,212,170,0.3); }
  .card-icon {
    width: 42px; height: 42px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; margin-bottom: 14px;
  }
  .card-title { font-size: 15px; font-weight: 800; margin-bottom: 10px; }
  .card-body { color: var(--text2); font-size: 13px; line-height: 1.8; }
  .tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
  .tag {
    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
    border-radius: 6px; padding: 3px 10px;
    color: var(--text2); font-size: 11px; font-weight: 600;
  }
  .tag.accent { background: rgba(0,212,170,0.08); border-color: rgba(0,212,170,0.2); color: var(--accent); }
  .tag.blue { background: rgba(79,142,247,0.08); border-color: rgba(79,142,247,0.2); color: var(--accent2); }
  .tag.purple { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.2); color: var(--purple); }

  /* ── UML ── */
  .uml-container {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 32px; overflow-x: auto;
  }
  .uml-title { color: var(--text2); font-size: 13px; font-weight: 700; letter-spacing: 1px; margin-bottom: 24px; }

  /* ── WIREFRAME GRID ── */
  .wireframes-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 24px;
  }
  .wireframe-wrap {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 18px; padding: 20px;
  }
  .wf-label {
    font-size: 13px; font-weight: 800; color: var(--text1); margin-bottom: 4px;
  }
  .wf-desc { font-size: 11px; color: var(--text3); margin-bottom: 16px; }
  .phone-frame {
    width: 220px; margin: 0 auto;
    background: var(--wire-bg); border-radius: 28px;
    border: 2px solid var(--wire-line);
    overflow: hidden; position: relative;
  }
  .phone-notch {
    height: 20px; background: var(--wire-block);
    display: flex; align-items: center; justify-content: center;
    gap: 8px;
  }
  .notch-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--wire-line); }
  .notch-bar { width: 40px; height: 4px; border-radius: 2px; background: var(--wire-line); }
  .phone-screen { padding: 10px 10px 14px; min-height: 380px; }

  /* Wire components */
  .w-bar { height: 8px; background: var(--wire-block); border-radius: 4px; margin-bottom: 6px; }
  .w-bar.short { width: 40%; }
  .w-bar.med { width: 65%; }
  .w-bar.long { width: 90%; }
  .w-bar.full { width: 100%; }
  .w-bar.accent { background: rgba(0,212,170,0.3); }
  .w-bar.thin { height: 5px; }
  .w-block {
    background: var(--wire-block); border-radius: 8px;
    padding: 8px; margin-bottom: 6px;
    border: 1px solid var(--wire-line);
  }
  .w-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
  .w-circle { width: 24px; height: 24px; border-radius: 50%; background: var(--wire-block); border: 1px solid var(--wire-line); flex-shrink: 0; }
  .w-circle.lg { width: 36px; height: 36px; }
  .w-circle.accent { border-color: var(--wire-accent); background: rgba(0,212,170,0.08); }
  .w-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }
  .w-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; margin-bottom: 6px; }
  .w-btn { height: 26px; background: rgba(0,212,170,0.15); border: 1px solid rgba(0,212,170,0.3); border-radius: 6px; }
  .w-btn.ghost { background: var(--wire-block); border-color: var(--wire-line); }
  .w-img { height: 50px; background: var(--wire-block); border-radius: 8px; border: 1px solid var(--wire-line); margin-bottom: 6px; display: flex; align-items: center; justify-content: center; }
  .w-img-icon { width: 20px; height: 20px; opacity: 0.2; }
  .w-badge { display: inline-block; width: 40px; height: 14px; background: rgba(0,212,170,0.15); border-radius: 10px; }
  .w-badge.warn { background: rgba(245,158,11,0.15); }
  .w-tabbar {
    display: flex; height: 44px;
    background: var(--wire-block); border-top: 1px solid var(--wire-line);
    border-radius: 0 0 26px 26px;
  }
  .w-tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; }
  .w-tab-dot { width: 16px; height: 16px; border-radius: 4px; background: var(--wire-line); }
  .w-tab-dot.active { background: rgba(0,212,170,0.4); }
  .w-tab-line { width: 20px; height: 3px; border-radius: 2px; background: var(--wire-line); }
  .w-tab-line.active { background: rgba(0,212,170,0.3); }
  .w-divider { height: 1px; background: var(--wire-line); margin: 6px 0; }
  .w-hero { height: 70px; background: var(--wire-block); border-radius: 10px; margin-bottom: 6px; border: 1px solid var(--wire-line); display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px; }
  .w-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--wire-accent); }

  /* ── USER STORY TABLE ── */
  .story-table { width: 100%; border-collapse: collapse; }
  .story-table th {
    background: var(--card); color: var(--text2); font-size: 12px; font-weight: 700;
    padding: 12px 16px; text-align: right; letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
  }
  .story-table td {
    padding: 12px 16px; font-size: 13px; color: var(--text2);
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .story-table tr:hover td { background: rgba(255,255,255,0.02); }
  .priority {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
  }
  .p-high { background: rgba(239,68,68,0.1); color: #EF4444; }
  .p-med { background: rgba(245,158,11,0.1); color: #F59E0B; }
  .p-low { background: rgba(99,102,241,0.1); color: #818CF8; }
  .screen-ref { color: var(--accent); font-weight: 700; font-size: 12px; }

  /* ── FLOW DIAGRAM ── */
  .flow-container {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px; padding: 32px; overflow-x: auto;
  }

  /* ── PRINT ── */
  @media print {
    body { background: white; color: black; }
  }
</style>
</head>
<body>

<div class="container">

  <!-- HERO -->
  <div class="hero">
    <div class="hero-tag">📱 ELMS — Customer App Blueprint</div>
    <h1>تطبيق بوابة العميل<br>من الصفر للنهاية</h1>
    <p>مواصفات كاملة تشمل البرومت التصميمي، مخططات UML، وواجهات هيكلية لكل شاشة في تطبيق العميل.</p>
    <div style="display:flex; gap:12px; margin-top:24px; flex-wrap:wrap;">
      <span class="tag accent">React Native</span>
      <span class="tag accent">Expo</span>
      <span class="tag blue">FastAPI Backend</span>
      <span class="tag blue">RTL عربي</span>
      <span class="tag purple">9 شاشات رئيسية</span>
    </div>
  </div>


  <!-- ══════════════════════════════════════
       SECTION 1 — PROMPT / BRIEF
  ══════════════════════════════════════ -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">١</div>
      <div>
        <div class="section-title">برومت التصميم والمواصفات</div>
        <div class="section-sub">وصف شامل للتطبيق — الهدف، المستخدم، الوظائف، والتقنيات</div>
      </div>
    </div>

    <div class="prompt-grid">

      <!-- Vision -->
      <div class="prompt-card" style="--card-glow: rgba(0,212,170,0.12);">
        <div class="card-icon" style="background:rgba(0,212,170,0.1);">🎯</div>
        <div class="card-title">رؤية التطبيق</div>
        <div class="card-body">
          بوابة رقمية للعملاء (أصحاب المباني والشركات) تتيح لهم متابعة كل ما يتعلق بمصاعدهم في الوقت الفعلي — من حالة التشغيل إلى الزيارات الفنية والعقود والفواتير — دون الحاجة للتواصل المباشر مع الشركة لكل استفسار.
        </div>
        <div class="tag-list">
          <span class="tag accent">Self-Service</span>
          <span class="tag accent">Real-time</span>
          <span class="tag accent">Arabic-first</span>
        </div>
      </div>

      <!-- Target User -->
      <div class="prompt-card" style="--card-glow: rgba(79,142,247,0.12);">
        <div class="card-icon" style="background:rgba(79,142,247,0.1);">👤</div>
        <div class="card-title">المستخدم المستهدف</div>
        <div class="card-body">
          <strong style="color:var(--text1)">الشخصية الأساسية:</strong> مدير مبنى أو مسؤول صيانة في شركة عقارية أو تجارية.<br><br>
          <strong style="color:var(--text1)">الاحتياجات:</strong> معرفة حالة المصعد فوراً، معرفة موعد الزيارة القادمة، الاطلاع على العقد ومواعيد تجديده، وتقديم بلاغات الأعطال.<br><br>
          <strong style="color:var(--text1)">نقاط الألم:</strong> الاتصال المتكرر للاستفسار، عدم معرفة موعد الفني، ضياع وثائق العقود.
        </div>
        <div class="tag-list">
          <span class="tag blue">مدير مبنى</span>
          <span class="tag blue">مسؤول صيانة</span>
          <span class="tag blue">مالك عقار</span>
        </div>
      </div>

      <!-- Core Features -->
      <div class="prompt-card" style="--card-glow: rgba(139,92,246,0.12);">
        <div class="card-icon" style="background:rgba(139,92,246,0.1);">⚡</div>
        <div class="card-title">الوظائف الأساسية</div>
        <div class="card-body">
          ١. <strong style="color:var(--text1)">لوحة المراقبة</strong> — حالة كل مصاعد لحظياً<br>
          ٢. <strong style="color:var(--text1)">إدارة المصاعد</strong> — ملف كامل لكل مصعد<br>
          ٣. <strong style="color:var(--text1)">الزيارات الفنية</strong> — جدول + تتبع الفني<br>
          ٤. <strong style="color:var(--text1)">العقود</strong> — عرض + تجديد + تحميل PDF<br>
          ٥. <strong style="color:var(--text1)">بلاغات الأعطال</strong> — إرسال وتتبع الحالة<br>
          ٦. <strong style="color:var(--text1)">الفواتير</strong> — عرض + دفع إلكتروني<br>
          ٧. <strong style="color:var(--text1)">الإشعارات</strong> — تنبيهات ذكية<br>
          ٨. <strong style="color:var(--text1)">الدعم الفني</strong> — تواصل مباشر
        </div>
      </div>

      <!-- Tech Stack -->
      <div class="prompt-card" style="--card-glow: rgba(245,158,11,0.08);">
        <div class="card-icon" style="background:rgba(245,158,11,0.1);">🛠</div>
        <div class="card-title">التقنيات المقترحة</div>
        <div class="card-body">
          <strong style="color:var(--text1)">Frontend:</strong> React Native + Expo<br>
          <strong style="color:var(--text1)">Navigation:</strong> React Navigation v7 (Stack + Bottom Tabs)<br>
          <strong style="color:var(--text1)">State:</strong> Zustand أو React Query<br>
          <strong style="color:var(--text1)">Backend:</strong> FastAPI موجود بالفعل ✅<br>
          <strong style="color:var(--text1)">Auth:</strong> JWT + Refresh Token<br>
          <strong style="color:var(--text1)">Notifications:</strong> Expo Push Notifications<br>
          <strong style="color:var(--text1)">PDF:</strong> expo-print أو react-native-pdf<br>
          <strong style="color:var(--text1)">Maps:</strong> react-native-maps (تتبع الفني)
        </div>
        <div class="tag-list">
          <span class="tag accent">Expo SDK 51+</span>
          <span class="tag blue">TypeScript</span>
        </div>
      </div>

      <!-- Design System -->
      <div class="prompt-card" style="--card-glow: rgba(0,212,170,0.08);">
        <div class="card-icon" style="background:rgba(0,212,170,0.1);">🎨</div>
        <div class="card-title">نظام التصميم</div>
        <div class="card-body">
          <strong style="color:var(--text1)">الثيم:</strong> Dark Mode أساسي مع خيار Light<br>
          <strong style="color:var(--text1)">الاتجاه:</strong> RTL كامل (عربي أولاً)<br>
          <strong style="color:var(--text1)">الخط:</strong> IBM Plex Sans Arabic<br>
          <strong style="color:var(--text1)">الألوان الرئيسية:</strong><br>
          — أخضر مزرق <code style="color:var(--accent)">#00D4AA</code> للحالة الإيجابية<br>
          — برتقالي <code style="color:var(--warn)">#F59E0B</code> للتحذيرات<br>
          — أحمر <code style="color:var(--danger)">#EF4444</code> للأعطال<br>
          — أزرق <code style="color:var(--accent2)">#4F8EF7</code> للمعلومات<br>
          <strong style="color:var(--text1)">الزوايا:</strong> 16px cards, 12px buttons, 24px modals
        </div>
      </div>

      <!-- Non-Functionals -->
      <div class="prompt-card" style="--card-glow: rgba(239,68,68,0.08);">
        <div class="card-icon" style="background:rgba(239,68,68,0.1);">📐</div>
        <div class="card-title">المتطلبات غير الوظيفية</div>
        <div class="card-body">
          <strong style="color:var(--text1)">الأداء:</strong> تحميل الشاشة &lt; 1.5 ثانية<br>
          <strong style="color:var(--text1)">Offline:</strong> عرض آخر بيانات محفوظة بدون إنترنت<br>
          <strong style="color:var(--text1)">الأمان:</strong> تشفير البيانات المحلية، انتهاء الجلسة تلقائياً بعد 30 دقيقة<br>
          <strong style="color:var(--text1)">Accessibility:</strong> دعم قارئ الشاشة، حجم خط مرن<br>
          <strong style="color:var(--text1)">الإشعارات:</strong> دفع فوري عند جدولة زيارة أو انتهاء عقد<br>
          <strong style="color:var(--text1)">Biometrics:</strong> بصمة الإصبع / Face ID لتسريع الدخول
        </div>
        <div class="tag-list">
          <span class="tag">iOS 14+</span>
          <span class="tag">Android 10+</span>
        </div>
      </div>

    </div>
  </div>


  <!-- ══════════════════════════════════════
       SECTION 2 — USER STORIES
  ══════════════════════════════════════ -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">٢</div>
      <div>
        <div class="section-title">قصص المستخدم — User Stories</div>
        <div class="section-sub">كل وظيفة موثقة كقصة مستخدم مع الأولوية والشاشة المرتبطة</div>
      </div>
    </div>

    <div style="background:var(--surface); border:1px solid var(--border); border-radius:18px; overflow:hidden;">
      <table class="story-table">
        <thead>
          <tr>
            <th>#</th>
            <th>كمستخدم أريد...</th>
            <th>لكي...</th>
            <th>الشاشة</th>
            <th>الأولوية</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-01</td>
            <td>أرى ملخص حالة كل مصاعدي فور فتح التطبيق</td>
            <td>أعرف إذا في مشكلة دون البحث</td>
            <td><span class="screen-ref">Home Dashboard</span></td>
            <td><span class="priority p-high">● عالية</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-02</td>
            <td>أتلقى إشعار فوري عند جدولة زيارة فنية</td>
            <td>أستعد وأتيح الوصول للفني</td>
            <td><span class="screen-ref">Notifications</span></td>
            <td><span class="priority p-high">● عالية</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-03</td>
            <td>أتابع موقع الفني لحظياً أثناء توجهه</td>
            <td>أعرف متى سيصل تحديداً</td>
            <td><span class="screen-ref">Technician Tracking</span></td>
            <td><span class="priority p-high">● عالية</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-04</td>
            <td>أرى تفاصيل كل مصعد (ماركة، سيريال، تاريخ صيانة)</td>
            <td>لدي مرجع موحد لكل المعدات</td>
            <td><span class="screen-ref">Elevator Detail</span></td>
            <td><span class="priority p-high">● عالية</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-05</td>
            <td>أرسل بلاغ عطل طارئ بضغطة واحدة</td>
            <td>أحصل على استجابة سريعة</td>
            <td><span class="screen-ref">Report Issue</span></td>
            <td><span class="priority p-high">● عالية</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-06</td>
            <td>أعرض عقودي وتاريخ انتهائها</td>
            <td>أجدد قبل الانقطاع</td>
            <td><span class="screen-ref">Contracts</span></td>
            <td><span class="priority p-med">● متوسطة</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-07</td>
            <td>أحمّل نسخة PDF للعقد</td>
            <td>أحتفظ بنسخة أرشيفية</td>
            <td><span class="screen-ref">Contract Detail</span></td>
            <td><span class="priority p-med">● متوسطة</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-08</td>
            <td>أرى سجل كل الزيارات الفنية بتفاصيلها</td>
            <td>أراجع تاريخ الصيانة</td>
            <td><span class="screen-ref">Visits History</span></td>
            <td><span class="priority p-med">● متوسطة</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-09</td>
            <td>أرى فواتيري وأدفع إلكترونياً</td>
            <td>أسوي التسوية دون ذهاب للمكتب</td>
            <td><span class="screen-ref">Invoices</span></td>
            <td><span class="priority p-med">● متوسطة</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-10</td>
            <td>أرى تقارير أداء المصاعد شهرياً</td>
            <td>أتخذ قرارات مبنية على بيانات</td>
            <td><span class="screen-ref">Reports</span></td>
            <td><span class="priority p-low">● منخفضة</span></td>
          </tr>
          <tr>
            <td style="color:var(--text3); font-size:12px;">US-11</td>
            <td>أتواصل مع الدعم مباشرة من التطبيق</td>
            <td>أحل مشاكلي دون مغادرة التطبيق</td>
            <td><span class="screen-ref">Support Chat</span></td>
            <td><span class="priority p-low">● منخفضة</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>


  <!-- ══════════════════════════════════════
       SECTION 3 — UML DIAGRAMS
  ══════════════════════════════════════ -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">٣</div>
      <div>
        <div class="section-title">مخططات UML</div>
        <div class="section-sub">Use Case Diagram + Navigation Flow + Data Model</div>
      </div>
    </div>

    <!-- Use Case Diagram -->
    <div class="uml-container" style="margin-bottom:24px;">
      <div class="uml-title">USE CASE DIAGRAM — تطبيق العميل</div>
      <svg width="100%" viewBox="0 0 900 500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#1A2845"/>
          </marker>
          <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#00D4AA"/>
          </marker>
        </defs>

        <!-- System boundary -->
        <rect x="160" y="20" width="680" height="460" rx="16"
          fill="rgba(13,20,32,0.6)" stroke="#1A2845" stroke-width="2"/>
        <text x="500" y="46" text-anchor="middle" fill="#3D5273" font-size="13" font-family="IBM Plex Sans Arabic">
          تطبيق بوابة العميل — Customer Portal
        </text>

        <!-- Actor: Customer -->
        <ellipse cx="80" cy="200" rx="22" ry="20" fill="none" stroke="#4F8EF7" stroke-width="1.5"/>
        <line x1="80" y1="220" x2="80" y2="270" stroke="#4F8EF7" stroke-width="1.5"/>
        <line x1="55" y1="245" x2="105" y2="245" stroke="#4F8EF7" stroke-width="1.5"/>
        <line x1="80" y1="270" x2="60" y2="300" stroke="#4F8EF7" stroke-width="1.5"/>
        <line x1="80" y1="270" x2="100" y2="300" stroke="#4F8EF7" stroke-width="1.5"/>
        <text x="80" y="320" text-anchor="middle" fill="#4F8EF7" font-size="12" font-family="IBM Plex Sans Arabic">العميل</text>

        <!-- Actor: System (Backend) -->
        <rect x="820" y="80" width="60" height="40" rx="6" fill="rgba(0,212,170,0.08)" stroke="#00D4AA" stroke-width="1.5"/>
        <text x="850" y="105" text-anchor="middle" fill="#00D4AA" font-size="11" font-family="IBM Plex Sans Arabic">Backend</text>
        <text x="850" y="140" text-anchor="middle" fill="#3D5273" font-size="10" font-family="IBM Plex Sans Arabic">FastAPI</text>

        <!-- Use cases -->
        <!-- Row 1 -->
        <ellipse cx="300" cy="90" rx="90" ry="22" fill="rgba(0,212,170,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="300" y="95" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">تسجيل الدخول</text>

        <ellipse cx="500" cy="90" rx="90" ry="22" fill="rgba(0,212,170,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="500" y="95" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">عرض لوحة التحكم</text>

        <ellipse cx="700" cy="90" rx="90" ry="22" fill="rgba(0,212,170,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="700" y="95" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">استقبال الإشعارات</text>

        <!-- Row 2 -->
        <ellipse cx="270" cy="175" rx="90" ry="22" fill="rgba(79,142,247,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="270" y="180" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">مراقبة المصاعد</text>

        <ellipse cx="490" cy="175" rx="90" ry="22" fill="rgba(79,142,247,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="490" y="180" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">متابعة الزيارات</text>

        <ellipse cx="710" cy="175" rx="90" ry="22" fill="rgba(79,142,247,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="710" y="180" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">تتبع الفني (خريطة)</text>

        <!-- Row 3 -->
        <ellipse cx="270" cy="265" rx="90" ry="22" fill="rgba(139,92,246,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="270" y="270" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">عرض العقود</text>

        <ellipse cx="490" cy="265" rx="90" ry="22" fill="rgba(139,92,246,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="490" y="270" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">إرسال بلاغ عطل</text>

        <ellipse cx="710" cy="265" rx="90" ry="22" fill="rgba(139,92,246,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="710" y="270" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">الفواتير والدفع</text>

        <!-- Row 4 -->
        <ellipse cx="350" cy="355" rx="90" ry="22" fill="rgba(245,158,11,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="350" y="360" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">تحميل PDF عقد</text>

        <ellipse cx="590" cy="355" rx="90" ry="22" fill="rgba(245,158,11,0.06)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="590" y="360" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">تقارير الأداء</text>

        <!-- Actor lines -->
        <line x1="103" y1="200" x2="195" y2="155" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="103" y1="200" x2="195" y2="175" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="103" y1="200" x2="195" y2="265" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="103" y1="220" x2="195" y2="355" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="103" y1="195" x2="380" y2="90" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="103" y1="185" x2="390" y2="265" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="103" y1="210" x2="395" y2="355" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>

        <!-- Include / extend labels -->
        <text x="400" y="225" fill="#3D5273" font-size="10" font-family="monospace">«include»</text>
        <line x1="380" y1="197" x2="400" y2="243" stroke="#1A2845" stroke-width="1" stroke-dasharray="3,2"/>

        <text x="560" y="148" fill="#3D5273" font-size="10" font-family="monospace">«extend»</text>
        <line x1="580" y1="197" x2="590" y2="243" stroke="#1A2845" stroke-width="1" stroke-dasharray="3,2"/>

        <!-- Legend -->
        <rect x="175" y="415" width="200" height="50" rx="8" fill="rgba(255,255,255,0.02)" stroke="#1A2845" stroke-width="1"/>
        <ellipse cx="200" cy="430" rx="18" ry="10" fill="rgba(0,212,170,0.06)" stroke="#1A2845" stroke-width="1"/>
        <text x="225" y="434" fill="#3D5273" font-size="11" font-family="IBM Plex Sans Arabic">حالة تسجيل الدخول</text>
        <ellipse cx="200" cy="450" rx="18" ry="10" fill="rgba(79,142,247,0.06)" stroke="#1A2845" stroke-width="1"/>
        <text x="225" y="454" fill="#3D5273" font-size="11" font-family="IBM Plex Sans Arabic">المصاعد والعقود</text>
      </svg>
    </div>

    <!-- Navigation Flow -->
    <div class="uml-container" style="margin-bottom:24px;">
      <div class="uml-title">NAVIGATION FLOW — هيكل التنقل بين الشاشات</div>
      <svg width="100%" viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="nav-arr" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#00D4AA"/>
          </marker>
          <marker id="nav-arr-g" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3D5273"/>
          </marker>
        </defs>

        <!-- Splash / Auth -->
        <rect x="20" y="170" width="100" height="40" rx="10" fill="rgba(0,212,170,0.1)" stroke="#00D4AA" stroke-width="1.5"/>
        <text x="70" y="195" text-anchor="middle" fill="#00D4AA" font-size="12" font-family="IBM Plex Sans Arabic">Splash</text>

        <rect x="155" y="170" width="100" height="40" rx="10" fill="rgba(0,212,170,0.08)" stroke="#1A2845" stroke-width="1.5"/>
        <text x="205" y="195" text-anchor="middle" fill="#8899B4" font-size="12" font-family="IBM Plex Sans Arabic">تسجيل الدخول</text>

        <line x1="120" y1="190" x2="153" y2="190" stroke="#00D4AA" stroke-width="1.5" marker-end="url(#nav-arr)"/>

        <!-- Bottom Tab -->
        <rect x="300" y="140" width="620" height="270" rx="14" fill="rgba(255,255,255,0.02)" stroke="#1A2845" stroke-width="1.5" stroke-dasharray="6,4"/>
        <text x="610" y="128" text-anchor="middle" fill="#3D5273" font-size="12" font-family="IBM Plex Sans Arabic">Bottom Tab Navigator</text>

        <line x1="255" y1="190" x2="298" y2="190" stroke="#00D4AA" stroke-width="1.5" marker-end="url(#nav-arr)"/>

        <!-- Tab 1: Home -->
        <rect x="318" y="165" width="100" height="36" rx="9" fill="rgba(0,212,170,0.1)" stroke="#00D4AA" stroke-width="1.5"/>
        <text x="368" y="187" text-anchor="middle" fill="#00D4AA" font-size="12" font-family="IBM Plex Sans Arabic">🏠 الرئيسية</text>

        <!-- Tab 2: Elevators -->
        <rect x="438" y="165" width="100" height="36" rx="9" fill="rgba(79,142,247,0.1)" stroke="#4F8EF7" stroke-width="1.5"/>
        <text x="488" y="187" text-anchor="middle" fill="#4F8EF7" font-size="12" font-family="IBM Plex Sans Arabic">🛗 مصاعدي</text>

        <!-- Tab 3: Visits -->
        <rect x="558" y="165" width="100" height="36" rx="9" fill="rgba(139,92,246,0.1)" stroke="#8B5CF6" stroke-width="1.5"/>
        <text x="608" y="187" text-anchor="middle" fill="#8B5CF6" font-size="12" font-family="IBM Plex Sans Arabic">🔧 الزيارات</text>

        <!-- Tab 4: Contracts -->
        <rect x="678" y="165" width="100" height="36" rx="9" fill="rgba(245,158,11,0.1)" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="728" y="187" text-anchor="middle" fill="#F59E0B" font-size="12" font-family="IBM Plex Sans Arabic">📋 العقود</text>

        <!-- Tab 5: More -->
        <rect x="798" y="165" width="100" height="36" rx="9" fill="rgba(99,102,241,0.1)" stroke="#6366F1" stroke-width="1.5"/>
        <text x="848" y="187" text-anchor="middle" fill="#6366F1" font-size="12" font-family="IBM Plex Sans Arabic">⋯ المزيد</text>

        <!-- Sub-screens -->
        <!-- From Home -->
        <line x1="368" y1="201" x2="368" y2="240" stroke="#1A2845" stroke-width="1" marker-end="url(#nav-arr-g)"/>
        <rect x="318" y="240" width="100" height="30" rx="7" fill="rgba(0,0,0,0.3)" stroke="#1A2845" stroke-width="1"/>
        <text x="368" y="260" text-anchor="middle" fill="#3D5273" font-size="10" font-family="IBM Plex Sans Arabic">تتبع الفني</text>

        <!-- From Elevators -->
        <line x1="488" y1="201" x2="488" y2="240" stroke="#1A2845" stroke-width="1" marker-end="url(#nav-arr-g)"/>
        <rect x="438" y="240" width="100" height="30" rx="7" fill="rgba(0,0,0,0.3)" stroke="#1A2845" stroke-width="1"/>
        <text x="488" y="260" text-anchor="middle" fill="#3D5273" font-size="10" font-family="IBM Plex Sans Arabic">تفاصيل مصعد</text>
        <line x1="488" y1="270" x2="488" y2="305" stroke="#1A2845" stroke-width="1" marker-end="url(#nav-arr-g)"/>
        <rect x="438" y="305" width="100" height="30" rx="7" fill="rgba(0,0,0,0.3)" stroke="#1A2845" stroke-width="1"/>
        <text x="488" y="325" text-anchor="middle" fill="#3D5273" font-size="10" font-family="IBM Plex Sans Arabic">إرسال بلاغ</text>

        <!-- From Visits -->
        <line x1="608" y1="201" x2="608" y2="240" stroke="#1A2845" stroke-width="1" marker-end="url(#nav-arr-g)"/>
        <rect x="558" y="240" width="100" height="30" rx="7" fill="rgba(0,0,0,0.3)" stroke="#1A2845" stroke-width="1"/>
        <text x="608" y="260" text-anchor="middle" fill="#3D5273" font-size="10" font-family="IBM Plex Sans Arabic">تفاصيل زيارة</text>

        <!-- From Contracts -->
        <line x1="728" y1="201" x2="728" y2="240" stroke="#1A2845" stroke-width="1" marker-end="url(#nav-arr-g)"/>
        <rect x="678" y="240" width="100" height="30" rx="7" fill="rgba(0,0,0,0.3)" stroke="#1A2845" stroke-width="1"/>
        <text x="728" y="260" text-anchor="middle" fill="#3D5273" font-size="10" font-family="IBM Plex Sans Arabic">تفاصيل عقد</text>
        <line x1="728" y1="270" x2="728" y2="305" stroke="#1A2845" stroke-width="1" marker-end="url(#nav-arr-g)"/>
        <rect x="678" y="305" width="100" height="30" rx="7" fill="rgba(0,0,0,0.3)" stroke="#1A2845" stroke-width="1"/>
        <text x="728" y="325" text-anchor="middle" fill="#3D5273" font-size="10" font-family="IBM Plex Sans Arabic">تجديد العقد</text>

        <!-- From More -->
        <line x1="848" y1="201" x2="848" y2="240" stroke="#1A2845" stroke-width="1" marker-end="url(#nav-arr-g)"/>
        <rect x="798" y="240" width="100" height="30" rx="7" fill="rgba(0,0,0,0.3)" stroke="#1A2845" stroke-width="1"/>
        <text x="848" y="260" text-anchor="middle" fill="#3D5273" font-size="10" font-family="IBM Plex Sans Arabic">الفواتير</text>
        <line x1="848" y1="270" x2="848" y2="305" stroke="#1A2845" stroke-width="1" marker-end="url(#nav-arr-g)"/>
        <rect x="798" y="305" width="100" height="30" rx="7" fill="rgba(0,0,0,0.3)" stroke="#1A2845" stroke-width="1"/>
        <text x="848" y="325" text-anchor="middle" fill="#3D5273" font-size="10" font-family="IBM Plex Sans Arabic">الدعم / التقارير</text>

        <!-- Modal from anywhere -->
        <rect x="318" y="370" width="580" height="28" rx="8" fill="rgba(239,68,68,0.06)" stroke="rgba(239,68,68,0.3)" stroke-width="1" stroke-dasharray="4,3"/>
        <text x="608" y="389" text-anchor="middle" fill="#EF4444" font-size="11" font-family="IBM Plex Sans Arabic">🚨 Modal: بلاغ عطل طارئ — يمكن الوصول من أي شاشة</text>
      </svg>
    </div>

    <!-- Data Model -->
    <div class="uml-container">
      <div class="uml-title">DATA MODEL — نموذج البيانات الرئيسي (من وجهة العميل)</div>
      <svg width="100%" viewBox="0 0 960 460" xmlns="http://www.w3.org/2000/svg">
        <!-- Company -->
        <rect x="40" y="30" width="180" height="170" rx="10" fill="rgba(0,212,170,0.06)" stroke="#00D4AA" stroke-width="1.5"/>
        <rect x="40" y="30" width="180" height="34" rx="10" fill="rgba(0,212,170,0.15)"/>
        <text x="130" y="52" text-anchor="middle" fill="#00D4AA" font-size="13" font-weight="bold" font-family="monospace">Company</text>
        <line x1="40" y1="64" x2="220" y2="64" stroke="#00D4AA" stroke-width="1"/>
        <text x="56" y="82" fill="#8899B4" font-size="11" font-family="monospace">PK  id</text>
        <text x="56" y="98" fill="#8899B4" font-size="11" font-family="monospace">    name_ar</text>
        <text x="56" y="114" fill="#8899B4" font-size="11" font-family="monospace">    cr_number</text>
        <text x="56" y="130" fill="#8899B4" font-size="11" font-family="monospace">    vat_number</text>
        <text x="56" y="146" fill="#8899B4" font-size="11" font-family="monospace">    logo_url</text>
        <text x="56" y="162" fill="#8899B4" font-size="11" font-family="monospace">    phone</text>
        <text x="56" y="178" fill="#5577AA" font-size="10" font-family="monospace" font-style="italic">FK  subscription_id</text>

        <!-- Elevator -->
        <rect x="280" y="30" width="180" height="200" rx="10" fill="rgba(79,142,247,0.06)" stroke="#4F8EF7" stroke-width="1.5"/>
        <rect x="280" y="30" width="180" height="34" rx="10" fill="rgba(79,142,247,0.15)"/>
        <text x="370" y="52" text-anchor="middle" fill="#4F8EF7" font-size="13" font-weight="bold" font-family="monospace">Elevator</text>
        <line x1="280" y1="64" x2="460" y2="64" stroke="#4F8EF7" stroke-width="1"/>
        <text x="296" y="82" fill="#8899B4" font-size="11" font-family="monospace">PK  id</text>
        <text x="296" y="98" fill="#8899B4" font-size="11" font-family="monospace">FK  company_id</text>
        <text x="296" y="114" fill="#8899B4" font-size="11" font-family="monospace">    name_ar</text>
        <text x="296" y="130" fill="#8899B4" font-size="11" font-family="monospace">    location</text>
        <text x="296" y="146" fill="#8899B4" font-size="11" font-family="monospace">    brand</text>
        <text x="296" y="162" fill="#8899B4" font-size="11" font-family="monospace">    serial_number</text>
        <text x="296" y="178" fill="#8899B4" font-size="11" font-family="monospace">    floors_count</text>
        <text x="296" y="194" fill="#8899B4" font-size="11" font-family="monospace">    status</text>
        <text x="296" y="210" fill="#5577AA" font-size="10" font-family="monospace" font-style="italic">    last_maintenance</text>

        <!-- Visit -->
        <rect x="520" y="30" width="180" height="200" rx="10" fill="rgba(139,92,246,0.06)" stroke="#8B5CF6" stroke-width="1.5"/>
        <rect x="520" y="30" width="180" height="34" rx="10" fill="rgba(139,92,246,0.15)"/>
        <text x="610" y="52" text-anchor="middle" fill="#8B5CF6" font-size="13" font-weight="bold" font-family="monospace">Visit</text>
        <line x1="520" y1="64" x2="700" y2="64" stroke="#8B5CF6" stroke-width="1"/>
        <text x="536" y="82" fill="#8899B4" font-size="11" font-family="monospace">PK  id</text>
        <text x="536" y="98" fill="#8899B4" font-size="11" font-family="monospace">FK  elevator_id</text>
        <text x="536" y="114" fill="#8899B4" font-size="11" font-family="monospace">FK  technician_id</text>
        <text x="536" y="130" fill="#8899B4" font-size="11" font-family="monospace">    scheduled_date</text>
        <text x="536" y="146" fill="#8899B4" font-size="11" font-family="monospace">    time_slot</text>
        <text x="536" y="162" fill="#8899B4" font-size="11" font-family="monospace">    visit_type</text>
        <text x="536" y="178" fill="#8899B4" font-size="11" font-family="monospace">    status</text>
        <text x="536" y="194" fill="#8899B4" font-size="11" font-family="monospace">    technician_notes</text>
        <text x="536" y="210" fill="#5577AA" font-size="10" font-family="monospace" font-style="italic">    completion_photo</text>

        <!-- Contract -->
        <rect x="760" y="30" width="180" height="185" rx="10" fill="rgba(245,158,11,0.06)" stroke="#F59E0B" stroke-width="1.5"/>
        <rect x="760" y="30" width="180" height="34" rx="10" fill="rgba(245,158,11,0.15)"/>
        <text x="850" y="52" text-anchor="middle" fill="#F59E0B" font-size="13" font-weight="bold" font-family="monospace">Contract</text>
        <line x1="760" y1="64" x2="940" y2="64" stroke="#F59E0B" stroke-width="1"/>
        <text x="776" y="82" fill="#8899B4" font-size="11" font-family="monospace">PK  id</text>
        <text x="776" y="98" fill="#8899B4" font-size="11" font-family="monospace">FK  company_id</text>
        <text x="776" y="114" fill="#8899B4" font-size="11" font-family="monospace">    contract_type</text>
        <text x="776" y="130" fill="#8899B4" font-size="11" font-family="monospace">    start_date</text>
        <text x="776" y="146" fill="#8899B4" font-size="11" font-family="monospace">    end_date</text>
        <text x="776" y="162" fill="#8899B4" font-size="11" font-family="monospace">    annual_amount</text>
        <text x="776" y="178" fill="#8899B4" font-size="11" font-family="monospace">    pdf_url</text>
        <text x="776" y="194" fill="#5577AA" font-size="10" font-family="monospace" font-style="italic">    status</text>

        <!-- IssueReport -->
        <rect x="40" y="280" width="180" height="150" rx="10" fill="rgba(239,68,68,0.06)" stroke="#EF4444" stroke-width="1.5"/>
        <rect x="40" y="280" width="180" height="34" rx="10" fill="rgba(239,68,68,0.12)"/>
        <text x="130" y="302" text-anchor="middle" fill="#EF4444" font-size="13" font-weight="bold" font-family="monospace">IssueReport</text>
        <line x1="40" y1="314" x2="220" y2="314" stroke="#EF4444" stroke-width="1"/>
        <text x="56" y="332" fill="#8899B4" font-size="11" font-family="monospace">PK  id</text>
        <text x="56" y="348" fill="#8899B4" font-size="11" font-family="monospace">FK  elevator_id</text>
        <text x="56" y="364" fill="#8899B4" font-size="11" font-family="monospace">FK  reported_by</text>
        <text x="56" y="380" fill="#8899B4" font-size="11" font-family="monospace">    description</text>
        <text x="56" y="396" fill="#8899B4" font-size="11" font-family="monospace">    severity</text>
        <text x="56" y="412" fill="#5577AA" font-size="10" font-family="monospace" font-style="italic">    status / photos</text>

        <!-- Invoice -->
        <rect x="280" y="280" width="180" height="150" rx="10" fill="rgba(99,102,241,0.06)" stroke="#6366F1" stroke-width="1.5"/>
        <rect x="280" y="280" width="180" height="34" rx="10" fill="rgba(99,102,241,0.15)"/>
        <text x="370" y="302" text-anchor="middle" fill="#6366F1" font-size="13" font-weight="bold" font-family="monospace">Invoice</text>
        <line x1="280" y1="314" x2="460" y2="314" stroke="#6366F1" stroke-width="1"/>
        <text x="296" y="332" fill="#8899B4" font-size="11" font-family="monospace">PK  id</text>
        <text x="296" y="348" fill="#8899B4" font-size="11" font-family="monospace">FK  subscription_id</text>
        <text x="296" y="364" fill="#8899B4" font-size="11" font-family="monospace">    invoice_number</text>
        <text x="296" y="380" fill="#8899B4" font-size="11" font-family="monospace">    amount + vat</text>
        <text x="296" y="396" fill="#8899B4" font-size="11" font-family="monospace">    status</text>
        <text x="296" y="412" fill="#5577AA" font-size="10" font-family="monospace" font-style="italic">    paid_date</text>

        <!-- Relations -->
        <!-- Company → Elevator -->
        <line x1="220" y1="100" x2="280" y2="100" stroke="#1A2845" stroke-width="1.5" marker-end="url(#nav-arr-g)"/>
        <text x="250" y="94" text-anchor="middle" fill="#3D5273" font-size="10" font-family="monospace">1→N</text>

        <!-- Elevator → Visit -->
        <line x1="460" y1="100" x2="520" y2="100" stroke="#1A2845" stroke-width="1.5" marker-end="url(#nav-arr-g)"/>
        <text x="490" y="94" text-anchor="middle" fill="#3D5273" font-size="10" font-family="monospace">1→N</text>

        <!-- Company → Contract -->
        <line x1="130" y1="200" x2="130" y2="250" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="130" y1="250" x2="850" y2="250" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="850" y1="250" x2="850" y2="215" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#nav-arr-g)"/>
        <text x="490" y="244" text-anchor="middle" fill="#3D5273" font-size="10" font-family="monospace">1→N</text>

        <!-- Elevator → IssueReport -->
        <line x1="370" y1="230" x2="370" y2="260" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="370" y1="260" x2="130" y2="260" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3"/>
        <line x1="130" y1="260" x2="130" y2="278" stroke="#1A2845" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#nav-arr-g)"/>
      </svg>
    </div>
  </div>


  <!-- ══════════════════════════════════════
       SECTION 4 — WIREFRAMES
  ══════════════════════════════════════ -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">٤</div>
      <div>
        <div class="section-title">الواجهات الهيكلية — Wireframes</div>
        <div class="section-sub">هيكل كل شاشة بمحتواها ومكوناتها الأساسية</div>
      </div>
    </div>

    <div class="wireframes-grid">

      <!-- Screen 1: Login -->
      <div class="wireframe-wrap">
        <div class="wf-label">١ — تسجيل الدخول</div>
        <div class="wf-desc">Login Screen</div>
        <div class="phone-frame">
          <div class="phone-notch"><div class="notch-dot"></div><div class="notch-bar"></div><div class="notch-dot"></div></div>
          <div class="phone-screen" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:20px 12px;">
            <div style="width:52px; height:52px; border-radius:16px; background:rgba(0,212,170,0.15); border:1px solid rgba(0,212,170,0.3); margin-bottom:4px;"></div>
            <div class="w-bar short" style="height:12px; width:60%; margin:0 auto;"></div>
            <div class="w-bar thin" style="width:80%; margin:0 auto;"></div>
            <div style="height:14px;"></div>
            <div class="w-block" style="width:100%; height:36px; border-radius:10px;"></div>
            <div class="w-block" style="width:100%; height:36px; border-radius:10px;"></div>
            <div style="height:4px;"></div>
            <div class="w-btn" style="width:100%; height:36px; border-radius:10px;"></div>
            <div class="w-bar thin" style="width:50%; margin:0 auto;"></div>
            <div style="height:8px;"></div>
            <div style="display:flex; gap:20px; justify-content:center;">
              <div style="width:36px; height:36px; border-radius:10px; background:var(--wire-block); border:1px solid var(--wire-line);"></div>
              <div style="width:36px; height:36px; border-radius:10px; background:var(--wire-block); border:1px solid var(--wire-line);"></div>
            </div>
            <div class="w-bar thin" style="width:70%; margin:0 auto;"></div>
          </div>
          <div class="w-tabbar"></div>
        </div>
      </div>

      <!-- Screen 2: Home Dashboard -->
      <div class="wireframe-wrap">
        <div class="wf-label">٢ — لوحة التحكم الرئيسية</div>
        <div class="wf-desc">Home Dashboard</div>
        <div class="phone-frame">
          <div class="phone-notch"><div class="notch-dot"></div><div class="notch-bar"></div><div class="notch-dot"></div></div>
          <div class="phone-screen">
            <!-- Header -->
            <div class="w-row" style="justify-content:space-between;">
              <div><div class="w-bar thin short" style="margin-bottom:3px;"></div><div class="w-bar" style="width:100px; height:7px;"></div></div>
              <div style="width:30px; height:30px; border-radius:8px; background:var(--wire-block); border:1px solid var(--wire-line); position:relative;">
                <div style="position:absolute; top:-2px; right:-2px; width:8px; height:8px; border-radius:50%; background:rgba(239,68,68,0.4);"></div>
              </div>
            </div>
            <!-- Hero Banner -->
            <div class="w-hero" style="margin-top:8px;">
              <div>
                <div class="w-row" style="gap:4px; margin-bottom:4px;"><div class="w-status-dot"></div><div class="w-bar thin" style="width:60px; margin:0;"></div></div>
                <div class="w-bar" style="width:50px; height:14px; margin-bottom:2px;"></div>
                <div class="w-bar thin" style="width:70px;"></div>
              </div>
              <div style="width:50px; height:50px; border-radius:50%; border:3px solid rgba(0,212,170,0.2); display:flex; align-items:center; justify-content:center;">
                <div style="width:34px; height:34px; border-radius:50%; border:2px solid rgba(0,212,170,0.4);"></div>
              </div>
            </div>
            <!-- Stats 2x2 -->
            <div class="w-grid2" style="margin-top:6px;">
              <div class="w-block" style="height:52px;"><div style="width:18px; height:18px; border-radius:6px; background:rgba(0,212,170,0.2); margin-bottom:4px;"></div><div class="w-bar" style="width:30px; height:10px;"></div></div>
              <div class="w-block" style="height:52px;"><div style="width:18px; height:18px; border-radius:6px; background:rgba(34,197,94,0.2); margin-bottom:4px;"></div><div class="w-bar" style="width:30px; height:10px;"></div></div>
              <div class="w-block" style="height:52px;"><div style="width:18px; height:18px; border-radius:6px; background:rgba(245,158,11,0.2); margin-bottom:4px;"></div><div class="w-bar" style="width:30px; height:10px;"></div></div>
              <div class="w-block" style="height:52px;"><div style="width:18px; height:18px; border-radius:6px; background:rgba(79,142,247,0.2); margin-bottom:4px;"></div><div class="w-bar" style="width:30px; height:10px;"></div></div>
            </div>
            <!-- Quick Actions 3x2 -->
            <div class="w-bar thin short" style="margin:6px 0 4px;"></div>
            <div class="w-grid3">
              <div class="w-block" style="height:48px; text-align:center;"><div style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.06); margin:0 auto 3px;"></div><div class="w-bar thin" style="width:80%; margin:0 auto;"></div></div>
              <div class="w-block" style="height:48px; text-align:center;"><div style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.06); margin:0 auto 3px;"></div><div class="w-bar thin" style="width:80%; margin:0 auto;"></div></div>
              <div class="w-block" style="height:48px; text-align:center;"><div style="width:20px; height:18px; border-radius:6px; background:rgba(255,255,255,0.06); margin:0 auto 3px;"></div><div class="w-bar thin" style="width:80%; margin:0 auto;"></div></div>
            </div>
          </div>
          <div class="w-tabbar">
            <div class="w-tab"><div class="w-tab-dot active"></div><div class="w-tab-line active"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
          </div>
        </div>
      </div>

      <!-- Screen 3: Elevators List -->
      <div class="wireframe-wrap">
        <div class="wf-label">٣ — قائمة المصاعد</div>
        <div class="wf-desc">Elevators Screen</div>
        <div class="phone-frame">
          <div class="phone-notch"><div class="notch-dot"></div><div class="notch-bar"></div><div class="notch-dot"></div></div>
          <div class="phone-screen">
            <div class="w-bar" style="width:80px; height:11px; margin-bottom:3px;"></div>
            <div class="w-bar thin" style="width:120px;"></div>
            <!-- Filter Tabs -->
            <div class="w-row" style="margin:8px 0; gap:4px;">
              <div style="padding:4px 10px; border-radius:12px; background:rgba(0,212,170,0.2); width:32px; height:18px;"></div>
              <div style="padding:4px 10px; border-radius:12px; background:var(--wire-block); width:40px; height:18px; border:1px solid var(--wire-line);"></div>
              <div style="padding:4px 10px; border-radius:12px; background:var(--wire-block); width:40px; height:18px; border:1px solid var(--wire-line);"></div>
              <div style="padding:4px 10px; border-radius:12px; background:var(--wire-block); width:36px; height:18px; border:1px solid var(--wire-line);"></div>
            </div>
            <!-- Elevator Cards -->
            {[0,1,2,3].map && [0,1,2,3].map(() => null)}
            <div class="w-block" style="padding:10px; height:80px; margin-bottom:6px;">
              <div class="w-row" style="justify-content:space-between; margin-bottom:6px;">
                <div class="w-row" style="gap:8px;">
                  <div style="width:32px; height:32px; border-radius:8px; background:rgba(0,212,170,0.1); border:1px solid var(--wire-line);"></div>
                  <div><div class="w-bar" style="width:80px; height:8px; margin-bottom:4px;"></div><div class="w-bar thin" style="width:100px;"></div></div>
                </div>
                <div class="w-badge"></div>
              </div>
              <div style="background:rgba(255,255,255,0.03); border-radius:6px; padding:5px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px;">
                <div class="w-bar thin" style="margin:0;"></div>
                <div class="w-bar thin" style="margin:0;"></div>
                <div class="w-bar thin" style="margin:0;"></div>
              </div>
            </div>
            <div class="w-block" style="padding:10px; height:80px; margin-bottom:6px;">
              <div class="w-row" style="justify-content:space-between; margin-bottom:6px;">
                <div class="w-row" style="gap:8px;">
                  <div style="width:32px; height:32px; border-radius:8px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2);"></div>
                  <div><div class="w-bar" style="width:80px; height:8px; margin-bottom:4px;"></div><div class="w-bar thin" style="width:100px;"></div></div>
                </div>
                <div class="w-badge warn"></div>
              </div>
              <div style="background:rgba(255,255,255,0.03); border-radius:6px; padding:5px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px;">
                <div class="w-bar thin" style="margin:0;"></div>
                <div class="w-bar thin" style="margin:0;"></div>
                <div class="w-bar thin" style="margin:0;"></div>
              </div>
            </div>
            <div class="w-block" style="padding:10px; height:80px;">
              <div class="w-row" style="justify-content:space-between; margin-bottom:6px;">
                <div class="w-row" style="gap:8px;">
                  <div style="width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid var(--wire-line);"></div>
                  <div><div class="w-bar" style="width:80px; height:8px; margin-bottom:4px;"></div><div class="w-bar thin" style="width:100px;"></div></div>
                </div>
                <div class="w-badge"></div>
              </div>
              <div style="background:rgba(255,255,255,0.03); border-radius:6px; padding:5px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px;">
                <div class="w-bar thin" style="margin:0;"></div><div class="w-bar thin" style="margin:0;"></div><div class="w-bar thin" style="margin:0;"></div>
              </div>
            </div>
          </div>
          <div class="w-tabbar">
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot active"></div><div class="w-tab-line active"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
          </div>
        </div>
      </div>

      <!-- Screen 4: Elevator Detail -->
      <div class="wireframe-wrap">
        <div class="wf-label">٤ — تفاصيل المصعد</div>
        <div class="wf-desc">Elevator Detail</div>
        <div class="phone-frame">
          <div class="phone-notch"><div class="notch-dot"></div><div class="notch-bar"></div><div class="notch-dot"></div></div>
          <div class="phone-screen">
            <!-- Back + Title -->
            <div class="w-row" style="gap:8px; margin-bottom:10px;">
              <div style="width:28px; height:28px; border-radius:8px; background:var(--wire-block); border:1px solid var(--wire-line);"></div>
              <div class="w-bar" style="width:100px; height:9px;"></div>
            </div>
            <!-- Status Hero -->
            <div style="height:72px; background:rgba(0,212,170,0.06); border-radius:12px; border:1px solid rgba(0,212,170,0.15); padding:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div>
                <div class="w-badge" style="margin-bottom:5px;"></div>
                <div class="w-bar" style="width:90px; height:11px; margin-bottom:3px;"></div>
                <div class="w-bar thin" style="width:110px;"></div>
              </div>
              <div style="width:42px; height:52px; border-radius:10px; background:rgba(0,212,170,0.1); border:1px solid rgba(0,212,170,0.15);"></div>
            </div>
            <!-- Info 2x2 -->
            <div class="w-grid2" style="margin-bottom:8px;">
              <div class="w-block" style="height:50px;"><div style="font-size:16px; margin-bottom:4px;">🏭</div><div class="w-bar thin short" style="margin-bottom:3px;"></div><div class="w-bar" style="width:50px; height:8px;"></div></div>
              <div class="w-block" style="height:50px;"><div style="font-size:16px; margin-bottom:4px;">🔢</div><div class="w-bar thin short" style="margin-bottom:3px;"></div><div class="w-bar" style="width:70px; height:8px;"></div></div>
              <div class="w-block" style="height:50px;"><div style="font-size:16px; margin-bottom:4px;">🏢</div><div class="w-bar thin short" style="margin-bottom:3px;"></div><div class="w-bar" style="width:45px; height:8px;"></div></div>
              <div class="w-block" style="height:50px;"><div style="font-size:16px; margin-bottom:4px;">🔧</div><div class="w-bar thin short" style="margin-bottom:3px;"></div><div class="w-bar" style="width:60px; height:8px;"></div></div>
            </div>
            <!-- Next Visit Banner -->
            <div style="background:rgba(79,142,247,0.08); border:1px solid rgba(79,142,247,0.2); border-radius:10px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
              <div><div class="w-bar thin" style="width:80px; margin-bottom:3px;"></div><div class="w-bar" style="width:60px; height:9px; margin-bottom:2px;"></div><div class="w-bar thin" style="width:70px;"></div></div>
              <div style="width:50px; height:24px; border-radius:6px; background:rgba(79,142,247,0.2); border:1px solid rgba(79,142,247,0.3);"></div>
            </div>
            <!-- Report Issue -->
            <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.15); border-radius:10px; padding:10px; display:flex; gap:8px; align-items:center;">
              <div style="font-size:18px;">🚨</div>
              <div><div class="w-bar" style="width:80px; height:8px; margin-bottom:3px;"></div><div class="w-bar thin" style="width:100px;"></div></div>
            </div>
          </div>
          <div class="w-tabbar">
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot active"></div><div class="w-tab-line active"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
          </div>
        </div>
      </div>

      <!-- Screen 5: Visits -->
      <div class="wireframe-wrap">
        <div class="wf-label">٥ — الزيارات الفنية</div>
        <div class="wf-desc">Visits Screen</div>
        <div class="phone-frame">
          <div class="phone-notch"><div class="notch-dot"></div><div class="notch-bar"></div><div class="notch-dot"></div></div>
          <div class="phone-screen">
            <div class="w-bar" style="width:90px; height:10px; margin-bottom:3px;"></div>
            <div class="w-bar thin" style="width:130px;"></div>
            <div class="w-bar thin" style="width:100px; margin:8px 0 4px; background:rgba(0,212,170,0.2);"></div>
            <!-- Upcoming Visit Cards -->
            <div style="background:var(--wire-block); border:1px solid rgba(79,142,247,0.2); border-right:3px solid rgba(79,142,247,0.4); border-radius:10px; padding:10px; margin-bottom:6px;">
              <div class="w-row" style="justify-content:space-between; margin-bottom:6px;">
                <div class="w-bar" style="width:100px; height:8px;"></div><div class="w-badge"></div>
              </div>
              <div class="w-row" style="gap:14px; margin-bottom:8px;">
                <div><div class="w-bar thin" style="width:30px; margin-bottom:2px;"></div><div class="w-bar" style="width:50px; height:8px;"></div></div>
                <div><div class="w-bar thin" style="width:25px; margin-bottom:2px;"></div><div class="w-bar" style="width:45px; height:8px;"></div></div>
                <div><div class="w-bar thin" style="width:25px; margin-bottom:2px;"></div><div class="w-bar" style="width:55px; height:8px;"></div></div>
              </div>
              <div class="w-row" style="gap:6px;">
                <div style="flex:1; height:22px; border-radius:6px; background:rgba(0,212,170,0.12); border:1px solid rgba(0,212,170,0.2);"></div>
                <div style="width:50px; height:22px; border-radius:6px; background:var(--wire-block); border:1px solid var(--wire-line);"></div>
              </div>
            </div>
            <div class="w-divider" style="margin:8px 0;"></div>
            <div class="w-bar thin" style="width:100px; margin-bottom:6px; background:rgba(0,212,170,0.15);"></div>
            <!-- Completed Visit -->
            <div class="w-block" style="padding:10px; margin-bottom:6px;">
              <div class="w-row" style="justify-content:space-between; margin-bottom:5px;">
                <div class="w-bar" style="width:100px; height:8px;"></div><div class="w-badge"></div>
              </div>
              <div class="w-bar thin" style="width:130px; margin-bottom:5px;"></div>
              <div style="background:rgba(255,255,255,0.03); border-radius:6px; padding:6px; height:20px;"></div>
            </div>
            <div class="w-block" style="padding:10px;">
              <div class="w-row" style="justify-content:space-between; margin-bottom:5px;">
                <div class="w-bar" style="width:100px; height:8px;"></div><div class="w-badge"></div>
              </div>
              <div class="w-bar thin" style="width:130px; margin-bottom:5px;"></div>
              <div class="w-bar thin" style="width:100%;"></div>
            </div>
          </div>
          <div class="w-tabbar">
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot active"></div><div class="w-tab-line active"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
          </div>
        </div>
      </div>

      <!-- Screen 6: Technician Tracking -->
      <div class="wireframe-wrap">
        <div class="wf-label">٦ — تتبع الفني (خريطة)</div>
        <div class="wf-desc">Technician Live Tracking</div>
        <div class="phone-frame">
          <div class="phone-notch"><div class="notch-dot"></div><div class="notch-bar"></div><div class="notch-dot"></div></div>
          <div class="phone-screen" style="padding:0; position:relative;">
            <!-- Map Area -->
            <div style="height:240px; background:rgba(10,20,35,0.8); position:relative; overflow:hidden;">
              <!-- Grid lines -->
              <svg width="100%" height="100%" style="position:absolute; top:0; left:0; opacity:0.3;">
                <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1A2845" stroke-width="0.5"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#grid)"/>
                <!-- Roads -->
                <line x1="20" y1="80" x2="200" y2="80" stroke="#1A2845" stroke-width="3"/>
                <line x1="110" y1="0" x2="110" y2="240" stroke="#1A2845" stroke-width="2"/>
                <line x1="20" y1="160" x2="200" y2="160" stroke="#1A2845" stroke-width="2"/>
                <!-- Technician -->
                <circle cx="80" cy="100" r="8" fill="rgba(0,212,170,0.3)" stroke="#00D4AA" stroke-width="2"/>
                <circle cx="80" cy="100" r="4" fill="#00D4AA"/>
                <circle cx="80" cy="100" r="16" fill="rgba(0,212,170,0.08)" stroke="rgba(0,212,170,0.2)" stroke-width="1"/>
                <!-- Destination -->
                <circle cx="140" cy="140" r="6" fill="rgba(239,68,68,0.3)" stroke="#EF4444" stroke-width="1.5"/>
                <line x1="140" y1="134" x2="140" y2="130" stroke="#EF4444" stroke-width="1.5"/>
                <!-- Route -->
                <path d="M80,100 Q110,80 140,140" fill="none" stroke="#00D4AA" stroke-width="1.5" stroke-dasharray="4,3"/>
              </svg>
              <!-- ETA Badge -->
              <div style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); border:1px solid rgba(0,212,170,0.3); border-radius:8px; padding:6px 10px;">
                <div class="w-bar thin" style="width:60px; margin-bottom:3px;"></div>
                <div class="w-bar" style="width:40px; height:8px; background:rgba(0,212,170,0.3);"></div>
              </div>
            </div>
            <!-- Bottom Sheet -->
            <div style="padding:12px 10px;">
              <div style="width:30px; height:3px; border-radius:2px; background:var(--wire-line); margin:0 auto 12px;"></div>
              <!-- Technician Info -->
              <div class="w-row" style="gap:10px; margin-bottom:12px;">
                <div class="w-circle lg"></div>
                <div style="flex:1;">
                  <div class="w-bar" style="width:80px; height:9px; margin-bottom:4px;"></div>
                  <div class="w-row" style="gap:4px;">
                    <div style="width:8px; height:8px; border-radius:50%; background:var(--wire-accent); opacity:0.4;"></div>
                    <div class="w-bar thin" style="width:60px;"></div>
                  </div>
                </div>
                <div class="w-btn ghost" style="width:34px; height:34px; border-radius:10px;"></div>
              </div>
              <!-- Status Steps -->
              <div style="display:flex; gap:0; align-items:center; margin-bottom:10px;">
                <div style="width:18px; height:18px; border-radius:50%; background:rgba(0,212,170,0.3); border:2px solid var(--wire-accent); flex-shrink:0;"></div>
                <div style="flex:1; height:2px; background:rgba(0,212,170,0.2);"></div>
                <div style="width:18px; height:18px; border-radius:50%; background:rgba(0,212,170,0.3); border:2px solid var(--wire-accent); flex-shrink:0;"></div>
                <div style="flex:1; height:2px; background:var(--wire-line);"></div>
                <div style="width:18px; height:18px; border-radius:50%; background:var(--wire-block); border:2px solid var(--wire-line); flex-shrink:0;"></div>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <div class="w-bar thin" style="width:40px;"></div>
                <div class="w-bar thin" style="width:40px;"></div>
                <div class="w-bar thin" style="width:40px;"></div>
              </div>
            </div>
          </div>
          <div class="w-tabbar">
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot active"></div><div class="w-tab-line active"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
          </div>
        </div>
      </div>

      <!-- Screen 7: Contracts -->
      <div class="wireframe-wrap">
        <div class="wf-label">٧ — العقود</div>
        <div class="wf-desc">Contracts Screen</div>
        <div class="phone-frame">
          <div class="phone-notch"><div class="notch-dot"></div><div class="notch-bar"></div><div class="notch-dot"></div></div>
          <div class="phone-screen">
            <div class="w-bar" style="width:70px; height:10px; margin-bottom:3px;"></div>
            <div class="w-bar thin" style="width:110px;"></div>
            <!-- Summary Stats -->
            <div style="background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.15); border-radius:10px; padding:10px; margin:8px 0; display:flex; justify-content:space-around;">
              <div style="text-align:center;"><div class="w-bar" style="width:20px; height:14px; margin:0 auto 3px; background:rgba(139,92,246,0.3);"></div><div class="w-bar thin" style="width:40px; margin:0 auto;"></div></div>
              <div style="text-align:center;"><div class="w-bar" style="width:20px; height:14px; margin:0 auto 3px; background:rgba(0,212,170,0.3);"></div><div class="w-bar thin" style="width:30px; margin:0 auto;"></div></div>
              <div style="text-align:center;"><div class="w-bar" style="width:20px; height:14px; margin:0 auto 3px; background:rgba(245,158,11,0.3);"></div><div class="w-bar thin" style="width:50px; margin:0 auto;"></div></div>
            </div>
            <!-- Contract Card Active -->
            <div style="background:var(--wire-block); border:1px solid var(--wire-line); border-top:3px solid rgba(0,212,170,0.4); border-radius:10px; padding:10px; margin-bottom:6px;">
              <div class="w-row" style="justify-content:space-between; margin-bottom:6px;">
                <div><div class="w-bar" style="width:110px; height:9px; margin-bottom:3px;"></div><div class="w-bar thin" style="width:60px;"></div></div>
                <div class="w-badge"></div>
              </div>
              <div class="w-grid2" style="background:rgba(255,255,255,0.02); border-radius:6px; padding:6px; margin-bottom:6px; gap:6px;">
                <div><div class="w-bar thin short" style="margin-bottom:2px;"></div><div class="w-bar" style="width:65px; height:7px;"></div></div>
                <div><div class="w-bar thin short" style="margin-bottom:2px;"></div><div class="w-bar" style="width:65px; height:7px;"></div></div>
                <div><div class="w-bar thin short" style="margin-bottom:2px;"></div><div class="w-bar" style="width:50px; height:7px;"></div></div>
                <div><div class="w-bar thin short" style="margin-bottom:2px;"></div><div class="w-bar" style="width:55px; height:7px;"></div></div>
              </div>
              <div class="w-row" style="justify-content:space-between; align-items:center;">
                <div><div class="w-bar thin short" style="margin-bottom:2px;"></div><div class="w-bar" style="width:70px; height:10px; background:rgba(0,212,170,0.25);"></div></div>
                <div style="width:70px; height:26px; border-radius:7px; background:rgba(0,212,170,0.12); border:1px solid rgba(0,212,170,0.2);"></div>
              </div>
            </div>
            <!-- Contract Card Expiring -->
            <div style="background:var(--wire-block); border:1px solid rgba(245,158,11,0.2); border-top:3px solid rgba(245,158,11,0.4); border-radius:10px; padding:10px;">
              <div class="w-row" style="justify-content:space-between; margin-bottom:6px;">
                <div><div class="w-bar" style="width:110px; height:9px; margin-bottom:3px;"></div><div class="w-bar thin" style="width:60px;"></div></div>
                <div class="w-badge warn"></div>
              </div>
              <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.15); border-radius:6px; padding:8px; display:flex; gap:6px; align-items:center;">
                <div style="font-size:14px;">⚠️</div>
                <div class="w-bar thin" style="width:130px;"></div>
              </div>
            </div>
          </div>
          <div class="w-tabbar">
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot active"></div><div class="w-tab-line active"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
          </div>
        </div>
      </div>

      <!-- Screen 8: Report Issue Modal -->
      <div class="wireframe-wrap">
        <div class="wf-label">٨ — بلاغ عطل طارئ</div>
        <div class="wf-desc">Report Issue Modal (Bottom Sheet)</div>
        <div class="phone-frame">
          <div class="phone-notch"><div class="notch-dot"></div><div class="notch-bar"></div><div class="notch-dot"></div></div>
          <div class="phone-screen" style="position:relative; padding:0;">
            <!-- Dimmed background -->
            <div style="height:100px; background:rgba(0,0,0,0.4);"></div>
            <!-- Bottom Sheet -->
            <div style="background:var(--wire-bg); border-radius:20px 20px 0 0; border-top:1px solid var(--wire-line); padding:14px 12px;">
              <div style="width:32px; height:3px; border-radius:2px; background:var(--wire-line); margin:0 auto 14px;"></div>
              <!-- Title -->
              <div class="w-row" style="gap:8px; margin-bottom:14px;">
                <div style="font-size:18px;">🚨</div>
                <div><div class="w-bar" style="width:90px; height:10px; margin-bottom:3px; background:rgba(239,68,68,0.3);"></div><div class="w-bar thin" style="width:120px;"></div></div>
              </div>
              <!-- Select Elevator -->
              <div class="w-bar thin" style="width:70px; margin-bottom:4px;"></div>
              <div class="w-block" style="height:36px; display:flex; align-items:center; justify-content:space-between; padding:0 10px; margin-bottom:10px;">
                <div class="w-bar thin" style="width:100px; margin:0;"></div>
                <div class="w-bar thin" style="width:12px; margin:0;"></div>
              </div>
              <!-- Severity -->
              <div class="w-bar thin" style="width:60px; margin-bottom:4px;"></div>
              <div class="w-row" style="gap:6px; margin-bottom:10px;">
                <div style="flex:1; height:30px; border-radius:8px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3);"></div>
                <div style="flex:1; height:30px; border-radius:8px; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3);"></div>
                <div style="flex:1; height:30px; border-radius:8px; background:var(--wire-block); border:1px solid var(--wire-line);"></div>
              </div>
              <!-- Description -->
              <div class="w-bar thin" style="width:60px; margin-bottom:4px;"></div>
              <div class="w-block" style="height:60px; margin-bottom:10px;"></div>
              <!-- Photo Upload -->
              <div style="height:50px; background:var(--wire-block); border:2px dashed var(--wire-line); border-radius:10px; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:12px;">
                <div style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.06);"></div>
                <div class="w-bar thin" style="width:80px; margin:0;"></div>
              </div>
              <!-- Submit -->
              <div style="height:38px; background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); border-radius:10px; display:flex; align-items:center; justify-content:center;">
                <div class="w-bar" style="width:80px; height:8px; background:rgba(239,68,68,0.4);"></div>
              </div>
            </div>
          </div>
          <div class="w-tabbar"></div>
        </div>
      </div>

      <!-- Screen 9: Notifications -->
      <div class="wireframe-wrap">
        <div class="wf-label">٩ — الإشعارات</div>
        <div class="wf-desc">Notifications Screen</div>
        <div class="phone-frame">
          <div class="phone-notch"><div class="notch-dot"></div><div class="notch-bar"></div><div class="notch-dot"></div></div>
          <div class="phone-screen">
            <div class="w-row" style="justify-content:space-between; margin-bottom:14px;">
              <div class="w-bar" style="width:80px; height:10px;"></div>
              <div class="w-bar thin" style="width:60px;"></div>
            </div>
            <!-- Unread Notifications -->
            {[
              { color: "rgba(245,158,11", icon: "⚠️" },
              { color: "rgba(79,142,247", icon: "ℹ️" },
            ].map ? null : null}
            <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.2); border-radius:12px; padding:10px; display:flex; gap:10px; margin-bottom:8px; align-items:flex-start;">
              <div style="width:34px; height:34px; border-radius:10px; background:rgba(245,158,11,0.15); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:16px;">⚠️</div>
              <div style="flex:1;">
                <div class="w-bar" style="width:150px; height:8px; margin-bottom:4px;"></div>
                <div class="w-bar thin" style="width:80px;"></div>
              </div>
              <div style="width:7px; height:7px; border-radius:50%; background:rgba(245,158,11,0.7); flex-shrink:0; margin-top:4px;"></div>
            </div>
            <div style="background:rgba(79,142,247,0.06); border:1px solid rgba(79,142,247,0.2); border-radius:12px; padding:10px; display:flex; gap:10px; margin-bottom:8px; align-items:flex-start;">
              <div style="width:34px; height:34px; border-radius:10px; background:rgba(79,142,247,0.15); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:16px;">ℹ️</div>
              <div style="flex:1;">
                <div class="w-bar" style="width:160px; height:8px; margin-bottom:4px;"></div>
                <div class="w-bar thin" style="width:90px;"></div>
              </div>
              <div style="width:7px; height:7px; border-radius:50%; background:rgba(79,142,247,0.7); flex-shrink:0; margin-top:4px;"></div>
            </div>
            <div class="w-divider" style="margin:10px 0;"></div>
            <!-- Read Notifications -->
            <div class="w-block" style="display:flex; gap:10px; padding:10px; margin-bottom:6px; align-items:center;">
              <div style="width:34px; height:34px; border-radius:10px; background:rgba(255,255,255,0.04); flex-shrink:0;"></div>
              <div style="flex:1;"><div class="w-bar med" style="height:7px; margin-bottom:3px;"></div><div class="w-bar thin" style="width:80px;"></div></div>
            </div>
            <div class="w-block" style="display:flex; gap:10px; padding:10px; margin-bottom:6px; align-items:center;">
              <div style="width:34px; height:34px; border-radius:10px; background:rgba(255,255,255,0.04); flex-shrink:0;"></div>
              <div style="flex:1;"><div class="w-bar med" style="height:7px; margin-bottom:3px;"></div><div class="w-bar thin" style="width:70px;"></div></div>
            </div>
            <div class="w-block" style="display:flex; gap:10px; padding:10px; align-items:center;">
              <div style="width:34px; height:34px; border-radius:10px; background:rgba(255,255,255,0.04); flex-shrink:0;"></div>
              <div style="flex:1;"><div class="w-bar" style="width:140px; height:7px; margin-bottom:3px;"></div><div class="w-bar thin" style="width:60px;"></div></div>
            </div>
          </div>
          <div class="w-tabbar">
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot"></div><div class="w-tab-line"></div></div>
            <div class="w-tab"><div class="w-tab-dot active"></div><div class="w-tab-line active"></div></div>
          </div>
        </div>
      </div>

    </div><!-- /wireframes-grid -->
  </div>


  <!-- ══════════════════════════════════════
       SECTION 5 — API ENDPOINTS
  ══════════════════════════════════════ -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">٥</div>
      <div>
        <div class="section-title">API Endpoints المطلوبة</div>
        <div class="section-sub">الـ endpoints التي يحتاجها التطبيق من الـ FastAPI backend</div>
      </div>
    </div>

    <div style="background:var(--surface); border:1px solid var(--border); border-radius:18px; overflow:hidden;">
      <table class="story-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Endpoint</th>
            <th>الوصف</th>
            <th>الشاشة</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><span style="color:#22C55E; font-weight:700; font-family:monospace;">POST</span></td><td><code style="color:var(--text2); font-size:12px;">/auth/login</code></td><td>تسجيل دخول العميل + JWT</td><td><span class="screen-ref">Login</span></td></tr>
          <tr><td><span style="color:#3B82F6; font-weight:700; font-family:monospace;">GET</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/dashboard</code></td><td>ملخص الحالة + إحصائيات</td><td><span class="screen-ref">Home</span></td></tr>
          <tr><td><span style="color:#3B82F6; font-weight:700; font-family:monospace;">GET</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/elevators</code></td><td>قائمة مصاعد الشركة</td><td><span class="screen-ref">Elevators</span></td></tr>
          <tr><td><span style="color:#3B82F6; font-weight:700; font-family:monospace;">GET</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/elevators/{id}</code></td><td>تفاصيل مصعد واحد</td><td><span class="screen-ref">Elevator Detail</span></td></tr>
          <tr><td><span style="color:#3B82F6; font-weight:700; font-family:monospace;">GET</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/visits</code></td><td>كل الزيارات (scheduled + completed)</td><td><span class="screen-ref">Visits</span></td></tr>
          <tr><td><span style="color:#3B82F6; font-weight:700; font-family:monospace;">GET</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/visits/{id}/tracking</code></td><td>موقع الفني لحظياً (lat/lng)</td><td><span class="screen-ref">Tracking</span></td></tr>
          <tr><td><span style="color:#3B82F6; font-weight:700; font-family:monospace;">GET</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/contracts</code></td><td>كل عقود الشركة</td><td><span class="screen-ref">Contracts</span></td></tr>
          <tr><td><span style="color:#3B82F6; font-weight:700; font-family:monospace;">GET</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/contracts/{id}/pdf</code></td><td>تحميل PDF العقد</td><td><span class="screen-ref">Contract Detail</span></td></tr>
          <tr><td><span style="color:#22C55E; font-weight:700; font-family:monospace;">POST</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/issues</code></td><td>إرسال بلاغ عطل</td><td><span class="screen-ref">Report Issue</span></td></tr>
          <tr><td><span style="color:#3B82F6; font-weight:700; font-family:monospace;">GET</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/invoices</code></td><td>الفواتير والحالة</td><td><span class="screen-ref">Invoices</span></td></tr>
          <tr><td><span style="color:#3B82F6; font-weight:700; font-family:monospace;">GET</span></td><td><code style="color:var(--text2); font-size:12px;">/customer/notifications</code></td><td>الإشعارات</td><td><span class="screen-ref">Notifications</span></td></tr>
          <tr><td><span style="color:#8B5CF6; font-weight:700; font-family:monospace;">WS</span></td><td><code style="color:var(--text2); font-size:12px;">/ws/tracking/{visit_id}</code></td><td>WebSocket تتبع الفني</td><td><span class="screen-ref">Tracking</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>


  <!-- Footer -->
  <div style="border-top:1px solid var(--border); padding:40px 0; margin-top:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
    <div>
      <p style="color:var(--text1); font-weight:800; font-size:15px; margin:0;">ELMS — Customer App Blueprint</p>
      <p style="color:var(--text3); font-size:12px; margin:4px 0 0;">9 شاشات · 11 User Stories · 12 API Endpoints</p>
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <span class="tag accent">v1.0</span>
      <span class="tag">React Native + Expo</span>
      <span class="tag blue">FastAPI</span>
      <span class="tag">RTL Arabic</span>
    </div>
  </div>

</div>
</body>
</html>


عندي تسؤلات حول شيءبنيت موقع إدارة مصاعد وتطبيق لفنيينوانا أبغاه يكون زي اشتراكات مثل سلة والمنصات هذي لكل شركة له يوزر وله بياناته الخاصه لعلمك سويت الموقع بايثون فاست اب اي ورايكت فايت5 مارساستحضر مفهوم تعدد الاستأجار وصياغة استراتيجية التنفيذاستحضر مفهوم تعدد الاستأجار وصياغة استراتيجية التنفيذتحويل ELMS إلى SaaS Multi-Tenant 🚀
فكرتك ممتازة! هذا يُسمى Multi-Tenancy - كل شركة (Tenant) عندها بياناتها المعزولة.
عندك 3 خيارات للمعمارية:

1. 🟡 Shared Database + Schema Separation (الأسهل والأسرع)
كل البيانات في نفس الـ DB لكن كل سجل فيه company_id
python# كل جدول يحتوي على company_id
class Elevator(Base):
    company_id = Column(Integer, ForeignKey("companies.id"))
    # ...

# كل query تفلتر تلقائياً
def get_elevators(db, company_id: int):
    return db.query(Elevator).filter(
        Elevator.company_id == company_id
    ).all()
```

**✅ مناسب لك الآن** - تعديل بسيط على الكود الحالي

---

### 2. 🟠 Separate Schema per Tenant (PostgreSQL)
كل شركة لها Schema مستقل داخل نفس الـ DB

---

### 3. 🔴 Separate Database per Tenant (الأغلى)
كل شركة DB منفصل تماماً - للشركات الكبيرة فقط

---

## الخطوات العملية لمشروعك:
```
1. إضافة جدول Companies (Tenants)
2. إضافة company_id لكل الجداول
3. نظام Subdomain أو Custom Domain
4. نظام Subscriptions & Plans
5. Middleware يحدد الـ Tenant تلقائياً

عندك أسئلة محددة؟
عايز أساعدك في أي جانب؟اختر من الخيارات وأساعدك خطوة بخطوة! 👆Q: وين تبغى تبدأ؟
A: نظام Subscriptions والخططQ: كم شركة تتوقع في البداية؟
A: 50 - 500 شركة5 مارسصاغ نظام اشتراكات شامل للمؤسسات الناشئةصاغ نظام اشتراكات شامل للمؤسسات الناشئةنظام Subscriptions والخطط 💳
مع 50-500 شركة، الخيار الأمثل هو Shared Database + company_id مع نظام اشتراكات متكامل.
1. تصميم قاعدة البيانات
python# models/subscription.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

class PlanType(str, enum.Enum):
    BASIC = "basic"
    PROFESSIONAL = "professional"  
    ENTERPRISE = "enterprise"

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    TRIAL = "trial"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"

# ── جدول الشركات (Tenants) ──────────────────────────
class Company(Base):
    __tablename__ = "companies"
    
    id              = Column(Integer, primary_key=True)
    name            = Column(String(200), nullable=False)
    name_ar         = Column(String(200))               # الاسم بالعربي
    slug            = Column(String(100), unique=True)  # للـ subdomain
    email           = Column(String(200), unique=True)
    phone           = Column(String(20))
    cr_number       = Column(String(50))                # السجل التجاري
    vat_number      = Column(String(50))                # الرقم الضريبي
    logo_url        = Column(String(500))
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    
    subscription    = relationship("Subscription", back_populates="company", uselist=False)
    users           = relationship("User", back_populates="company")

# ── جدول الخطط ──────────────────────────────────────
class Plan(Base):
    __tablename__ = "plans"
    
    id              = Column(Integer, primary_key=True)
    name            = Column(String(100))               # Basic / Pro / Enterprise
    name_ar         = Column(String(100))
    plan_type       = Column(Enum(PlanType))
    price_monthly   = Column(Numeric(10, 2))            # السعر الشهري
    price_yearly    = Column(Numeric(10, 2))            # السعر السنوي (خصم)
    
    # الحدود
    max_elevators   = Column(Integer)                   # عدد المصاعد
    max_technicians = Column(Integer)                   # عدد الفنيين
    max_users       = Column(Integer)                   # عدد المستخدمين
    max_contracts   = Column(Integer)                   # عدد العقود
    
    # المميزات
    has_mobile_app  = Column(Boolean, default=True)
    has_reports     = Column(Boolean, default=True)
    has_api_access  = Column(Boolean, default=False)
    has_custom_branding = Column(Boolean, default=False)
    has_priority_support = Column(Boolean, default=False)
    
    is_active       = Column(Boolean, default=True)

# ── جدول الاشتراكات ─────────────────────────────────
class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id              = Column(Integer, primary_key=True)
    company_id      = Column(Integer, ForeignKey("companies.id"), unique=True)
    plan_id         = Column(Integer, ForeignKey("plans.id"))
    status          = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    
    start_date      = Column(DateTime)
    end_date        = Column(DateTime)
    trial_end_date  = Column(DateTime)                  # نهاية التجربة المجانية
    
    is_yearly       = Column(Boolean, default=False)    # شهري أو سنوي
    auto_renew      = Column(Boolean, default=True)
    
    # الاستخدام الحالي
    current_elevators   = Column(Integer, default=0)
    current_technicians = Column(Integer, default=0)
    current_users       = Column(Integer, default=0)
    
    company         = relationship("Company", back_populates="subscription")
    plan            = relationship("Plan")
    invoices        = relationship("Invoice", back_populates="subscription")

# ── جدول الفواتير ────────────────────────────────────
class Invoice(Base):
    __tablename__ = "invoices"
    
    id              = Column(Integer, primary_key=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    invoice_number  = Column(String(50), unique=True)   # INV-2024-0001
    amount          = Column(Numeric(10, 2))
    vat_amount      = Column(Numeric(10, 2))            # VAT 15%
    total_amount    = Column(Numeric(10, 2))
    status          = Column(String(20))                # paid / pending / overdue
    due_date        = Column(DateTime)
    paid_date       = Column(DateTime, nullable=True)
    
    subscription    = relationship("Subscription", back_populates="invoices")

2. الخطط المقترحة لسوق السعودية
python# seed_plans.py - بيانات الخطط الأولية
plans = [
    {
        "name": "Basic",
        "name_ar": "الأساسية",
        "plan_type": "basic",
        "price_monthly": 299,     # ريال سعودي
        "price_yearly": 2990,     # خصم شهرين
        "max_elevators": 20,
        "max_technicians": 5,
        "max_users": 3,
        "max_contracts": 10,
        "has_mobile_app": True,
        "has_reports": False,
        "has_api_access": False,
        "has_custom_branding": False,
    },
    {
        "name": "Professional", 
        "name_ar": "الاحترافية",
        "plan_type": "professional",
        "price_monthly": 799,
        "price_yearly": 7990,
        "max_elevators": 100,
        "max_technicians": 20,
        "max_users": 10,
        "max_contracts": 50,
        "has_mobile_app": True,
        "has_reports": True,
        "has_api_access": False,
        "has_custom_branding": False,
        "has_priority_support": True,
    },
    {
        "name": "Enterprise",
        "name_ar": "المؤسسية", 
        "plan_type": "enterprise",
        "price_monthly": 1999,
        "price_yearly": 19990,
        "max_elevators": -1,      # -1 = unlimited
        "max_technicians": -1,
        "max_users": -1,
        "max_contracts": -1,
        "has_mobile_app": True,
        "has_reports": True,
        "has_api_access": True,
        "has_custom_branding": True,
        "has_priority_support": True,
    }
]

3. Middleware عزل البيانات
python# middleware/tenant.py
from fastapi import Request, HTTPException
from jose import jwt

async def get_current_company(request: Request, db: Session = Depends(get_db)):
    """يستخرج company_id من الـ JWT ويتحقق من الاشتراك"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    company_id = payload.get("company_id")
    
    # تحقق من الاشتراك النشط
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id,
        Subscription.status.in_(["active", "trial"]),
        Subscription.end_date > datetime.utcnow()
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=402, detail="الاشتراك منتهي أو غير نشط")
    
    return company_id, subscription

# استخدامه في كل endpoint
@router.get("/elevators")
async def get_elevators(
    tenant: tuple = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    company_id, subscription = tenant
    
    # بيانات الشركة فقط - عزل تلقائي ✅
    return db.query(Elevator).filter(
        Elevator.company_id == company_id
    ).all()

4. فحص حدود الخطة
python# utils/plan_limits.py
class PlanLimitChecker:
    
    @staticmethod
    def check_elevator_limit(db: Session, company_id: int):
        sub = db.query(Subscription).filter_by(company_id=company_id).first()
        plan = sub.plan
        
        if plan.max_elevators == -1:  # Enterprise = unlimited
            return True
            
        if sub.current_elevators >= plan.max_elevators:
            raise HTTPException(
                status_code=403,
                detail=f"وصلت للحد الأقصى ({plan.max_elevators} مصاعد). يرجى ترقية الخطة"
            )
        return True

# في endpoint إضافة مصعد
@router.post("/elevators")
async def add_elevator(tenant = Depends(get_current_company), ...):
    company_id, subscription = tenant
    PlanLimitChecker.check_elevator_limit(db, company_id)  # ✅ فحص الحد
    # ... باقي الكود
```

---

## الخطوات التالية 🗺️
```
المرحلة 1 ✅  →  Models + Migration (الآن)
المرحلة 2    →  Registration Flow (تسجيل شركة جديدة + Trial)
المرحلة 3    →  Subscription Page (صفحة الخطط في الفرونت)
المرحلة 4    →  بوابة دفع (Moyasar أو HyperPay - سعودي)
المرحلة 5    →  Auto-renewal + إشعارات انتهاء الاشتراك

تبغى أبدأ معك في أي مرحلة؟ تسجيل الشركات أو صفحة الخطط بالفرونت؟طيب خليك من هذا انا سويت تطبيق للفني والادارة باقي اسوي تطبيق للعميل فا ابغى من اقتراحات وتصميمك السحري للواجهات من الف للياء ووش الأشياء اللي يحتاجها العميل من مراقبة المصعد ومتابعة أعمال الفنيين ومتابعة كل ما يخصه من عقوده ومصاعده5 مارسصمم تطبيق عميل شامل بواجهة فاخرة وميزات متعددةصمم تطبيق عميل شامل بواجهة فاخرة وميزات متعددةClaude's response was interruptedRetryلا تبرمج اي كود عطني تفاصيل برومت و uml diagram وواجهات هيكلية5 مارسصاغ خطة شاملة لتوثيق بصري بدون برمجةصاغ خطة شاملة لتوثيق بصري بدون برمجةالـ Blueprint جاهز بالكامل 🎯 يحتوي على:
١ — البرومت والمواصفات
رؤية التطبيق، المستخدم المستهدف، الوظائف الأساسية، التقنيات، نظام التصميم، والمتطلبات غير الوظيفية.
٢ — User Stories (11 قصة)
كل وظيفة مع أولويتها (عالية/متوسطة/منخفضة) والشاشة المرتبطة.
٣ — مخططات UML

Use Case Diagram — كل تفاعلات العميل مع النظام
Navigation Flow — هيكل التنقل بين الشاشات (Stack + Bottom Tabs)
Data Model — العلاقات بين الجداول من وجهة العميل

٤ — ٩ واجهات هيكلية
Login، Home Dashboard، قائمة المصاعد، تفاصيل مصعد، الزيارات، تتبع الفني بالخريطة، العقود، بلاغ عطل (Bottom Sheet Modal)، الإشعارات.
٥ — API Endpoints
12 endpoint يحتاجها التطبيق من الـ FastAPI — منها WebSocket لتتبع الفني.
