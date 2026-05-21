-- CreateTable
CREATE TABLE "t_user" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "nickname" TEXT,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'FARMER',
    "regionCode" TEXT,
    "villageName" TEXT,
    "realName" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "isElderMode" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_user_oauth" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "unionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_points_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "remark" TEXT,
    "refId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "refId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_feedback" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "contact" TEXT,
    "images" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reply" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_operation_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "module" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_api_switch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_region" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "parentCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_land_plot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "plotName" TEXT NOT NULL,
    "areaMu" REAL NOT NULL DEFAULT 0,
    "boundaryGeojson" TEXT,
    "cropType" TEXT,
    "soilType" TEXT,
    "regionCode" TEXT,
    "localUuid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_farm_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "plotId" INTEGER,
    "recordType" TEXT NOT NULL,
    "cropType" TEXT,
    "content" TEXT,
    "cost" REAL NOT NULL DEFAULT 0,
    "images" TEXT,
    "recordDate" DATETIME NOT NULL,
    "localUuid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_disease_knowledge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "diseaseName" TEXT NOT NULL,
    "cropType" TEXT,
    "category" TEXT,
    "symptoms" TEXT,
    "cause" TEXT,
    "prevention" TEXT,
    "medicineAdvice" TEXT,
    "coverImage" TEXT,
    "modelLabel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_ai_detect_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "detectType" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "resultLabel" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0,
    "adviceText" TEXT,
    "isOffline" BOOLEAN NOT NULL DEFAULT false,
    "feedback" INTEGER,
    "localUuid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_yield_prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plotId" INTEGER NOT NULL,
    "cropType" TEXT,
    "predictedYield" REAL NOT NULL,
    "confidenceLow" REAL,
    "confidenceHigh" REAL,
    "predictDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_farm_calendar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "solarTerm" TEXT,
    "month" INTEGER NOT NULL,
    "cropType" TEXT,
    "activity" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_pesticide_info" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "regNo" TEXT,
    "type" TEXT,
    "targetPest" TEXT,
    "cropType" TEXT,
    "safeDosage" TEXT,
    "safeInterval" TEXT,
    "toxicity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_carbon_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "plotId" INTEGER,
    "cropType" TEXT,
    "areaMu" REAL NOT NULL DEFAULT 0,
    "carbonAmount" REAL NOT NULL DEFAULT 0,
    "method" TEXT,
    "recordDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_market_price" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productName" TEXT NOT NULL,
    "category" TEXT,
    "marketName" TEXT,
    "regionCode" TEXT,
    "price" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '元/公斤',
    "priceDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_price_prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productName" TEXT NOT NULL,
    "predictDate" DATETIME NOT NULL,
    "predictedPrice" REAL NOT NULL,
    "trend" TEXT,
    "advice" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sellerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "price" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '斤',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT,
    "traceCode" TEXT,
    "regionCode" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNo" TEXT NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "receiverInfo" TEXT,
    "logisticsNo" TEXT,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_trace_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "traceCode" TEXT NOT NULL,
    "productId" INTEGER,
    "stage" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT,
    "operator" TEXT,
    "recordTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_buyer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "regionCode" TEXT,
    "lat" REAL,
    "lng" REAL,
    "products" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_group_buy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "initiatorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
    "unitPrice" REAL NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "regionCode" TEXT,
    "deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_logistics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER,
    "logisticsNo" TEXT NOT NULL,
    "company" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentLocation" TEXT,
    "isColdChain" BOOLEAN NOT NULL DEFAULT false,
    "fee" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_machinery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER NOT NULL,
    "machineName" TEXT NOT NULL,
    "machineType" TEXT,
    "dailyPrice" REAL NOT NULL DEFAULT 0,
    "deposit" REAL NOT NULL DEFAULT 0,
    "regionCode" TEXT,
    "totalHours" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "rating" REAL NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_machinery_booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machineryId" INTEGER NOT NULL,
    "renterId" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_machinery_track" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "machineryId" INTEGER NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "workDate" DATETIME NOT NULL,
    "trackPoints" TEXT,
    "workArea" REAL NOT NULL DEFAULT 0,
    "durationHours" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_land_transfer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "areaMu" REAL NOT NULL DEFAULT 0,
    "regionCode" TEXT,
    "location" TEXT,
    "transferType" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "priceUnit" TEXT NOT NULL DEFAULT '元/亩/年',
    "duration" TEXT,
    "description" TEXT,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_machinery_insurance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "machineryId" INTEGER,
    "insuranceType" TEXT,
    "premium" REAL NOT NULL DEFAULT 0,
    "coverage" REAL NOT NULL DEFAULT 0,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_operator_cert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "realName" TEXT,
    "certType" TEXT,
    "certNo" TEXT,
    "machineTypes" TEXT,
    "issueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_disaster_report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "disasterType" TEXT NOT NULL,
    "plotId" INTEGER,
    "affectedArea" REAL NOT NULL DEFAULT 0,
    "estimatedLoss" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "images" TEXT,
    "location" TEXT,
    "aiLossLevel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "regionCode" TEXT,
    "localUuid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_weather_alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alertType" TEXT NOT NULL,
    "alertLevel" TEXT NOT NULL,
    "regionCode" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "defenseGuide" TEXT,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_insurance_claim" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "disasterReportId" INTEGER,
    "claimType" TEXT,
    "estimatedAmount" REAL NOT NULL DEFAULT 0,
    "aiAssessLevel" TEXT,
    "assessDetail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "insurerContact" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_emergency_guide" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "disasterType" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "steps" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_sos_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "sosType" TEXT,
    "location" TEXT,
    "description" TEXT,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "handledBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_policy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "level" TEXT,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "publishOrg" TEXT,
    "regionCode" TEXT,
    "applyGuide" TEXT,
    "validFrom" DATETIME,
    "validTo" DATETIME,
    "attachments" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_policy_chunk" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "policyId" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkContent" TEXT NOT NULL,
    "embedding" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_subsidy_application" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "policyId" INTEGER NOT NULL,
    "materials" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewRemark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_party_lesson" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '文章',
    "content" TEXT,
    "mediaUrl" TEXT,
    "pointsReward" INTEGER NOT NULL DEFAULT 5,
    "publishDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_party_learn_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "learnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_village_affair" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "regionCode" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "attachments" TEXT,
    "publishOrg" TEXT,
    "publishDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_honor_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "regionCode" TEXT,
    "honoreeName" TEXT NOT NULL,
    "honorType" TEXT,
    "deed" TEXT,
    "images" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_training_course" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "cover" TEXT,
    "instructor" TEXT,
    "content" TEXT,
    "videoUrl" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "certName" TEXT,
    "enrollCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_course_enrollment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "certNo" TEXT,
    "certIssuedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_talent_profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "name" TEXT NOT NULL,
    "talentType" TEXT,
    "skills" TEXT,
    "regionCode" TEXT,
    "description" TEXT,
    "photo" TEXT,
    "contactPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_clinic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "regionCode" TEXT,
    "address" TEXT,
    "doctorName" TEXT,
    "phone" TEXT,
    "services" TEXT,
    "lat" REAL,
    "lng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_consultation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "clinicId" INTEGER,
    "symptom" TEXT NOT NULL,
    "images" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "doctorReply" TEXT,
    "replyAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_job_info" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publisherId" INTEGER,
    "title" TEXT NOT NULL,
    "jobType" TEXT,
    "company" TEXT,
    "location" TEXT,
    "salary" TEXT,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "requirement" TEXT,
    "contactPhone" TEXT,
    "regionCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_tourism_spot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "spotType" TEXT,
    "regionCode" TEXT,
    "address" TEXT,
    "description" TEXT,
    "images" TEXT,
    "price" REAL,
    "phone" TEXT,
    "promoText" TEXT,
    "rating" REAL NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_secondhand_item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sellerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "images" TEXT,
    "regionCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ON_SALE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_help_request" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT '求助',
    "title" TEXT NOT NULL,
    "content" TEXT,
    "regionCode" TEXT,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "helperId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_env_report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "problemType" TEXT,
    "description" TEXT,
    "images" TEXT,
    "location" TEXT,
    "regionCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "handleResult" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_loan_product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bankName" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "interestRate" REAL NOT NULL DEFAULT 0,
    "maxAmount" REAL NOT NULL DEFAULT 0,
    "term" TEXT,
    "requirement" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_loan_application" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "loanProductId" INTEGER NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "purpose" TEXT,
    "aiCreditScore" INTEGER,
    "aiAssessResult" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSESSING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "t_folk_culture" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "title" TEXT NOT NULL,
    "cultureType" TEXT,
    "regionCode" TEXT,
    "content" TEXT,
    "images" TEXT,
    "videoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_express_point" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "regionCode" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "companies" TEXT,
    "businessHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_annual_report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "reportContent" TEXT,
    "totalIncome" REAL,
    "totalCost" REAL,
    "summary" TEXT,
    "generatedByAi" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_stat_report" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "regionCode" TEXT,
    "reporterId" INTEGER,
    "statType" TEXT,
    "year" INTEGER NOT NULL,
    "period" TEXT,
    "dataJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_sync_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "tableName" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "localUuid" TEXT,
    "syncStatus" TEXT NOT NULL,
    "conflictDetail" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "t_ai_qa_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "scene" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "modelUsed" TEXT,
    "isOffline" BOOLEAN NOT NULL DEFAULT false,
    "referencesJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "t_user_username_key" ON "t_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "t_user_phone_key" ON "t_user"("phone");

