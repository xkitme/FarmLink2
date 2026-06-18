-- 加收货地址列（集市下单 / AI 语音助手下单填充 receiverInfo）
ALTER TABLE "t_user" ADD COLUMN "shippingAddress" TEXT;
