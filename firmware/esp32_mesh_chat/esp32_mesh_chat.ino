#include <WiFi.h>
#include <WebServer.h>
#include <esp_now.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include "MAX30100_PulseOximeter.h"

// --- Configuration ---
const int SERVER_PORT = 80;

// --- Globals ---
WebServer server(SERVER_PORT);
String mySSID;
String deviceId; 

// Message Structure
struct Message {
  String id;
  String sender;
  String content;
  String timestamp;
  bool isEmergency;
};

// Buffers
std::vector<Message> messageBuffer; 
const int MAX_BUFFER_SIZE = 50;

// MAX30100 Globals
PulseOximeter pox;
uint32_t tsLastReport = 0;
float currentBPM = 0;
float currentSpO2 = 0;

// Callback
void onBeatDetected() {
    // Serial.println("Beat!");
}

// --- Helper Functions ---

String generateSSID() {
  uint64_t chipid = ESP.getEfuseMac(); 
  uint16_t chip = (uint16_t)(chipid >> 32);
  char ssid[32];
  snprintf(ssid, sizeof(ssid), "AlertMate_%04X%08X", chip, (uint32_t)chipid);
  return String(ssid);
}

// --- ESP-NOW Callbacks ---

void OnDataSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
  // Serial.print("Last Packet Send Status: ");
  // Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
}

void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {
  char jsonStr[len + 1];
  memcpy(jsonStr, incomingData, len);
  jsonStr[len] = '\0';

  Serial.print("ESP-NOW Recv from: ");
  for (int i = 0; i < 6; i++) {
    Serial.print(info->src_addr[i], HEX);
    if (i < 5) Serial.print(":");
  }
  Serial.print(" Data: ");
  Serial.println(jsonStr);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, jsonStr);

  if (!error) {
    Message msg;
    msg.id = doc["id"].as<String>();
    msg.sender = doc["sender"].as<String>();
    msg.content = doc["content"].as<String>();
    msg.timestamp = doc["timestamp"].as<String>();
    msg.isEmergency = doc["isEmergency"];

    if (messageBuffer.size() >= MAX_BUFFER_SIZE) {
      messageBuffer.erase(messageBuffer.begin());
    }
    messageBuffer.push_back(msg);
  } else {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
  }
}

// --- HTTP Handlers ---

void handleSend() {
  if (server.hasArg("plain") == false) {
    server.send(400, "text/plain", "Body not received");
    return;
  }

  String body = server.arg("plain");
  Serial.println("HTTP POST /send: " + body);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    server.send(400, "text/plain", "Invalid JSON");
    return;
  }

  // 1. Broadcast via ESP-NOW
  uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  
  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;
  
  if (!esp_now_is_peer_exist(broadcastAddress)) {
    esp_now_add_peer(&peerInfo);
  }

  esp_err_t result = esp_now_send(broadcastAddress, (uint8_t *)body.c_str(), body.length());

  // 2. Local Echo
  Message msg;
  msg.id = doc["id"].as<String>();
  msg.sender = doc["sender"].as<String>();
  msg.content = doc["content"].as<String>();
  msg.timestamp = doc["timestamp"].as<String>();
  msg.isEmergency = doc["isEmergency"];

  if (messageBuffer.size() >= MAX_BUFFER_SIZE) {
    messageBuffer.erase(messageBuffer.begin());
  }
  messageBuffer.push_back(msg);

  if (result == ESP_OK) {
    server.send(200, "application/json", "{\"status\":\"sent\"}");
  } else {
    server.send(500, "application/json", "{\"status\":\"failed\"}");
  }
}

void handleReceive() {
  StaticJsonDocument<2048> doc;
  JsonArray array = doc.to<JsonArray>();

  for (const auto& msg : messageBuffer) {
    JsonObject obj = array.createNestedObject();
    obj["id"] = msg.id;
    obj["sender"] = msg.sender;
    obj["content"] = msg.content;
    obj["timestamp"] = msg.timestamp;
    obj["isEmergency"] = msg.isEmergency;
  }

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleHealth() {
    StaticJsonDocument<200> doc;
    doc["bpm"] = currentBPM;
    doc["spo2"] = currentSpO2;
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
}

void setup() {
  Serial.begin(115200);
  delay(1000); // Wait for serial to stabilize
  Serial.println("\n\n--- ESP32 STARTING ---");
  
  // 0. I2C Debugging
  Wire.begin(21, 22); // SDA=21, SCL=22
  Wire.setClock(100000); // Set to 100kHz (Standard Mode) for better stability
  
  Serial.println("Scanning I2C bus on SDA=21, SCL=22...");
  byte error, address;
  int nDevices = 0;
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (address<16) Serial.print("0");
      Serial.print(address,HEX);
      Serial.println("  !");
      nDevices++;
    }
  }
  if (nDevices == 0)
    Serial.println("No I2C devices found\n");
  else
    Serial.println("done\n");

  // 1. Initialize MAX30100
  Serial.print("Initializing pulse oximeter..");
  if (!pox.begin()) {
      Serial.println("FAILED");
      Serial.println("Check wiring: SDA->21, SCL->22, VIN->3.3V/5V");
  } else {
      Serial.println("SUCCESS");
      pox.setOnBeatDetectedCallback(onBeatDetected);
  }

  // 2. WiFi AP Mode
  WiFi.mode(WIFI_AP_STA);
  
  mySSID = generateSSID();
  Serial.print("Setting up AP: ");
  Serial.println(mySSID);
  
  WiFi.softAP(mySSID.c_str(), "12345678");
  
  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP());
  Serial.print("MAC Address: ");
  Serial.println(WiFi.macAddress());

  // 3. Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }
  
  esp_now_register_send_cb(OnDataSent);
  esp_now_register_recv_cb(OnDataRecv);

  // 4. HTTP Server
  server.on("/send", HTTP_POST, handleSend);
  server.on("/receive", HTTP_GET, handleReceive);
  server.on("/health", HTTP_GET, handleHealth);
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  // Update sensor
  pox.update();
  
  // Update readings periodically (every 1s)
  if (millis() - tsLastReport > 1000) {
      currentBPM = pox.getHeartRate();
      currentSpO2 = pox.getSpO2();
      tsLastReport = millis();
  }

  server.handleClient();
}