-- CreateIndex
CREATE INDEX "t_user_phone_idx" ON "t_user"("phone");

-- CreateIndex
CREATE INDEX "t_user_regionCode_idx" ON "t_user"("regionCode");

-- CreateIndex
CREATE INDEX "t_user_role_idx" ON "t_user"("role");

-- CreateIndex
CREATE INDEX "t_user_oauth_userId_idx" ON "t_user_oauth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "t_user_oauth_platform_openId_key" ON "t_user_oauth"("platform", "openId");

-- CreateIndex
CREATE INDEX "t_points_log_userId_idx" ON "t_points_log"("userId");

-- CreateIndex
CREATE INDEX "t_notification_userId_idx" ON "t_notification"("userId");

-- CreateIndex
CREATE INDEX "t_notification_type_idx" ON "t_notification"("type");

-- CreateIndex
CREATE INDEX "t_feedback_userId_idx" ON "t_feedback"("userId");

-- CreateIndex
CREATE INDEX "t_feedback_status_idx" ON "t_feedback"("status");

-- CreateIndex
CREATE INDEX "t_operation_log_userId_idx" ON "t_operation_log"("userId");

-- CreateIndex
CREATE INDEX "t_operation_log_module_idx" ON "t_operation_log"("module");

-- CreateIndex
CREATE UNIQUE INDEX "t_api_switch_key_key" ON "t_api_switch"("key");

