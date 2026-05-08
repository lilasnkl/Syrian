# شرح مسار `post new request`

هذا الملف يشرح, خطوة بخطوة, كيف يتم إنشاء طلب جديد في هذا المشروع بدءًا من الواجهة الأمامية (`frontend`) وحتى يصل إلى قاعدة البيانات (`database`).

المهم جدًا أن تعرف نقطة أساسية في هذا المشروع:

- في الواجهة الأمامية اسم الميزة هو `Request` أو `Post New Request`.
- في الخلفية نفس الكيان اسمه `Order`.
- لهذا السبب إنشاء طلب جديد في الواجهة ينتهي بطلب HTTP إلى المسار `POST /api/v1/orders/`.

## الخلاصة السريعة

المسار الكامل كالتالي:

```text
المستخدم يملأ النموذج
-> صفحة الواجهة تجمع البيانات
-> Zustand store يحول البيانات إلى صيغة API
-> httpRequest يرسل POST إلى /api/v1/orders/
-> Django URL routing يوجه الطلب إلى OrderListCreateView
-> Serializer يتحقق من صحة البيانات
-> OrderService يطبق قواعد العمل
-> OrderRepository يستدعي Django ORM
-> Order.objects.create(...) ينفذ INSERT في قاعدة البيانات
-> يتم إرجاع الاستجابة للواجهة
-> الواجهة تعيد جلب البيانات وتعرض الطلب الجديد
```

## 1. من أين يبدأ الطلب في الواجهة الأمامية؟

يوجد مساران رئيسيان في الواجهة لإنشاء طلب جديد:

- `frontend/src/pages/MyRequestsPage.tsx`
- `frontend/src/pages/ServiceDetailPage.tsx`

والمسارات معرفة في:

- `frontend/src/routes/route-config.tsx`

المساران هما:

- `/my-requests`
- `/services/:providerId/:serviceId`

الفرق بينهما:

- `MyRequestsPage.tsx`: المستخدم ينشئ طلبًا عامًا من صفحة "طلباتي".
- `ServiceDetailPage.tsx`: المستخدم يطلب خدمة محددة من مزود محدد.

لكن في النهاية, كلاهما يصلان إلى نفس الدالة في الـ store:

- `useDataStore().addRequest(...)`

## 2. ماذا يحدث داخل النموذج في الواجهة؟

### الحالة الأولى: من صفحة `MyRequestsPage.tsx`

الصفحة تستخدم:

- `react-hook-form`
- `zod`

وهذا يعني أن التحقق الأولي من البيانات يحدث في المتصفح قبل الإرسال.

الحقول الأساسية التي يجمعها النموذج:

- `title`
- `description`
- `category`
- `budget`
- `location`
- `urgency`
- `preferredTime`

وعند الضغط على زر `Post New Request`, يتم تشغيل `onSubmit`.

### الحالة الثانية: من صفحة `ServiceDetailPage.tsx`

هنا يوجد نموذج أبسط يطلب:

- `description`
- `preferredTime`
- `preferredLocation`
- `desiredBudget`

ولأن المستخدم دخل من صفحة خدمة محددة, فالصفحة تعرف مسبقًا:

- الخدمة المطلوبة
- مقدم الخدمة
- الفئة
- السعر الافتراضي

## 3. ملاحظة مهمة: الواجهة تنشئ كائنًا محليًا, لكن هذا ليس ما يُحفَظ مباشرة في قاعدة البيانات

في `MyRequestsPage.tsx` و `ServiceDetailPage.tsx` يتم إنشاء كائن من نوع `ServiceRequest` داخل الواجهة. هذا الكائن مفيد لواجهة المستخدم, لكنه ليس الشكل النهائي الذي يذهب إلى قاعدة البيانات.

مثال على بيانات الواجهة:

```ts
{
  id: `r${Date.now()}`,
  clientId: user.id,
  clientName: user.name,
  title: data.title,
  description: data.description,
  category: data.category,
  budget: data.budget,
  location: data.location,
  status: 'open',
  urgency: data.urgency,
  createdAt: '2026-05-06',
  bidsCount: 0,
  preferredTime: data.preferredTime
}
```

لكن انتبه:

- `id` المحلي لا يتم إرساله للخلفية.
- `clientId` و `clientName` لا يتم إرسالهما للخلفية.
- `status` لا تعتمد الخلفية عليه من الواجهة.
- `createdAt` لا تعتمد الخلفية عليه من الواجهة.
- `bidsCount` لا يتم إرساله أصلًا.

السبب:

- رقم الطلب الحقيقي يجب أن يولد من قاعدة البيانات.
- العميل الحقيقي يجب أن يؤخذ من المستخدم المسجل دخوله (`request.user`) وليس من بيانات الواجهة.
- حالة الطلب الأولية يجب أن يحددها الموديل في الخلفية.
- تاريخ الإنشاء يجب أن يسجل من الخادم.

بمعنى آخر: الواجهة ترسل فقط البيانات التي يسمح النظام للمستخدم أن يحددها.

## 4. كيف تنتقل البيانات من الصفحة إلى الـ store؟

الصفحتان تستدعيان:

- `frontend/src/stores/data-store.ts`
- الدالة: `addRequest`

هذه الدالة هي أول نقطة مهمة في تحويل البيانات من شكل الواجهة إلى شكل الـ API.

الدالة ترسل هذا الشكل تقريبًا:

```ts
await createOrder({
  service: req.serviceId ? Number(req.serviceId) : undefined,
  title: req.title,
  description: req.description,
  category: req.backendCategory ?? req.category,
  budget: req.budget,
  location: req.location,
  urgency: req.urgency,
  preferred_time: req.preferredTime,
});
```

لاحظ التحويلات التالية:

- `serviceId` في الواجهة يتحول إلى `service` في API.
- `preferredTime` يتحول إلى `preferred_time` لأن الخلفية تستخدم أسلوب `snake_case`.
- `backendCategory ?? category` يعني: إذا كانت الواجهة تحتفظ باسم فئة خاص بالخلفية, استخدمه. وإلا استخدم فئة الواجهة.

هذا مهم جدًا في الطلب المباشر من صفحة الخدمة, لأن الواجهة أحيانًا تعرض فئة مبسطة للمستخدم لكنها تحتفظ بالقيمة الأصلية القادمة من الخلفية داخل `backendCategory`.

## 5. من الـ store إلى دالة الـ API

بعد تجهيز البيانات, `addRequest` تستدعي:

- `frontend/src/features/orders/api.ts`
- الدالة: `createOrder(input)`

وهذه الدالة لا تحتوي منطقًا كبيرًا, بل فقط تستدعي عميل HTTP العام:

```ts
return httpRequest<{ order: BackendOrder }>("/orders/", {
  method: "POST",
  body: input,
});
```

إذًا هنا أصبح من الواضح أن:

- اسم الميزة في الواجهة `request`
- لكن طلب الشبكة الحقيقي يذهب إلى `/orders/`

## 6. كيف يتم إرسال طلب HTTP فعليًا؟

الإرسال الفعلي يتم في:

- `frontend/src/api/http-client.ts`

هذه الدالة تقوم بعدة أشياء مهمة:

### 6.1 تكوين الرابط الكامل

الرابط الأساسي يأتي من:

- `frontend/src/api/endpoints.ts`

القيمة الافتراضية هي:

```ts
http://localhost:8000/api/v1
```

وعندما ترسل `"/orders/"`, يصبح الرابط النهائي:

```text
http://localhost:8000/api/v1/orders/
```

### 6.2 تحويل الـ body إلى JSON

إذا كانت العملية `POST`, يتم وضع:

- `Content-Type: application/json`

