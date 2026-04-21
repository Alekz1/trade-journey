# 🎓 Дипломен проект
## Готова и работеща среда за изпробване може да намерите на: lechev.hopto.org

## 📋 Изисквания

Преди да стартирате проекта, уверете се, че имате инсталирано следното:

- [Python 3.13+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

---

## ⚙️ Конфигурация на файловете

Преди стартиране трябва ръчно да създадете и попълните следните конфигурационни файлове:

### 1. `backend/app/.env`

Структурата на базата данни се генерира автоматично стига да съществува.

```env
SECRET_KEY=super-secret-key-change-this
SQLALCHEMY_DATABASE_URL=mysql+pymysql://tradejournal:tradeproject@localhost:3306/tradejournal
```

---

### 2. `frontend/.env`

```env
VITE_API_URL=http://localhost:8000
```

---

### 3. `backend/app/firebase-service-account.json`

Изтеглете от **Firebase Console → Project Settings → Service Accounts → Generate new private key**:

```json
{
  "type": "service_account",
  "project_id": "your_project_id",
  "private_key_id": "your_private_key_id",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com",
  "client_id": "your_client_id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

---

### 4. `frontend/src/services/firebase-config.json`

Изтеглете от **Firebase Console → Project Settings → General → Your apps → Config**:

```json
{
  "apiKey": "your_api_key",
  "authDomain": "your_project.firebaseapp.com",
  "projectId": "your_project_id",
  "storageBucket": "your_project.appspot.com",
  "messagingSenderId": "your_sender_id",
  "appId": "your_app_id"
}
```

---

### 5. `backend/.oci/config` — Oracle Cloud (OCI) за съхранение на снимки

```ini
[DEFAULT]
user=ocid1.user.oc1..your_user_ocid
fingerprint=xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx
tenancy=ocid1.tenancy.oc1..your_tenancy_ocid
region=eu-frankfurt-1
key_file=~/.oci/oci_api_key.pem
```

> Поставете и двата ключа в `backend/.oci/`:
> - `oci_api_key.pem` — **частен** ключ (изтеглен при създаване на API key в OCI Console)
> - `oci_api_key_public.pem` — **публичен** ключ (качен в OCI Console → User Settings → API Keys)

---

## 🚀 Стартиране на проекта

### 🔧 Бекенд (FastAPI)

1. **Отидете в папката на бекенда:**

```bash
cd backend
```

2. **Създайте виртуална среда (venv):**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

3. **Инсталирайте зависимостите:**

```bash
pip install -r requirements.txt
```

4. **Стартирайте сървъра:**

```bash
uvicorn app.main:app --reload --env-file .\app\.env --host 0.0.0.0 --port 8000
```

> Бекендът ще бъде достъпен на: **http://localhost:8000**  
> Документация (Swagger UI): **http://localhost:8000/docs**

---

### 🎨 Фронтенд

1. **Отидете в папката на фронтенда** *(в нов терминал)*:

```bash
cd frontend
```

2. **Инсталирайте зависимостите:**

```bash
npm install
```

3. **Стартирайте dev сървъра:**

```bash
npm run dev
```

> Фронтендът ще бъде достъпен на: **http://localhost:5173**

---

## 📁 Структура на проекта

```
project/
│   README.md
│   requirements.txt
│
├───backend/
│   │   alembic.ini
│   │   requirements.txt
│   │
│   ├───.oci/                              # OCI конфигурация (НЕ commit-вайте!)
│   │       config
│   │       oci_api_key.pem
│   │       oci_api_key_public.pem
│   │
│   ├───alembic/                           # Database миграции
│   │   └───versions/
│   │
│   └───app/
│           .env                           # Env променливи (НЕ commit-вайте!)
│           firebase-service-account.json  # Firebase Admin (НЕ commit-вайте!)
│           main.py
│           auth.py
│           crud.py
│           database.py
│           models.py
│           schemas.py
│           parser.py
│           utils.py
│           fileupload.py
│
└───frontend/
    │   .env                               # Env променливи (НЕ commit-вайте!)
    │   package.json
    │   vite.config.js
    │
    └───src/
        │   app.jsx
        │   main.jsx
        │
        ├───components/
        └───services/
                firebase-config.json       # Firebase Web Config (НЕ commit-вайте!)
                firebase.ts
                api.ts
```

---

## 🗃️ Database миграции (Alembic)

При първо стартиране или при промени в моделите:

```bash
cd backend

# Прилагане на съществуващите миграции
alembic upgrade head

# Създаване на нова миграция след промяна на модел
alembic revision --autogenerate -m "describe your change"
```

---

## 🛑 Спиране на проекта

- Спрете всеки сървър с **`Ctrl + C`** в съответния терминал.
- Деактивирайте виртуалната среда на Python:

```bash
deactivate
```