-- CreateIndex
CREATE UNIQUE INDEX "t_region_code_key" ON "t_region"("code");

-- CreateIndex
CREATE INDEX "t_region_parentCode_idx" ON "t_region"("parentCode");

-- CreateIndex
CREATE INDEX "t_land_plot_userId_idx" ON "t_land_plot"("userId");

-- CreateIndex
CREATE INDEX "t_farm_record_userId_idx" ON "t_farm_record"("userId");

-- CreateIndex
CREATE INDEX "t_farm_record_plotId_idx" ON "t_farm_record"("plotId");

-- CreateIndex
CREATE INDEX "t_farm_record_recordDate_idx" ON "t_farm_record"("recordDate");

-- CreateIndex
CREATE INDEX "t_disease_knowledge_modelLabel_idx" ON "t_disease_knowledge"("modelLabel");

-- CreateIndex
CREATE INDEX "t_ai_detect_record_userId_idx" ON "t_ai_detect_record"("userId");

-- CreateIndex
CREATE INDEX "t_ai_detect_record_detectType_idx" ON "t_ai_detect_record"("detectType");

-- CreateIndex
CREATE INDEX "t_yield_prediction_plotId_idx" ON "t_yield_prediction"("plotId");

-- CreateIndex
CREATE INDEX "t_farm_calendar_month_idx" ON "t_farm_calendar"("month");

