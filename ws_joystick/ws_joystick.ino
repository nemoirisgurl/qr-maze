#include <WiFi.h>
#include <WebSocketsClient.h>

#define X_AXIS_PIN 32
#define Y_AXIS_PIN 33
#define SWITCH_PIN 25

const char* ssid = "wifi";
const char* password = "1357924680";

// 👇 ใส่ IP ของคอมพิวเตอร์ที่รัน server (Node.js หรือ Web)
const char* websocket_server = "10.98.34.199";
const int websocket_port = 8081;

WebSocketsClient webSocket;

float fmap(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("✅ Connected to WebSocket server");
      break;
    case WStype_DISCONNECTED:
      Serial.println("❌ Disconnected, reconnecting...");
      break;
    case WStype_TEXT:
      Serial.printf("📩 Message: %s\n", payload);
      break;
  }
}

void setup() {
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  Serial.begin(115200);
  Serial.println();
  Serial.print("Connecting to WiFi ");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\nWiFi connected!");
  Serial.print("Local IP: ");
  Serial.println(WiFi.localIP());

  // เริ่มเชื่อมต่อ WebSocket
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000); // reconnect อัตโนมัติทุก 5 วินาที
}

void loop() {
  webSocket.loop(); // ต้องมีทุกครั้งใน loop()
  int rawX = analogRead(X_AXIS_PIN);
  int rawY = analogRead(Y_AXIS_PIN);
  int sw = digitalRead(SWITCH_PIN);

  // แปลงค่าจาก 0–4095 → -1.0 ถึง +1.0 (float)
  float x = fmap(rawX, 0, 4095, -1.0, 1.0);
  float y = fmap(rawY, 0, 4095, -1.0, 1.0);

  // แปลงค่าเป็น JSON string
  String msg = "{\"x\":" + String(x) + ",\"y\":" + String(y) + ",\"sw\":" + String(sw) + "}";
  webSocket.sendTXT(msg);

  Serial.println(msg); // debug
  delay(100);
}