ثم يتم تنفيذ:

```ts
JSON.stringify(options.body)
```

### 6.3 إرسال الكوكيز مع الطلب

الدالة تضيف:

```ts
credentials: "include"
```

وهذا مهم لأن المشروع يستخدم تسجيل دخول مبنيًا على Cookies مع JWT.

### 6.4 إضافة `X-CSRFToken`

إذا كان الطلب من نوع `POST` أو `PATCH` أو `DELETE`, تقوم الدالة بقراءة قيمة `csrftoken` من الكوكيز, ثم تضيفها إلى الهيدر:

```text
X-CSRFToken: <token>
```

وهذا مهم لأن الخلفية تستخدم `CsrfViewMiddleware`.

## 7. كيف تكون المصادقة جاهزة أصلًا؟

قبل أن يستطيع المستخدم إنشاء طلب جديد, يجب أن يكون مسجل دخوله.

ملفات مهمة هنا:

- `backend/apps/accounts/api/views.py`
- `backend/config/settings/base.py`

عند `login` أو `register`:

- الخلفية تنشئ `access token` و `refresh token`
- وتضعهما في Cookies من نوع `HttpOnly`
- وتجهز CSRF token

لذلك عند إنشاء طلب جديد لاحقًا:

- المتصفح يرسل كوكيز المصادقة تلقائيًا
- `http-client.ts` يرسل `X-CSRFToken`
- الخلفية تستطيع معرفة المستخدم الحالي من `request.user`

## 8. ماذا يستقبل الـ backend بالضبط؟

الشكل المتوقع للطلب المرسل إلى الخلفية هو تقريبًا:

```json
{
  "service": 200,
  "title": "Kitchen sink fix",
  "description": "Need a verified plumber for leaking sink",
  "category": "plumbing",
  "budget": 150,
  "location": "Damascus",
  "urgency": "medium",
  "preferred_time": "Tomorrow afternoon"
}
```

وحقل `service` اختياري:

- إذا كان موجودًا, فهذا طلب مباشر لخدمة محددة.
- إذا لم يكن موجودًا, فهذا طلب عام.

## 9. كيف يصل الطلب إلى الـ View في Django؟

المسار في الخلفية يمر بهذه الملفات:

- `backend/config/urls.py`
- `backend/apps/orders/api/urls.py`
- `backend/apps/orders/api/views.py`

الربط يتم كالتالي:

1. `config/urls.py` يربط `api/v1/orders/` مع `apps.orders.api.urls`
2. `apps/orders/api/urls.py` يربط المسار الفارغ `""` مع `OrderListCreateView`
3. لأن الطلب `POST`, يتم تنفيذ `OrderListCreateView.post()`

والدالة الأساسية هي:

```py
def post(self, request):
    serializer = OrderCreateUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    order = OrderService.create_order(actor=request.user, attrs=serializer.validated_data)
    return success_response(...)
```

هذا السطر يلخص الفكرة كلها:

- `request.data`: البيانات القادمة من الواجهة
- `serializer.is_valid()`: فحص الصحة
- `request.user`: المستخدم الحالي من المصادقة
- `OrderService.create_order(...)`: منطق العمل الحقيقي

## 10. ما وظيفة الـ Serializer؟

الـ serializer موجود في:

- `backend/apps/orders/api/serializers.py`

والكلاس المسؤول عن الإنشاء هو:

- `OrderCreateUpdateSerializer`

هذا الكلاس يتحقق من:

- `title` نص
- `description` نص
- `category` نص
- `budget` رقم عشري `Decimal`
- `location` نص
- `urgency` واحدة من `low`, `medium`, `high`
- `preferred_time` اختياري
- `service` كمرجع إلى `ServiceListing`

أهم نقطة للمبتدئين هنا:

`service` ليس مجرد رقم يتم تمريره كما هو. لأن `PrimaryKeyRelatedField` يقوم بالتحقق من أن هذا الـ ID موجود فعلًا داخل جدول الخدمات. فإذا كان الرقم غير موجود, ترجع الخلفية `400 Bad Request` بدلًا من حدوث خطأ داخلي.

بعد نجاح التحقق, تصبح البيانات داخل:

- `serializer.validated_data`

وهنا تكون البيانات جاهزة للطبقة التالية.

## 11. ماذا تفعل طبقة الخدمة `OrderService`؟

المنطق الحقيقي موجود في:

- `backend/apps/orders/services/order_service.py`

والدالة المستخدمة عند الإنشاء هي:

- `OrderService.create_order(actor=request.user, attrs=serializer.validated_data)`

هذه الدالة مسؤولة عن قواعد العمل, وليس فقط الحفظ.

### ما الذي تتحقق منه؟

1. تتأكد أن المستخدم الحالي دوره `customer`
2. تتحقق من صحة الخدمة المختارة إن وجدت
3. تنفذ الحفظ داخل `transaction.atomic`

### لماذا هذا مهم؟

لأن الخلفية لا تثق بالواجهة وحدها.

حتى لو تمكن شخص من إرسال طلب يدوي من Postman أو من المتصفح, فهذه الطبقة ستمنع الحالات غير المسموح بها.

### التحقق الخاص بالخدمة المباشرة

إذا كان الطلب مرتبطًا بخدمة معينة (`service` موجود), فالدالة `_validate_service_reference` تتحقق من:

- أن الخدمة `is_active`
- أن `category` الخاصة بالطلب تطابق `category` الخاصة بالخدمة

إذا لم تتطابق الفئة, يتم رفع `BusinessRuleViolation` بالكود:

- `service_category_mismatch`

وتعود الاستجابة بحالة `409 Conflict`.

## 12. أين يتم الحفظ الفعلي في قاعدة البيانات؟

بعد نجاح كل التحققات, تنتقل الدالة إلى repository:

- `backend/apps/orders/repositories/order_repository.py`

وتحديدًا إلى:

```py
OrderRepository.create(customer=actor, **attrs)
```

وهذه بدورها تستدعي:

```py
Order.objects.create(**kwargs)
```

هنا تحدث النقلة المهمة جدًا:

- قبل هذه اللحظة كانت البيانات مجرد JSON ثم `validated_data`
- في هذه اللحظة تتحول إلى كائن Django Model
- ثم Django ORM ينفذ أمر `INSERT` داخل قاعدة البيانات

## 13. ما هو الموديل الذي يتم حفظه؟

الموديل موجود في:

- `backend/apps/orders/models/order.py`

الكلاس هو:

- `Order`

ومن أهم الحقول فيه:

- `customer`
- `service`
- `title`
- `description`
- `category`
- `budget`
- `location`
- `urgency`
- `preferred_time`
- `status`
- `awarded_provider`
- `created_at`
- `updated_at`

وهنا نلاحظ من جديد أن الخلفية هي التي تتحكم في أشياء مهمة:

- `customer` يأتي من `request.user`
- `status` قيمته الافتراضية `open`
- `created_at` يُسجل تلقائيًا
- `updated_at` يُحدث تلقائيًا

بما أنه لا يوجد `db_table` مخصص, فغالبًا Django يحفظ السجل في جدول باسم قريب من:

```text
orders_order
```

## 14. أي قاعدة بيانات تُستخدم؟

الإعدادات موجودة في:

- `backend/config/settings/base.py`

المشروع يدعم:

- PostgreSQL عندما تكون متغيرات البيئة الخاصة بقاعدة البيانات موجودة
- SQLite كخيار احتياطي محلي

لذلك عند تنفيذ `Order.objects.create(...)`:

- في بيئة الإنتاج غالبًا سيتم تنفيذ `INSERT` في PostgreSQL
- وفي البيئة المحلية قد يكون الحفظ في SQLite إذا لم يتم إعداد PostgreSQL

