#include <cmath>
#include <cstdio>
#include <cstring>
#include <atomic>

#include <M5Unified.h>
#include "agent_link.h"
#include "gesture_detector.hpp"
#include "handshake_gate.hpp"
#include "cardputer_keyboard.hpp"
#include "esp_err.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/stream_buffer.h"
#include "freertos/task.h"

namespace {

constexpr char kTag[] = "node.cardputer";
constexpr char kFirmwareVersion[] = "0.3.0-text";
constexpr size_t kUiTextBytes = 192;
constexpr size_t kSpeakerBufferBytes = 16 * 1024;
constexpr uint32_t kGestureCooldownMs = 1500;
constexpr uint32_t kTelemetryIntervalMs = 500;

struct UiMessage {
    char text[kUiTextBytes];
};

QueueHandle_t g_ui_queue = nullptr;
StreamBufferHandle_t g_speaker_buffer = nullptr;
char g_device_name[24] = "NODE-UNKNOWN";
std::atomic_bool g_handshake_connected{false};
std::atomic_bool g_link_ready{false};
std::atomic_bool g_confirmed{false};
std::atomic_bool g_handshake_armed{false};
std::atomic_bool g_gesture_seen{false};
enum class MenuMode : uint8_t { HOME, LINK, CAMPFIRE, ASK_ROOM, PROFILE };
std::atomic<MenuMode> g_menu_mode{MenuMode::HOME};
CardputerKeyboard g_keyboard;
std::atomic_int g_battery_percent{-1};
std::atomic_uint32_t g_last_interaction_ms{0};

void QueueUi(const char* text) {
    if (!g_ui_queue || !text) return;
    UiMessage message{};
    std::snprintf(message.text, sizeof(message.text), "%s", text);
    if (xQueueSend(g_ui_queue, &message, 0) != pdTRUE) {
        UiMessage discarded{};
        xQueueReceive(g_ui_queue, &discarded, 0);
        xQueueSend(g_ui_queue, &message, 0);
    }
}

void DrawUi(const char* text) {
    const bool connected = g_handshake_connected.load();
    const bool link_ready = g_link_ready.load();
    const int battery = g_battery_percent.load();
    const uint16_t orange = M5.Display.color565(247, 126, 45);
    const char* title = "Starting";
    const char* detail = "Agent Link";

    if (text && (std::strstr(text, "KIN CONNECTED") || connected)) {
        title = "Context saved";
        detail = "Your agents are now kin.";
    } else if (text && std::strstr(text, "CONFIRMED")) {
        title = "Confirmed";
        detail = "Shake both together";
    } else if (text && std::strstr(text, "GESTURE")) {
        title = "Motion sent";
        detail = "Waiting for peer";
    } else if (text && (std::strstr(text, "READY") || std::strstr(text, "KIN READY"))) {
        title = "Ready to match";
        detail = "Press G0 on both";
    } else if (text && std::strstr(text, "CONNECTING")) {
        title = "Connecting";
        detail = "Finding KIN gateway";
    } else if (text && std::strstr(text, "OFFLINE")) {
        title = "Offline";
        detail = "Keep gateway open";
    } else if (text && std::strstr(text, "KIN LINK")) {
        title = "KIN Link";
        detail = "Scan + handshake";
    } else if (text && std::strstr(text, "CAMPFIRE")) {
        title = "Campfire";
        detail = "Build together";
    } else if (text && std::strstr(text, "ASK ROOM")) {
        title = "Ask the room";
        detail = "Broadcast a need";
    } else if (text && std::strstr(text, "PROFILE")) {
        title = "Profile";
        detail = "Builder context";
    } else if (text && std::strstr(text, "KIN HOME")) {
        title = "KIN Home";
        detail = "Press 1-4 to choose";
    }

    M5.Display.fillScreen(TFT_BLACK);
    M5.Display.fillRect(0, 0, 4, 135, orange);
    M5.Display.setTextSize(1);
    M5.Display.setTextColor(orange, TFT_BLACK);
    M5.Display.setCursor(10, 8);
    M5.Display.print("KIN");
    M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    M5.Display.setCursor(38, 8);
    M5.Display.print(g_device_name + 5);

    if (connected) {
        M5.Display.fillRoundRect(158, 3, 76, 18, 4, orange);
        M5.Display.setTextColor(TFT_BLACK, orange);
        M5.Display.setCursor(166, 8);
        M5.Display.print("CONNECTED");
    }

    M5.Display.drawFastHLine(10, 28, 220, TFT_DARKGREY);
    M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
    M5.Display.setTextSize(2);
    M5.Display.setCursor(10, 43);
    M5.Display.print(title);
    M5.Display.setTextSize(1);
    M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    M5.Display.setCursor(10, 75);
    M5.Display.print(detail);

    M5.Display.drawFastHLine(10, 105, 220, TFT_DARKGREY);
    M5.Display.fillCircle(14, 120, 3, link_ready ? TFT_GREEN : TFT_RED);
    M5.Display.setCursor(22, 116);
    M5.Display.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    M5.Display.print(link_ready ? "LINK" : "NO LINK");
    M5.Display.setCursor(193, 116);
    if (battery >= 0 && battery <= 100) M5.Display.printf("%d%%", battery);
    else M5.Display.print("--%");
}

void UiTask(void*) {
    UiMessage message{};
    std::snprintf(message.text, sizeof(message.text), "KIN BOOT\nCONNECTING");
    int shown_battery = -2;
    while (true) {
        const BaseType_t received = xQueueReceive(g_ui_queue, &message, pdMS_TO_TICKS(1000));
        const int battery = g_battery_percent.load();
        if (received == pdTRUE || battery != shown_battery) {
            shown_battery = battery;
            DrawUi(message.text);
        }
    }
}

void SpeakerTask(void*) {
    int16_t pcm[320];
    while (true) {
        const size_t bytes = xStreamBufferReceive(g_speaker_buffer, pcm, sizeof(pcm), portMAX_DELAY);
        if (bytes >= sizeof(int16_t)) {
            M5.Speaker.playRaw(pcm, bytes / sizeof(int16_t), 16000, false, 1, 0, false);
        }
    }
}

void OnAudio(const uint8_t* pcm16, size_t bytes, void*) {
    if (!pcm16 || !bytes || !g_speaker_buffer) return;
    const size_t sent = xStreamBufferSend(g_speaker_buffer, pcm16, bytes, 0);
    if (sent < bytes) ESP_LOGW(kTag, "speaker queue full; dropped %u bytes", unsigned(bytes - sent));
}

void OnAudioEnd(void*) {
    ESP_LOGI(kTag, "audio segment queued to completion");
}

const char* MenuLabel(MenuMode mode) {
    switch (mode) {
        case MenuMode::LINK: return "KIN LINK\nSCAN + HANDSHAKE";
        case MenuMode::CAMPFIRE: return "CAMPFIRE\nBUILD TOGETHER";
        case MenuMode::ASK_ROOM: return "ASK ROOM\nBROADCAST NEED";
        case MenuMode::PROFILE: return "PROFILE\nBUILDER CONTEXT";
        default: return "KIN HOME\nSELECT A MODE";
    }
}

void SetMenuMode(MenuMode mode) {
    g_menu_mode.store(mode);
    if (mode != MenuMode::LINK) { g_handshake_armed.store(false); g_confirmed.store(false); g_gesture_seen.store(false); }
    QueueUi(MenuLabel(mode));
}

void OnShowText(const char* text, void*) {
    if (text && std::strstr(text, "KIN CONNECTED")) {
        g_handshake_connected.store(true);
        g_handshake_armed.store(false);
        g_confirmed.store(false);
        g_gesture_seen.store(false);
        M5.Speaker.tone(1800, 350);
    } else if (text && std::strstr(text, "KIN READY")) {
        g_handshake_connected.store(false);
        g_handshake_armed.store(g_menu_mode.load() == MenuMode::LINK);
        g_confirmed.store(false);
        g_gesture_seen.store(false);
    }
    QueueUi(text);
}

void OnState(agent_state_t state, void*) {
    g_link_ready.store(state == AGENT_STATE_READY);
    if (g_handshake_connected.load()) return;
    const char* label = "AGENT LINK\nOFFLINE";
    if (state == AGENT_STATE_CONNECTED) label = "AGENT LINK\nCONNECTING";
    if (state == AGENT_STATE_READY) label = g_menu_mode.load() == MenuMode::LINK ? "KIN LINK\nSCAN + HANDSHAKE" : MenuLabel(g_menu_mode.load());
    if (state != AGENT_STATE_READY) { g_confirmed.store(false); g_handshake_armed.store(false); g_gesture_seen.store(false); }
    ESP_LOGI(kTag, "Agent_link state=%d", int(state));
    QueueUi(label);
}

void PushButtonEvent() {
    if (g_menu_mode.load() == MenuMode::HOME) { SetMenuMode(MenuMode::LINK); return; }
    if (g_menu_mode.load() == MenuMode::CAMPFIRE) {
        const char payload[] = "{\"kind\":\"campfire.enter\"}";
        agent_link_push_event(AGENT_EVT_CUSTOM, reinterpret_cast<const uint8_t*>(payload), sizeof(payload)-1);
        QueueUi("CAMPFIRE\nROOM OPEN"); return;
    }
    if (g_menu_mode.load() == MenuMode::ASK_ROOM) {
        const char payload[] = "{\"kind\":\"need.broadcast\",\"text\":\"ASK THE ROOM\"}";
        agent_link_push_event(AGENT_EVT_CUSTOM, reinterpret_cast<const uint8_t*>(payload), sizeof(payload)-1);
        QueueUi("ASK ROOM\nNEED SENT"); return;
    }
    if (g_menu_mode.load() == MenuMode::PROFILE) { QueueUi("PROFILE\nCONTEXT READY"); return; }
    if (g_handshake_connected.load()) return;
    if (!g_link_ready.load()) { QueueUi("KIN OFFLINE\nRECONNECTING"); return; }
    if (!g_handshake_armed.load()) { QueueUi("KIN LINK\nWAITING MATCH"); return; }
    if (g_confirmed.load()) { QueueUi("CONFIRMED\nSHAKE NOW"); return; }
    const uint8_t payload[2] = {0, 1};
    const esp_err_t err = agent_link_push_event(AGENT_EVT_BUTTON, payload, sizeof(payload));
    ESP_LOGI(kTag, "confirm button: %s", esp_err_to_name(err));
    if (err == ESP_OK) { g_confirmed.store(true); g_gesture_seen.store(false); g_last_interaction_ms.store(M5.millis()); }
    QueueUi(err == ESP_OK ? "CONFIRMED\nSHAKE NOW" : "KIN OFFLINE\nRETRY G0");
}

void PushGestureEvent(float peak_g) {
    if (!CanSendGesture(g_handshake_armed.load(), g_confirmed.load(), g_gesture_seen.load(), g_link_ready.load(), g_handshake_connected.load())) return;
    char json[80];
    const int length = std::snprintf(json, sizeof(json), "{\"kind\":\"handshake.gesture\",\"peak_g\":%.2f}", peak_g);
    const esp_err_t err = agent_link_push_event(AGENT_EVT_CUSTOM, reinterpret_cast<const uint8_t*>(json), static_cast<size_t>(length));
    ESP_LOGI(kTag, "gesture %.2fg: %s", peak_g, esp_err_to_name(err));
    if (err == ESP_OK) { g_gesture_seen.store(true); M5.Speaker.tone(1400, 120); g_last_interaction_ms.store(M5.millis()); QueueUi("GESTURE SENT\nWAITING PEER"); }
}

void HandleNumberKey(uint8_t key) {
    switch (key) {
        case 1: SetMenuMode(MenuMode::LINK); break;
        case 2: SetMenuMode(MenuMode::CAMPFIRE); break;
        case 3: SetMenuMode(MenuMode::ASK_ROOM); break;
        case 4: SetMenuMode(MenuMode::PROFILE); break;
        case 5: SetMenuMode(MenuMode::HOME); break;
        default: break;
    }
}

void InputTask(void*) {
    uint32_t last_gesture_ms = 0;
    uint32_t last_telemetry_ms = 0;
    GestureDetector gesture_detector;
    while (true) {
        M5.update();
        const uint8_t number_key = g_keyboard.pressedNumber();
        if (number_key) { ESP_LOGI(kTag, "numeric key=%u", unsigned(number_key)); HandleNumberKey(number_key); }
        if (M5.BtnA.wasPressed()) PushButtonEvent();

        float ax = 0, ay = 0, az = 0;
        if (M5.Imu.isEnabled()) {
            // getAccel() returns whether this call refreshed the sensor, not
            // whether the cached sample is usable. M5.update() may have
            // refreshed it immediately before this call, so always process
            // the returned cached vector.
            M5.Imu.getAccel(&ax, &ay, &az);
            const GestureSample gesture = gesture_detector.update(ax, ay, az);
            const uint32_t now = M5.millis();
            const uint32_t last_interaction = g_last_interaction_ms.load();
            if (!g_handshake_connected.load() && g_confirmed.load() && last_interaction > 0 &&
                now - last_interaction >= 30000) {
                g_confirmed.store(false);
                g_gesture_seen.store(false);
                g_last_interaction_ms.store(0);
                QueueUi("MATCH READY\nPRESS G0");
            }
            if (gesture.candidate && now - last_gesture_ms >= kGestureCooldownMs) {
                last_gesture_ms = now;
                PushGestureEvent(gesture.magnitude);
            }
            if (now - last_telemetry_ms >= kTelemetryIntervalMs) {
                last_telemetry_ms = now;
                const float vector[3] = {ax, ay, az};
                agent_link_push_reading("imu_accel", vector, sizeof(vector));
            }
        }
        vTaskDelay(pdMS_TO_TICKS(10));  // 100 Hz local sampling
    }
}

void BatteryTask(void*) {
    while (true) {
        const int level = M5.Power.getBatteryLevel();
        if (level >= 0 && level <= 100) g_battery_percent.store(level);
        if (agent_link_state() == AGENT_STATE_READY) {
            if (level >= 0 && level <= 100) {
                agent_link_report_battery(static_cast<uint8_t>(level), M5.Power.isCharging());
            }
        }
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}

void InitDeviceName() {
    uint8_t mac[6]{};
    ESP_ERROR_CHECK(esp_read_mac(mac, ESP_MAC_BT));
    std::snprintf(g_device_name, sizeof(g_device_name), "NODE-%02X%02X", mac[4], mac[5]);
}

void RegisterIo() {
    static const agent_link_io_desc_t accel = {
        .id = "imu_accel",
        .dir = AGENT_IO_IN,
        .kind = "imu.acceleration",
        .value = AGENT_VAL_VEC3,
        .unit = "g",
        .desc = "Cardputer-Adv BMI270 acceleration vector",
        .range_min = -16.0f,
        .range_max = 16.0f,
        .rate_hz = 2,
        .args_schema = nullptr,
        .display_name = "Motion",
        .audience = AGENT_AUD_AI,
        .enum_json = nullptr,
        .default_json = nullptr,
        .event = AGENT_EVT_PERIODIC,
    };
    ESP_ERROR_CHECK(agent_link_register_io(&accel, nullptr, nullptr));
}

}  // namespace

extern "C" void app_main() {
    InitDeviceName();

    auto m5cfg = M5.config();
    m5cfg.fallback_board = m5::board_t::board_M5CardputerADV;
    m5cfg.clear_display = true;
    m5cfg.internal_imu = true;
    m5cfg.internal_mic = true;
    m5cfg.internal_spk = true;
    M5.begin(m5cfg);
    ESP_LOGI(kTag, "keyboard_tca8418=%d", g_keyboard.begin());
    M5.Display.setRotation(1);
    M5.Display.setBrightness(128);
    M5.Speaker.setVolume(96);

    ESP_LOGI(kTag, "board=%d imu=%d speaker=%d mic=%d battery=%d",
             int(M5.getBoard()), M5.Imu.isEnabled(), M5.Speaker.isEnabled(),
             M5.Mic.isEnabled(), int(M5.Power.getBatteryLevel()));

    g_ui_queue = xQueueCreate(4, sizeof(UiMessage));
    g_speaker_buffer = xStreamBufferCreate(kSpeakerBufferBytes, 1);
    ESP_ERROR_CHECK(g_ui_queue && g_speaker_buffer ? ESP_OK : ESP_ERR_NO_MEM);
    xTaskCreate(UiTask, "node_ui", 4096, nullptr, 4, nullptr);
    xTaskCreate(SpeakerTask, "node_speaker", 4096, nullptr, 5, nullptr);
    QueueUi("BOOTING\nAGENT LINK");

    RegisterIo();
    static agent_output_cb_t output{};
    output.on_audio_out = OnAudio;
    output.on_audio_end = OnAudioEnd;
    output.on_show_text = OnShowText;

    agent_link_config_t config{};
    config.device_name = g_device_name;
    config.caps = AGENT_CAP_SPEAKER | AGENT_CAP_SCREEN | AGENT_CAP_BUTTON |
                  AGENT_CAP_BATTERY | AGENT_CAP_SENSOR;
    config.output = &output;
    config.on_state = OnState;
    config.transport = AGENT_TRANSPORT_BLE;
    config.manufacturer = "Deotaland + Node";
    config.model = "M5Stack Cardputer-Adv";
    config.firmware_rev = kFirmwareVersion;
    ESP_ERROR_CHECK(agent_link_init(&config));
    ESP_ERROR_CHECK(agent_link_start());

    xTaskCreate(InputTask, "node_input", 6144, nullptr, 5, nullptr);
    xTaskCreate(BatteryTask, "node_battery", 3072, nullptr, 3, nullptr);
}
