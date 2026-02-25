//
//  KoinyWidgetBridge.swift
//  App
//
//  Writes child data to the shared App Group so the widget can read it.
//  Call KoinyWidgetBridge.update(...) from AppDelegate or a Capacitor plugin.
//

import Foundation
import WidgetKit

private let appGroupID  = "group.com.koiny.app"
private let storageKey  = "koiny_widget_data"

struct KoinyWidgetBridge {

    struct Payload: Codable {
        let childName: String
        let balance: Double
        let goalName: String?
        let goalTarget: Double
    }

    /// Write data and ask WidgetKit to refresh.
    /// Gracefully handles simulator environments where App Groups may not be available.
    static func update(childName: String,
                       balance: Double,
                       goalName: String? = nil,
                       goalTarget: Double = 0) {
        let payload = Payload(childName: childName,
                              balance: balance,
                              goalName: goalName,
                              goalTarget: goalTarget)

        guard let encoded = try? JSONEncoder().encode(payload) else {
            print("[WidgetBridge] ⚠️ Failed to encode payload")
            return
        }

        // Try App Group UserDefaults — may fail on Simulator without proper provisioning
        if let defaults = UserDefaults(suiteName: appGroupID) {
            defaults.set(encoded, forKey: storageKey)
            // Note: synchronize() is deprecated and no longer necessary on iOS 12+.
            // Removing it also avoids the CFPrefsPlistSource console warning.
            WidgetCenter.shared.reloadAllTimelines()
            print("[WidgetBridge] ✅ Data written to App Group for: \(childName)")
        } else {
            // Fallback: store in standard UserDefaults (widget won't see this,
            // but at least the app doesn't crash on simulator)
            UserDefaults.standard.set(encoded, forKey: storageKey)
            print("[WidgetBridge] ⚠️ App Group unavailable (Simulator?), using standard UserDefaults")
        }
    }
}