-- CreateIndex
CREATE INDEX "t_pesticide_info_regNo_idx" ON "t_pesticide_info"("regNo");

-- CreateIndex
CREATE INDEX "t_carbon_record_userId_idx" ON "t_carbon_record"("userId");

-- CreateIndex
CREATE INDEX "t_market_price_productName_priceDate_idx" ON "t_market_price"("productName", "priceDate");

-- CreateIndex
CREATE INDEX "t_market_price_regionCode_idx" ON "t_market_price"("regionCode");

-- CreateIndex
CREATE INDEX "t_price_prediction_productName_idx" ON "t_price_prediction"("productName");

-- CreateIndex
CREATE INDEX "t_product_sellerId_idx" ON "t_product"("sellerId");

-- CreateIndex
CREATE INDEX "t_product_category_idx" ON "t_product"("category");

-- CreateIndex
CREATE UNIQUE INDEX "t_order_orderNo_key" ON "t_order"("orderNo");

-- CreateIndex
CREATE INDEX "t_order_buyerId_idx" ON "t_order"("buyerId");

-- CreateIndex
CREATE INDEX "t_order_sellerId_idx" ON "t_order"("sellerId");

-- CreateIndex
CREATE INDEX "t_order_orderNo_idx" ON "t_order"("orderNo");

-- CreateIndex
CREATE INDEX "t_trace_record_traceCode_idx" ON "t_trace_record"("traceCode");

-- CreateIndex
CREATE INDEX "t_buyer_regionCode_idx" ON "t_buyer"("regionCode");

-- CreateIndex
CREATE INDEX "t_group_buy_initiatorId_idx" ON "t_group_buy"("initiatorId");

-- CreateIndex
CREATE INDEX "t_logistics_logisticsNo_idx" ON "t_logistics"("logisticsNo");

-- CreateIndex
CREATE INDEX "t_machinery_ownerId_idx" ON "t_machinery"("ownerId");

-- CreateIndex
CREATE INDEX "t_machinery_regionCode_idx" ON "t_machinery"("regionCode");

-- CreateIndex
CREATE INDEX "t_machinery_booking_machineryId_idx" ON "t_machinery_booking"("machineryId");

-- CreateIndex
CREATE INDEX "t_machinery_booking_renterId_idx" ON "t_machinery_booking"("renterId");

-- CreateIndex
CREATE INDEX "t_machinery_track_machineryId_idx" ON "t_machinery_track"("machineryId");

-- CreateIndex
CREATE INDEX "t_land_transfer_userId_idx" ON "t_land_transfer"("userId");

-- CreateIndex
CREATE INDEX "t_land_transfer_regionCode_idx" ON "t_land_transfer"("regionCode");

-- CreateIndex
CREATE INDEX "t_machinery_insurance_userId_idx" ON "t_machinery_insurance"("userId");

-- CreateIndex
CREATE INDEX "t_operator_cert_userId_idx" ON "t_operator_cert"("userId");

-- CreateIndex
CREATE INDEX "t_disaster_report_userId_idx" ON "t_disaster_report"("userId");

-- CreateIndex
CREATE INDEX "t_disaster_report_regionCode_idx" ON "t_disaster_report"("regionCode");

-- CreateIndex
CREATE INDEX "t_disaster_report_status_idx" ON "t_disaster_report"("status");

-- CreateIndex
CREATE INDEX "t_weather_alert_regionCode_idx" ON "t_weather_alert"("regionCode");

-- CreateIndex
CREATE INDEX "t_weather_alert_validFrom_validTo_idx" ON "t_weather_alert"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "t_insurance_claim_userId_idx" ON "t_insurance_claim"("userId");

-- CreateIndex
CREATE INDEX "t_emergency_guide_disasterType_idx" ON "t_emergency_guide"("disasterType");