## 15. هل يتم حفظ شيء آخر غير الطلب نفسه؟

نعم, أحيانًا.

إذا كان الطلب مباشرًا على خدمة محددة, فإن `OrderService.create_order` ينشئ أيضًا إشعارًا لمقدم الخدمة:

- `NotificationService.create(...)`

هذا يعني أن العملية قد تشمل:

- إنشاء سجل جديد في `orders`
- وإنشاء سجل جديد في `notifications`

وبما أن الدالة داخل `transaction.atomic`, فهذا يعطيك ميزة مهمة:

- إذا فشل جزء من العملية, يتم التراجع عن العملية كلها
- فلا نحصل على طلب محفوظ بدون البيانات المرتبطة التي يجب أن تحفظ معه داخل نفس المعاملة

## 16. كيف ترجع الاستجابة إلى الواجهة؟

بعد نجاح الحفظ, تقوم الـ view بإرجاع البيانات عبر:

- `OrderSerializer`
- `success_response(...)`

الاستجابة تكون بالشكل العام التالي:

```json
{
  "success": true,
  "message": "Order created",
  "data": {
    "order": {
      "id": 123,
      "customer_id": 15,
      "customer_name": "Noor Customer",
      "service": 200,
      "title": "Kitchen sink fix",
      "description": "Need a verified plumber for leaking sink",
      "category": "plumbing",
      "budget": "150.00",
      "location": "Damascus",
      "urgency": "medium",
      "preferred_time": "Tomorrow afternoon",
      "status": "open",
      "awarded_provider_id": null,
      "bids_count": 0,
      "created_at": "2026-05-06T10:30:00Z",
      "updated_at": "2026-05-06T10:30:00Z"
    }
  }
}
```

لاحظ أن بعض القيم التي لم تكن مرسلة من الواجهة أصبحت موجودة الآن, مثل:

- `id`
- `customer_id`
- `customer_name`
- `status`
- `bids_count`
- `created_at`
- `updated_at`

وهذا طبيعي لأن هذه القيم تم توليدها أو حسابها في الخلفية.

## 17. كيف تتعامل الواجهة مع الاستجابة بعد الحفظ؟

بعد نجاح `createOrder(...)`, لا تقوم الواجهة بإضافة العنصر يدويًا فقط, بل تستدعي:

- `hydrateMarketplace()`

وهذا موجود أيضًا في:

- `frontend/src/stores/data-store.ts`

أثناء إعادة الجلب:

- `listOrders()` يجلب الطلبات من الخلفية
- ثم `mapOrderToRequest()` يحول `BackendOrder` إلى `ServiceRequest` مناسب للواجهة

هذا يعني أن الواجهة لا تعتمد على التخمين المحلي, بل تعيد قراءة الحقيقة النهائية من الخادم.

وهذه خطوة ممتازة لأن الخادم هو المصدر الحقيقي للبيانات.

## 18. كيف تتغير البيانات من طبقة إلى أخرى؟

هذا من أهم الأشياء التي يجب أن يفهمها المبتدئ.

### في الواجهة

```ts
ServiceRequest
```

### أثناء الإرسال

```json
POST /api/v1/orders/
{
  "service": 200,
  "title": "Kitchen sink fix",
  "description": "Need a verified plumber for leaking sink",
  "category": "plumbing",
  "budget": 150,
  "location": "Damascus",
  "urgency": "medium",
  "preferred_time": "Tomorrow afternoon"
}
```

### داخل Django بعد التحقق

```py
serializer.validated_data
```

ويحتوي على قيم Python جاهزة, مثل:

- `service` ككائن `ServiceListing` فعلي, وليس مجرد رقم فقط
- `budget` كقيمة `Decimal`

### داخل الموديل

```py
Order(...)
```

### داخل قاعدة البيانات