-- CreateIndex
CREATE INDEX "t_sos_record_userId_idx" ON "t_sos_record"("userId");

-- CreateIndex
CREATE INDEX "t_policy_level_idx" ON "t_policy"("level");

-- CreateIndex
CREATE INDEX "t_policy_category_idx" ON "t_policy"("category");

-- CreateIndex
CREATE INDEX "t_policy_regionCode_idx" ON "t_policy"("regionCode");

-- CreateIndex
CREATE INDEX "t_policy_chunk_policyId_idx" ON "t_policy_chunk"("policyId");

-- CreateIndex
CREATE INDEX "t_subsidy_application_userId_idx" ON "t_subsidy_application"("userId");

-- CreateIndex
CREATE INDEX "t_subsidy_application_policyId_idx" ON "t_subsidy_application"("policyId");

-- CreateIndex
CREATE INDEX "t_party_learn_log_userId_idx" ON "t_party_learn_log"("userId");

-- CreateIndex
CREATE INDEX "t_party_learn_log_lessonId_idx" ON "t_party_learn_log"("lessonId");

-- CreateIndex
CREATE INDEX "t_village_affair_regionCode_idx" ON "t_village_affair"("regionCode");

-- CreateIndex
CREATE INDEX "t_honor_record_regionCode_idx" ON "t_honor_record"("regionCode");

-- CreateIndex
CREATE INDEX "t_course_enrollment_userId_idx" ON "t_course_enrollment"("userId");

-- CreateIndex
CREATE INDEX "t_course_enrollment_courseId_idx" ON "t_course_enrollment"("courseId");

-- CreateIndex
CREATE INDEX "t_talent_profile_regionCode_idx" ON "t_talent_profile"("regionCode");

-- CreateIndex
CREATE INDEX "t_clinic_regionCode_idx" ON "t_clinic"("regionCode");

-- CreateIndex
CREATE INDEX "t_consultation_userId_idx" ON "t_consultation"("userId");

-- CreateIndex
CREATE INDEX "t_job_info_regionCode_idx" ON "t_job_info"("regionCode");

-- CreateIndex
CREATE INDEX "t_tourism_spot_regionCode_idx" ON "t_tourism_spot"("regionCode");

-- CreateIndex
CREATE INDEX "t_secondhand_item_sellerId_idx" ON "t_secondhand_item"("sellerId");

-- CreateIndex
CREATE INDEX "t_secondhand_item_regionCode_idx" ON "t_secondhand_item"("regionCode");

-- CreateIndex
CREATE INDEX "t_help_request_userId_idx" ON "t_help_request"("userId");

-- CreateIndex
CREATE INDEX "t_help_request_regionCode_idx" ON "t_help_request"("regionCode");

-- CreateIndex
CREATE INDEX "t_env_report_userId_idx" ON "t_env_report"("userId");

-- CreateIndex
CREATE INDEX "t_env_report_regionCode_idx" ON "t_env_report"("regionCode");

-- CreateIndex
CREATE INDEX "t_loan_application_userId_idx" ON "t_loan_application"("userId");

-- CreateIndex
CREATE INDEX "t_folk_culture_regionCode_idx" ON "t_folk_culture"("regionCode");

-- CreateIndex
CREATE INDEX "t_express_point_regionCode_idx" ON "t_express_point"("regionCode");

-- CreateIndex
CREATE INDEX "t_annual_report_userId_idx" ON "t_annual_report"("userId");

-- CreateIndex
CREATE INDEX "t_stat_report_regionCode_idx" ON "t_stat_report"("regionCode");

-- CreateIndex
CREATE INDEX "t_sync_log_userId_idx" ON "t_sync_log"("userId");

-- CreateIndex
CREATE INDEX "t_sync_log_localUuid_idx" ON "t_sync_log"("localUuid");

-- CreateIndex
CREATE INDEX "t_ai_qa_record_userId_idx" ON "t_ai_qa_record"("userId");

-- CreateIndex
CREATE INDEX "t_ai_qa_record_scene_idx" ON "t_ai_qa_record"("scene");