سطر جديد في جدول الطلبات يحتوي على:

- رقم الطلب
- رقم العميل
- رقم الخدمة إن وجدت
- العنوان
- الوصف
- الفئة
- الميزانية
- الموقع
- الأولوية
- الوقت المفضل
- الحالة
- وقت الإنشاء

## 19. ماذا يحدث إذا كانت البيانات خاطئة؟

المشروع يملك معالج أخطاء موحدًا في:

- `backend/shared/exceptions/handlers.py`

لذلك الأخطاء ترجع بصيغة منظمة.

أمثلة شائعة:

- `400 Bad Request`: إذا كانت البيانات غير صالحة, مثل `service` غير موجودة
- `401 Unauthorized`: إذا لم يكن المستخدم مسجلًا دخوله
- `403 Forbidden`: إذا كان المستخدم ليس `customer`
- `409 Conflict`: إذا خالفت البيانات قاعدة عمل, مثل عدم تطابق فئة الطلب مع فئة الخدمة

مثال على استجابة خطأ:

```json
{
  "success": false,
  "error": {
    "type": "business_rule_violation",
    "code": "service_category_mismatch",
    "details": {
      "service_category": "plumbing",
      "request_category": "cleaning"
    }
  }
}
```

## 20. لماذا هذا التصميم جيد؟

هذا المسار منظم لعدة أسباب:

- الواجهة مسؤولة عن تجربة المستخدم وجمع البيانات
- `store` مسؤول عن تحويل البيانات بين شكل الواجهة وشكل API
- `http-client` مسؤول عن النقل الشبكي والمصادقة و CSRF
- `serializer` مسؤول عن التحقق من صحة المدخلات
- `service layer` مسؤولة عن قواعد العمل
- `repository` مسؤول عن الوصول للبيانات
- `model` يمثل شكل البيانات داخل قاعدة البيانات

هذا الفصل يجعل المشروع أسهل في:

- الفهم
- التعديل
- الاختبار
- اكتشاف الأخطاء

## 21. أهم الملفات التي تتبعها إذا أردت فهم المسار بنفسك

ابدأ بهذه الملفات بهذا الترتيب:

1. `frontend/src/pages/MyRequestsPage.tsx`
2. `frontend/src/pages/ServiceDetailPage.tsx`
3. `frontend/src/stores/data-store.ts`
4. `frontend/src/features/orders/api.ts`
5. `frontend/src/api/http-client.ts`
6. `backend/config/urls.py`
7. `backend/apps/orders/api/urls.py`
8. `backend/apps/orders/api/views.py`
9. `backend/apps/orders/api/serializers.py`
10. `backend/apps/orders/services/order_service.py`
11. `backend/apps/orders/repositories/order_repository.py`
12. `backend/apps/orders/models/order.py`
13. `backend/shared/exceptions/handlers.py`
14. `backend/shared/responses/api_response.py`

## 22. ملخص نهائي قصير جدًا

عند الضغط على `Post New Request`:

1. الواجهة تجمع البيانات وتتحقق منها
2. الـ store يحولها إلى صيغة مناسبة للـ API
3. `httpRequest` يرسل `POST /api/v1/orders/`
4. Django يمرر الطلب إلى `OrderListCreateView`
5. الـ serializer يتحقق من البيانات
6. `OrderService` يطبق قواعد العمل
7. `OrderRepository` و `Django ORM` يحفظان السجل في قاعدة البيانات
8. الخادم يرجع الطلب الجديد
9. الواجهة تعيد الجلب وتعرض البيانات النهائية من الخادم

إذا أردت تبسيط الفكرة في جملة واحدة:

`Post New Request` في الواجهة هو مجرد بداية, أما الحفظ الحقيقي فلا يحدث إلا بعد أن تمر البيانات عبر التحقق, وقواعد العمل, وطبقة ORM, ثم تُكتب كسجل جديد في قاعدة البيانات.
